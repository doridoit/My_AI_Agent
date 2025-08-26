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

- **대화형 LLM 챗봇**
  - LangChain 기반 챗봇 → 자연어로 데이터 관련 질의응답
  - Google Gemini, OpenAI 모델 선택 가능
  - API 키는 `.env`로 관리
  - 대화 기록은 `logs/chat_log.csv` 저장

- **RAG (Retrieval-Augmented Generation)** *(P1 예정)*
  - PDF 문서 파싱 및 벡터화
  - 관련 문서 검색 + 인용과 함께 답변

- **MCP 통합** *(P1 예정)*
  - MCP 서버/클라이언트 구조로 기능 확장
  - Chat/EDA/Anomaly/RAG 기능을 MCP Tool로 노출

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

### 2. API 키 설정
`.env` 파일 생성 후 원하는 키를 입력하세요:
```env
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

### 3. 애플리케이션 실행
```bash
streamlit run main.py
```
→ 브라우저에서 `http://localhost:8501` 접속

---

## 📂 프로젝트 구조

```
ai.agent_proto/
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

## 📜 진행 상황
- ✅ P0: 구조 세팅, 기본 EDA, Ping 테스트, 로그 export  
- 🔄 P1 예정: 이상탐지, RAG, MCP 클라이언트 통합  
- 📈 P2 이후: 모델 확장, Docker 배포, 문서화 강화  

---