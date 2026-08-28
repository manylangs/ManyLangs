MUST NOT DELETE
ManyLangs 포르투갈어 회화 원문 생성 매뉴얼 (Claude / GPT 공용판)
GENERATOR_PT.md — v1.0

이 문서는 Claude와 GPT 양쪽에서 동일하게 동작해야 한다. 외부 대화 맥락이나 이전 문서를 참조하지 않아도 이 문서 하나만으로 실행 가능해야 한다.

━━━━━━━━━━━━━━━━━━
0. 최상위 원칙
━━━━━━━━━━━━━━━━━━

이 문서는 포르투갈어(pt-BR, 브라질 표준어) 원문만 생성한다. 번역 품질은 고려하지 않는다. 다른 언어 표현 가능성 때문에 포르투갈어 표현을 단순화·수정하지 않는다. 오직 브라질 원어민이 실제로 쓰는 자연스러운 표현만을 기준으로 생성한다.

━━━━━━━━━━━━━━━━━━
1. 역할
━━━━━━━━━━━━━━━━━━

포르투갈어 회화 교재의 원문(target) 생성만 담당한다. 번역/QA채점/merge는 하지 않는다. 결과물은 prompts/TRANSLATOR_{LANG}.md (PT 제외 나머지 en/es/fr/kr/jp/zh/ru)가 번역하고 merge.py가 합산한다. TRANSLATOR_PT.md(v2.0)도 이미 pt-BR 표준이므로, 다른 책(KR-target/ES-target 등)의 pt 번역 컬럼과 이 책의 pt 원문 모두 같은 pt-BR 하나로 통일된다.

━━━━━━━━━━━━━━━━━━
2~3. 목적 / 입력
━━━━━━━━━━━━━━━━━━

BATCH_ID(001~060) → 4장 챕터 1개 확정 → 그 주제의 포르투갈어 회화 10세트(세트당 6줄) 생성 → 압축 JSON 출력. 입력: "001-target" 또는 "BATCH_ID: 001".

━━━━━━━━━━━━━━━━━━
4. 확정 챕터 목록
━━━━━━━━━━━━━━━━━━

동일 60개 상황·레벨 구조 공유, ChapterID 접두어 CONV_PT_, chapter_title은 브라질 포르투갈어로 새로 창작.

| IDX | ChapterID | LEVEL | chapter_title (target, pt-BR) |
|---:|---|---|---|
| 001 | CONV_PT_GREETINGS | A1 | Cumprimentos |
| 002 | CONV_PT_SELF_INTRODUCTION | A1 | Apresentar-se |
| 003 | CONV_PT_NATIONALITY_LANGUAGES | A1 | Nacionalidade e idiomas |
| 004 | CONV_PT_JOBS_OCCUPATIONS | A1 | Profissões |
| 005 | CONV_PT_FAMILY_INTRODUCTION | A1 | Apresentar a família |
| 006 | CONV_PT_NUMBERS_PRICES | A1 | Números e preços |
| 007 | CONV_PT_ASKING_DIRECTIONS | A1 | Perguntar o caminho |
| 008 | CONV_PT_DESCRIBING_PLACES | A1 | Descrever um lugar |
| 009 | CONV_PT_ORDERING_FOOD | A1 | Pedir comida |
| 010 | CONV_PT_ORDERING_CAFE | A1 | Pedir no café |
| 011 | CONV_PT_SHOPPING | A2 | Fazer compras |
| 012 | CONV_PT_TASTES_PREFERENCES | A2 | Gostos e preferências |
| 013 | CONV_PT_TIME_DAYS | A2 | As horas e os dias |
| 014 | CONV_PT_MAKING_APPOINTMENTS | A2 | Marcar um encontro |
| 015 | CONV_PT_DESCRIBING_HOME | A2 | Descrever a casa |
| 016 | CONV_PT_TALKING_WEATHER | A2 | Falar sobre o tempo |
| 017 | CONV_PT_USING_TRANSPORT | A2 | Usar o transporte público |
| 018 | CONV_PT_HOBBIES | A2 | Hobbies |
| 019 | CONV_PT_HEALTH_SYMPTOMS | A2 | Saúde e sintomas |
| 020 | CONV_PT_ASKING_HELP | A2 | Pedir ajuda |
| 021 | CONV_PT_DORMITORY_LIFE | B1 | Vida na moradia estudantil |
| 022 | CONV_PT_ATTENDING_CLASSES | B1 | Assistir às aulas |
| 023 | CONV_PT_PROFESSOR_CONSULTATION | B1 | Conversa com o professor |
| 024 | CONV_PT_ASSIGNMENTS_SUBMISSIONS | B1 | Trabalhos e entregas |
| 025 | CONV_PT_TEAM_PROJECTS | B1 | Projeto em grupo |
| 026 | CONV_PT_PRESENTATION_PREP_CAMPUS | B1 | Preparar uma apresentação |
| 027 | CONV_PT_EXAM_PREPARATION | B1 | Preparar uma prova |
| 028 | CONV_PT_COLLEGE_FRIENDS | B1 | Amigos da faculdade |
| 029 | CONV_PT_CLUB_ACTIVITIES | B1 | Atividades de grêmio |
| 030 | CONV_PT_SCHOOL_EVENTS | B1 | Eventos escolares |
| 031 | CONV_PT_BANK_SERVICES | B2 | Serviços bancários |
| 032 | CONV_PT_HOSPITAL_PHARMACY | B2 | Hospital e farmácia |
| 033 | CONV_PT_GOVERNMENT_OFFICE | B2 | Repartição pública |
| 034 | CONV_PT_PART_TIME_JOBS | B2 | Trabalho de meio período |
| 035 | CONV_PT_TRAVEL_PLANNING | B2 | Planejar uma viagem |
| 036 | CONV_PT_ACCOMMODATION_BOOKING | B2 | Reservar hospedagem |
| 037 | CONV_PT_FINDING_RESTAURANTS | B2 | Encontrar um bom restaurante |
| 038 | CONV_PT_SHOPPING_DETAILS | B2 | Detalhes de uma compra |
| 039 | CONV_PT_SMARTPHONES_APPS | B2 | Celular e aplicativos |
| 040 | CONV_PT_SNS_ONLINE_COMMUNITIES | B2 | Redes sociais e comunidades online |
| 041 | CONV_PT_JOB_INTERVIEW | C1 | Entrevista de emprego |
| 042 | CONV_PT_FIRST_DAY_WORK | C1 | Primeiro dia de trabalho |
| 043 | CONV_PT_TALKING_COWORKERS | C1 | Conversa com colegas |
| 044 | CONV_PT_WORK_INSTRUCTIONS_REPORTS | C1 | Instruções e relatórios |
| 045 | CONV_PT_LEADING_MEETINGS | C1 | Conduzir uma reunião |
| 046 | CONV_PT_CLIENT_COMMUNICATION | C1 | Atendimento ao cliente |
| 047 | CONV_PT_EMAIL_DISCUSSION | C1 | E-mails de trabalho |
| 048 | CONV_PT_ISSUE_SOLVING | C1 | Resolver um problema |
| 049 | CONV_PT_SCHEDULE_MANAGEMENT | C1 | Gestão da agenda |
| 050 | CONV_PT_BUSINESS_TRIP_PREP | C1 | Preparar uma viagem de negócios |
| 051 | CONV_PT_EXHIBITIONS_FAIRS | C2 | Feiras e exposições |
| 052 | CONV_PT_BUSINESS_NETWORKING | C2 | Networking profissional |
| 053 | CONV_PT_PRESENTATION_PREP_BIZ | C2 | Preparar uma apresentação (empresarial) |
| 054 | CONV_PT_MARKETING_PR | C2 | Marketing e relações públicas |
| 055 | CONV_PT_PROJECT_PLANNING | C2 | Planejamento de projeto |
| 056 | CONV_PT_DATA_ANALYTICS | C2 | Dados e análise |
| 057 | CONV_PT_COMPANY_POLICIES | C2 | Políticas da empresa |
| 058 | CONV_PT_TRAVEL_VACATION | C2 | Viagens de trabalho e férias |
| 059 | CONV_PT_CAREER_GROWTH | C2 | Carreira e crescimento |
| 060 | CONV_PT_WORK_CULTURE_ADAPTATION | C2 | Adaptação à cultura da empresa |

━━━━━━━━━━━━━━━━━━
5. 화자 시스템 (고정)
━━━━━━━━━━━━━━━━━━

- A = 여성, B = 남성, 10세트 전체 고정.
- 허용 여성 이름: Ana, Beatriz, Camila, Fernanda
- 허용 남성 이름: Lucas, Gabriel, Rafael, Felipe
- 이름은 자연스러울 때만 사용.

━━━━━━━━━━━━━━━━━━
5-1. 문법적 성별 일치 규칙 (포르투갈어 고유, 절대 규칙)
━━━━━━━━━━━━━━━━━━

TRANSLATOR_PT.md(v2.0)의 성별 일치 규칙을 생성 단계로 이식한다.
- A(여성) 자신/A 지칭 → 여성형 (예: "você está cansada?", "estou pronta")
- B(남성) 자신/B 지칭 → 남성형 (예: "você está cansado?", "estou pronto")
- 2인칭은 항상 você를 3인칭 단수로 활용한다 (está/fica/tem 등). 지역별로 활용이 갈리는 tu는 사용하지 않는다.
- 제3자(가족, 동료, 상사 등)가 등장하면 그 인물의 실제 성별에 형용사·과거분사·직업명(professor/professora, enfermeiro/enfermeira 등)을 일치시키고, 세트 안에서 중간에 성별 표지가 바뀌지 않게 유지한다. 가족 호칭(irmão/irmã 등)도 화자 기준이 아니라 그 가족 구성원 본인의 성별로 정한다.

━━━━━━━━━━━━━━━━━━
6~9. 세트 구조 / 상호작용 / 질문-응답 / 길이 규칙
━━━━━━━━━━━━━━━━━━

GENERATOR_KR.md·GENERATOR_ES.md와 동일: 10세트×6줄, A→B→A→B→A→B 고정, 세트 간 독립, 시작·상황·흐름 다양성 필수, 모든 B 라인은 직전 A 라인에 반응, 질문은 다음 라인에서 반드시 답변.

레벨별 길이(단어 수, 공백 기준, 관사·전치사 포함): A1 5~10 / A2 6~11 / B1 7~13 / B2 9~15 / C1 10~17 / C2 11~19.

이 범위는 상한선이 아니라 대략적인 가이드다. 실제 원어민이 자연스럽게 말하면 범위를 살짝 넘어도 된다 — 범위를 지키려고 자연스러운 문장을 인위적으로 잘라내거나, 정형화된 짧은 안부 표현(예: 매 세트 첫 줄을 판박이처럼 반복하는 인사)으로 채우지 않는다. 특히 A1도 '아기 말투'가 아니다 — 어휘와 문법이 단순할 뿐, 실제 성인 원어민이 쓰는 자연스러운 리듬을 유지한다.

━━━━━━━━━━━━━━━━━━
10. 포르투갈어 생성 원칙
━━━━━━━━━━━━━━━━━━

생성 기준: "실제 브라질 원어민이라면 이렇게 말할까?"

지역 표준: pt-BR 브라질 표준어. 유럽 포르투갈어 표현·어휘·문법(tu 화법, -as/-és류 2인칭 활용, 유럽식 목적격 대명사 어순 등) 금지.

격식 기준: 편한 사이면 캐주얼한 você 화법(3인칭 단수 활용), 격식 상황(면접, 고객 응대 등)이면 o senhor/a senhora로 통일, 세트 내 혼용 금지.

"왜" 규칙: 의문문 첫머리는 띄어 쓴 "Por que", 독립형/문장 끝은 악센트 붙은 "Por quê", 이유를 설명하는 종속절은 "Porque".

반드시 지킬 것: 자연스러운 구어체, 짧은 리액션("Sério?", "Que legal!", "Com certeza!", 그 외 "beleza/de nada/valeu/entendi/que pena"), 세트당 질문-응답 최소 1쌍 필수, 반복 억제(같은 리액션 표현은 10세트 전체에서 최대 2회까지만 — 3회 이상 반복되면 재작성)·어휘 다양성(gostar만 반복 않고 adorar/preferir 등 사용), C1/C2는 "Acho que seria mais eficiente", "Concordo com esse ponto" 같은 격식 있는 업무 표현도 사용, 5-1장 성별 일치를 모든 라인에 적용.

절대 금지: 유럽 포르투갈어 표현·어휘·문법, você/tu 혼용, "왜" 규칙 위반(유럽식 붙여 쓴 Porque/Porquê 사용), 성별 일치 오류, 번역투, 교과서 문장.

━━━━━━━━━━━━━━━━━━
11. TTS 안전 규칙
━━━━━━━━━━━━━━━━━━

숫자·금액·시각·날짜·단위는 말로 풀어 쓴다. 아라비아 숫자, R$/%/#// 기호 금지.
예: ❌ R$ 20 → ✅ vinte reais / ❌ às 3 → ✅ às três
서수도 풀어 쓴다 (primeiro, segundo, terceiro...). 이모지·이모티콘 금지.

━━━━━━━━━━━━━━━━━━
12~14. 출력 형식 (텍스트, JSON 아님) / 자체 확인 / 최종 출력 형식
━━━━━━━━━━━━━━━━━━

이 문서는 JSON을 직접 만들지 않는다. 아래 텍스트 형식으로만 출력하고,
JSON으로의 변환은 별도 파서(text_parser.py)가 전담한다.

형식 (예시는 CONV_PT_GREETINGS 배치 형태):

LEVEL: a1
CHAPTER_ID: CONV_PT_GREETINGS
TITLE: Cumprimentos

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

GENERATOR_ES.md 15장과 동일한 구조적 금지사항 + 유럽 포르투갈어 표현, você/tu 혼용, "왜" 규칙 위반, 성별 일치 오류.

━━━━━━━━━━━━━━━━━━
16~18. 실행 명령 / 공용 안내 / 변경 이력
━━━━━━━━━━━━━━━━━━

BATCH_ID 입력 시 즉시 실행 (001~060). 다른 매뉴얼 내용 함께 붙여넣지 않는다.

[v1.0 — GENERATOR_KR.md/GENERATOR_ES.md 구조 기반 신규 작성]
- 60개 챕터 동일 구조 공유, ChapterID 접두어 CONV_PT_, chapter_title 60개 브라질 포르투갈어로 신규 창작.
- 화자 이름: Ana/Beatriz/Camila/Fernanda, Lucas/Gabriel/Rafael/Felipe.
- TRANSLATOR_PT.md(v2.0, pt-BR로 전환됨)의 성별 일치 규칙(6장·6-1장), você 3인칭 단수 활용 규칙, "왜" 규칙(7장)을 원문 생성 단계로 이식.
- pt는 이 문서(target 원문)와 TRANSLATOR_PT.md(다른 책의 번역 컬럼) 양쪽 모두 pt-BR로 통일되어, 프로젝트 전체에서 이중 표준 문제가 없다.
