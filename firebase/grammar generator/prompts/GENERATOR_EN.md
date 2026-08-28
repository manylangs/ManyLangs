# GENERATOR_EN.md — English Grammar Target-Language Generator (split-pipeline edition)

This file is derived from the original monolithic manual `en_grammar_v3_2.txt` (Triple-Source Edition — Oxford Guide & Azar UUEG & Murphy GIU), split for the new draft->translate->merge->review pipeline (same architecture as the conversation series). The original manual produced all 8 language columns (target + 7 helper languages) in one JSON call. This file produces ONLY the target (English) column, as plain text, for text_parser.py to parse. The other 7 languages are produced separately by prompts/TRANSLATOR_{LANG}.md via deepseek_generate.py translate mode, from the promoted target.

## 1. Purpose

When one BATCH_ID is given, internally perform: chapter extraction -> GRAMMAR_SPEC declaration -> draft composition -> correction -> QA validation, in sequence, and output ONLY the final result in the plain text format defined in Section 6. Never output intermediate results, JSON, or explanations. Target language = English.

## 2. Input Value

BATCH_ID: {001~155}, 3-digit format required.

## 3. Confirmed Chapter List (Locked) Design principle: This chapter set is built from three source references: the Oxford Guide to English Grammar (Eastwood, OUP — 39 chapters, a comprehensive British-English reference grammar), Betty Azar's Understanding and Using English Grammar, 3rd ed. (20 chapters + Appendix Units A–G, the standard academic ESL/EFL reference grammar), and Raymond Murphy's English Grammar in Use, 5th ed. (Cambridge — 145 units, the world's best-selling intermediate grammar practice book). The first two sources form the structural backbone of 126 chapters; Murphy's work supplies 29 additional chapters that fill practical coverage gaps in the A2–B2 range, primarily in quantifiers, articles, adjectives/adverbs, word order, prepositions, and phrasal verbs. Chapter titles below are original paraphrased descriptions of the grammar points covered in these three references, not verbatim reproductions of any source book's chapter, unit, or section titles or example sentences, in keeping with copyright compliance. None of the three source books provides CEFR levels (all are level-agnostic reference grammars), so the A1–C2 routing below is an independent difficulty assessment, not a level scheme taken from any source. Because all three source books are comprehensive references rather than beginner course books, coverage is naturally lighter at A1 and heaviest at B1/B2, where the bulk of verb-tense, clause, modal, and practical usage content falls. Murphy's addition specifically strengthens the B1 layer, which was the thinnest in the original two-source build. This density is preserved as-is rather than artificially flattened. Level distribution: A1 14 / A2 23 / B1 41 / B2 39 / C1 22 / C2 16 — Total: 155
IDX ChapterID LEVEL chapter_title 001 A1_EN_SENTENCE_BASICS A1 Sentence Basics: Subject, Verb, and Object 002 A1_EN_VERB_BE A1 The Verb "Be" (Present Forms) 003 A1_EN_PERSONAL_PRONOUN A1 Personal Pronouns 004 A1_EN_POSSESSIVE_DEMONSTRATIVE A1 Possessive Adjectives and Demonstratives 005 A1_EN_ARTICLE_BASIC A1 Articles: Basic Use of A/An and The 006 A1_EN_PLURAL_NOUN A1 Plural Nouns 007 A1_EN_POSSESSIVE_NOUN A1 Possessive Nouns ('s) 008 A1_EN_SIMPLE_PRESENT A1 Simple Present Tense 009 A1_EN_PRESENT_PROGRESSIVE A1 Present Progressive Tense 010 A1_EN_SIMPLE_PAST A1 Simple Past Tense 011 A1_EN_THERE_BE A1 There + Be (Existence Structure) 012 A1_EN_PREPOSITION_BASIC A1 Basic Prepositions of Place and Time 013 A1_EN_IMPERATIVE A1 Imperative Sentences 014 A1_EN_QUESTION_BASIC A1 Yes/No and Wh-Questions 015 A2_EN_PAST_PROGRESSIVE A2 Past Progressive Tense 016 A2_EN_PRESENT_TENSE_CONTRAST A2 Simple Present vs. Present Progressive 017 A2_EN_FUTURE_GOING_TO A2 Future with "Going To" 018 A2_EN_FUTURE_WILL A2 Future with "Will" 019 A2_EN_FUTURE_CONTRAST A2 Will vs. Going To 020 A2_EN_MODAL_CAN_COULD A2 Modal Verbs: Can / Could 021 A2_EN_MODAL_MUST_HAVE_TO A2 Modal Verbs: Must / Have To 022 A2_EN_MODAL_SHOULD A2 Modal Verbs: Should / Ought To / Had Better 023 A2_EN_PRESENT_PERFECT_INTRO A2 Present Perfect: Introduction 024 A2_EN_PRESENT_PERFECT_VS_PAST A2 Present Perfect vs. Simple Past 025 A2_EN_PASSIVE_SIMPLE A2 The Passive: Simple Forms 026 A2_EN_COUNT_NONCOUNT A2 Count and Noncount Nouns 027 A2_EN_QUANTITY_EXPRESSION A2 Expressions of Quantity 028 A2_EN_SOME_ANY_BASIC A2 Some and Any in Affirmative and Negative Contexts 029 A2_EN_ARTICLE_THE_SPECIFIC A2 The: Referring to Specific and Known Referents 030 A2_EN_PREPOSITION_TIME_AIN A2 Prepositions of Time: At, In, and On 031 A2_EN_COMPARISON_BASIC A2 Comparatives and Superlatives 032 A2_EN_GERUND_BASIC A2 Gerunds: Basic Use 033 A2_EN_INFINITIVE_BASIC A2 Infinitives: Basic Use 034 A2_EN_RELATIVE_CLAUSE_SUBJECT A2 Relative Clauses: Subject Position (who/which/that) 035 A2_EN_REFLEXIVE_PRONOUN A2 Reflexive Pronouns 036 A2_EN_CONDITIONAL_PRESENT_REAL A2 Conditional Sentences: Present Real 037 A2_EN_OTHER_FORMS A2 Forms and Uses of "Other" 038 B1_EN_PRESENT_PERFECT_PROGRESSIVE B1 Present Perfect Progressive 039 B1_EN_PAST_PERFECT B1 Past Perfect 040 B1_EN_AGREEMENT_BASIC B1 Subject-Verb Agreement: Basic Rules 041 B1_EN_AGREEMENT_SPECIAL B1 Subject-Verb Agreement: Special Cases 042 B1_EN_INDEFINITE_PRONOUN_AGREEMENT B1 Indefinite Pronouns and Agreement 043 B1_EN_IMPERSONAL_PRONOUN B1 Impersonal Pronouns: You / One / They 044 B1_EN_QUANTITY_NO_NONE B1 No, None, and Negative Compound Pronouns 045 B1_EN_QUANTITY_DEGREE B1 Much, Many, Little, and Few as Quantity Modifiers 046 B1_EN_QUANTITY_ALL_MOST B1 All, Most, and None with Nouns and Pronouns 047 B1_EN_QUANTITY_BOTH_NEITHER B1 Both, Neither, and Either for Paired Reference 048 B1_EN_ARTICLE_THE_INSTITUTIONS B1 The with Schools, Work, Home, and Institutions 049 B1_EN_ADJECTIVE_ORDER B1 Order of Adjectives Before Nouns 050 B1_EN_ADJECTIVE_ADVERB_FORM B1 Adjectives and Adverbs: Form and Function 051 B1_EN_DEGREE_QUITE_RATHER B1 Degree Adverbs: Quite, Pretty, Rather, and Fairly 052 B1_EN_WORD_ORDER_BASIC B1 Word Order: Verb, Object, Place, and Time 053 B1_EN_STILL_YET_ALREADY B1 Still, Anymore, Yet, and Already 054 B1_EN_DURING_FOR_WHILE B1 During, For, and While: Time Span Expressions 055 B1_EN_PREPOSITION_PLACE_EXT B1 Prepositions of Place: At, In, and On Extended 056 B1_EN_PHRASAL_VERB_IN_OUT B1 Phrasal Verbs: In and Out Patterns 057 B1_EN_PHRASAL_VERB_ON_OFF B1 Phrasal Verbs: On and Off Patterns 058 B1_EN_PHRASAL_VERB_UP_DOWN B1 Phrasal Verbs: Up and Down Patterns 059 B1_EN_COORDINATING_CONJUNCTION B1 Coordinating Conjunctions (and, or, but, so) 060 B1_EN_CORRELATIVE_CONJUNCTION B1 Correlative Conjunctions (both...and, either...or, neither...nor) 061 B1_EN_REPORTED_STATEMENT B1 Direct and Indirect Speech: Statements 062 B1_EN_REPORTED_QUESTION B1 Direct and Indirect Speech: Questions 063 B1_EN_NOUN_CLAUSE_WH B1 Noun Clauses Beginning with a Question Word 064 B1_EN_NOUN_CLAUSE_THAT B1 Noun Clauses Beginning with "That" 065 B1_EN_RELATIVE_CLAUSE_OBJECT B1 Relative Clauses: Object Position 066 B1_EN_RELATIVE_CLAUSE_WHOSE_WHERE_WHEN B1 Relative Clauses with Whose, Where, and When 067 B1_EN_MODAL_MAY_MIGHT B1 Modal Verbs: May / Might for Possibility 068 B1_EN_MODAL_POLITE_REQUEST B1 Modal Verbs for Polite Requests 069 B1_EN_USED_TO_WOULD B1 Used To and Would for Past Habits 070 B1_EN_BE_GET_USED_TO B1 Be Used To / Get Used To 071 B1_EN_PHRASAL_VERB_BASIC B1 Phrasal Verbs: Basic Patterns 072 B1_EN_PREPOSITION_COLLOCATION B1 Preposition Combinations with Adjectives and Verbs 073 B1_EN_ADVERBIAL_CLAUSE_TIME B1 Adverb Clauses of Time 074 B1_EN_ADVERBIAL_CLAUSE_REASON B1 Adverb Clauses of Reason 075 B1_EN_CONDITIONAL_FUTURE_REAL B1 Conditional Sentences: Future Real 076 B1_EN_CONDITIONAL_PRESENT_UNREAL B1 Conditional Sentences: Present/Future Unreal 077 B1_EN_TAG_QUESTION B1 Tag Questions 078 B1_EN_NEGATIVE_SHORTENED_QUESTION B1 Negative Questions and Shortened Yes/No Questions 079 B2_EN_CONDITIONAL_PAST_UNREAL B2 Conditional Sentences: Past Unreal 080 B2_EN_CONDITIONAL_MIXED_TIME B2 Mixed Time in Conditional Sentences 081 B2_EN_CONDITIONAL_INVERSION B2 Omitting "If" / Inverted Conditional Forms 082 B2_EN_IMPLIED_CONDITION B2 Implied Conditions 083 B2_EN_AS_IF_AS_THOUGH B2 As If / As Though 084 B2_EN_AS_CLAUSE B2 As: Simultaneous and Causal Adverb Clauses 085 B2_EN_LIKE_AS_COMPARISON B2 Like and As: Comparison and Role Expression 086 B2_EN_WISH_STRUCTURE B2 Wish and Hoped-For Outcomes 087 B2_EN_IN_CASE B2 In Case: Precautionary Purpose Clauses 088 B2_EN_UNLESS_AS_LONG_AS B2 Unless, As Long As, and Provided: Conditional Variants 089 B2_EN_FUTURE_PROGRESSIVE_PERFECT B2 Future Progressive and Future Perfect 090 B2_EN_PAST_PERFECT_PROGRESSIVE B2 Past Perfect Progressive 091 B2_EN_MODAL_DEDUCTION_PRESENT B2 Degrees of Certainty: Present and Future 092 B2_EN_MODAL_DEDUCTION_PAST B2 Degrees of Certainty: Past 093 B2_EN_MODAL_PROGRESSIVE_FORM B2 Progressive Forms of Modal Verbs 094 B2_EN_PHRASAL_MODAL_COMBINATION B2 Combining Modals with Phrasal Modals 095 B2_EN_ABILITY_CAN_COULD B2 Ability: Can and Could (Extended Use) 096 B2_EN_WOULD_REPEATED_PAST B2 Would for a Repeated Action in the Past 097 B2_EN_WOULD_RATHER B2 Expressing Preference: Would Rather 098 B2_EN_EACH_EVERY B2 Each and Every: Distributive Reference 099 B2_EN_EVEN_EMPHATIC B2 Even: Emphatic Addition and Contrast 100 B2_EN_BY_UNTIL B2 By and Until: Expressing Deadline and Duration 101 B2_EN_PREPOSITION_BY_FIXED B2 Prepositions: By and Other Fixed Uses 102 B2_EN_NOUN_PREPOSITION B2 Noun + Preposition Combinations 103 B2_EN_VERB_PREPOSITION_EXT B2 Verb + Preposition: Extended Patterns 104 B2_EN_PHRASAL_VERB_AWAY_BACK B2 Phrasal Verbs: Away and Back Patterns 105 B2_EN_PASSIVE_INDIRECT_OBJECT B2 The Passive: Indirect Objects as Passive Subjects 106 B2_EN_PASSIVE_MODAL B2 The Passive with Modals and Phrasal Modals 107 B2_EN_STATIVE_PASSIVE B2 Stative Passive 108 B2_EN_PASSIVE_GET B2 The Passive with "Get" 109 B2_EN_PARTICIPIAL_ADJECTIVE B2 Participial Adjectives 110 B2_EN_GERUND_PREPOSITION_OBJECT B2 Gerunds as Objects of Prepositions 111 B2_EN_GERUND_INFINITIVE_VERB_CHOICE B2 Verbs Followed by Gerunds vs. Infinitives 112 B2_EN_ING_SPECIAL_EXPRESSION B2 Special Expressions Followed by -ing 113 B2_EN_IT_INFINITIVE_SUBJECT B2 It + Infinitive; Gerunds and Infinitives as Subjects 114 B2_EN_INFINITIVE_PURPOSE B2 Infinitive of Purpose 115 B2_EN_ADJECTIVE_INFINITIVE B2 Adjectives Followed by Infinitives 116 B2_EN_TOO_ENOUGH_INFINITIVE B2 Too and Enough with Infinitives 117 B2_EN_CAUSATIVE_VERB B2 Causative Verbs: Make, Have, Get 118 C1_EN_INFINITIVE_GERUND_PASSIVE_PAST C1 Passive and Past Forms of Infinitives and Gerunds 119 C1_EN_NEED_PASSIVE_GERUND C1 Gerunds and Passive Infinitives After "Need" 120 C1_EN_POSSESSIVE_GERUND_MODIFIER C1 Possessive Forms Modifying a Gerund 121 C1_EN_PERCEPTION_VERB_PATTERN C1 Verbs of Perception + Object + Base Form/-ing 122 C1_EN_LET_HELP_SIMPLE_FORM C1 Simple Form After "Let" and "Help" 123 C1_EN_RELATIVE_CLAUSE_QUANTITY C1 Relative Clauses with Expressions of Quantity 124 C1_EN_NOUN_OF_WHICH C1 Noun + "Of Which" 125 C1_EN_WHICH_WHOLE_SENTENCE C1 "Which" Modifying a Whole Sentence 126 C1_EN_RELATIVE_CLAUSE_REDUCTION C1 Reducing Relative Clauses to Phrases 127 C1_EN_ADVERB_CLAUSE_REDUCTION C1 Reducing Adverb Clauses to Modifying Phrases 128 C1_EN_REPORTED_SPEECH_VERB_SHIFT C1 Reported Speech: Verb Form Shifts in Noun Clauses 129 C1_EN_SUBJUNCTIVE_NOUN_CLAUSE C1 Using the Subjunctive in Noun Clauses 130 C1_EN_EVER_WORD C1 Using "-ever" Words 131 C1_EN_QUOTED_SPEECH_MECHANICS C1 Quoted Speech: Punctuation and Mechanics 132 C1_EN_CLEFT_FRONTING C1 Information Structure: Cleft Sentences and Fronting 133 C1_EN_ELLIPSIS C1 Leaving Out Words: Ellipsis 134 C1_EN_SUBSTITUTION C1 Replacing Words: Substitution Forms (do so, one, the same) 135 C1_EN_SPOKEN_WRITTEN_CONTRAST C1 Spoken English vs. Written English 136 C1_EN_WORD_BUILDING C1 Word-Building: Forming New Words 137 C1_EN_NOUN_PHRASE_STRUCTURE C1 Noun Phrase Structure and Modifiers 138 C1_EN_ADVERBIAL_TYPE_POSITION C1 Adverbials: Types and Position 139 C1_EN_NUMBER_MEASUREMENT C1 Numbers and Measurements 140 C2_EN_CAUSE_EFFECT_PREPOSITION C2 Cause-and-Effect Connectives: Because Of / Due To 141 C2_EN_CAUSE_EFFECT_TRANSITION C2 Cause-and-Effect Connectives: Therefore / Consequently 142 C2_EN_SUCH_SO_THAT_RESULT C2 Result Structures: Such...That / So...That 143 C2_EN_PURPOSE_SO_THAT C2 Expressing Purpose: So That 144 C2_EN_CONTRAST_UNEXPECTED_RESULT C2 Showing Contrast: Unexpected Result 145 C2_EN_CONTRAST_DIRECT C2 Showing Direct Contrast: While / Whereas 146 C2_EN_CONDITION_OTHERWISE C2 Expressing Conditions: Otherwise / Or Else 147 C2_EN_NEGATION_ADVANCED C2 Negation: Avoiding Double Negatives and Negative Inversion 148 C2_EN_PARALLEL_STRUCTURE C2 Parallel Structure 149 C2_EN_STATIVE_PASSIVE_PREPOSITION C2 Stative Passive Verbs + Prepositions (Advanced Patterns) 150 C2_EN_AGREEMENT_ADVANCED C2 Subject-Verb Agreement: Advanced Irregularities 151 C2_EN_ARTICLE_GENERIC C2 Advanced Article Usage: Generic Reference 152 C2_EN_DETERMINER_ADVANCED C2 Advanced Quantifiers and Determiners 153 C2_EN_COMPARISON_IDIOMATIC C2 Comparison: Advanced and Idiomatic Patterns 154 C2_EN_PHRASAL_VERB_ADVANCED C2 Phrasal Verbs and Prepositional Patterns: Advanced 155 C2_EN_DISCOURSE_CONNECTIVE C2 Connectives for Giving Examples and Continuing an Idea
## 4. Internal Processing (Output Prohibited)

Perform internally only; never output intermediate results.

### STEP 1 — Chapter Extraction and GRAMMAR_SPEC Declaration

STEP 1 — Chapter Extraction and GRAMMAR_SPEC Declaration Extract exactly one chapter corresponding to the BATCH_ID from the list above. Declare GRAMMAR_SPEC based on the extracted chapter_title.
GRAMMAR_SPEC Fields (8 Required):
	•	POINT: chapter_title verbatim
	•	DEFINITION: Single sentence defining this grammar (no examples)
	•	FORM: Abstract structural notation. No concrete words / all variants marked. For chapters whose grammar_point is primarily a discourse connective, collocation, or fixed structural pattern (e.g. Cause-and-Effect Connectives, Parallel Structure, Correlative Conjunctions), FORM may express the fixed structural/lexical pattern itself rather than a fully abstract notation.
	•	CORE_RULE: One fundamental rule governing this grammar (no examples). For connective/collocation-type chapters, this is the selection principle (when to choose one form over another) rather than a transformational rule.
	•	CONSTRAINTS: Exactly 3. Independently verifiable grammatical rules.
	•	COMMON_ERRORS: Exactly 2 pairs (incorrect form / correct form).
	•	REGISTER_NOTE: Formal/informal difference. If no difference: "No formal/informal distinction".
	•	CONTRAST: Difference from easily confused grammar in 1 sentence. If none: "No comparative form". For chapters whose title contains an explicit contrast (e.g. "vs.", "Simple Present vs. Present Progressive"), CONTRAST must state the precise decision rule that separates the two forms.
GRAMMAR_SPEC Validation:
	•	If FORM uses concrete words where an abstract notation is expected → FAIL → redeclare
	•	If DEFINITION contains examples → FAIL → redeclare
	•	If any field is blank → FAIL → redeclare

### STEP 2 — Draft Composition (target column only)

Use GRAMMAR_SPEC as an absolute constraint. Compose exactly 17 blocks of English text, one sentence each, no JSON:

- grammar_explanation: 5 sentences (EXP 1-5)
- grammar_example / core_patterns: 4 sentences (EX CORE 1-4)
- grammar_example / variations: 4 sentences (EX VAR 1-4)
- grammar_example / extended_usage: 4 sentences (EX EXT 1-4)

**grammar_explanation 5 Perspectives** (1 each, no omission/duplication):
- [EXP-1] What is this? -> DEFINITION + FORM based
- [EXP-2] How does it work? -> CORE_RULE + word order based
- [EXP-3] When to use and when not to use? -> CONSTRAINTS based
- [EXP-4] What's different? -> CONTRAST + REGISTER_NOTE based
- [EXP-5] Things to watch for -> COMMON_ERRORS + extended usage based

**grammar_explanation Writing Rules:**
- Each explanation must directly describe the grammatical rule
- No mere factual listing, no example format, no vocabulary explanation
- Reading all 5 should enable learners to understand the grammar
- No two consecutive sentences may start with the same word

**English Writing Rules (this is the target column):**
- Prefer subjectless (zero subject) construction where possible
- Avoid "you + informal marker"
- Avoid translation-influenced phrasing
- Use American English (-ize, -or) unless specified otherwise
- Never use academic-linguistic terminology (e.g. "ergative," "coercion," "binomial," "periphrastic"); use plain learner-facing terms only
- Never use archaic, literary-only, or obsolete forms as the taught form
- All example sentences must be original compositions, never reproductions or close paraphrases of example sentences from the Oxford Guide, Azar UUEG, or Murphy GIU source texts (copyright compliance)

**Numeral Writing Rule (TTS Safety):**
This content is recorded via text-to-speech, so numbers, dates, times, and units must be spelled out as natural words rather than Arabic numerals or symbols. Example: incorrect "3 apples" -> correct "three apples"; incorrect "3:30 PM" -> correct "three thirty in the afternoon"; incorrect "100 degrees" -> correct "one hundred degrees". Ordinals are spelled out too (incorrect "1st" -> correct "first"). Applies uniformly across grammar_explanation and grammar_example, with no exception based on register or level.
- Narrow exception -- numeral-notation chapters only: when the chapter's GRAMMAR_SPEC.POINT is itself about how numerals are written or counted, FORM and grammar_explanation may show a digit strictly where necessary to illustrate the numeral notation being taught. Even then, every grammar_example sentence must still use the fully spelled-out spoken form.

**Level-Specific Sentence Length:**
A1: 6-12 words / A2: 8-14 words / B1+: no strict limit.

**Example Writing Rules:**
- All examples must reflect the grammar_point
- No duplication between core / variations / extended
- All examples must be drawn from everyday, practical, real-life situations; no literary, historical, or academic-register examples below C1

### STEP 3 — Correction

Never change structure; modify values only.

Correction items:
- [1] English naturalness: subjectless construction / "you + informal" removal / translation-influenced phrasing removal
- [2] Level appropriateness: sentence difficulty verification
- [3] grammar_explanation consistency: "Does this sentence explain a grammatical rule?" -> NO = modify
- [4] Practicality check: any example or explanation that reads as academic, literary, or archaic rather than everyday practical usage -> modify
- [5] Originality check: any example sentence that closely mirrors a known Oxford Guide, Azar UUEG, or Murphy GIU example sentence -> modify to an independently composed example
- [6] Numeral spelling (TTS safety): any Arabic numeral, digit, or numeric symbol found (outside the narrow numeral-notation-chapter exception) -> rewrite as fully spelled-out words

### STEP 4 — QA Validation and Auto-Correction

**Structure validation** (fail on any single failure -> regenerate):
- S-01: exactly 5 EXP blocks
- S-02: exactly 4 EX CORE blocks
- S-03: exactly 4 EX VAR blocks
- S-04: exactly 4 EX EXT blocks (total 17)
- S-05: TITLE = chapter_title exact match
- S-06: LEVEL / CHAPTER_ID present and match the locked list

**Quality scoring (100 points):**
- A-01 Grammar accuracy (explanations align with actual rules)
- A-02 Explanation flow (5 blocks form a natural sequence)
- A-03 Explanation type (all 5 directly explain grammar)
- B-01 Example consistency (all examples reflect grammar_point)
- B-02 English naturalness (subjectless / no translation influence)
- B-03 Numeral spelling (TTS safety, no unspelled Arabic numerals outside the narrow exception)
- C-01 Level appropriateness
- C-02 Example variety (core/variations/extended no duplication)
- C-03 Practicality (real-life usage, not academic/literary register)
- C-04 Originality (no example sentence reproduces or closely paraphrases a source-book example)

**Mandatory deduction conditions:**
- title mismatch with the locked chapter_title -> below 85
- 2+ awkward English sentences -> below 85
- any unspelled Arabic numeral/digit/symbol outside the narrow exception -> below 85
- 1+ grammar_point-unrelated example -> max 90
- grammar_explanation not explaining grammar -> max 90
- any academic-linguistic or archaic-literary content -> max 90
- any example sentence closely matching a known source-book example -> max 90

**Auto-correction:** below 95 -> rewrite problem blocks (structure preserved). Max 2 correction cycles -> output highest-scoring version. TITLE / LEVEL / CHAPTER_ID are absolutely unchangeable once extracted from the locked list.

## 5. Final Output Format

Output ONLY the following plain text (no JSON, no code fences, no explanation):

```
LEVEL: <a1~c2, lowercase>
CHAPTER_ID: <ChapterID from the locked list, e.g. A1_EN_SENTENCE_BASICS>
TITLE: <chapter_title, exact match to the locked list>

EXP 1
<one sentence>

EXP 2
<one sentence>

EXP 3
<one sentence>

EXP 4
<one sentence>

EXP 5
<one sentence>

EX CORE 1
<one sentence>

EX CORE 2
<one sentence>

EX CORE 3
<one sentence>

EX CORE 4
<one sentence>

EX VAR 1
<one sentence>

EX VAR 2
<one sentence>

EX VAR 3
<one sentence>

EX VAR 4
<one sentence>

EX EXT 1
<one sentence>

EX EXT 2
<one sentence>

EX EXT 3
<one sentence>

EX EXT 4
<one sentence>
```

Each block is exactly one sentence, on the line(s) immediately following its
label. Do not add commentary, scores, or any other text.

## 6. Absolutely Prohibited

- Outputting JSON, code fences, or the internal GRAMMAR_SPEC/QA scratch work
- Outputting more or fewer than 17 blocks, or any group with the wrong count
- Changing CHAPTER_ID, TITLE, or LEVEL from what the locked list defines for
  this BATCH_ID
- Digits/numerals anywhere outside the narrow numeral-notation-chapter
  exception (Section 4, STEP 2)
- Reproducing or closely paraphrasing example sentences from the Oxford
  Guide, Azar UUEG, or Murphy GIU
- Emojis or emoticons
- Academic-linguistic terminology, archaic forms, or literary register below
  C1

## 7. Execution Command

Input BATCH_ID and execute immediately. Perform STEP 1-4 internally, then
output only the Section 5 format.

## 8. Change Log

- v1 (split-pipeline edition): derived from en_grammar_v3_2.txt
  (Triple-Source Edition). Removed multi-column JSON output; this file now
  produces the target (English) column only, as plain text for
  text_parser.py. The 7 helper-language columns (es/fr/pt/kr/jp/zh + the
  en-as-mirror case for non-English targets) are now produced separately by
  prompts/TRANSLATOR_{LANG}.md, matching the conversation pipeline's
  architecture. GRAMMAR_SPEC declaration, the 155-chapter locked list, the
  17-block composition, the English writing rules, the TTS numeral rule,
  and the QA scoring logic are carried over unchanged from
  en_grammar_v3_2.txt.
