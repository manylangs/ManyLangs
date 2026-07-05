"use client";

import Link from "next/link";
import { useState } from "react";
import { copyLink } from "@/utils/share";
/* ================= 하드코딩 데이터 ================= */
const CHAPTERS = [
  { id: "001", level: "A1", title: { en: "Sentence Basics: Subject, Verb, and Object", es: "Fundamentos de la oración: sujeto, verbo y objeto", fr: "Les bases de la phrase : sujet, verbe et complément", pt: "Fundamentos da frase: sujeito, verbo e objeto", ko: "문장의 기초: 주어, 동사, 목적어" } },
  { id: "002", level: "A1", title: { en: "The Verb \"Be\" (Present Forms)", es: "El verbo «Be» (formas del presente)", fr: "Le verbe « Be » (formes du présent)", pt: "O verbo \"Be\" (formas do presente)", ko: "동사 \"Be\" (현재형)" } },
  { id: "003", level: "A1", title: { en: "Personal Pronouns", es: "Pronombres personales", fr: "Pronoms personnels", pt: "Pronomes pessoais", ko: "인칭대명사" } },
  { id: "004", level: "A1", title: { en: "Possessive Adjectives and Demonstratives", es: "Adjetivos posesivos y demostrativos", fr: "Adjectifs possessifs et démonstratifs", pt: "Adjetivos possessivos e demonstrativos", ko: "소유형용사와 지시대명사" } },
  { id: "005", level: "A1", title: { en: "Articles: Basic Use of A/An and The", es: "Artículos: uso básico de A/An y The", fr: "Articles : utilisation de base de A/An et The", pt: "Artigos: uso básico de A/An e The", ko: "관사: A/An과 The의 기본 용법" } },
  { id: "006", level: "A1", title: { en: "Plural Nouns", es: "Sustantivos en plural", fr: "Les noms au pluriel", pt: "Substantivos no plural", ko: "명사의 복수형" } },
  { id: "007", level: "A1", title: { en: "Possessive Nouns ('s)", es: "Sustantivos posesivos ('s)", fr: "Les noms possessifs ('s)", pt: "Substantivos possessivos ('s)", ko: "소유격 명사 ('s)" } },
  { id: "008", level: "A1", title: { en: "Simple Present Tense", es: "Presente simple", fr: "Présent simple", pt: "Presente simples", ko: "단순현재시제" } },
  { id: "009", level: "A1", title: { en: "Present Progressive Tense", es: "Presente continuo", fr: "Présent progressif", pt: "Presente contínuo", ko: "현재진행시제" } },
  { id: "010", level: "A1", title: { en: "Simple Past Tense", es: "Pasado simple", fr: "Passé simple", pt: "Passado simples", ko: "단순과거시제" } },
  { id: "011", level: "A1", title: { en: "There + Be (Existence Structure)", es: "There + Be (estructura de existencia)", fr: "There + Be (structure d'existence)", pt: "There + Be (estrutura de existência)", ko: "There + Be (존재 구문)" } },
  { id: "012", level: "A1", title: { en: "Basic Prepositions of Place and Time", es: "Preposiciones básicas de lugar y tiempo", fr: "Prépositions de base de lieu et de temps", pt: "Preposições básicas de lugar e tempo", ko: "장소와 시간의 기본 전치사" } },
  { id: "013", level: "A1", title: { en: "Imperative Sentences", es: "Oraciones imperativas", fr: "Les phrases impératives", pt: "Frases imperativas", ko: "명령문" } },
  { id: "014", level: "A1", title: { en: "Yes/No and Wh-Questions", es: "Preguntas de sí/no y con palabras interrogativas", fr: "Questions fermées et questions avec mots interrogatifs", pt: "Perguntas de sim/não e com pronomes interrogativos", ko: "Yes/No 의문문과 Wh- 의문문" } },

  { id: "001", level: "A2", title: { en: "Past Progressive Tense", es: "Pasado continuo", fr: "Passé progressif", pt: "Pretérito contínuo", ko: "과거진행시제" } },
  { id: "002", level: "A2", title: { en: "Simple Present vs. Present Progressive", es: "Presente simple vs. presente continuo", fr: "Présent simple vs. présent progressif", pt: "Presente simples vs. presente contínuo", ko: "단순현재 vs. 현재진행" } },
  { id: "003", level: "A2", title: { en: "Future with \"Going To\"", es: "Futuro con \"Going To\"", fr: "Le futur avec « Going To »", pt: "Futuro com \"Going To\"", ko: "\"Going To\"를 이용한 미래표현" } },
  { id: "004", level: "A2", title: { en: "Future with \"Will\"", es: "Futuro con \"Will\"", fr: "Le futur avec « Will »", pt: "Futuro com \"Will\"", ko: "\"Will\"을 이용한 미래표현" } },
  { id: "005", level: "A2", title: { en: "Will vs. Going To", es: "\"Will\" vs. \"Going To\"", fr: "« Will » vs. « Going To »", pt: "\"Will\" vs. \"Going To\"", ko: "Will vs. Going To" } },
  { id: "006", level: "A2", title: { en: "Modal Verbs: Can / Could", es: "Verbos modales: Can / Could", fr: "Verbes modaux : Can / Could", pt: "Verbos modais: Can / Could", ko: "조동사: Can / Could" } },
  { id: "007", level: "A2", title: { en: "Modal Verbs: Must / Have To", es: "Verbos modales: Must / Have To", fr: "Verbes modaux : Must / Have To", pt: "Verbos modais: Must / Have To", ko: "조동사: Must / Have To" } },
  { id: "008", level: "A2", title: { en: "Modal Verbs: Should / Ought To / Had Better", es: "Verbos modales: Should / Ought To / Had Better", fr: "Verbes modaux : Should / Ought To / Had Better", pt: "Verbos modais: Should / Ought To / Had Better", ko: "조동사: Should / Ought To / Had Better" } },
  { id: "009", level: "A2", title: { en: "Present Perfect: Introduction", es: "Presente perfecto: introducción", fr: "Le present perfect : introduction", pt: "Present perfect: introdução", ko: "현재완료: 소개" } },
  { id: "010", level: "A2", title: { en: "Present Perfect vs. Simple Past", es: "Presente perfecto vs. pasado simple", fr: "Present perfect vs. passé simple", pt: "Present perfect vs. passado simples", ko: "현재완료 vs. 단순과거" } },
  { id: "011", level: "A2", title: { en: "The Passive: Simple Forms", es: "La voz pasiva: formas básicas", fr: "La voix passive : formes simples", pt: "Voz passiva: formas básicas", ko: "수동태: 기본형" } },
  { id: "012", level: "A2", title: { en: "Count and Noncount Nouns", es: "Sustantivos contables e incontables", fr: "Noms dénombrables et indénombrables", pt: "Substantivos contáveis e incontáveis", ko: "가산명사와 불가산명사" } },
  { id: "013", level: "A2", title: { en: "Expressions of Quantity", es: "Expresiones de cantidad", fr: "Expressions de quantité", pt: "Expressões de quantidade", ko: "수량 표현" } },
  { id: "014", level: "A2", title: { en: "Some and Any in Affirmative and Negative Contexts", es: "Some y Any en contextos afirmativos y negativos", fr: "Some et Any dans les phrases affirmatives et négatives", pt: "Some e Any em contextos afirmativos e negativos", ko: "긍정문과 부정문에서의 Some과 Any" } },
  { id: "015", level: "A2", title: { en: "The: Referring to Specific and Known Referents", es: "The: referencia a elementos específicos y conocidos", fr: "The : référence à des éléments spécifiques et connus", pt: "The: referência a elementos específicos e conhecidos", ko: "The: 특정하고 알려진 대상 지칭" } },
  { id: "016", level: "A2", title: { en: "Prepositions of Time: At, In, and On", es: "Preposiciones de tiempo: At, In y On", fr: "Prépositions de temps : At, In et On", pt: "Preposições de tempo: At, In e On", ko: "시간 전치사: At, In, On" } },
  { id: "017", level: "A2", title: { en: "Comparatives and Superlatives", es: "Comparativos y superlativos", fr: "Comparatifs et superlatifs", pt: "Comparativos e superlativos", ko: "비교급과 최상급" } },
  { id: "018", level: "A2", title: { en: "Gerunds: Basic Use", es: "Gerundios: uso básico", fr: "Gérondifs : utilisation de base", pt: "Gerúndios: uso básico", ko: "동명사: 기본 용법" } },
  { id: "019", level: "A2", title: { en: "Infinitives: Basic Use", es: "Infinitivos: uso básico", fr: "Infinitifs : utilisation de base", pt: "Infinitivos: uso básico", ko: "부정사: 기본 용법" } },
  { id: "020", level: "A2", title: { en: "Relative Clauses: Subject Position (who/which/that)", es: "Oraciones de relativo: función de sujeto (who/which/that)", fr: "Propositions relatives : fonction sujet (who/which/that)", pt: "Orações relativas: função de sujeito (who/which/that)", ko: "관계대명사절: 주어 역할 (who/which/that)" } },
  { id: "021", level: "A2", title: { en: "Reflexive Pronouns", es: "Pronombres reflexivos", fr: "Pronoms réfléchis", pt: "Pronomes reflexivos", ko: "재귀대명사" } },
  { id: "022", level: "A2", title: { en: "Conditional Sentences: Present Real", es: "Oraciones condicionales: presente real", fr: "Phrases conditionnelles : présent réel", pt: "Frases condicionais: presente real", ko: "조건문: 현재 실현 가능" } },
  { id: "023", level: "A2", title: { en: "Forms and Uses of \"Other\"", es: "Formas y usos de \"Other\"", fr: "Formes et emplois de « Other »", pt: "Formas e usos de \"Other\"", ko: "\"Other\"의 형태와 용법" } },

  { id: "001", level: "B1", title: { en: "Present Perfect Progressive", es: "Presente perfecto continuo", fr: "Present perfect progressif", pt: "Present perfect contínuo", ko: "현재완료진행형" } },
  { id: "002", level: "B1", title: { en: "Past Perfect", es: "Pretérito pluscuamperfecto", fr: "Plus-que-parfait", pt: "Pretérito mais-que-perfeito", ko: "과거완료" } },
  { id: "003", level: "B1", title: { en: "Subject-Verb Agreement: Basic Rules", es: "Concordancia entre sujeto y verbo: reglas básicas", fr: "Accord sujet-verbe : règles de base", pt: "Concordância entre sujeito e verbo: regras básicas", ko: "주어-동사 일치: 기본 규칙" } },
  { id: "004", level: "B1", title: { en: "Subject-Verb Agreement: Special Cases", es: "Concordancia entre sujeto y verbo: casos especiales", fr: "Accord sujet-verbe : cas particuliers", pt: "Concordância entre sujeito e verbo: casos especiais", ko: "주어-동사 일치: 특수한 경우" } },
  { id: "005", level: "B1", title: { en: "Indefinite Pronouns and Agreement", es: "Pronombres indefinidos y concordancia", fr: "Pronoms indéfinis et accord", pt: "Pronomes indefinidos e concordância", ko: "부정대명사와 일치" } },
  { id: "006", level: "B1", title: { en: "Impersonal Pronouns: You / One / They", es: "Pronombres impersonales: You / One / They", fr: "Pronoms impersonnels : You / One / They", pt: "Pronomes impessoais: You / One / They", ko: "비인칭대명사: You / One / They" } },
  { id: "007", level: "B1", title: { en: "No, None, and Negative Compound Pronouns", es: "No, None y pronombres compuestos negativos", fr: "No, None et pronoms composés négatifs", pt: "No, None e pronomes compostos negativos", ko: "No, None과 부정 복합대명사" } },
  { id: "008", level: "B1", title: { en: "Much, Many, Little, and Few as Quantity Modifiers", es: "Much, Many, Little y Few como cuantificadores", fr: "Much, Many, Little et Few comme quantificateurs", pt: "Much, Many, Little e Few como quantificadores", ko: "수량 수식어로서의 Much, Many, Little, Few" } },
  { id: "009", level: "B1", title: { en: "All, Most, and None with Nouns and Pronouns", es: "All, Most y None con sustantivos y pronombres", fr: "All, Most et None avec noms et pronoms", pt: "All, Most e None com substantivos e pronomes", ko: "명사·대명사와 함께 쓰이는 All, Most, None" } },
  { id: "010", level: "B1", title: { en: "Both, Neither, and Either for Paired Reference", es: "Both, Neither y Either para referencias dobles", fr: "Both, Neither et Either pour les références par paire", pt: "Both, Neither e Either para referências em pares", ko: "짝을 이루는 대상을 가리키는 Both, Neither, Either" } },
  { id: "011", level: "B1", title: { en: "The with Schools, Work, Home, and Institutions", es: "The con escuelas, trabajo, hogar e instituciones", fr: "The avec les écoles, le travail, la maison et les institutions", pt: "The com escolas, trabalho, casa e instituições", ko: "학교, 직장, 집, 기관과 함께 쓰는 The" } },
  { id: "012", level: "B1", title: { en: "Order of Adjectives Before Nouns", es: "Orden de los adjetivos antes del sustantivo", fr: "Ordre des adjectifs avant le nom", pt: "Ordem dos adjetivos antes do substantivo", ko: "명사 앞 형용사의 어순" } },
  { id: "013", level: "B1", title: { en: "Adjectives and Adverbs: Form and Function", es: "Adjetivos y adverbios: forma y función", fr: "Adjectifs et adverbes : forme et fonction", pt: "Adjetivos e advérbios: forma e função", ko: "형용사와 부사: 형태와 기능" } },
  { id: "014", level: "B1", title: { en: "Degree Adverbs: Quite, Pretty, Rather, and Fairly", es: "Adverbios de grado: Quite, Pretty, Rather y Fairly", fr: "Adverbes de degré : Quite, Pretty, Rather et Fairly", pt: "Advérbios de intensidade: Quite, Pretty, Rather e Fairly", ko: "정도부사: Quite, Pretty, Rather, Fairly" } },
  { id: "015", level: "B1", title: { en: "Word Order: Verb, Object, Place, and Time", es: "Orden de palabras: verbo, objeto, lugar y tiempo", fr: "Ordre des mots : verbe, objet, lieu et temps", pt: "Ordem das palavras: verbo, objeto, lugar e tempo", ko: "어순: 동사, 목적어, 장소, 시간" } },
  { id: "016", level: "B1", title: { en: "Still, Anymore, Yet, and Already", es: "Still, Anymore, Yet y Already", fr: "Still, Anymore, Yet et Already", pt: "Still, Anymore, Yet e Already", ko: "Still, Anymore, Yet, Already" } },
  { id: "017", level: "B1", title: { en: "During, For, and While: Time Span Expressions", es: "During, For y While: expresiones de tiempo", fr: "During, For et While : expressions de durée", pt: "During, For e While: expressões de tempo", ko: "기간 표현: During, For, While" } },
  { id: "018", level: "B1", title: { en: "Prepositions of Place: At, In, and On Extended", es: "Preposiciones de lugar: At, In y On (uso ampliado)", fr: "Prépositions de lieu : At, In et On (usage avancé)", pt: "Preposições de lugar: At, In e On (uso ampliado)", ko: "장소 전치사: At, In, On (확장)" } },
  { id: "019", level: "B1", title: { en: "Phrasal Verbs: In and Out Patterns", es: "Phrasal verbs: patrones con In y Out", fr: "Phrasal verbs : modèles avec In et Out", pt: "Phrasal verbs: padrões com In e Out", ko: "구동사: In과 Out 패턴" } },
  { id: "020", level: "B1", title: { en: "Phrasal Verbs: On and Off Patterns", es: "Phrasal verbs: patrones con On y Off", fr: "Phrasal verbs : modèles avec On et Off", pt: "Phrasal verbs: padrões com On e Off", ko: "구동사: On과 Off 패턴" } },
  { id: "021", level: "B1", title: { en: "Phrasal Verbs: Up and Down Patterns", es: "Phrasal verbs: patrones con Up y Down", fr: "Phrasal verbs : modèles avec Up et Down", pt: "Phrasal verbs: padrões com Up e Down", ko: "구동사: Up과 Down 패턴" } },
  { id: "022", level: "B1", title: { en: "Coordinating Conjunctions (and, or, but, so)", es: "Conjunciones coordinantes (and, or, but, so)", fr: "Conjonctions de coordination (and, or, but, so)", pt: "Conjunções coordenativas (and, or, but, so)", ko: "등위접속사 (and, or, but, so)" } },
  { id: "023", level: "B1", title: { en: "Correlative Conjunctions (both...and, either...or, neither...nor)", es: "Conjunciones correlativas (both...and, either...or, neither...nor)", fr: "Conjonctions corrélatives (both...and, either...or, neither...nor)", pt: "Conjunções correlativas (both...and, either...or, neither...nor)", ko: "상관접속사 (both...and, either...or, neither...nor)" } },
  { id: "024", level: "B1", title: { en: "Direct and Indirect Speech: Statements", es: "Estilo directo e indirecto: enunciados", fr: "Discours direct et indirect : déclarations", pt: "Discurso direto e indireto: afirmações", ko: "직접화법과 간접화법: 평서문" } },
  { id: "025", level: "B1", title: { en: "Direct and Indirect Speech: Questions", es: "Estilo directo e indirecto: preguntas", fr: "Discours direct et indirect : questions", pt: "Discurso direto e indireto: perguntas", ko: "직접화법과 간접화법: 의문문" } },
  { id: "026", level: "B1", title: { en: "Noun Clauses Beginning with a Question Word", es: "Oraciones subordinadas sustantivas con palabra interrogativa", fr: "Propositions nominales commençant par un mot interrogatif", pt: "Orações substantivas iniciadas por palavra interrogativa", ko: "의문사로 시작하는 명사절" } },
  { id: "027", level: "B1", title: { en: "Noun Clauses Beginning with \"That\"", es: "Oraciones subordinadas sustantivas con \"That\"", fr: "Propositions nominales introduites par « That »", pt: "Orações substantivas iniciadas por \"That\"", ko: "\"That\"로 시작하는 명사절" } },
  { id: "028", level: "B1", title: { en: "Relative Clauses: Object Position", es: "Oraciones de relativo: función de objeto", fr: "Propositions relatives : fonction objet", pt: "Orações relativas: função de objeto", ko: "관계대명사절: 목적어 역할" } },
  { id: "029", level: "B1", title: { en: "Relative Clauses with Whose, Where, and When", es: "Oraciones de relativo con Whose, Where y When", fr: "Propositions relatives avec Whose, Where et When", pt: "Orações relativas com Whose, Where e When", ko: "Whose, Where, When을 이용한 관계사절" } },
  { id: "030", level: "B1", title: { en: "Modal Verbs: May / Might for Possibility", es: "Verbos modales: May / Might para posibilidad", fr: "Verbes modaux : May / Might pour exprimer la possibilité", pt: "Verbos modais: May / Might para possibilidade", ko: "조동사: 가능성을 나타내는 May / Might" } },
  { id: "031", level: "B1", title: { en: "Modal Verbs for Polite Requests", es: "Verbos modales para hacer peticiones corteses", fr: "Verbes modaux pour les demandes polies", pt: "Verbos modais para pedidos educados", ko: "정중한 요청을 위한 조동사" } },
  { id: "032", level: "B1", title: { en: "Used To and Would for Past Habits", es: "Used To y Would para hábitos pasados", fr: "Used To et Would pour les habitudes passées", pt: "Used To e Would para hábitos no passado", ko: "과거의 습관을 나타내는 Used To와 Would" } },
  { id: "033", level: "B1", title: { en: "Be Used To / Get Used To", es: "Be Used To / Get Used To", fr: "Be Used To / Get Used To", pt: "Be Used To / Get Used To", ko: "Be Used To / Get Used To" } },
  { id: "034", level: "B1", title: { en: "Phrasal Verbs: Basic Patterns", es: "Phrasal verbs: patrones básicos", fr: "Phrasal verbs : modèles de base", pt: "Phrasal verbs: padrões básicos", ko: "구동사: 기본 패턴" } },
  { id: "035", level: "B1", title: { en: "Preposition Combinations with Adjectives and Verbs", es: "Combinaciones de preposiciones con adjetivos y verbos", fr: "Combinaisons de prépositions avec adjectifs et verbes", pt: "Combinações de preposições com adjetivos e verbos", ko: "형용사·동사와 결합하는 전치사" } },
  { id: "036", level: "B1", title: { en: "Adverb Clauses of Time", es: "Oraciones adverbiales de tiempo", fr: "Propositions adverbiales de temps", pt: "Orações adverbiais de tempo", ko: "시간을 나타내는 부사절" } },
  { id: "037", level: "B1", title: { en: "Adverb Clauses of Reason", es: "Oraciones adverbiales de causa", fr: "Propositions adverbiales de cause", pt: "Orações adverbiais de causa", ko: "이유를 나타내는 부사절" } },
  { id: "038", level: "B1", title: { en: "Conditional Sentences: Future Real", es: "Oraciones condicionales: futuro real", fr: "Phrases conditionnelles : futur réel", pt: "Frases condicionais: futuro real", ko: "조건문: 미래 실현 가능" } },
  { id: "039", level: "B1", title: { en: "Conditional Sentences: Present/Future Unreal", es: "Oraciones condicionales: presente/futuro irreal", fr: "Phrases conditionnelles : présent/futur irréel", pt: "Frases condicionais: presente/futuro irreal", ko: "조건문: 현재·미래의 비현실" } },
  { id: "040", level: "B1", title: { en: "Tag Questions", es: "Preguntas confirmativas (Tag Questions)", fr: "Questions-tags", pt: "Perguntas confirmatórias (Tag Questions)", ko: "부가의문문" } },
  { id: "041", level: "B1", title: { en: "Negative Questions and Shortened Yes/No Questions", es: "Preguntas negativas y preguntas abreviadas de sí/no", fr: "Questions négatives et questions fermées abrégées", pt: "Perguntas negativas e perguntas abreviadas de sim/não", ko: "부정의문문과 축약형 Yes/No 의문문" } },

  { id: "001", level: "B2", title: { en: "Conditional Sentences: Past Unreal", es: "Oraciones condicionales: pasado irreal", fr: "Phrases conditionnelles : passé irréel", pt: "Frases condicionais: passado irreal", ko: "조건문: 과거의 비현실" } },
  { id: "002", level: "B2", title: { en: "Mixed Time in Conditional Sentences", es: "Condicionales con tiempos mixtos", fr: "Temps mixtes dans les phrases conditionnelles", pt: "Tempos mistos nas frases condicionais", ko: "조건문에서의 혼합 시제" } },
  { id: "003", level: "B2", title: { en: "Omitting \"If\" / Inverted Conditional Forms", es: "Omisión de \"If\" / formas condicionales invertidas", fr: "Suppression de « If » / formes conditionnelles inversées", pt: "Omissão de \"If\" / formas condicionais invertidas", ko: "\"If\" 생략 / 도치된 조건문" } },
  { id: "004", level: "B2", title: { en: "Implied Conditions", es: "Condiciones implícitas", fr: "Conditions implicites", pt: "Condições implícitas", ko: "암시된 조건" } },
  { id: "005", level: "B2", title: { en: "As If / As Though", es: "As If / As Though", fr: "As If / As Though", pt: "As If / As Though", ko: "As If / As Though" } },
  { id: "006", level: "B2", title: { en: "As: Simultaneous and Causal Adverb Clauses", es: "As: oraciones adverbiales de simultaneidad y causa", fr: "As : propositions adverbiales de simultanéité et de cause", pt: "As: orações adverbiais de simultaneidade e causa", ko: "As: 동시성과 이유를 나타내는 부사절" } },
  { id: "007", level: "B2", title: { en: "Like and As: Comparison and Role Expression", es: "Like y As: comparación y expresión de función", fr: "Like et As : comparaison et rôle", pt: "Like e As: comparação e função", ko: "Like와 As: 비교와 역할 표현" } },
  { id: "008", level: "B2", title: { en: "Wish and Hoped-For Outcomes", es: "Wish y resultados esperados", fr: "Wish et résultats souhaités", pt: "Wish e resultados esperados", ko: "Wish와 바라는 결과 표현" } },
  { id: "009", level: "B2", title: { en: "In Case: Precautionary Purpose Clauses", es: "In Case: oraciones de propósito preventivo", fr: "In Case : propositions exprimant la précaution", pt: "In Case: orações de finalidade preventiva", ko: "In Case: 예방적 목적을 나타내는 절" } },
  { id: "010", level: "B2", title: { en: "Unless, As Long As, and Provided: Conditional Variants", es: "Unless, As Long As y Provided: variantes condicionales", fr: "Unless, As Long As et Provided : variantes conditionnelles", pt: "Unless, As Long As e Provided: variantes condicionais", ko: "조건문의 변형: Unless, As Long As, Provided" } },
  { id: "011", level: "B2", title: { en: "Future Progressive and Future Perfect", es: "Futuro continuo y futuro perfecto", fr: "Futur progressif et futur antérieur", pt: "Futuro contínuo e futuro perfeito", ko: "미래진행형과 미래완료형" } },
  { id: "012", level: "B2", title: { en: "Past Perfect Progressive", es: "Pretérito pluscuamperfecto continuo", fr: "Plus-que-parfait progressif", pt: "Pretérito mais-que-perfeito contínuo", ko: "과거완료진행형" } },
  { id: "013", level: "B2", title: { en: "Degrees of Certainty: Present and Future", es: "Grados de certeza: presente y futuro", fr: "Degrés de certitude : présent et futur", pt: "Graus de certeza: presente e futuro", ko: "확신의 정도: 현재와 미래" } },
  { id: "014", level: "B2", title: { en: "Degrees of Certainty: Past", es: "Grados de certeza: pasado", fr: "Degrés de certitude : passé", pt: "Graus de certeza: passado", ko: "확신의 정도: 과거" } },
  { id: "015", level: "B2", title: { en: "Progressive Forms of Modal Verbs", es: "Formas progresivas de los verbos modales", fr: "Formes progressives des verbes modaux", pt: "Formas progressivas dos verbos modais", ko: "조동사의 진행형" } },
  { id: "016", level: "B2", title: { en: "Combining Modals with Phrasal Modals", es: "Combinación de verbos modales y phrasal modals", fr: "Combinaison des verbes modaux et phrasal modals", pt: "Combinação de verbos modais e phrasal modals", ko: "조동사와 구동사형 조동사의 결합" } },
  { id: "017", level: "B2", title: { en: "Ability: Can and Could (Extended Use)", es: "Capacidad: Can y Could (uso ampliado)", fr: "Capacité : Can et Could (usage avancé)", pt: "Capacidade: Can e Could (uso ampliado)", ko: "능력: Can과 Could (확장 용법)" } },
  { id: "018", level: "B2", title: { en: "Would for a Repeated Action in the Past", es: "Would para acciones repetidas en el pasado", fr: "Would pour les actions répétées dans le passé", pt: "Would para ações repetidas no passado", ko: "과거의 반복적 행동을 나타내는 Would" } },
  { id: "019", level: "B2", title: { en: "Expressing Preference: Would Rather", es: "Expresar preferencia: Would Rather", fr: "Exprimer une préférence : Would Rather", pt: "Expressando preferência: Would Rather", ko: "선호 표현: Would Rather" } },
  { id: "020", level: "B2", title: { en: "Each and Every: Distributive Reference", es: "Each y Every: referencia distributiva", fr: "Each et Every : référence distributive", pt: "Each e Every: referência distributiva", ko: "개별 지칭: Each와 Every" } },
  { id: "021", level: "B2", title: { en: "Even: Emphatic Addition and Contrast", es: "Even: énfasis y contraste", fr: "Even : emphase et contraste", pt: "Even: ênfase e contraste", ko: "Even: 강조 추가와 대조" } },
  { id: "022", level: "B2", title: { en: "By and Until: Expressing Deadline and Duration", es: "By y Until: plazo y duración", fr: "By et Until : échéance et durée", pt: "By e Until: prazo e duração", ko: "마감과 기간 표현: By와 Until" } },
  { id: "023", level: "B2", title: { en: "Prepositions: By and Other Fixed Uses", es: "Preposiciones: By y otros usos fijos", fr: "Prépositions : By et autres emplois fixes", pt: "Preposições: By e outros usos fixos", ko: "전치사: By와 그 밖의 고정 용법" } },
  { id: "024", level: "B2", title: { en: "Noun + Preposition Combinations", es: "Combinaciones de sustantivo + preposición", fr: "Combinaisons nom + préposition", pt: "Combinações de substantivo + preposição", ko: "명사 + 전치사 결합" } },
  { id: "025", level: "B2", title: { en: "Verb + Preposition: Extended Patterns", es: "Verbo + preposición: patrones ampliados", fr: "Verbe + préposition : modèles avancés", pt: "Verbo + preposição: padrões avançados", ko: "동사 + 전치사: 확장 패턴" } },
  { id: "026", level: "B2", title: { en: "Phrasal Verbs: Away and Back Patterns", es: "Phrasal verbs: patrones con Away y Back", fr: "Phrasal verbs : modèles avec Away et Back", pt: "Phrasal verbs: padrões com Away e Back", ko: "구동사: Away와 Back 패턴" } },
  { id: "027", level: "B2", title: { en: "The Passive: Indirect Objects as Passive Subjects", es: "La voz pasiva: objetos indirectos como sujeto", fr: "La voix passive : objets indirects comme sujets", pt: "Voz passiva: objetos indiretos como sujeito", ko: "수동태: 간접목적어가 주어가 되는 경우" } },
  { id: "028", level: "B2", title: { en: "The Passive with Modals and Phrasal Modals", es: "La voz pasiva con verbos modales y phrasal modals", fr: "La voix passive avec verbes modaux et phrasal modals", pt: "Voz passiva com verbos modais e phrasal modals", ko: "조동사·구동사형 조동사와 함께 쓰이는 수동태" } },
  { id: "029", level: "B2", title: { en: "Stative Passive", es: "Pasiva de estado", fr: "Passif d'état", pt: "Passiva estativa", ko: "상태수동태" } },
  { id: "030", level: "B2", title: { en: "The Passive with \"Get\"", es: "La voz pasiva con \"Get\"", fr: "La voix passive avec « Get »", pt: "Voz passiva com \"Get\"", ko: "\"Get\"을 이용한 수동태" } },
  { id: "031", level: "B2", title: { en: "Participial Adjectives", es: "Adjetivos participiales", fr: "Adjectifs participiaux", pt: "Adjetivos participiais", ko: "분사형 형용사" } },
  { id: "032", level: "B2", title: { en: "Gerunds as Objects of Prepositions", es: "Gerundios como objeto de preposiciones", fr: "Gérondifs comme compléments de prépositions", pt: "Gerúndios como objeto de preposições", ko: "전치사의 목적어로 쓰이는 동명사" } },
  { id: "033", level: "B2", title: { en: "Verbs Followed by Gerunds vs. Infinitives", es: "Verbos seguidos de gerundio o infinitivo", fr: "Verbes suivis d'un gérondif ou d'un infinitif", pt: "Verbos seguidos de gerúndio ou infinitivo", ko: "동명사/부정사를 취하는 동사" } },
  { id: "034", level: "B2", title: { en: "Special Expressions Followed by -ing", es: "Expresiones especiales seguidas de -ing", fr: "Expressions particulières suivies de -ing", pt: "Expressões especiais seguidas de -ing", ko: "-ing가 뒤따르는 특수 표현" } },
  { id: "035", level: "B2", title: { en: "It + Infinitive; Gerunds and Infinitives as Subjects", es: "It + infinitivo; gerundios e infinitivos como sujeto", fr: "It + infinitif ; gérondifs et infinitifs comme sujets", pt: "It + infinitivo; gerúndios e infinitivos como sujeito", ko: "It + 부정사; 주어로 쓰이는 동명사와 부정사" } },
  { id: "036", level: "B2", title: { en: "Infinitive of Purpose", es: "Infinitivo de finalidad", fr: "Infinitif de but", pt: "Infinitivo de finalidade", ko: "목적을 나타내는 부정사" } },
  { id: "037", level: "B2", title: { en: "Adjectives Followed by Infinitives", es: "Adjetivos seguidos de infinitivo", fr: "Adjectifs suivis d'un infinitif", pt: "Adjetivos seguidos de infinitivo", ko: "부정사가 뒤따르는 형용사" } },
  { id: "038", level: "B2", title: { en: "Too and Enough with Infinitives", es: "Too y Enough con infinitivos", fr: "Too et Enough avec les infinitifs", pt: "Too e Enough com infinitivos", ko: "부정사와 함께 쓰이는 Too와 Enough" } },
  { id: "039", level: "B2", title: { en: "Causative Verbs: Make, Have, Get", es: "Verbos causativos: Make, Have, Get", fr: "Verbes causatifs : Make, Have, Get", pt: "Verbos causativos: Make, Have, Get", ko: "사역동사: Make, Have, Get" } },

  { id: "001", level: "C1", title: { en: "Passive and Past Forms of Infinitives and Gerunds", es: "Formas pasivas y pasadas de infinitivos y gerundios", fr: "Formes passives et passées des infinitifs et gérondifs", pt: "Formas passivas e passadas de infinitivos e gerúndios", ko: "부정사와 동명사의 수동형·과거형" } },
  { id: "002", level: "C1", title: { en: "Gerunds and Passive Infinitives After \"Need\"", es: "Gerundios e infinitivos pasivos después de \"Need\"", fr: "Gérondifs et infinitifs passifs après « Need »", pt: "Gerúndios e infinitivos passivos após \"Need\"", ko: "\"Need\" 뒤에 오는 동명사와 수동부정사" } },
  { id: "003", level: "C1", title: { en: "Possessive Forms Modifying a Gerund", es: "Formas posesivas que modifican un gerundio", fr: "Formes possessives modifiant un gérondif", pt: "Formas possessivas modificando um gerúndio", ko: "동명사를 수식하는 소유격" } },
  { id: "004", level: "C1", title: { en: "Verbs of Perception + Object + Base Form/-ing", es: "Verbos de percepción + objeto + forma base/-ing", fr: "Verbes de perception + objet + forme de base/-ing", pt: "Verbos de percepção + objeto + forma base/-ing", ko: "지각동사 + 목적어 + 원형/-ing" } },
  { id: "005", level: "C1", title: { en: "Simple Form After \"Let\" and \"Help\"", es: "Forma base después de \"Let\" y \"Help\"", fr: "Forme de base après « Let » et « Help »", pt: "Forma básica após \"Let\" e \"Help\"", ko: "\"Let\"과 \"Help\" 뒤의 원형부정사" } },
  { id: "006", level: "C1", title: { en: "Relative Clauses with Expressions of Quantity", es: "Oraciones de relativo con expresiones de cantidad", fr: "Propositions relatives avec expressions de quantité", pt: "Orações relativas com expressões de quantidade", ko: "수량 표현이 포함된 관계사절" } },
  { id: "007", level: "C1", title: { en: "Noun + \"Of Which\"", es: "Sustantivo + \"Of Which\"", fr: "Nom + « Of Which »", pt: "Substantivo + \"Of Which\"", ko: "명사 + \"Of Which\"" } },
  { id: "008", level: "C1", title: { en: "\"Which\" Modifying a Whole Sentence", es: "\"Which\" modificando una oración completa", fr: "« Which » modifiant une phrase entière", pt: "\"Which\" modificando uma frase inteira", ko: "문장 전체를 수식하는 \"Which\"" } },
  { id: "009", level: "C1", title: { en: "Reducing Relative Clauses to Phrases", es: "Reducción de oraciones de relativo a frases", fr: "Réduction des propositions relatives en groupes de mots", pt: "Redução de orações relativas para frases", ko: "관계사절의 구로의 축약" } },
  { id: "010", level: "C1", title: { en: "Reducing Adverb Clauses to Modifying Phrases", es: "Reducción de oraciones adverbiales a frases modificadoras", fr: "Réduction des propositions adverbiales en groupes modifiants", pt: "Redução de orações adverbiais para expressões modificadoras", ko: "부사절의 수식구로의 축약" } },
  { id: "011", level: "C1", title: { en: "Reported Speech: Verb Form Shifts in Noun Clauses", es: "Estilo indirecto: cambios verbales en oraciones sustantivas", fr: "Discours indirect : changements de temps dans les propositions nominales", pt: "Discurso indireto: mudanças verbais em orações substantivas", ko: "간접화법: 명사절에서의 동사 형태 변화" } },
  { id: "012", level: "C1", title: { en: "Using the Subjunctive in Noun Clauses", es: "Uso del subjuntivo en oraciones sustantivas", fr: "Utilisation du subjonctif dans les propositions nominales", pt: "Uso do subjuntivo em orações substantivas", ko: "명사절에서의 가정법 사용" } },
  { id: "013", level: "C1", title: { en: "Using \"-ever\" Words", es: "Uso de palabras terminadas en \"-ever\"", fr: "Utilisation des mots en « -ever »", pt: "Uso de palavras terminadas em \"-ever\"", ko: "\"-ever\" 단어의 사용" } },
  { id: "014", level: "C1", title: { en: "Quoted Speech: Punctuation and Mechanics", es: "Discurso citado: puntuación y reglas de escritura", fr: "Discours cité : ponctuation et règles d'écriture", pt: "Discurso citado: pontuação e convenções", ko: "인용화법: 구두점과 표기 규칙" } },
  { id: "015", level: "C1", title: { en: "Information Structure: Cleft Sentences and Fronting", es: "Estructura de la información: oraciones hendidas y anticipación", fr: "Structure de l'information : phrases clivées et mise en avant", pt: "Estrutura da informação: cleft sentences e topicalização", ko: "정보구조: 분열문과 전치" } },
  { id: "016", level: "C1", title: { en: "Leaving Out Words: Ellipsis", es: "Elisión: omisión de palabras", fr: "Ellipse : omission de mots", pt: "Elipse: omissão de palavras", ko: "생략: 단어 생략" } },
  { id: "017", level: "C1", title: { en: "Replacing Words: Substitution Forms (do so, one, the same)", es: "Sustitución de palabras (do so, one, the same)", fr: "Substitution de mots (do so, one, the same)", pt: "Substituição de palavras (do so, one, the same)", ko: "대용형: do so, one, the same" } },
  { id: "018", level: "C1", title: { en: "Spoken English vs. Written English", es: "Inglés hablado vs. inglés escrito", fr: "Anglais parlé vs. anglais écrit", pt: "Inglês falado vs. inglês escrito", ko: "구어체 영어 vs. 문어체 영어" } },
  { id: "019", level: "C1", title: { en: "Word-Building: Forming New Words", es: "Formación de palabras", fr: "Formation des mots", pt: "Formação de palavras", ko: "단어 형성: 새로운 단어 만들기" } },
  { id: "020", level: "C1", title: { en: "Noun Phrase Structure and Modifiers", es: "Estructura del sintagma nominal y modificadores", fr: "Structure du groupe nominal et modificateurs", pt: "Estrutura do sintagma nominal e modificadores", ko: "명사구의 구조와 수식어" } },
  { id: "021", level: "C1", title: { en: "Adverbials: Types and Position", es: "Adverbiales: tipos y posición", fr: "Compléments circonstanciels : types et position", pt: "Adjuntos adverbiais: tipos e posição", ko: "부사어: 종류와 위치" } },
  { id: "022", level: "C1", title: { en: "Numbers and Measurements", es: "Números y medidas", fr: "Nombres et mesures", pt: "Números e medidas", ko: "숫자와 측정 표현" } },

  { id: "001", level: "C2", title: { en: "Cause-and-Effect Connectives: Because Of / Due To", es: "Conectores de causa y efecto: Because Of / Due To", fr: "Connecteurs de cause et de conséquence : Because Of / Due To", pt: "Conectores de causa e efeito: Because Of / Due To", ko: "인과 연결어: Because Of / Due To" } },
  { id: "002", level: "C2", title: { en: "Cause-and-Effect Connectives: Therefore / Consequently", es: "Conectores de causa y efecto: Therefore / Consequently", fr: "Connecteurs de cause et de conséquence : Therefore / Consequently", pt: "Conectores de causa e efeito: Therefore / Consequently", ko: "인과 연결어: Therefore / Consequently" } },
  { id: "003", level: "C2", title: { en: "Result Structures: Such...That / So...That", es: "Estructuras de resultado: Such...That / So...That", fr: "Structures de résultat : Such...That / So...That", pt: "Estruturas de resultado: Such...That / So...That", ko: "결과 구문: Such...That / So...That" } },
  { id: "004", level: "C2", title: { en: "Expressing Purpose: So That", es: "Expresar finalidad: So That", fr: "Exprimer le but : So That", pt: "Expressando finalidade: So That", ko: "목적 표현: So That" } },
  { id: "005", level: "C2", title: { en: "Showing Contrast: Unexpected Result", es: "Expresar contraste: resultado inesperado", fr: "Exprimer le contraste : résultat inattendu", pt: "Expressando contraste: resultado inesperado", ko: "대조 표현: 예상 밖의 결과" } },
  { id: "006", level: "C2", title: { en: "Showing Direct Contrast: While / Whereas", es: "Expresar contraste directo: While / Whereas", fr: "Exprimer un contraste direct : While / Whereas", pt: "Expressando contraste direto: While / Whereas", ko: "직접적 대조 표현: While / Whereas" } },
  { id: "007", level: "C2", title: { en: "Expressing Conditions: Otherwise / Or Else", es: "Expresar condiciones: Otherwise / Or Else", fr: "Exprimer des conditions : Otherwise / Or Else", pt: "Expressando condições: Otherwise / Or Else", ko: "조건 표현: Otherwise / Or Else" } },
  { id: "008", level: "C2", title: { en: "Negation: Avoiding Double Negatives and Negative Inversion", es: "Negación: evitar dobles negaciones e inversión negativa", fr: "Négation : éviter les doubles négations et l'inversion négative", pt: "Negação: evitando dupla negação e inversão negativa", ko: "부정: 이중부정 피하기와 부정 도치" } },
  { id: "009", level: "C2", title: { en: "Parallel Structure", es: "Estructura paralela", fr: "Structure parallèle", pt: "Estrutura paralela", ko: "병렬구조" } },
  { id: "010", level: "C2", title: { en: "Stative Passive Verbs + Prepositions (Advanced Patterns)", es: "Verbos pasivos de estado + preposiciones (patrones avanzados)", fr: "Verbes passifs d'état + prépositions (modèles avancés)", pt: "Verbos passivos de estado + preposições (padrões avançados)", ko: "상태수동태 동사 + 전치사 (고급 패턴)" } },
  { id: "011", level: "C2", title: { en: "Subject-Verb Agreement: Advanced Irregularities", es: "Concordancia entre sujeto y verbo: irregularidades avanzadas", fr: "Accord sujet-verbe : irrégularités avancées", pt: "Concordância entre sujeito e verbo: irregularidades avançadas", ko: "주어-동사 일치: 고급 불규칙 사례" } },
  { id: "012", level: "C2", title: { en: "Advanced Article Usage: Generic Reference", es: "Uso avanzado de los artículos: referencia genérica", fr: "Utilisation avancée des articles : référence générique", pt: "Uso avançado dos artigos: referência genérica", ko: "관사의 고급 용법: 총칭 지칭" } },
  { id: "013", level: "C2", title: { en: "Advanced Quantifiers and Determiners", es: "Cuantificadores y determinantes avanzados", fr: "Quantificateurs et déterminants avancés", pt: "Quantificadores e determinantes avançados", ko: "고급 수량사와 한정사" } },
  { id: "014", level: "C2", title: { en: "Comparison: Advanced and Idiomatic Patterns", es: "Comparación: patrones avanzados e idiomáticos", fr: "Comparaison : structures avancées et idiomatiques", pt: "Comparação: padrões avançados e idiomáticos", ko: "비교: 고급 및 관용적 패턴" } },
  { id: "015", level: "C2", title: { en: "Phrasal Verbs and Prepositional Patterns: Advanced", es: "Phrasal verbs y patrones preposicionales: nivel avanzado", fr: "Phrasal verbs et structures prépositionnelles : niveau avancé", pt: "Phrasal verbs e padrões preposicionais: nível avançado", ko: "구동사와 전치사 패턴: 고급" } },
  { id: "016", level: "C2", title: { en: "Connectives for Giving Examples and Continuing an Idea", es: "Conectores para dar ejemplos y desarrollar una idea", fr: "Connecteurs pour donner des exemples et développer une idée", pt: "Conectores para dar exemplos e desenvolver uma ideia", ko: "예시 제시와 논지 연결을 위한 연결어" } },
];

/* ================= 페이지 ================= */

export default function Page() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyLink(undefined, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <main style={main}>
      <div style={container}>

        {/* HEADER */}
        <div style={{ ...headerRow, position: "relative", zIndex: 10 }}>
          <button
            type="button"
            onClick={() => { window.location.href = "/curriculum"; }}
            style={btnBack}
          >
            ← Back
          </button>

          <div style={headerActions}>
            <button
              type="button"
              onClick={handleCopy}
              style={btnSecondary}
            >
              Copy link
            </button>

            <button
              type="button"
              onClick={() => { window.location.href = "/app"; }}
              style={btnHeaderPrimary}
            >
              Unlock Full Access
            </button>
          </div>
        </div>

        {/* TITLE */}
        <h1 style={title}>🧩 Grammar Curriculum (English)</h1>
        <p style={descStrong}>
          With <b>one coupon</b>, you can study <b>one level (A1–C2)</b> for <b>30 days</b>.
        </p>

        {/* LIST (반복문 1개만 사용, 로직 없음) */}
        {CHAPTERS.map((c) => (
          <div key={`${c.level}-${c.id}`} style={card}>
            <div style={left}>
              <div style={numStyle}>{c.id}</div>
            </div>

            <div style={right}>
              <div style={levelBadge}>{c.level}</div>
              <div style={chapterTitle}>
                <div>{c.title.en}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {c.title.es} / {c.title.fr} / {c.title.pt}/ {c.title.ko}
                </div>
              </div>
            </div>
          </div>
        ))}

      </div>
      {copied && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            zIndex: 9999,
          }}
        >
          Link copied
        </div>
      )}
    </main>
  );
}

/* ================= 스타일 ================= */

const main: React.CSSProperties = {
  background: "#f9fafb",
  minHeight: "100vh",
};

const container: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "20px 16px 60px",
};
const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  paddingTop: "calc(env(safe-area-inset-top) + 8px)",
};

const headerActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
};

const baseBtn: React.CSSProperties = {
  height: 32,
  padding: "0 10px",
  fontSize: 12,
  lineHeight: 1,
  borderRadius: 8,
  WebkitAppearance: "none",
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const btnBack: React.CSSProperties = {
  ...baseBtn,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  ...baseBtn,
  border: "1px solid #ddd",
  background: "#f5f5f5",
  cursor: "pointer",
};

const btnHeaderPrimary: React.CSSProperties = {
  ...baseBtn,
  background: "#111",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
};

const title: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  marginBottom: 20,
};

const listWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const card: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: 12,
  borderRadius: 10,
  background: "#fff",
  border: "1px solid #eee",
};

const left: React.CSSProperties = {
  width: 50,
};

const numStyle: React.CSSProperties = {
  fontWeight: 700,
};

const right: React.CSSProperties = {
  flex: 1,
};

const levelBadge: React.CSSProperties = {
  fontSize: 12,
  color: "#4f46e5",
  fontWeight: 700,
};

const chapterTitle: React.CSSProperties = {
  fontSize: 14,
};

const linkReset: React.CSSProperties = {
  textDecoration: "none",
};
const descStrong: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#111",
  marginBottom: 24,
  lineHeight: 1.6,
};
