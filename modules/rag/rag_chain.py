import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import streamlit as st
import concurrent.futures
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.embeddings.base import Embeddings
from typing import List
from .embedder import embed_texts
from ..chatbot.chain_factory import create_gemini_chat_chain

# --- CONFIGS ---
VECTOR_STORE_DIR = "data/vector_store"

class CustomEmbeddings(Embeddings):
    """LangChain Embeddings 인터페이스 구현체 (인덱싱용)."""
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return embed_texts(texts, is_query=False)

    def embed_query(self, text: str) -> List[float]:
        return embed_texts([text], is_query=True)[0]

def _process_one_pdf(file_data: tuple) -> list:
    """단일 PDF 파일을 처리하고 텍스트 청크를 반환하는 헬퍼 함수."""
    file_name, file_bytes = file_data
    temp_file_path = os.path.join("data", f"temp_{file_name}")
    os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
    try:
        with open(temp_file_path, "wb") as f:
            f.write(file_bytes)
        loader = PyPDFLoader(temp_file_path)
        docs = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        return text_splitter.split_documents(docs)
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

def ingest_pdfs(pdf_files: list) -> dict:
    """업로드된 PDF 파일 목록을 처리하여 벡터 스토어에 인덱싱하고, 상세한 진행 상황을 UI에 표시합니다."""
    if not pdf_files:
        return {}

    with st.status("PDF 인덱싱 시작...", expanded=True) as status:
        try:
            status.write("1/4: PDF 파일 처리 및 텍스트 추출 중...")
            all_chunks = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count()) as executor:
                future_to_file = {executor.submit(_process_one_pdf, file_data): file_data for file_data in pdf_files}
                for i, future in enumerate(concurrent.futures.as_completed(future_to_file)):
                    file_name, _ = future_to_file[future]
                    try:
                        chunks = future.result()
                        all_chunks.extend(chunks)
                        st.write(f"  - '{file_name}' 처리 완료.")
                    except Exception as exc:
                        st.error(f"'{file_name}' 파일 처리 중 오류 발생: {exc}")
            
            if not all_chunks:
                status.update(label="텍스트를 추출할 수 있는 PDF가 없어 인덱싱을 중단합니다.", state="error")
                return {}

            status.update(label="2/4: 텍스트 벡터 변환 중...", state="running")
            st.write(f"총 {len(all_chunks)}개의 텍스트 조각을 임베딩합니다. (Google API 호출 중...)")
            embeddings = CustomEmbeddings()
            
            status.update(label="3/4: 벡터 인덱스 생성 중...", state="running")
            vector_store = FAISS.from_documents(all_chunks, embeddings)
            
            status.update(label="4/4: 인덱스 파일 저장 중...", state="running")
            if not os.path.exists(VECTOR_STORE_DIR):
                os.makedirs(VECTOR_STORE_DIR)
            # 저장 경로는 실제 인덱스 폴더(예: data/vector_store/faiss_index)
            # 절대경로로 저장/반환하여 다른 프로세스(서버)에서도 확실히 접근 가능하게 처리
            save_dir = os.path.abspath(os.path.join(VECTOR_STORE_DIR, "faiss_index"))
            vector_store.save_local(save_dir)

            status.update(label="인덱싱 성공!", state="complete", expanded=False)

            return {
                "files": [name for name, _ in pdf_files],
                "chunks": len(all_chunks),
                # ✅ 서버가 정확한 인덱스 폴더를 열 수 있도록 faiss_index 폴더를 전달
                "index_dir": save_dir,
            }
        except Exception as e:
            status.update(label=f"인덱싱 실패", state="error")
            st.error(f"오류 상세 내용: {e}")
            raise e

def compose_answer(hits: list, query: str, temperature: float = 0.2) -> str:
    """검색 결과(hits)를 바탕으로 LLM을 이용해 답변을 생성합니다."""
    if not hits:
        return "검색된 내용이 없습니다."
    
    try:
        llm = create_gemini_chat_chain(temperature=temperature)
    except Exception as e:
        return f"[LLM 오류] {e}\n환경설정을 확인하세요."

    context = "\n\n---\n\n".join([h.page_content for h in hits])
    prompt = (
        "아래는 문서에서 발췌한 내용입니다.\n\n"
        f"DOCUMENTS:\n{context}\n\n"
        "이 정보를 바탕으로 사용자 질문에 답변하세요. 만약 정보가 충분하지 않다면, "
        "모른다고 솔직하게 답하세요.\n\n"
        f"USER QUESTION: {query}"
    )
    
    try:
        resp = llm.invoke(prompt)
        text = getattr(resp, "content", "") or str(resp)
        return text.strip() if text else "[LLM 오류] 응답이 비어 있습니다."
    except Exception as e:
        return f"[LLM 오류] {e}\n네트워크 또는 API를 확인하거나 질문을 구체화해주세요."
