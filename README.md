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

### 3. 애플리케이션 실행 (TS 프런트 + API 게이트웨이)
```bash
make run                 # API(9000) + Core(8001) + Data Tools(8002)
make run-core-server
make run-data-tools-server
make run-api             # API Gateway (9000)
```

---

## 📂 프로젝트 구조 (리팩토링 반영)

```
My_AI_Agent/
├── main.py                      # 경량 라우터(페이지 위임/헤더/스타일/네비)
├── requirements.txt             # 패키지 목록
├── data/                        # 샘플/업로드 데이터(FAISS 인덱스 등)
├── app/
│   ├── pages/
│   │   ├── chat_page.py         # 업로드·인덱싱·대화(MCP 연동)
│   │   ├── eda_page.py          # KPI/요약/차트/이상치/PCA + EDA 챗봇
│   │   ├── rag_page.py          # RAG 검색/답변
│   │   ├── anomaly_page.py      # 이상치(자리 마련)
│   │   └── settings_page.py     # 설정(자리 마련)
│   ├── services/
│   │   └── mcp_client.py        # MCP 호출 래퍼
│   ├── header.py                # 헬스 배지 렌더러
│   ├── theme.py                 # 사이드바/배지 CSS
│   └── state.py                 # 세션 상태 유틸(초기화/셋/클리어/KB 관리)
└── modules/
    ├── processing/
    │   └── eda.py               # (존치) EDA 로직
    ├── chatbot/
    │   ├── chain_factory.py
    │   └── prompt_templates.py
    ├── rag/
    │   ├── pdf_parser.py
    │   ├── embedder.py
    │   ├── retriever.py
    │   ├── rag_chain.py
    │   └── vector_store/
    └── mcp/
        ├── servers/             # FastAPI MCP 서버(Core/Data Tools)
        └── client/              # 기존 MCP 클라이언트(services 래퍼에서 사용)
```

---

프런트엔드 개발 서버(로컬):
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

## 🧭 사용 방법 (요약)

- Chat: /chat에서 질문(스트리밍/비스트리밍 토글)
- EDA: /eda에서 CSV 업로드→프로파일 호출 및 차트 표시, 서버 업로드 버튼 제공
- RAG: /rag에서 키워드 검색→문서 조각 반환

---

## 🧱 프런트엔드(Typescript) 초석

- 위치: `frontend/` (Next.js + TS 스켈레톤)
- 개발 서버 실행(로컬):
  ```bash
  cd frontend
  npm install   # 최초 1회
  npm run dev   # http://localhost:3000
  ```
- 환경변수: `NEXT_PUBLIC_API_BASE_URL` (기본 `http://localhost:9000`)
- 라우트:
  - `/` 홈, `/chat` 간단 챗 UI, `/eda` CSV 업로드→EDA 프로파일 호출
- 백엔드: `make run-api`로 FastAPI 게이트웨이(9000) 기동 후 연동

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

## 🧹 정리/관리

- 디렉터리 정리: 불필요한 빈 디렉터리(`assets/`, `logs/`) 제거했습니다. 필요 시 다시 생성해도 무방합니다.
- `.gitignore`(예시): 데이터/벡터 인덱스는 기본 무시, 샘플/가이드는 허용
  - 무시: `data/**`, `**/vector_store/**`
  - 허용: 샘플 데이터/문서(프로젝트에 맞게 유지)
- 패키지 인식 안정성을 위해 `__init__.py` 유지

### 코드 스타일/린팅 (Black + Ruff)

- 설정 파일: `pyproject.toml`
- Black(포매터): 코드 스타일을 자동 정렬(기본 라인 길이 100)
- Ruff(린터/포매터): 빠른 린팅과 isort 포함(E,F,I 규칙 사용)

실행 예시
```bash
# 포매팅(Black) + 린팅/자동수정(Ruff)
ruff check --fix .
black .
```


---
