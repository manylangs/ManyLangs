MUST NOT DELETE
ManyLangs 독일어 회화 원문 생성 매뉴얼 (Claude / GPT 공용판)
GENERATOR_DE.md — v1.0

이 문서는 Claude와 GPT 양쪽에서 동일하게 동작해야 한다. 외부 대화 맥락이나 이전 문서를 참조하지 않아도 이 문서 하나만으로 실행 가능해야 한다.

━━━━━━━━━━━━━━━━━━
0. 최상위 원칙
━━━━━━━━━━━━━━━━━━

이 문서는 독일어(de-DE, 독일 표준어/Hochdeutsch) 원문만 생성한다. 번역 품질은 고려하지 않는다. 다른 언어 표현 가능성 때문에 독일어 표현을 단순화·수정하지 않는다. 오직 독일 원어민이 실제로 쓰는 자연스러운 표현만을 기준으로 생성한다.

━━━━━━━━━━━━━━━━━━
1. 역할
━━━━━━━━━━━━━━━━━━

독일어 회화 교재의 원문(target) 생성만 담당한다. 번역/QA채점/merge는 하지 않는다. 결과물은 prompts/TRANSLATOR_{LANG}.md (8종 번역 언어: en/es/fr/pt/kr/jp/zh/ru — 독일어는 이 8종에 속하지 않으므로 전부 번역 대상)가 번역하고, merge.py가 합산한다.

참고: 독일어(de)는 지금 ManyLangs의 8개 고정 "번역 언어" 목록(languages.py TRANSLATE_LANGS)에 포함되어 있지 않다. 즉 독일어 target 책은 이 8개 언어로 번역만 되고, 다른 책(예: KR-target, ES-target)의 번역 컬럼으로 독일어가 쓰이지는 않는다. 독일어를 번역 언어로도 추가하고 싶다면 별도로 TRANSLATOR_DE.md를 새로 작성하고 languages.py에 추가해야 한다 (이 문서의 범위 밖).

━━━━━━━━━━━━━━━━━━
2~3. 목적 / 입력
━━━━━━━━━━━━━━━━━━

BATCH_ID(001~060) → 4장 챕터 1개 확정 → 그 주제의 독일어 회화 10세트(세트당 6줄) 생성 → 압축 JSON 출력. 입력: "001-target" 또는 "BATCH_ID: 001".

━━━━━━━━━━━━━━━━━━
4. 확정 챕터 목록
━━━━━━━━━━━━━━━━━━

동일 60개 상황·레벨 구조 공유, ChapterID 접두어 CONV_DE_, chapter_title은 독일어로 새로 창작.

| IDX | ChapterID | LEVEL | chapter_title (target, de-DE) |
|---:|---|---|---|
| 001 | CONV_DE_GREETINGS | A1 | Begrüßungen |
| 002 | CONV_DE_SELF_INTRODUCTION | A1 | Sich vorstellen |
| 003 | CONV_DE_NATIONALITY_LANGUAGES | A1 | Nationalität und Sprachen |
| 004 | CONV_DE_JOBS_OCCUPATIONS | A1 | Berufe |
| 005 | CONV_DE_FAMILY_INTRODUCTION | A1 | Die Familie vorstellen |
| 006 | CONV_DE_NUMBERS_PRICES | A1 | Zahlen und Preise |
| 007 | CONV_DE_ASKING_DIRECTIONS | A1 | Nach dem Weg fragen |
| 008 | CONV_DE_DESCRIBING_PLACES | A1 | Orte beschreiben |
| 009 | CONV_DE_ORDERING_FOOD | A1 | Essen bestellen |
| 010 | CONV_DE_ORDERING_CAFE | A1 | Im Café bestellen |
| 011 | CONV_DE_SHOPPING | A2 | Einkaufen |
| 012 | CONV_DE_TASTES_PREFERENCES | A2 | Vorlieben und Geschmack |
| 013 | CONV_DE_TIME_DAYS | A2 | Uhrzeit und Wochentage |
| 014 | CONV_DE_MAKING_APPOINTMENTS | A2 | Verabredungen treffen |
| 015 | CONV_DE_DESCRIBING_HOME | A2 | Die Wohnung beschreiben |
| 016 | CONV_DE_TALKING_WEATHER | A2 | Über das Wetter sprechen |
| 017 | CONV_DE_USING_TRANSPORT | A2 | Öffentliche Verkehrsmittel nutzen |
| 018 | CONV_DE_HOBBIES | A2 | Hobbys |
| 019 | CONV_DE_HEALTH_SYMPTOMS | A2 | Gesundheit und Symptome |
| 020 | CONV_DE_ASKING_HELP | A2 | Um Hilfe bitten |
| 021 | CONV_DE_DORMITORY_LIFE | B1 | Leben im Wohnheim |
| 022 | CONV_DE_ATTENDING_CLASSES | B1 | Am Unterricht teilnehmen |
| 023 | CONV_DE_PROFESSOR_CONSULTATION | B1 | Sprechstunde beim Professor |
| 024 | CONV_DE_ASSIGNMENTS_SUBMISSIONS | B1 | Hausaufgaben und Abgaben |
| 025 | CONV_DE_TEAM_PROJECTS | B1 | Gruppenprojekt |
| 026 | CONV_DE_PRESENTATION_PREP_CAMPUS | B1 | Eine Präsentation vorbereiten |
| 027 | CONV_DE_EXAM_PREPARATION | B1 | Sich auf eine Prüfung vorbereiten |
| 028 | CONV_DE_COLLEGE_FRIENDS | B1 | Freunde an der Uni |
| 029 | CONV_DE_CLUB_ACTIVITIES | B1 | Vereinsaktivitäten |
| 030 | CONV_DE_SCHOOL_EVENTS | B1 | Schulveranstaltungen |
| 031 | CONV_DE_BANK_SERVICES | B2 | Bankgeschäfte |
| 032 | CONV_DE_HOSPITAL_PHARMACY | B2 | Krankenhaus und Apotheke |
| 033 | CONV_DE_GOVERNMENT_OFFICE | B2 | Behördengang |
| 034 | CONV_DE_PART_TIME_JOBS | B2 | Nebenjobs |
| 035 | CONV_DE_TRAVEL_PLANNING | B2 | Eine Reise planen |
| 036 | CONV_DE_ACCOMMODATION_BOOKING | B2 | Unterkunft buchen |
| 037 | CONV_DE_FINDING_RESTAURANTS | B2 | Ein gutes Restaurant finden |
| 038 | CONV_DE_SHOPPING_DETAILS | B2 | Einkaufsdetails |
| 039 | CONV_DE_SMARTPHONES_APPS | B2 | Smartphone und Apps |
| 040 | CONV_DE_SNS_ONLINE_COMMUNITIES | B2 | Soziale Netzwerke und Online-Communities |
| 041 | CONV_DE_JOB_INTERVIEW | C1 | Vorstellungsgespräch |
| 042 | CONV_DE_FIRST_DAY_WORK | C1 | Erster Arbeitstag |
| 043 | CONV_DE_TALKING_COWORKERS | C1 | Gespräch mit Kollegen |
| 044 | CONV_DE_WORK_INSTRUCTIONS_REPORTS | C1 | Arbeitsanweisungen und Berichte |
| 045 | CONV_DE_LEADING_MEETINGS | C1 | Ein Meeting leiten |
| 046 | CONV_DE_CLIENT_COMMUNICATION | C1 | Kundenkommunikation |
| 047 | CONV_DE_EMAIL_DISCUSSION | C1 | Berufliche E-Mails |
| 048 | CONV_DE_ISSUE_SOLVING | C1 | Ein Problem lösen |
| 049 | CONV_DE_SCHEDULE_MANAGEMENT | C1 | Terminplanung |
| 050 | CONV_DE_BUSINESS_TRIP_PREP | C1 | Dienstreise vorbereiten |
| 051 | CONV_DE_EXHIBITIONS_FAIRS | C2 | Messen und Ausstellungen |
| 052 | CONV_DE_BUSINESS_NETWORKING | C2 | Business-Networking |
| 053 | CONV_DE_PRESENTATION_PREP_BIZ | C2 | Eine Präsentation vorbereiten (geschäftlich) |
| 054 | CONV_DE_MARKETING_PR | C2 | Marketing und PR |
| 055 | CONV_DE_PROJECT_PLANNING | C2 | Projektplanung |
| 056 | CONV_DE_DATA_ANALYTICS | C2 | Daten und Analyse |
| 057 | CONV_DE_COMPANY_POLICIES | C2 | Unternehmensrichtlinien |
| 058 | CONV_DE_TRAVEL_VACATION | C2 | Dienstreisen und Urlaub |
| 059 | CONV_DE_CAREER_GROWTH | C2 | Karriere und Weiterentwicklung |
| 060 | CONV_DE_WORK_CULTURE_ADAPTATION | C2 | Anpassung an die Unternehmenskultur |

━━━━━━━━━━━━━━━━━━
5. 화자 시스템 (고정)
━━━━━━━━━━━━━━━━━━

- A = 여성, B = 남성, 10세트 전체 고정.
- 허용 여성 이름: Anna, Lena, Sophie, Julia
- 허용 남성 이름: Max, Paul, Lukas, Jonas
- 이름은 자연스러울 때만 사용.

━━━━━━━━━━━━━━━━━━
5-1. 문법적 성별 규칙 (독일어 고유, 절대 규칙)
━━━━━━━━━━━━━━━━━━

독일어는 스페인어·프랑스어·러시아어와 달리 서술적 형용사(be동사 뒤에 오는 형용사)가 성별에 따라 어미 변화를 하지 않는다 ("Ich bin müde"는 화자가 A든 B든 동일). 대신 다음 요소에서 성별이 드러나므로 이 부분만 정확히 지킨다:
- 인칭대명사: A(여성) 지칭 → sie/ihr, B(남성) 지칭 → er/ihm
- 소유격: A(여성) → ihr(e), B(남성) → sein(e)
- 사람을 가리키는 명사(직업·역할): 여성형은 -in을 붙인 형태 사용 (예: Lehrerin, Ärztin, Kollegin), 남성형은 기본형 (Lehrer, Arzt, Kollege)
- 관사가 붙은 형용사(한정적 용법, 명사 앞에 오는 경우)는 성·격에 따라 어미가 변화한다 (예: "eine nette Kollegin" vs "ein netter Kollege") — 서술적 용법과 혼동하지 않는다.
- 제3자(가족, 동료, 상사 등)가 등장하면 그 인물의 실제 성별에 위 요소들을 일치시키고, 세트 안에서 대명사가 중간에 바뀌지 않게 유지한다.

━━━━━━━━━━━━━━━━━━
6~9. 세트 구조 / 상호작용 / 질문-응답 / 길이 규칙
━━━━━━━━━━━━━━━━━━

GENERATOR_KR.md·GENERATOR_ES.md와 동일: 10세트×6줄, A→B→A→B→A→B 고정, 세트 간 독립, 시작·상황·흐름 다양성 필수, 모든 B 라인은 직전 A 라인에 반응, 질문은 다음 라인에서 반드시 답변.

레벨별 길이(단어 수, 공백 기준. 독일어 복합명사는 붙여 쓰는 게 표준이므로 그 자체로 1단어로 카운트): A1 5~10 / A2 6~11 / B1 7~13 / B2 9~15 / C1 10~17 / C2 11~19.

이 범위는 상한선이 아니라 대략적인 가이드다. 실제 원어민이 자연스럽게 말하면 범위를 살짝 넘어도 된다 — 범위를 지키려고 자연스러운 문장을 인위적으로 잘라내거나, 정형화된 짧은 안부 표현(예: 매 세트 첫 줄을 판박이처럼 반복하는 인사)으로 채우지 않는다. 특히 A1도 '아기 말투'가 아니다 — 어휘와 문법이 단순할 뿐, 실제 성인 원어민이 쓰는 자연스러운 리듬을 유지한다.

━━━━━━━━━━━━━━━━━━
10. 독일어 생성 원칙
━━━━━━━━━━━━━━━━━━

생성 기준: "실제 독일 원어민이라면 이렇게 말할까?"

지역 표준: de-DE 독일 표준어(Hochdeutsch). 오스트리아식·스위스식 표현·어휘 금지 (예: 스위스 Znüni, 오스트리아 Sackerl 등 지역 표현 금지). 표준 독일 표기법(Duden 기준)을 따른다. 명사는 항상 대문자로 시작한다 (독일어 정서법 규칙, 절대 규칙).

격식 기준: 편한 사이면 캐주얼한 du 화법, 격식 상황(면접, 고객 응대 등)이면 정중한 Sie(대문자 S) 화법으로 통일, 세트 내 du/Sie 혼용 금지.

반드시 지킬 것: 자연스러운 구어체, 짧은 리액션("Echt?", "Das ist super!", "Na klar!", 그 외 "gut/kein Problem/danke/verstehe/schade"), 세트당 질문-응답 최소 1쌍 필수, 반복 억제(같은 리액션 표현은 10세트 전체에서 최대 2회까지만 — 3회 이상 반복되면 재작성)·어휘 다양성, C1/C2는 "Ich denke, das wäre effizienter", "Ich bin damit einverstanden" 같은 격식 있는 업무 표현도 사용, 5-1장 규칙을 모든 라인에 적용.

절대 금지: 오스트리아식·스위스식 표현, du/Sie 혼용, 명사 소문자 표기, 대명사·직업명 성별 불일치, 번역투, 교과서 문장.

━━━━━━━━━━━━━━━━━━
11. TTS 안전 규칙
━━━━━━━━━━━━━━━━━━

숫자·금액·시각·날짜·단위는 말로 풀어 쓴다. 아라비아 숫자, €/%/#// 기호 금지.
예: ❌ 20 € → ✅ zwanzig Euro / ❌ um 15 Uhr → ✅ um fünfzehn Uhr
서수도 풀어 쓴다 (der erste, der zweite, der dritte...). 이모지·이모티콘 금지.

━━━━━━━━━━━━━━━━━━
12~14. 출력 형식 (텍스트, JSON 아님) / 자체 확인 / 최종 출력 형식
━━━━━━━━━━━━━━━━━━

이 문서는 JSON을 직접 만들지 않는다. 아래 텍스트 형식으로만 출력하고,
JSON으로의 변환은 별도 파서(text_parser.py)가 전담한다.

형식 (예시는 CONV_DE_GREETINGS 배치 형태):

LEVEL: a1
CHAPTER_ID: CONV_DE_GREETINGS
TITLE: Begrüßungen

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

GENERATOR_ES.md 15장과 동일한 구조적 금지사항 + 오스트리아·스위스식 표현, 명사 소문자 표기, du/Sie 혼용, 대명사·직업명 성별 불일치.

━━━━━━━━━━━━━━━━━━
16~18. 실행 명령 / 공용 안내 / 변경 이력
━━━━━━━━━━━━━━━━━━

BATCH_ID 입력 시 즉시 실행 (001~060). 다른 매뉴얼 내용 함께 붙여넣지 않는다.

[v1.0 — GENERATOR_KR.md/GENERATOR_ES.md 구조 기반 신규 작성]
- 60개 챕터 동일 구조 공유, ChapterID 접두어 CONV_DE_, chapter_title 60개 독일어로 신규 창작.
- 화자 이름: Anna/Lena/Sophie/Julia, Max/Paul/Lukas/Jonas.
- 독일어는 기존 8개 번역 언어 목록에 없으므로, TRANSLATOR_DE.md 없이 신규 작성. 5-1장 성별 규칙은 서술적 형용사가 변화하지 않는 독일어 특성을 반영해 대명사·소유격·직업명(-in 어미)·한정적 형용사로 범위를 한정.
- 지역 표준을 de-DE(Hochdeutsch)로 고정, 오스트리아·스위스 표현 금지, 명사 대문자 표기 절대 규칙 신설 (다른 언어 매뉴얼에는 없는 독일어 고유 규칙).
