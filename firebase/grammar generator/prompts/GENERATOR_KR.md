# GENERATOR_KR.md — 한국어 문법 target 생성기 (분리 파이프라인 버전)

이 파일은 원본 통합 매뉴얼 `kr_grammar_v6.md`(7개 언어 지원 확장 에디션)에서 파생됐다. conversation 시리즈와 동일한 draft->translate->merge->review 구조로 바꾸기 위해, 원본이 8개 언어 컬럼(target + 7개 보조언어)을 한 번의 JSON 호출로 만들던 것을 target(한국어) 컬럼만 만들도록 분리했다. 나머지 7개 언어는 deepseek_generate.py translate 모드가 승격된 target을 입력으로 삼아 prompts/TRANSLATOR_{LANG}.md를 각각 호출해서 만든다.

## 1. 목적

BATCH_ID 1개를 입력하면 내부적으로 챕터 추출 → GRAMMAR_SPEC 선언 → 초안 작성 → 교정 → QA 검증을 순서대로 수행하고, 6장 형식의 최종 결과만 출력한다. 중간 결과·JSON·설명은 절대 출력하지 않는다. 목표언어(target) = 한국어.

## 2. 입력값

BATCH_ID: {001~210}, 3자리 형식 필수.

## 3. 2. 확정 챕터 목록 (잠금) ━━━━━━━━━━━━━━━━━━ 아래 목록은 절대 변경 금지다. ChapterID / IDX / LEVEL / chapter_title 모두 잠금 상태다. LEVEL은 ChapterID 접두어(A1/A2/B1/B2/C1/C2)로 고정 결정된다. IDX|ChapterID|LEVEL|chapter_title| 001|A1_KO_HANGEUL_BASIC|A1|한글 읽기와 쓰기| 002|A1_KO_COPULA_IDA|A1|이다 / 아니다| 003|A1_KO_EXISTENCE_ITDA|A1|있다 / 없다| 004|A1_KO_SUBJECT_PARTICLE|A1|이/가| 005|A1_KO_TOPIC_PARTICLE|A1|은/는| 006|A1_KO_OBJECT_PARTICLE|A1|을/를| 007|A1_KO_LOCATION_PARTICLE_E|A1|에| 008|A1_KO_LOCATION_PARTICLE_ESEO|A1|에서| 009|A1_KO_DIRECTION_PARTICLE|A1|-(으)로| 010|A1_KO_RECIPIENT_PARTICLE|A1|에게 / 한테| 011|A1_KO_COMITATIVE_PARTICLE|A1|하고 / (이)랑| 012|A1_KO_ADDITIVE_PARTICLE|A1|도| 013|A1_KO_LIMITING_PARTICLE|A1|만| 014|A1_KO_POSSESSIVE_PARTICLE|A1|의| 015|A1_KO_PRESENT_POLITE|A1|-아요/-어요| 016|A1_KO_PRESENT_FORMAL|A1|-습니다/-ㅂ니다| 017|A1_KO_PRESENT_NEGATIVE|A1|안 / -지 않다| 018|A1_KO_PAST_TENSE|A1|-았/었어요| 019|A1_KO_FUTURE_GEOYEYO|A1|-(으)ㄹ 거예요| 020|A1_KO_PROGRESSIVE|A1|-고 있다| 021|A1_KO_IMPERATIVE|A1|-(으)세요| 022|A1_KO_PROPOSITIVE|A1|-(으)ㅂ시다| 023|A1_KO_QUESTION_POLITE|A1|-아요/어요?| 024|A1_KO_WH_QUESTIONS|A1|의문사(누구, 무엇, 어디, 언제, 왜, 어떻게)| 025|A1_KO_NUMBERS_NATIVE|A1|고유어 수| 026|A1_KO_NUMBERS_SINO|A1|한자어 수| 027|A1_KO_COUNTERS|A1|단위 명사(개, 명, 권 등)| 028|A1_KO_DATE_TIME|A1|날짜와 시간 표현| 029|A1_KO_HONORIFIC_BASIC|A1|기본 높임말 -(으)시-| 030|A1_KO_AND_GO|A1|A/V-고 (나열)| 031|A1_KO_AND_THEN|A1|V-아서/어서 (순차)| 032|A1_KO_REASON_BASIC|A1|A/V-아서/어서 (이유)| 033|A1_KO_TRY|A1|V-아/어 보다| 034|A1_KO_CAN|A1|V-(으)ㄹ 수 있다 / 없다| 035|A1_KO_WANT|A1|V-고 싶다| 036|A2_KO_DO_NOT|A2|V-지 말다| 037|A2_KO_HAVE_TO|A2|A/V-아/어야 하다| 038|A2_KO_MAY|A2|A/V-아/어도 되다| 039|A2_KO_MUST_NOT|A2|A/V-(으)면 안 되다| 040|A2_KO_BECAUSE|A2|A/V-기 때문에| 041|A2_KO_SO|A2|A/V-아서/어서 그래서| 042|A2_KO_WHEN|A2|V-(으)ㄹ 때| 043|A2_KO_BEFORE|A2|V-기 전에| 044|A2_KO_AFTER|A2|V-(으)ㄴ 후에 / 뒤에| 045|A2_KO_WHILE|A2|V-는 동안| 046|A2_KO_UNTIL|A2|N까지 / V-까지| 047|A2_KO_FROM|A2|N부터| 048|A2_KO_TO_TRYING|A2|V-아/어 보다 (경험)| 049|A2_KO_INTENTION|A2|V-(으)려고 하다| 050|A2_KO_PLAN|A2|V-(으)ㄹ 예정이다| 051|A2_KO_PROMISE|A2|V-(으)ㄹ게요| 052|A2_KO_SUGGESTION|A2|V-(으)ㄹ까요?| 053|A2_KO_INTENTION2|A2|V-(으)ㄹ래요| 054|A2_KO_REQUEST|A2|V-아/어 주세요| 055|A2_KO_GIVE_BENEFIT|A2|V-아/어 주다| 056|A2_KO_AND_THEN2|A2|V-고 나서| 057|A2_KO_CONNECT_AND|A2|V-(으)면서| 058|A2_KO_CHANGE|A2|A/V-아/어지다| 059|A2_KO_BECOME|A2|V-게 되다| 060|A2_KO_PURPOSE|A2|V-(으)러 가다 / 오다| 061|A2_KO_PURPOSE2|A2|V-기 위해(서)| 062|A2_KO_IF|A2|A/V-(으)면| 063|A2_KO_EVEN_IF|A2|A/V-아/어도| 064|A2_KO_PROHIBITION|A2|V-지 못하다| 065|A2_KO_CANNOT|A2|V-(으)ㄹ 수 없다 (심화)| 066|A2_KO_COMPARISON|A2|A/V-보다| 067|A2_KO_AMONG|A2|N 중에서| 068|A2_KO_TOO|A2|A/V-지만| 069|A2_KO_BUT|A2|A/V-는데| 070|A2_KO_REASON_EXPLAIN|A2|A/V-(으)니까| 071|B1_KO_GUESS_SEEMS|B1|-아/어 보이다| 072|B1_KO_APPEARS|B1|-(으)ㄴ/는 모양이다| 073|B1_KO_ASSUMPTION|B1|-(으)ㄹ 텐데| 074|B1_KO_REASON_ASSUMPTION|B1|-(으)ㄹ 테니까| 075|B1_KO_GUESS_PROBABILITY|B1|-(으)ㄹ걸요| 076|B1_KO_UNCERTAINTY|B1|-(으)ㄹ지도 모르다| 077|B1_KO_HEARSAY|B1|-다고 하다 (간접화법 기초)| 078|B1_KO_QUOTATION_QUESTION|B1|-냐고 하다| 079|B1_KO_QUOTATION_REQUEST|B1|-자고 하다 / -(으)라고 하다| 080|B1_KO_DECISION|B1|-(으)기로 하다| 081|B1_KO_RESOLUTION|B1|-(으)기로 마음먹다| 082|B1_KO_ADVICE|B1|-(으)면 좋겠다| 083|B1_KO_RECOMMEND|B1|-는 게 좋다| 084|B1_KO_RECOLLECTION|B1|-더라고요| 085|B1_KO_RECOLLECTION2|B1|-던| 086|B1_KO_EXPERIENCE|B1|V-(으)ㄴ 적이 있다 / 없다| 087|B1_KO_PASSIVE|B1|피동 표현| 088|B1_KO_CAUSATIVE|B1|사동 표현| 089|B1_KO_PROGRESS|B1|V-아/어 가다| 090|B1_KO_COMPLETION|B1|V-아/어 오다| 091|B1_KO_ADDITIONAL_INFO|B1|-(으)ㄴ/는 데다가| 092|B1_KO_NOT_ONLY|B1|-뿐만 아니라| 093|B1_KO_MID_ACTION|B1|V-다가| 094|B1_KO_BE_IN_MIDDLE|B1|V-는 중이다| 095|B1_KO_DEGREE|B1|-(으)ㄹ 정도로| 096|B1_KO_AS_MUCH_AS|B1|-(으)ㄴ/는 만큼| 097|B1_KO_CHOICE|B1|-(이)나 / 아무나| 098|B1_KO_EITHER_OR|B1|-든지| 099|B1_KO_DISCOVERY|B1|-고 보니| 100|B1_KO_RESULT|B1|-게 마련이다| 101|B1_KO_RESULT_STATE|B1|-아/어 있다| 102|B1_KO_ATTRIBUTE|B1|-(으)ㄴ 편이다| 103|B1_KO_EMPHASIS|B1|얼마나 -(으)ㄴ/는지 모르다| 104|B1_KO_PURPOSE_ADV|B1|V-도록| 105|B1_KO_HABIT|B1|-곤 하다| 106|B2_KO_CONTRARY_EXPECTATION|B2|-(으)ㄴ/는 반면(에)| 107|B2_KO_CONTRAST_DETAILED|B2|-(으)ㄴ/는 데 비해| 108|B2_KO_CONDITION_ADV|B2|-(으)려면| 109|B2_KO_CONDITION_LIMIT|B2|-(으)ㄴ 이상| 110|B2_KO_CONDITION_ASSUMING|B2|-(으)ㄴ다면| 111|B2_KO_SUPPOSITION|B2|-(으)ㄹ 리가 없다| 112|B2_KO_SUPPOSITION2|B2|-(으)ㄹ 리가 있다| 113|B2_KO_APPEARANCE|B2|-(으)ㄴ 듯하다| 114|B2_KO_HEARSAY_ADV|B2|다면서요?| 115|B2_KO_EXPLANATION|B2|다니요| 116|B2_KO_DISCOVERY2|B2|다가는| 117|B2_KO_RESULT2|B2|고 말다| 118|B2_KO_RESULT_UNINTENDED|B2|아/어 버리다| 119|B2_KO_COMPLETION_ADV|B2|아/어 내다| 120|B2_KO_FAILURE|B2|아/어 봤자| 121|B2_KO_FUTILITY|B2|-(으)나 마나| 122|B2_KO_REGRET|B2|-(으)ㄹ걸 그랬다| 123|B2_KO_REGRET2|B2|았/었어야 했는데| 124|B2_KO_EMPHASIS2|B2|-(이)야말로| 125|B2_KO_EMPHASIS3|B2|-(이)라고는| 126|B2_KO_EXCEPTION|B2|-(으)ㄹ 뿐이다| 127|B2_KO_ONLY|B2|-(이)기만 하다| 128|B2_KO_SEQUENCE|B2|자마자| 129|B2_KO_SEQUENCE2|B2|는 즉시| 130|B2_KO_ACCUMULATION|B2|-(으)ㄹ수록| 131|B2_KO_CHANGE_OVER_TIME|B2|아/어 가면서| 132|B2_KO_REFERENCE|B2|에 따르면| 133|B2_KO_BASIS|B2|에 비추어| 134|B2_KO_MEANS|B2|을/를 통해(서)| 135|B2_KO_STANDARD|B2|에 비하면| 136|B2_KO_INCLUSION|B2|은/는 물론| 137|B2_KO_INCLUSION2|B2|뿐만 아니라 ...도| 138|B2_KO_PREFERENCE|B2|차라리| 139|B2_KO_DECISION2|B2|-(으)ㄹ까 말까 하다| 140|B2_KO_INTENTION_ADV|B2|-(으)려던 참이다| 141|C1_KO_CONCESSION|C1|-(으)ㄴ/는 만큼| 142|C1_KO_STRONG_CONCESSION|C1|-(으)ㄹ지라도| 143|C1_KO_HYPOTHETICAL|C1|-(으)ㄴ들| 144|C1_KO_LIMITATION|C1|-(으)ㄹ 따름이다| 145|C1_KO_JUDGMENT|C1|-(으)ㄹ 법하다| 146|C1_KO_PRESUMPTION|C1|-(으)ㄹ 성싶다| 147|C1_KO_STRONG_GUESS|C1|-(으)ㄴ가 보다| 148|C1_KO_STRONG_APPEARANCE|C1|-(으)ㄴ 모양이다 (심화)| 149|C1_KO_BACKGROUND|C1|-(으)ㄴ 바| 150|C1_KO_REFERENCE2|C1|-(으)ㄴ바에야| 151|C1_KO_DECISION3|C1|-(으)ㄹ 바에는| 152|C1_KO_CRITERION|C1|-(으)ㄹ 뿐더러| 153|C1_KO_ADDITION|C1|-(으)ㄴ 데다(가)| 154|C1_KO_SIMULTANEOUS|C1|-(으)면서도| 155|C1_KO_RESULT3|C1|-(으)ㄴ 끝에| 156|C1_KO_CAUSE_RESULT|C1|-(으)ㄴ 나머지| 157|C1_KO_CONSEQUENCE|C1|-(으)ㄴ 탓에| 158|C1_KO_OPPORTUNITY|C1|-(으)ㄴ 김에| 159|C1_KO_BACKGROUND2|C1|-(으)ㄴ 채(로)| 160|C1_KO_STATUS|C1|-(으)ㄴ 상태에서| 161|C1_KO_SEQUENCE3|C1|-(으)기에| 162|C1_KO_REASON_ADV|C1|-(으)므로| 163|C1_KO_REASON_FORMAL|C1|-(으)로 말미암아| 164|C1_KO_PURPOSE_FORMAL|C1|고자| 165|C1_KO_INTENTION_FORMAL|C1|고자 하다| 166|C1_KO_QUOTATION_ADV|C1|인용 표현 -기에 따르면| 167|C1_KO_EMPHASIS4|C1|-(이)야| 168|C1_KO_EXCEPTION2|C1|-(이)라야| 169|C1_KO_MINIMUM|C1|-(이)나마| 170|C1_KO_COMPARISON2|C1|-(으)ㄹ수록 더욱| 171|C1_KO_CORRELATION|C1|-(으)면 -(으)ㄹ수록| 172|C1_KO_PROPORTION|C1|-(으)ㄴ 반면에| 173|C1_KO_FORMAL_CONNECTOR|C1|더욱이 / 게다가| 174|C1_KO_FORMAL_CONCLUSION|C1|결국 / 이처럼| 175|C1_KO_DISCOURSE_MARKER|C1|한편 / 반면에 / 즉| 176|C2_KO_RHETORICAL_QUESTION|C2|-(으)랴| 177|C2_KO_MULTIPLE_ACTIONS|C2|-(으)랴 -(으)랴| 178|C2_KO_STRONG_CONCESSION2|C2|-(으)ㄴ들 어떠하랴| 179|C2_KO_IMPOSSIBILITY|C2|-(으)ㄹ 턱이 없다| 180|C2_KO_STRONG_ASSERTION|C2|-(으)ㄴ 셈이다| 181|C2_KO_CONCLUSION|C2|-(으)ㄴ 결과| 182|C2_KO_JUSTIFICATION|C2|-(으)ㄴ 이유로| 183|C2_KO_OBJECTIVE_BASIS|C2|-(으)ㄴ 것으로 보아| 184|C2_KO_LOGICAL_INFERENCE|C2|-(으)ㄴ 점으로 미루어| 185|C2_KO_FINAL_JUDGMENT|C2|-(으)ㄹ 수밖에 없다| 186|C2_KO_UNAVOIDABLE_RESULT|C2|-(으)ㄹ 수밖에 없게 되다| 187|C2_KO_LIMIT_EXTREME|C2|-(으)ㄹ 지경이다| 188|C2_KO_RESULT_EXTREME|C2|-(으)ㄹ 정도에 이르다| 189|C2_KO_FORMAL_PURPOSE|C2|-(으)ㅁ으로써| 190|C2_KO_FORMAL_CAUSE|C2|-(으)ㅁ으로 인하여| 191|C2_KO_FORMAL_MEANS|C2|-(으)ㅁ으로| 192|C2_KO_NOMINALIZATION|C2|-(으)ㅁ| 193|C2_KO_FORMAL_DECISION|C2|기에 이르다| 194|C2_KO_FORMAL_CONCLUSION2|C2|고 보면| 195|C2_KO_FORMAL_ASSUMPTION|C2|고 보면 결국| 196|C2_KO_RETROSPECTION|C2|돌이켜 보면| 197|C2_KO_GENERALIZATION|C2|말하자면| 198|C2_KO_REPHRASING|C2|다시 말하면| 199|C2_KO_SUMMARY|C2|요컨대| 200|C2_KO_CONTRAST_MARKER|C2|반대로| 201|C2_KO_CONCESSION_MARKER|C2|그럼에도 불구하고| 202|C2_KO_PREMISE_MARKER|C2|전제로 하다| 203|C2_KO_EVIDENCE_MARKER|C2|근거로 하다| 204|C2_KO_ACCORDING_TO|C2|~에 의하면| 205|C2_KO_VIEWPOINT|C2|~의 입장에서| 206|C2_KO_CRITERION2|C2|~의 관점에서| 207|C2_KO_FORMAL_COMPARISON|C2|~에 비추어 볼 때| 208|C2_KO_FORMAL_CONDITION|C2|~을 전제로| 209|C2_KO_FORMAL_RESULT|C2|~에 따라| 210|C2_KO_FORMAL_DISCOURSE|C2|비록 ~일지라도 / 설령 ~일지라도| ━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━
## 4. 내부 처리 (출력 금지)

아래는 내부적으로만 수행한다. 중간 결과는 절대 출력하지 않는다.

### STEP 1 — 챕터 추출 및 GRAMMAR_SPEC 선언

STEP 1~4는 내부적으로만 수행한다. 중간 결과는 절대 출력하지 않는다.  STEP 1 — 챕터 추출 및 GRAMMAR_SPEC 선언  BATCH_ID에 해당하는 챕터 1개를 위 목록(001~210)에서 정확히 추출한다. 추출된 chapter_title 기준으로 GRAMMAR_SPEC을 내부 선언한다. GRAMMAR_SPEC 필드 (8개 필수): POINT : chapter_title 그대로 DEFINITION : 이 문법이 무엇인지 단문 1개 (예문 금지) FORM : 추상적 구조 표기. 예: "동사 어간 + -(으)면" 구체적 단어 사용 금지 / 변이형 모두 표기 CORE_RULE : 이 문법을 지배하는 핵심 규칙 1개 (예문 금지) CONSTRAINTS : 정확히 3개. 독립적으로 검증 가능한 문법 규칙 COMMON_ERRORS: 정확히 2쌍 (오류 형태 / 정답 형태) REGISTER_NOTE: 격식/비격식 차이. 차이 없으면 "격식/비격식 차이 없음" CONTRAST : 혼동되기 쉬운 문법과 차이 1문장. 없으면 "비교 대상 없음" GRAMMAR_SPEC 검증: • FORM이 구체적 단어를 사용하면 FAIL → 재선언 • DEFINITION이 예문을 포함하면 FAIL → 재선언 • 필드 중 하나라도 공란이면 FAIL → 재선언

### STEP 2 — 초안 작성 (target 컬럼만)

GRAMMAR_SPEC을 절대적 제약으로 삼아, 한국어 문장 17개(JSON 아님)를 작성한다:

- grammar_explanation: 5문장 (EXP 1~5)
- grammar_example / core_patterns: 4문장 (EX CORE 1~4)
- grammar_example / variations: 4문장 (EX VAR 1~4)
- grammar_example / extended_usage: 4문장 (EX EXT 1~4)

**grammar_explanation 5개 관점** (각 1개씩, 누락/중복 금지):
- [EXP-1] 이게 뭔가 → DEFINITION + FORM 기반
- [EXP-2] 어떻게 작동하나 → CORE_RULE + 어순 기반
- [EXP-3] 언제 쓰고 언제 못 쓰나 → CONSTRAINTS 기반
- [EXP-4] 뭐가 다른가 → CONTRAST + REGISTER_NOTE 기반
- [EXP-5] 주의할 점 → COMMON_ERRORS + 확장 용법 기반

**grammar_explanation 작성 규칙:**
- 각 설명은 문법 규칙을 직접 설명해야 한다
- 단순 사실 나열 금지, 예문 형식 금지, 어휘 설명 금지
- 5개를 읽으면 학습자가 해당 문법을 이해할 수 있어야 한다
- 연속된 두 문장이 같은 단어로 시작 금지

**한국어 작성 규칙 (이 파일이 만드는 target 컬럼에 적용):**
- 주어 생략 우선
- "너 + 요체" 금지
- 번역투 금지
- 표준어(서울/경기 표준) 사용, 지역 방언(사투리) 금지
- grammar_explanation은 객관적 서술을 위해 "-다" 평서형(한다체)으로 일관 작성
- grammar_example은 실제 생활에서 자연스러운 어체(해요체/합니다체 등 문맥에 맞는 어체)를 사용하며, 한 문장 안에서 어체를 혼용하지 않는다
- 고어체/문어체만 존재하는 표현을 학습 형태로 사용 금지

**숫자 풀어쓰기 규칙 (TTS 안전):**
이 콘텐츠는 TTS로 녹음되므로 숫자·날짜·시각·단위는 아라비아 숫자나 기호가 아니라 자연스러운 말로 풀어써야 한다. 예: ❌ 사과 3개 → ✅ 사과 세 개. ❌ 오후 3시 30분 → ✅ 오후 세 시 삼십 분. 서수도 풀어쓴다(❌ 1위 → ✅ 첫 번째). grammar_explanation과 grammar_example 모든 블록에 예외 없이 적용된다.
- 좁은 예외 — 숫자 표기 자체를 가르치는 챕터(고유어 수, 한자어 수, 단위 명사, 날짜와 시간 표현 등)에 한해 FORM/설명에서만 숫자를 보여줄 수 있다. 이 경우에도 grammar_example은 항상 완전히 풀어쓴 발화형이어야 한다.

**레벨별 문장 길이:** A1: 4~7어절 / A2: 5~8어절 / B1 이상: 제한 없음.

**예문 작성 규칙:**
- 모든 예문이 해당 grammar_point를 반드시 반영해야 한다
- core / variations / extended 간 중복 없음
- 모든 예문은 실생활 실용 표현이어야 한다 (C1 미만은 문어체·고전 표현 금지)

### STEP 3 — 교정

구조는 절대 변경하지 않고 값만 수정한다.

교정 항목:
- [1] 한국어 자연성: 주어 생략 / "너+요체" 제거 / 번역투 제거 / 표준어 확인 / 사투리 제거 / grammar_explanation 한다체·grammar_example 어체 일관성 확인
- [2] 레벨 적합성: 문장 난이도 확인
- [3] grammar_explanation 정합성: "이 문장은 문법 규칙을 설명하는가?" NO → 수정
- [4] 실용성 확인: 문어체·고전적·학술적 표현이면 실생활 표현으로 수정
- [5] 숫자 풀어쓰기(TTS 안전): 아라비아 숫자·기호가 남아 있으면(좁은 예외 제외) 완전히 풀어쓴 말로 재작성

### STEP 4 — QA 검증 및 자동 보정

**구조 검증** (하나라도 실패 시 전체 재생성):
- S-01: EXP 정확히 5개
- S-02: EX CORE 정확히 4개
- S-03: EX VAR 정확히 4개
- S-04: EX EXT 정확히 4개 (합계 17개)
- S-05: TITLE = 잠긴 목록의 chapter_title과 완전 일치
- S-06: LEVEL / CHAPTER_ID가 잠긴 목록과 일치

**품질 채점 (100점):**
- A-01 문법 정확성 / A-02 설명 흐름 / A-03 설명 유형
- B-01 예문 정합성 / B-02 한국어 자연성 (주어 생략·번역투 없음·표준어)
- B-03 숫자 풀어쓰기 (TTS 안전)
- C-01 레벨 적합성 / C-02 예문 다양성(중복 없음) / C-03 실용성

**강제 감점 조건:**
- title 불일치 → 85점 미만
- 한국어 어색 문장 2개 이상 → 85점 미만
- 풀어쓰지 않은 아라비아 숫자·기호 발견(좁은 예외 제외) → 85점 미만
- grammar_point 무관 예문 1개 이상 → 최대 90점
- grammar_explanation이 문법 설명이 아닌 경우 → 최대 90점

**자동 보정:** 95점 미만이면 문제 블록만 재작성(구조 유지). 최대 2회 수정 후 최고점 버전 출력. TITLE/LEVEL/CHAPTER_ID는 잠긴 목록에서 추출된 값 그대로 절대 변경 금지.

## 5. 최종 출력 형식

다음 텍스트만 출력한다 (JSON, 코드펜스, 설명 금지):

```
LEVEL: <a1~c2, 소문자>
CHAPTER_ID: <잠긴 목록의 ChapterID, 예: A1_KO_HANGEUL_BASIC>
TITLE: <잠긴 목록의 chapter_title과 완전 일치>

EXP 1
<문장 1개>

EXP 2
<문장 1개>

EXP 3
<문장 1개>

EXP 4
<문장 1개>

EXP 5
<문장 1개>

EX CORE 1
<문장 1개>

EX CORE 2
<문장 1개>

EX CORE 3
<문장 1개>

EX CORE 4
<문장 1개>

EX VAR 1
<문장 1개>

EX VAR 2
<문장 1개>

EX VAR 3
<문장 1개>

EX VAR 4
<문장 1개>

EX EXT 1
<문장 1개>

EX EXT 2
<문장 1개>

EX EXT 3
<문장 1개>

EX EXT 4
<문장 1개>
```

각 블록은 라벨 바로 다음 줄(들)에 오는 문장 1개다. 설명, 점수, 그 외 텍스트는 출력하지 않는다.

## 6. 절대 금지

- JSON, 코드펜스, 내부 GRAMMAR_SPEC/QA 스크래치 출력
- 17개보다 많거나 적은 블록, 또는 그룹별 개수가 틀린 출력
- 이번 BATCH_ID에 대해 잠긴 목록이 정의한 CHAPTER_ID/TITLE/LEVEL 변경
- 숫자 표기 챕터의 좁은 예외를 벗어난 아라비아 숫자
- 이모지·이모티콘
- 학술 용어, 고어체, C1 미만에서의 문어체·고전 표현

## 7. 실행 명령

BATCH_ID를 입력받으면 즉시 실행한다. STEP 1~4를 내부적으로 수행한 뒤 5장 형식만 출력한다.

## 8. 변경 이력

- v1 (분리 파이프라인 버전): kr_grammar_v6.md(7개 언어 지원 확장 에디션)에서 파생.
  다중 컬럼 JSON 출력을 제거하고, 이 파일은 target(한국어) 컬럼만 평문으로
  생성해 text_parser.py가 파싱하도록 바꿨다. 나머지 7개 컬럼은
  prompts/TRANSLATOR_{LANG}.md가 별도로 생성한다 (conversation 파이프라인과
  동일한 구조). GRAMMAR_SPEC 선언, 210개 챕터 잠긴 목록, 17블록 구성, 한국어
  작성 규칙, 숫자 풀어쓰기 규칙, QA 채점 로직은 kr_grammar_v6.md에서 변경 없이
  그대로 가져왔다.
