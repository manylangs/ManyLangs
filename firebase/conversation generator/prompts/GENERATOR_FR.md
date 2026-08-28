MUST NOT DELETE
ManyLangs 프랑스어 회화 원문 생성 매뉴얼 (Claude / GPT 공용판)
GENERATOR_FR.md — v1.0

이 문서는 Claude와 GPT 양쪽에서 동일하게 동작해야 한다. 외부 대화 맥락이나 이전 문서를 참조하지 않아도 이 문서 하나만으로 실행 가능해야 한다.

━━━━━━━━━━━━━━━━━━
0. 최상위 원칙
━━━━━━━━━━━━━━━━━━

이 문서는 프랑스어(fr-FR, 프랑스 본토 표준어) 원문만 생성한다. 번역 품질은 고려하지 않는다. 다른 언어 표현 가능성 때문에 프랑스어 표현을 단순화·수정하지 않는다. 오직 프랑스 본토 원어민이 실제로 쓰는 자연스러운 표현만을 기준으로 생성한다.

━━━━━━━━━━━━━━━━━━
1. 역할
━━━━━━━━━━━━━━━━━━

프랑스어 회화 교재의 원문(target) 생성만 담당한다. 번역/QA채점/merge는 하지 않는다. 결과물은 prompts/TRANSLATOR_{LANG}.md (FR 제외 나머지)가 번역하고 merge.py가 합산한다.

━━━━━━━━━━━━━━━━━━
2~3. 목적 / 입력
━━━━━━━━━━━━━━━━━━

BATCH_ID(001~060) → 4장 챕터 1개 확정 → 그 주제의 프랑스어 회화 10세트(세트당 6줄) 생성 → 압축 JSON 출력. 입력: "001-target" 또는 "BATCH_ID: 001".

━━━━━━━━━━━━━━━━━━
4. 확정 챕터 목록
━━━━━━━━━━━━━━━━━━

동일 60개 상황·레벨 구조 공유, ChapterID 접두어 CONV_FR_, chapter_title은 프랑스어로 새로 창작.

| IDX | ChapterID | LEVEL | chapter_title (target, fr-FR) |
|---:|---|---|---|
| 001 | CONV_FR_GREETINGS | A1 | Salutations |
| 002 | CONV_FR_SELF_INTRODUCTION | A1 | Se présenter |
| 003 | CONV_FR_NATIONALITY_LANGUAGES | A1 | Nationalité et langues |
| 004 | CONV_FR_JOBS_OCCUPATIONS | A1 | Professions |
| 005 | CONV_FR_FAMILY_INTRODUCTION | A1 | Présenter sa famille |
| 006 | CONV_FR_NUMBERS_PRICES | A1 | Nombres et prix |
| 007 | CONV_FR_ASKING_DIRECTIONS | A1 | Demander son chemin |
| 008 | CONV_FR_DESCRIBING_PLACES | A1 | Décrire un lieu |
| 009 | CONV_FR_ORDERING_FOOD | A1 | Commander à manger |
| 010 | CONV_FR_ORDERING_CAFE | A1 | Commander au café |
| 011 | CONV_FR_SHOPPING | A2 | Faire du shopping |
| 012 | CONV_FR_TASTES_PREFERENCES | A2 | Goûts et préférences |
| 013 | CONV_FR_TIME_DAYS | A2 | L'heure et les jours |
| 014 | CONV_FR_MAKING_APPOINTMENTS | A2 | Prendre rendez-vous |
| 015 | CONV_FR_DESCRIBING_HOME | A2 | Décrire son logement |
| 016 | CONV_FR_TALKING_WEATHER | A2 | Parler du temps |
| 017 | CONV_FR_USING_TRANSPORT | A2 | Prendre les transports |
| 018 | CONV_FR_HOBBIES | A2 | Loisirs |
| 019 | CONV_FR_HEALTH_SYMPTOMS | A2 | Santé et symptômes |
| 020 | CONV_FR_ASKING_HELP | A2 | Demander de l'aide |
| 021 | CONV_FR_DORMITORY_LIFE | B1 | Vie en résidence universitaire |
| 022 | CONV_FR_ATTENDING_CLASSES | B1 | Assister à un cours |
| 023 | CONV_FR_PROFESSOR_CONSULTATION | B1 | Rendez-vous avec un professeur |
| 024 | CONV_FR_ASSIGNMENTS_SUBMISSIONS | B1 | Devoirs et rendus |
| 025 | CONV_FR_TEAM_PROJECTS | B1 | Projet de groupe |
| 026 | CONV_FR_PRESENTATION_PREP_CAMPUS | B1 | Préparer un exposé |
| 027 | CONV_FR_EXAM_PREPARATION | B1 | Préparer un examen |
| 028 | CONV_FR_COLLEGE_FRIENDS | B1 | Amis de fac |
| 029 | CONV_FR_CLUB_ACTIVITIES | B1 | Activités associatives |
| 030 | CONV_FR_SCHOOL_EVENTS | B1 | Événements scolaires |
| 031 | CONV_FR_BANK_SERVICES | B2 | Opérations bancaires |
| 032 | CONV_FR_HOSPITAL_PHARMACY | B2 | Hôpital et pharmacie |
| 033 | CONV_FR_GOVERNMENT_OFFICE | B2 | Administration |
| 034 | CONV_FR_PART_TIME_JOBS | B2 | Petits boulots |
| 035 | CONV_FR_TRAVEL_PLANNING | B2 | Préparer un voyage |
| 036 | CONV_FR_ACCOMMODATION_BOOKING | B2 | Réserver un logement |
| 037 | CONV_FR_FINDING_RESTAURANTS | B2 | Trouver un bon restaurant |
| 038 | CONV_FR_SHOPPING_DETAILS | B2 | Détails d'un achat |
| 039 | CONV_FR_SMARTPHONES_APPS | B2 | Smartphone et applications |
| 040 | CONV_FR_SNS_ONLINE_COMMUNITIES | B2 | Réseaux sociaux et communautés en ligne |
| 041 | CONV_FR_JOB_INTERVIEW | C1 | Entretien d'embauche |
| 042 | CONV_FR_FIRST_DAY_WORK | C1 | Premier jour de travail |
| 043 | CONV_FR_TALKING_COWORKERS | C1 | Discuter avec des collègues |
| 044 | CONV_FR_WORK_INSTRUCTIONS_REPORTS | C1 | Consignes et comptes rendus |
| 045 | CONV_FR_LEADING_MEETINGS | C1 | Diriger une réunion |
| 046 | CONV_FR_CLIENT_COMMUNICATION | C1 | Relation client |
| 047 | CONV_FR_EMAIL_DISCUSSION | C1 | E-mails professionnels |
| 048 | CONV_FR_ISSUE_SOLVING | C1 | Résoudre un problème |
| 049 | CONV_FR_SCHEDULE_MANAGEMENT | C1 | Gestion de l'agenda |
| 050 | CONV_FR_BUSINESS_TRIP_PREP | C1 | Préparer un déplacement professionnel |
| 051 | CONV_FR_EXHIBITIONS_FAIRS | C2 | Salons et expositions |
| 052 | CONV_FR_BUSINESS_NETWORKING | C2 | Réseautage professionnel |
| 053 | CONV_FR_PRESENTATION_PREP_BIZ | C2 | Préparer un exposé (professionnel) |
| 054 | CONV_FR_MARKETING_PR | C2 | Marketing et communication |
| 055 | CONV_FR_PROJECT_PLANNING | C2 | Planification de projet |
| 056 | CONV_FR_DATA_ANALYTICS | C2 | Données et analyse |
| 057 | CONV_FR_COMPANY_POLICIES | C2 | Politiques de l'entreprise |
| 058 | CONV_FR_TRAVEL_VACATION | C2 | Déplacements et congés |
| 059 | CONV_FR_CAREER_GROWTH | C2 | Évolution de carrière |
| 060 | CONV_FR_WORK_CULTURE_ADAPTATION | C2 | S'adapter à la culture d'entreprise |

━━━━━━━━━━━━━━━━━━
5. 화자 시스템 (고정)
━━━━━━━━━━━━━━━━━━

- A = 여성, B = 남성, 10세트 전체 고정.
- 허용 여성 이름: Camille, Léa, Manon, Chloé
- 허용 남성 이름: Lucas, Hugo, Thomas, Antoine
- 이름은 자연스러울 때만 사용.

━━━━━━━━━━━━━━━━━━
5-1. 문법적 성별 일치 규칙 (프랑스어 고유, 절대 규칙)
━━━━━━━━━━━━━━━━━━

TRANSLATOR_FR.md의 성별 일치 규칙을 생성 단계로 이식한다.
- A(여성) 자신/A 지칭 → 여성형 (예: "tu es fatiguée ?", "je suis contente")
- B(남성) 자신/B 지칭 → 남성형 (예: "tu es fatigué ?", "je suis content")
- 제3자(가족, 동료, 상사 등)가 등장하면 그 인물의 실제 성별에 형용사·과거분사·직업명(professeur/professeure 등)을 일치시키고, 세트 안에서 중간에 성별 표지가 바뀌지 않게 유지한다.

━━━━━━━━━━━━━━━━━━
6~9. 세트 구조 / 상호작용 / 질문-응답 / 길이 규칙
━━━━━━━━━━━━━━━━━━

GENERATOR_KR.md·GENERATOR_ES.md와 동일: 10세트×6줄, A→B→A→B→A→B 고정, 세트 간 독립, 시작·상황·흐름 다양성 필수, 모든 B 라인은 직전 A 라인에 반응, 질문은 다음 라인에서 반드시 답변.

A1/A2에서는 부자연스러운 도치 의문문("Vas-tu bien ?" 류)을 금지하고 est-ce que 의문문이나 억양 의문문(문장+? )을 우선한다.

레벨별 길이(단어 수, 공백 기준, 관사·전치사 포함): A1 5~10 / A2 6~11 / B1 7~13 / B2 9~15 / C1 10~17 / C2 11~19.

이 범위는 상한선이 아니라 대략적인 가이드다. 실제 원어민이 자연스럽게 말하면 범위를 살짝 넘어도 된다 — 범위를 지키려고 자연스러운 문장을 인위적으로 잘라내거나, 정형화된 짧은 안부 표현(예: 매 세트 첫 줄을 판박이처럼 반복하는 인사)으로 채우지 않는다. 특히 A1도 '아기 말투'가 아니다 — 어휘와 문법이 단순할 뿐, 실제 성인 원어민이 쓰는 자연스러운 리듬을 유지한다.

━━━━━━━━━━━━━━━━━━
10. 프랑스어 생성 원칙
━━━━━━━━━━━━━━━━━━

생성 기준: "실제 프랑스 원어민이라면 이렇게 말할까?"

지역 표준: fr-FR 프랑스 본토 표준어. 캐나다 프랑스어(퀘벡식) 표현·어휘·문법 금지.

격식 기준: 편한 사이면 tu, 격식 상황(면접, 고객 응대 등)이면 vous로 통일, 세트 내 tu/vous 혼용 금지.

반드시 지킬 것: 자연스러운 구어체, 짧은 리액션("Ah bon ?", "C'est super !", "Carrément !", 그 외 "d'accord/pas de souci/merci/je vois/tant mieux"), 세트당 질문-응답 최소 1쌍 필수, 반복 억제(같은 리액션 표현은 10세트 전체에서 최대 2회까지만 — 3회 이상 반복되면 재작성)·어휘 다양성(aimer만 반복 않고 préférer/adorer/plaire 등 사용), C1/C2는 "Je pense que ce serait plus efficace", "Je suis d'accord avec ce point" 같은 격식 표현도 사용, 5-1장 성별 일치를 모든 라인에 적용.

절대 금지: 퀘벡식 표현, 부자연스러운 도치 의문문(A1/A2), tu/vous 혼용, 성별 일치 오류, 번역투, 교과서 문장.

━━━━━━━━━━━━━━━━━━
11. TTS 안전 규칙
━━━━━━━━━━━━━━━━━━

숫자·금액·시각·날짜·단위는 말로 풀어 쓴다. 아라비아 숫자, €/%/#// 기호 금지.
예: ❌ 20 € → ✅ vingt euros / ❌ à 3 heures → ✅ à trois heures
서수도 풀어 쓴다 (premier, deuxième, troisième...). 이모지·이모티콘 금지.

━━━━━━━━━━━━━━━━━━
12~14. 출력 형식 (텍스트, JSON 아님) / 자체 확인 / 최종 출력 형식
━━━━━━━━━━━━━━━━━━

이 문서는 JSON을 직접 만들지 않는다. 아래 텍스트 형식으로만 출력하고,
JSON으로의 변환은 별도 파서(text_parser.py)가 전담한다.

형식 (예시는 CONV_FR_GREETINGS 배치 형태):

LEVEL: a1
CHAPTER_ID: CONV_FR_GREETINGS
TITLE: Salutations

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

GENERATOR_ES.md 15장과 동일한 구조적 금지사항 + 퀘벡식 표현, A1/A2 도치 의문문, tu/vous 혼용, 성별 일치 오류.

━━━━━━━━━━━━━━━━━━
16~18. 실행 명령 / 공용 안내 / 변경 이력
━━━━━━━━━━━━━━━━━━

BATCH_ID 입력 시 즉시 실행 (001~060). 다른 매뉴얼 내용 함께 붙여넣지 않는다.

[v1.0 — GENERATOR_KR.md/GENERATOR_ES.md 구조 기반 신규 작성]
- 60개 챕터 동일 구조 공유, ChapterID 접두어 CONV_FR_, chapter_title 60개 프랑스어로 신규 창작.
- 화자 이름: Camille/Léa/Manon/Chloé, Lucas/Hugo/Thomas/Antoine.
- TRANSLATOR_FR.md(v1.1)의 성별 일치 규칙(6장)과 지역 표준(fr-FR, 퀘벡 금지)·A1/A2 도치 의문문 금지 규칙(7장)을 원문 생성 단계로 이식.
