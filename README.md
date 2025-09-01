# ✨ 프로젝트 소개

**프로젝트명:** AI 기반 데이터 분석 에이전트 (Data Analysis AI Agent)

**요약:**  
이 프로젝트는 Python의 **Streamlit**을 기반으로, 사용자가 업로드한 데이터를 **탐색적 데이터 분석(EDA)**, **이상 탐지**, 그리고 **LLM(대규모 언어 모델) 기반 챗봇**을 통해 대화형으로 분석할 수 있는 웹 애플리케이션입니다.  
데이터 분석에 익숙하지 않은 사람도 쉽게 데이터를 탐색하고 인사이트를 얻을 수 있도록 돕는 것을 목표로 합니다.

---

## 🚀 주요 기능

- **데이터 업로드**
  - CSV 업로드 지원 (추후 Excel 확장 가능)
  - 업로드 후 데이터 미리보기 제공

- **탐색적 데이터 분석 (EDA)**
  - 기본 통계, 결측치, 컬럼 타입 분석
  - 단변량 분석: 수치형 컬럼 기초 통계 및 시각화
  - 다변량 분석: 상관관계 매트릭스, 히트맵

- **이상 탐지 (Anomaly Detection)** *(P1 예정)*
  - Z-score, IQR, Isolation Forest 등 제공
  - 이상치 인덱스 및 요약 리포트 반환

- **대화형 LLM 챗봇 + RAG 연동**
  - LangChain 기반 챗봇 → 자연어로 데이터 관련 질의응답
  - PDF 업로드 후 인덱싱하면 챗봇이 문서 조각을 컨텍스트로 활용해 답변
  - 검색 결과가 없으면 CSV 위주로 답변하며 간단 안내 문구 표시(옵션)
  - Google Gemini, OpenAI 모델 선택 가능 (키는 `.env`)
  - 대화 기록 저장은 추후 추가 예정

- **RAG (Retrieval-Augmented Generation)**
  - PDF 파싱·청킹·임베딩 후 FAISS 인덱스 생성/저장
  - RAG 탭에서 키워드 검색, Chat에서도 동일 인덱스를 자동 활용
  - 자동 재인덱싱: PDF/임베딩 설정 변경 시 자동 갱신(토글 가능)

- **MCP 통합**
  - Uvicorn 기반 FastAPI 서버(8001 Core, 8002 Data Tools)
  - Chat/EDA/RAG를 MCP Tool API로 노출

---

## 🛠️ 기술 스택

- **프레임워크**: Streamlit, LangChain  
- **언어**: Python  
- **데이터 처리**: Pandas, Numpy  
- **모델/분석**: Scikit-learn (추후 XGBoost, TensorFlow 고려)  
- **시각화**: Matplotlib, Seaborn  
- **환경 관리**: python-dotenv  
- **확장**: MCP, FAISS (Vector DB)

---

## ⚙️ 시작하기

### 1. 환경 설정
```bash
git clone https://github.com/doridoit/My_AI_Agent.git
cd My_AI_Agent

python -m venv .venv
source .venv/bin/activate   # macOS/Linux
# Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

### 2. API 키/임베딩 설정
`.env` 파일 생성 후 원하는 키를 입력하세요:
```env
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
# (선택) 임베딩 설정 — 기본은 Google Gemini 임베딩
EMBEDDING_PROVIDER=google
EMBEDDING_MODEL=models/text-embedding-004
```

### 3. 애플리케이션 실행
```bash
streamlit run main.py
```
→ 브라우저에서 `http://localhost:8501` 접속

또는 Makefile로 UI/서버 동시 실행:
```bash
make run                 # UI(8501) + Core(8001) + Data Tools(8002)
make run-ui
make run-core-server
make run-data-tools-server
```

---

## 📂 프로젝트 구조

```
My_AI_Agent/
├── main.py                      # Streamlit 앱 실행 파일
├── requirements.txt             # 패키지 목록
├── .env.example                 # 환경변수 예시
├── logs/
│   └── chat_log.csv             # 챗봇 대화 기록
├── data/                        # 샘플/업로드 데이터
├── modules/
│   ├── components/
│   │   └── llm_selector.py      # LLM 모델 선택 및 초기화
│   ├── processing/
│   │   ├── eda.py               # EDA 로직
│   │   └── anomaly_model.py     # 이상탐지 로직
│   ├── chatbot/
│   │   ├── chain_factory.py     # LangChain 체인 생성
│   │   └── prompt_templates.py  # 프롬프트 템플릿
│   ├── rag/
│   │   ├── pdf_parser.py        # PDF 파싱
│   │   ├── embedder.py          # 임베딩 생성
│   │   ├── retriever.py         # 문서 검색
│   │   ├── rag_chain.py         # RAG 체인
│   │   └── vector_store/        # 벡터 DB 저장소
│   └── mcp/
│       ├── servers/             # MCP 서버
│       ├── client/              # MCP 클라이언트
│       ├── schemas/             # MCP 파라미터 정의
│       └── utils/               # 공통 유틸
└── assets/
    └── logo.png                 # 로고/정적 자원
```

---

## 🧭 사용 방법 (요약)

- Chat & Upload 탭
  - CSV 업로드 → EDA/챗봇에서 활용
  - PDF 업로드 → “📚 PDF 인덱싱 실행(재인덱싱)” 또는 자동 재인덱싱으로 벡터 인덱스 생성
  - 인덱싱 완료 후 Chat에서 질문하면 PDF 조각이 컨텍스트로 반영됨

- RAG 탭
  - 키워드 입력 → 유사 문서 조각 확인 → LLM으로 간단 답변 생성

- 자동 재인덱싱
  - 기본 ON. PDF 목록/임베딩 설정(EMBEDDING_PROVIDER/MODEL) 변경 시 자동 실행
  - 무한 반복 방지 가드 내장, 필요 시 체크박스로 OFF 가능

## 🧰 트러블슈팅

- Chat에 “RAG 검색 결과가 없어 CSV 위주로 답합니다.”가 보일 때
  - 인덱스 없음/로딩 실패/검색 0건일 수 있습니다.
  - RAG 탭에서 동일 키워드로 검색이 되는지 확인 → 안 되면 PDF 재업로드 및 재인덱싱
  - 인덱스 경로: `data/vector_store/faiss_index` (앱에서 절대경로로 서버에 전달)
  - Core 서버(8001) 콘솔의 `[RAG] ...` 로그 확인

- 임베딩 경고 `[WARN] Google provider ...]`
  - 서버가 `.env`를 못 읽을 때 발생. 현재 서버/임베더에서 `.env`를 로드하도록 반영됨.
  - 정확도를 위해 `GOOGLE_API_KEY` 설정 후 재인덱싱 권장(폴백 임베딩도 동작은 함)

- FAISS 로드 오류
  - `faiss-cpu` 설치 필요(요구사항에 포함). LangChain 로더는 `allow_dangerous_deserialization=True`로 동작.

## 🧹 Git 관리

- `.gitignore` 정책: 데이터/벡터/로그는 기본 무시, 샘플/가이드는 허용
  - 무시: `data/*`, `vector_store/*`, `logs/*`
  - 허용: `!data/README.md`, `!data/melting_tank.csv`, `!data/samples/**`, `!data/.gitkeep`, `!logs/.gitkeep`, `!vector_store/.gitkeep`
- 패키지 인식 안정성을 위해 `modules/**/__init__.py` 포함

## 📜 진행 상황
- ✅ P0: 구조 세팅, 기본 EDA, Ping 테스트  
- ✅ P1: RAG 인덱싱/탐색, Chat 연동, 자동 재인덱싱, 프롬프트/폴백 개선  
- 🔄 P2: 이상탐지 고도화, RAG 소스 인용/하이라이트, Docker 배포  

---
