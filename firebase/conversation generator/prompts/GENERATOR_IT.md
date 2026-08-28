MUST NOT DELETE
ManyLangs 이탈리아어 회화 원문 생성 매뉴얼 (Claude / GPT 공용판)
GENERATOR_IT.md — v1.0

이 문서는 Claude와 GPT 양쪽에서 동일하게 동작해야 한다. 외부 대화 맥락이나 이전 문서를 참조하지 않아도 이 문서 하나만으로 실행 가능해야 한다.

━━━━━━━━━━━━━━━━━━
0. 최상위 원칙
━━━━━━━━━━━━━━━━━━

이 문서는 이탈리아어(it-IT, 이탈리아 표준어) 원문만 생성한다. 번역 품질은 고려하지 않는다. 다른 언어 표현 가능성 때문에 이탈리아어 표현을 단순화·수정하지 않는다. 오직 이탈리아 원어민이 실제로 쓰는 자연스러운 표현만을 기준으로 생성한다.

━━━━━━━━━━━━━━━━━━
1. 역할
━━━━━━━━━━━━━━━━━━

이탈리아어 회화 교재의 원문(target) 생성만 담당한다. 번역/QA채점/merge는 하지 않는다. 결과물은 prompts/TRANSLATOR_{LANG}.md (8종 번역 언어: en/es/fr/pt/kr/jp/zh/ru)가 번역하고 merge.py가 합산한다.

참고: 이탈리아어(it)도 독일어와 마찬가지로 지금 8개 고정 "번역 언어" 목록에 포함되어 있지 않다. 이탈리아어 target 책은 이 8개 언어로만 번역되고, 다른 책의 번역 컬럼으로 이탈리아어가 쓰이지는 않는다.

━━━━━━━━━━━━━━━━━━
2~3. 목적 / 입력
━━━━━━━━━━━━━━━━━━

BATCH_ID(001~060) → 4장 챕터 1개 확정 → 그 주제의 이탈리아어 회화 10세트(세트당 6줄) 생성 → 압축 JSON 출력. 입력: "001-target" 또는 "BATCH_ID: 001".

━━━━━━━━━━━━━━━━━━
4. 확정 챕터 목록
━━━━━━━━━━━━━━━━━━

동일 60개 상황·레벨 구조 공유, ChapterID 접두어 CONV_IT_, chapter_title은 이탈리아어로 새로 창작.

| IDX | ChapterID | LEVEL | chapter_title (target, it-IT) |
|---:|---|---|---|
| 001 | CONV_IT_GREETINGS | A1 | Saluti |
| 002 | CONV_IT_SELF_INTRODUCTION | A1 | Presentarsi |
| 003 | CONV_IT_NATIONALITY_LANGUAGES | A1 | Nazionalità e lingue |
| 004 | CONV_IT_JOBS_OCCUPATIONS | A1 | Professioni |
| 005 | CONV_IT_FAMILY_INTRODUCTION | A1 | Presentare la famiglia |
| 006 | CONV_IT_NUMBERS_PRICES | A1 | Numeri e prezzi |
| 007 | CONV_IT_ASKING_DIRECTIONS | A1 | Chiedere indicazioni |
| 008 | CONV_IT_DESCRIBING_PLACES | A1 | Descrivere un luogo |
| 009 | CONV_IT_ORDERING_FOOD | A1 | Ordinare da mangiare |
| 010 | CONV_IT_ORDERING_CAFE | A1 | Ordinare al bar |
| 011 | CONV_IT_SHOPPING | A2 | Fare shopping |
| 012 | CONV_IT_TASTES_PREFERENCES | A2 | Gusti e preferenze |
| 013 | CONV_IT_TIME_DAYS | A2 | L'ora e i giorni |
| 014 | CONV_IT_MAKING_APPOINTMENTS | A2 | Fissare un appuntamento |
| 015 | CONV_IT_DESCRIBING_HOME | A2 | Descrivere la casa |
| 016 | CONV_IT_TALKING_WEATHER | A2 | Parlare del tempo |
| 017 | CONV_IT_USING_TRANSPORT | A2 | Usare i mezzi pubblici |
| 018 | CONV_IT_HOBBIES | A2 | Hobby |
| 019 | CONV_IT_HEALTH_SYMPTOMS | A2 | Salute e sintomi |
| 020 | CONV_IT_ASKING_HELP | A2 | Chiedere aiuto |
| 021 | CONV_IT_DORMITORY_LIFE | B1 | Vita in residenza universitaria |
| 022 | CONV_IT_ATTENDING_CLASSES | B1 | Frequentare le lezioni |
| 023 | CONV_IT_PROFESSOR_CONSULTATION | B1 | Colloquio con il professore |
| 024 | CONV_IT_ASSIGNMENTS_SUBMISSIONS | B1 | Compiti e consegne |
| 025 | CONV_IT_TEAM_PROJECTS | B1 | Progetto di gruppo |
| 026 | CONV_IT_PRESENTATION_PREP_CAMPUS | B1 | Preparare una presentazione |
| 027 | CONV_IT_EXAM_PREPARATION | B1 | Prepararsi per un esame |
| 028 | CONV_IT_COLLEGE_FRIENDS | B1 | Amici dell'università |
| 029 | CONV_IT_CLUB_ACTIVITIES | B1 | Attività del club |
| 030 | CONV_IT_SCHOOL_EVENTS | B1 | Eventi scolastici |
| 031 | CONV_IT_BANK_SERVICES | B2 | Operazioni bancarie |
| 032 | CONV_IT_HOSPITAL_PHARMACY | B2 | Ospedale e farmacia |
| 033 | CONV_IT_GOVERNMENT_OFFICE | B2 | Ufficio pubblico |
| 034 | CONV_IT_PART_TIME_JOBS | B2 | Lavoro part-time |
| 035 | CONV_IT_TRAVEL_PLANNING | B2 | Pianificare un viaggio |
| 036 | CONV_IT_ACCOMMODATION_BOOKING | B2 | Prenotare un alloggio |
| 037 | CONV_IT_FINDING_RESTAURANTS | B2 | Trovare un buon ristorante |
| 038 | CONV_IT_SHOPPING_DETAILS | B2 | Dettagli di un acquisto |
| 039 | CONV_IT_SMARTPHONES_APPS | B2 | Smartphone e app |
| 040 | CONV_IT_SNS_ONLINE_COMMUNITIES | B2 | Social network e comunità online |
| 041 | CONV_IT_JOB_INTERVIEW | C1 | Colloquio di lavoro |
| 042 | CONV_IT_FIRST_DAY_WORK | C1 | Primo giorno di lavoro |
| 043 | CONV_IT_TALKING_COWORKERS | C1 | Parlare con i colleghi |
| 044 | CONV_IT_WORK_INSTRUCTIONS_REPORTS | C1 | Istruzioni e resoconti |
| 045 | CONV_IT_LEADING_MEETINGS | C1 | Condurre una riunione |
| 046 | CONV_IT_CLIENT_COMMUNICATION | C1 | Comunicazione con il cliente |
| 047 | CONV_IT_EMAIL_DISCUSSION | C1 | E-mail di lavoro |
| 048 | CONV_IT_ISSUE_SOLVING | C1 | Risolvere un problema |
| 049 | CONV_IT_SCHEDULE_MANAGEMENT | C1 | Gestione dell'agenda |
| 050 | CONV_IT_BUSINESS_TRIP_PREP | C1 | Preparare un viaggio di lavoro |
| 051 | CONV_IT_EXHIBITIONS_FAIRS | C2 | Fiere ed esposizioni |
| 052 | CONV_IT_BUSINESS_NETWORKING | C2 | Networking professionale |
| 053 | CONV_IT_PRESENTATION_PREP_BIZ | C2 | Preparare una presentazione (aziendale) |
| 054 | CONV_IT_MARKETING_PR | C2 | Marketing e comunicazione |
| 055 | CONV_IT_PROJECT_PLANNING | C2 | Pianificazione del progetto |
| 056 | CONV_IT_DATA_ANALYTICS | C2 | Dati e analisi |
| 057 | CONV_IT_COMPANY_POLICIES | C2 | Politiche aziendali |
| 058 | CONV_IT_TRAVEL_VACATION | C2 | Viaggi di lavoro e ferie |
| 059 | CONV_IT_CAREER_GROWTH | C2 | Crescita professionale |
| 060 | CONV_IT_WORK_CULTURE_ADAPTATION | C2 | Adattarsi alla cultura aziendale |

━━━━━━━━━━━━━━━━━━
5. 화자 시스템 (고정)
━━━━━━━━━━━━━━━━━━

- A = 여성, B = 남성, 10세트 전체 고정.
- 허용 여성 이름: Giulia, Sara, Chiara, Elena
- 허용 남성 이름: Marco, Luca, Matteo, Davide
- 이름은 자연스러울 때만 사용.

━━━━━━━━━━━━━━━━━━
5-1. 문법적 성별 일치 규칙 (이탈리아어 고유, 절대 규칙)
━━━━━━━━━━━━━━━━━━

이탈리아어는 스페인어와 유사하게 서술적 형용사·과거분사가 성별에 따라 어미 변화한다.
- A(여성) 자신/A 지칭 → 여성형 (예: "sei stanca?", "sono contenta")
- B(남성) 자신/B 지칭 → 남성형 (예: "sei stanco?", "sono contento")
- 제3자(가족, 동료, 상사 등)가 등장하면 그 인물의 실제 성별에 형용사·과거분사·직업명(professore/professoressa, dottore/dottoressa 등)을 일치시키고, 세트 안에서 중간에 성별 표지가 바뀌지 않게 유지한다.

━━━━━━━━━━━━━━━━━━
6~9. 세트 구조 / 상호작용 / 질문-응답 / 길이 규칙
━━━━━━━━━━━━━━━━━━

GENERATOR_KR.md·GENERATOR_ES.md와 동일: 10세트×6줄, A→B→A→B→A→B 고정, 세트 간 독립, 시작·상황·흐름 다양성 필수, 모든 B 라인은 직전 A 라인에 반응, 질문은 다음 라인에서 반드시 답변.

레벨별 길이(단어 수, 공백 기준, 관사·전치사 포함): A1 5~10 / A2 6~11 / B1 7~13 / B2 9~15 / C1 10~17 / C2 11~19.

이 범위는 상한선이 아니라 대략적인 가이드다. 실제 원어민이 자연스럽게 말하면 범위를 살짝 넘어도 된다 — 범위를 지키려고 자연스러운 문장을 인위적으로 잘라내거나, 정형화된 짧은 안부 표현(예: 매 세트 첫 줄을 판박이처럼 반복하는 인사)으로 채우지 않는다. 특히 A1도 '아기 말투'가 아니다 — 어휘와 문법이 단순할 뿐, 실제 성인 원어민이 쓰는 자연스러운 리듬을 유지한다.

━━━━━━━━━━━━━━━━━━
10. 이탈리아어 생성 원칙
━━━━━━━━━━━━━━━━━━

생성 기준: "실제 이탈리아 원어민이라면 이렇게 말할까?"

지역 표준: it-IT 이탈리아 표준어. 지역 방언(나폴리, 시칠리아, 밀라노 등)의 고유 어휘·문법 금지, 표준 이탈리아어 어휘·문법만 사용.

격식 기준: 편한 사이면 캐주얼한 tu 화법, 격식 상황(면접, 고객 응대 등)이면 정중한 Lei(3인칭 단수로 활용) 화법으로 통일, 세트 내 tu/Lei 혼용 금지.

반드시 지킬 것: 자연스러운 구어체, 짧은 리액션("Davvero?", "Che bello!", "Certo!", 그 외 "va bene/non c'è problema/grazie/capisco/che peccato"), 세트당 질문-응답 최소 1쌍 필수, 반복 억제(같은 리액션 표현은 10세트 전체에서 최대 2회까지만 — 3회 이상 반복되면 재작성)·어휘 다양성(piacere만 반복 않고 preferire/adorare 등 사용), C1/C2는 "Penso che sarebbe più efficiente", "Sono d'accordo con questo punto" 같은 격식 표현도 사용, 5-1장 성별 일치를 모든 라인에 적용.

절대 금지: 지역 방언 어휘·문법, tu/Lei 혼용, 성별 일치 오류, 번역투, 교과서 문장.

━━━━━━━━━━━━━━━━━━
11. TTS 안전 규칙
━━━━━━━━━━━━━━━━━━

숫자·금액·시각·날짜·단위는 말로 풀어 쓴다. 아라비아 숫자, €/%/#// 기호 금지.
예: ❌ 20 € → ✅ venti euro / ❌ alle 3 → ✅ alle tre
서수도 풀어 쓴다 (primo, secondo, terzo...). 이모지·이모티콘 금지.

━━━━━━━━━━━━━━━━━━
12~14. 출력 형식 (텍스트, JSON 아님) / 자체 확인 / 최종 출력 형식
━━━━━━━━━━━━━━━━━━

이 문서는 JSON을 직접 만들지 않는다. 아래 텍스트 형식으로만 출력하고,
JSON으로의 변환은 별도 파서(text_parser.py)가 전담한다.

형식 (예시는 CONV_IT_GREETINGS 배치 형태):

LEVEL: a1
CHAPTER_ID: CONV_IT_GREETINGS
TITLE: Saluti

SET 001
A: (문장)
B: (문장)
A: (문장)
B: (문장)
A: (문장)
B: (문장)

SET 002
A: (문장)
B: (문장)
A: (문장)
B: (문장)
A: (문장)
B: (문장)

(... SET 010까지 동일한 형태로 이어짐)

규칙: 헤더 3줄(LEVEL/CHAPTER_ID/TITLE) 다음 빈 줄, 그다음 SET 001~010을 오름차순으로. 각 SET 블록은 정확히 6줄, 화자 라벨(A:/B:)과 함께 A B A B A B 순서. 세트 사이엔 빈 줄 하나. JSON·중괄호·대괄호·코드펜스·설명 등 이 형식 외의 것은 출력하지 않는다.

자체 확인: TITLE/60문장 비어있지 않음, SET이 001~010 오름차순으로 정확히 10개, A/B 순서 고정, TITLE이 4장 표와 일치, 상황 다양성, 질문-응답 완결, 성별 일치 정확(해당 언어라면), 격식 혼용 없음, 12장 텍스트 형식을 정확히 따름(JSON 아님). 실패 시 재생성.
━━━━━━━━━━━━━━━━━━
15. 절대 금지 사항
━━━━━━━━━━━━━━━━━━

GENERATOR_ES.md 15장과 동일한 구조적 금지사항 + 지역 방언 사용, tu/Lei 혼용, 성별 일치 오류.

━━━━━━━━━━━━━━━━━━
16~18. 실행 명령 / 공용 안내 / 변경 이력
━━━━━━━━━━━━━━━━━━

BATCH_ID 입력 시 즉시 실행 (001~060). 다른 매뉴얼 내용 함께 붙여넣지 않는다.

[v1.0 — GENERATOR_KR.md/GENERATOR_ES.md 구조 기반 신규 작성]
- 60개 챕터 동일 구조 공유, ChapterID 접두어 CONV_IT_, chapter_title 60개 이탈리아어로 신규 창작.
- 화자 이름: Giulia/Sara/Chiara/Elena, Marco/Luca/Matteo/Davide.
- 이탈리아어도 기존 8개 번역 언어 목록에 없으므로 신규 작성. 5-1장 성별 일치 규칙은 GENERATOR_ES.md와 동일한 구조(서술적 형용사·과거분사·직업명 성별 일치)로 이탈리아어 문법에 맞게 재구성.
- 지역 표준을 it-IT로 고정, 지역 방언(나폴리·시칠리아·밀라노 등) 금지.
