"use client";

import Link from "next/link";
import { useState } from "react";
import { copyLink } from "@/utils/share";
/* ================= 하드코딩 데이터 ================= */

const CHAPTERS = [
  { id: "001", level: "A1", title: { en: "Sentence Basics: Subject, Verb, and Object", es: "Fundamentos de la oración: sujeto, verbo y objeto", fr: "Les bases de la phrase : sujet, verbe et complément", pt: "Fundamentos da frase: sujeito, verbo e objeto" } },
  { id: "002", level: "A1", title: { en: "The Verb \"Be\" (Present Forms)", es: "El verbo «Be» (formas del presente)", fr: "Le verbe « Be » (formes du présent)", pt: "O verbo \"Be\" (formas do presente)" } },
  { id: "003", level: "A1", title: { en: "Personal Pronouns", es: "Pronombres personales", fr: "Pronoms personnels", pt: "Pronomes pessoais" } },
  { id: "004", level: "A1", title: { en: "Possessive Adjectives and Demonstratives", es: "Adjetivos posesivos y demostrativos", fr: "Adjectifs possessifs et démonstratifs", pt: "Adjetivos possessivos e demonstrativos" } },
  { id: "005", level: "A1", title: { en: "Articles: Basic Use of A/An and The", es: "Artículos: uso básico de A/An y The", fr: "Articles : utilisation de base de A/An et The", pt: "Artigos: uso básico de A/An e The" } },
  { id: "006", level: "A1", title: { en: "Plural Nouns", es: "Sustantivos en plural", fr: "Les noms au pluriel", pt: "Substantivos no plural" } },
  { id: "007", level: "A1", title: { en: "Possessive Nouns ('s)", es: "Sustantivos posesivos ('s)", fr: "Les noms possessifs ('s)", pt: "Substantivos possessivos ('s)" } },
  { id: "008", level: "A1", title: { en: "Simple Present Tense", es: "Presente simple", fr: "Présent simple", pt: "Presente simples" } },
  { id: "009", level: "A1", title: { en: "Present Progressive Tense", es: "Presente continuo", fr: "Présent progressif", pt: "Presente contínuo" } },
  { id: "010", level: "A1", title: { en: "Simple Past Tense", es: "Pasado simple", fr: "Passé simple", pt: "Passado simples" } },
  { id: "011", level: "A1", title: { en: "There + Be (Existence Structure)", es: "There + Be (estructura de existencia)", fr: "There + Be (structure d'existence)", pt: "There + Be (estrutura de existência)" } },
  { id: "012", level: "A1", title: { en: "Basic Prepositions of Place and Time", es: "Preposiciones básicas de lugar y tiempo", fr: "Prépositions de base de lieu et de temps", pt: "Preposições básicas de lugar e tempo" } },
  { id: "013", level: "A1", title: { en: "Imperative Sentences", es: "Oraciones imperativas", fr: "Les phrases impératives", pt: "Frases imperativas" } },
  { id: "014", level: "A1", title: { en: "Yes/No and Wh-Questions", es: "Preguntas de sí/no y con palabras interrogativas", fr: "Questions fermées et questions avec mots interrogatifs", pt: "Perguntas de sim/não e com pronomes interrogativos" } },

  { id: "001", level: "A2", title: { en: "Past Progressive Tense", es: "Pasado continuo", fr: "Passé progressif", pt: "Pretérito contínuo" } },
  { id: "002", level: "A2", title: { en: "Simple Present vs. Present Progressive", es: "Presente simple vs. presente continuo", fr: "Présent simple vs. présent progressif", pt: "Presente simples vs. presente contínuo" } },
  { id: "003", level: "A2", title: { en: "Future with \"Going To\"", es: "Futuro con \"Going To\"", fr: "Le futur avec « Going To »", pt: "Futuro com \"Going To\"" } },
  { id: "004", level: "A2", title: { en: "Future with \"Will\"", es: "Futuro con \"Will\"", fr: "Le futur avec « Will »", pt: "Futuro com \"Will\"" } },
  { id: "005", level: "A2", title: { en: "Will vs. Going To", es: "\"Will\" vs. \"Going To\"", fr: "« Will » vs. « Going To »", pt: "\"Will\" vs. \"Going To\"" } },
  { id: "006", level: "A2", title: { en: "Modal Verbs: Can / Could", es: "Verbos modales: Can / Could", fr: "Verbes modaux : Can / Could", pt: "Verbos modais: Can / Could" } },
  { id: "007", level: "A2", title: { en: "Modal Verbs: Must / Have To", es: "Verbos modales: Must / Have To", fr: "Verbes modaux : Must / Have To", pt: "Verbos modais: Must / Have To" } },
  { id: "008", level: "A2", title: { en: "Modal Verbs: Should / Ought To / Had Better", es: "Verbos modales: Should / Ought To / Had Better", fr: "Verbes modaux : Should / Ought To / Had Better", pt: "Verbos modais: Should / Ought To / Had Better" } },
  { id: "009", level: "A2", title: { en: "Present Perfect: Introduction", es: "Presente perfecto: introducción", fr: "Le present perfect : introduction", pt: "Present perfect: introdução" } },
  { id: "010", level: "A2", title: { en: "Present Perfect vs. Simple Past", es: "Presente perfecto vs. pasado simple", fr: "Present perfect vs. passé simple", pt: "Present perfect vs. passado simples" } },
  { id: "011", level: "A2", title: { en: "The Passive: Simple Forms", es: "La voz pasiva: formas básicas", fr: "La voix passive : formes simples", pt: "Voz passiva: formas básicas" } },
  { id: "012", level: "A2", title: { en: "Count and Noncount Nouns", es: "Sustantivos contables e incontables", fr: "Noms dénombrables et indénombrables", pt: "Substantivos contáveis e incontáveis" } },
  { id: "013", level: "A2", title: { en: "Expressions of Quantity", es: "Expresiones de cantidad", fr: "Expressions de quantité", pt: "Expressões de quantidade" } },
  { id: "014", level: "A2", title: { en: "Some and Any in Affirmative and Negative Contexts", es: "Some y Any en contextos afirmativos y negativos", fr: "Some et Any dans les phrases affirmatives et négatives", pt: "Some e Any em contextos afirmativos e negativos" } },
  { id: "015", level: "A2", title: { en: "The: Referring to Specific and Known Referents", es: "The: referencia a elementos específicos y conocidos", fr: "The : référence à des éléments spécifiques et connus", pt: "The: referência a elementos específicos e conhecidos" } },
  { id: "016", level: "A2", title: { en: "Prepositions of Time: At, In, and On", es: "Preposiciones de tiempo: At, In y On", fr: "Prépositions de temps : At, In et On", pt: "Preposições de tempo: At, In e On" } },
  { id: "017", level: "A2", title: { en: "Comparatives and Superlatives", es: "Comparativos y superlativos", fr: "Comparatifs et superlatifs", pt: "Comparativos e superlativos" } },
  { id: "018", level: "A2", title: { en: "Gerunds: Basic Use", es: "Gerundios: uso básico", fr: "Gérondifs : utilisation de base", pt: "Gerúndios: uso básico" } },
  { id: "019", level: "A2", title: { en: "Infinitives: Basic Use", es: "Infinitivos: uso básico", fr: "Infinitifs : utilisation de base", pt: "Infinitivos: uso básico" } },
  { id: "020", level: "A2", title: { en: "Relative Clauses: Subject Position (who/which/that)", es: "Oraciones de relativo: función de sujeto (who/which/that)", fr: "Propositions relatives : fonction sujet (who/which/that)", pt: "Orações relativas: função de sujeito (who/which/that)" } },
  { id: "021", level: "A2", title: { en: "Reflexive Pronouns", es: "Pronombres reflexivos", fr: "Pronoms réfléchis", pt: "Pronomes reflexivos" } },
  { id: "022", level: "A2", title: { en: "Conditional Sentences: Present Real", es: "Oraciones condicionales: presente real", fr: "Phrases conditionnelles : présent réel", pt: "Frases condicionais: presente real" } },
  { id: "023", level: "A2", title: { en: "Forms and Uses of \"Other\"", es: "Formas y usos de \"Other\"", fr: "Formes et emplois de « Other »", pt: "Formas e usos de \"Other\"" } },

  { id: "001", level: "B1", title: { en: "Present Perfect Progressive", es: "Presente perfecto continuo", fr: "Present perfect progressif", pt: "Present perfect contínuo" } },
  { id: "002", level: "B1", title: { en: "Past Perfect", es: "Pretérito pluscuamperfecto", fr: "Plus-que-parfait", pt: "Pretérito mais-que-perfeito" } },
  { id: "003", level: "B1", title: { en: "Subject-Verb Agreement: Basic Rules", es: "Concordancia entre sujeto y verbo: reglas básicas", fr: "Accord sujet-verbe : règles de base", pt: "Concordância entre sujeito e verbo: regras básicas" } },
  { id: "004", level: "B1", title: { en: "Subject-Verb Agreement: Special Cases", es: "Concordancia entre sujeto y verbo: casos especiales", fr: "Accord sujet-verbe : cas particuliers", pt: "Concordância entre sujeito e verbo: casos especiais" } },
  { id: "005", level: "B1", title: { en: "Indefinite Pronouns and Agreement", es: "Pronombres indefinidos y concordancia", fr: "Pronoms indéfinis et accord", pt: "Pronomes indefinidos e concordância" } },
  { id: "006", level: "B1", title: { en: "Impersonal Pronouns: You / One / They", es: "Pronombres impersonales: You / One / They", fr: "Pronoms impersonnels : You / One / They", pt: "Pronomes impessoais: You / One / They" } },
  { id: "007", level: "B1", title: { en: "No, None, and Negative Compound Pronouns", es: "No, None y pronombres compuestos negativos", fr: "No, None et pronoms composés négatifs", pt: "No, None e pronomes compostos negativos" } },
  { id: "008", level: "B1", title: { en: "Much, Many, Little, and Few as Quantity Modifiers", es: "Much, Many, Little y Few como cuantificadores", fr: "Much, Many, Little et Few comme quantificateurs", pt: "Much, Many, Little e Few como quantificadores" } },
  { id: "009", level: "B1", title: { en: "All, Most, and None with Nouns and Pronouns", es: "All, Most y None con sustantivos y pronombres", fr: "All, Most et None avec noms et pronoms", pt: "All, Most e None com substantivos e pronomes" } },
  { id: "010", level: "B1", title: { en: "Both, Neither, and Either for Paired Reference", es: "Both, Neither y Either para referencias dobles", fr: "Both, Neither et Either pour les références par paire", pt: "Both, Neither e Either para referências em pares" } },
  { id: "011", level: "B1", title: { en: "The with Schools, Work, Home, and Institutions", es: "The con escuelas, trabajo, hogar e instituciones", fr: "The avec les écoles, le travail, la maison et les institutions", pt: "The com escolas, trabalho, casa e instituições" } },
  { id: "012", level: "B1", title: { en: "Order of Adjectives Before Nouns", es: "Orden de los adjetivos antes del sustantivo", fr: "Ordre des adjectifs avant le nom", pt: "Ordem dos adjetivos antes do substantivo" } },
  { id: "013", level: "B1", title: { en: "Adjectives and Adverbs: Form and Function", es: "Adjetivos y adverbios: forma y función", fr: "Adjectifs et adverbes : forme et fonction", pt: "Adjetivos e advérbios: forma e função" } },
  { id: "014", level: "B1", title: { en: "Degree Adverbs: Quite, Pretty, Rather, and Fairly", es: "Adverbios de grado: Quite, Pretty, Rather y Fairly", fr: "Adverbes de degré : Quite, Pretty, Rather et Fairly", pt: "Advérbios de intensidade: Quite, Pretty, Rather e Fairly" } },
  { id: "015", level: "B1", title: { en: "Word Order: Verb, Object, Place, and Time", es: "Orden de palabras: verbo, objeto, lugar y tiempo", fr: "Ordre des mots : verbe, objet, lieu et temps", pt: "Ordem das palavras: verbo, objeto, lugar e tempo" } },
  { id: "016", level: "B1", title: { en: "Still, Anymore, Yet, and Already", es: "Still, Anymore, Yet y Already", fr: "Still, Anymore, Yet et Already", pt: "Still, Anymore, Yet e Already" } },
  { id: "017", level: "B1", title: { en: "During, For, and While: Time Span Expressions", es: "During, For y While: expresiones de tiempo", fr: "During, For et While : expressions de durée", pt: "During, For e While: expressões de tempo" } },
  { id: "018", level: "B1", title: { en: "Prepositions of Place: At, In, and On Extended", es: "Preposiciones de lugar: At, In y On (uso ampliado)", fr: "Prépositions de lieu : At, In et On (usage avancé)", pt: "Preposições de lugar: At, In e On (uso ampliado)" } },
  { id: "019", level: "B1", title: { en: "Phrasal Verbs: In and Out Patterns", es: "Phrasal verbs: patrones con In y Out", fr: "Phrasal verbs : modèles avec In et Out", pt: "Phrasal verbs: padrões com In e Out" } },
  { id: "020", level: "B1", title: { en: "Phrasal Verbs: On and Off Patterns", es: "Phrasal verbs: patrones con On y Off", fr: "Phrasal verbs : modèles avec On et Off", pt: "Phrasal verbs: padrões com On e Off" } },
  { id: "021", level: "B1", title: { en: "Phrasal Verbs: Up and Down Patterns", es: "Phrasal verbs: patrones con Up y Down", fr: "Phrasal verbs : modèles avec Up et Down", pt: "Phrasal verbs: padrões com Up e Down" } },
  { id: "022", level: "B1", title: { en: "Coordinating Conjunctions (and, or, but, so)", es: "Conjunciones coordinantes (and, or, but, so)", fr: "Conjonctions de coordination (and, or, but, so)", pt: "Conjunções coordenativas (and, or, but, so)" } },
  { id: "023", level: "B1", title: { en: "Correlative Conjunctions (both...and, either...or, neither...nor)", es: "Conjunciones correlativas (both...and, either...or, neither...nor)", fr: "Conjonctions corrélatives (both...and, either...or, neither...nor)", pt: "Conjunções correlativas (both...and, either...or, neither...nor)" } },
  { id: "024", level: "B1", title: { en: "Direct and Indirect Speech: Statements", es: "Estilo directo e indirecto: enunciados", fr: "Discours direct et indirect : déclarations", pt: "Discurso direto e indireto: afirmações" } },
  { id: "025", level: "B1", title: { en: "Direct and Indirect Speech: Questions", es: "Estilo directo e indirecto: preguntas", fr: "Discours direct et indirect : questions", pt: "Discurso direto e indireto: perguntas" } },
  { id: "026", level: "B1", title: { en: "Noun Clauses Beginning with a Question Word", es: "Oraciones subordinadas sustantivas con palabra interrogativa", fr: "Propositions nominales commençant par un mot interrogatif", pt: "Orações substantivas iniciadas por palavra interrogativa" } },
  { id: "027", level: "B1", title: { en: "Noun Clauses Beginning with \"That\"", es: "Oraciones subordinadas sustantivas con \"That\"", fr: "Propositions nominales introduites par « That »", pt: "Orações substantivas iniciadas por \"That\"" } },
  { id: "028", level: "B1", title: { en: "Relative Clauses: Object Position", es: "Oraciones de relativo: función de objeto", fr: "Propositions relatives : fonction objet", pt: "Orações relativas: função de objeto" } },
  { id: "029", level: "B1", title: { en: "Relative Clauses with Whose, Where, and When", es: "Oraciones de relativo con Whose, Where y When", fr: "Propositions relatives avec Whose, Where et When", pt: "Orações relativas com Whose, Where e When" } },
  { id: "030", level: "B1", title: { en: "Modal Verbs: May / Might for Possibility", es: "Verbos modales: May / Might para posibilidad", fr: "Verbes modaux : May / Might pour exprimer la possibilité", pt: "Verbos modais: May / Might para possibilidade" } },
  { id: "031", level: "B1", title: { en: "Modal Verbs for Polite Requests", es: "Verbos modales para hacer peticiones corteses", fr: "Verbes modaux pour les demandes polies", pt: "Verbos modais para pedidos educados" } },
  { id: "032", level: "B1", title: { en: "Used To and Would for Past Habits", es: "Used To y Would para hábitos pasados", fr: "Used To et Would pour les habitudes passées", pt: "Used To e Would para hábitos no passado" } },
  { id: "033", level: "B1", title: { en: "Be Used To / Get Used To", es: "Be Used To / Get Used To", fr: "Be Used To / Get Used To", pt: "Be Used To / Get Used To" } },
  { id: "034", level: "B1", title: { en: "Phrasal Verbs: Basic Patterns", es: "Phrasal verbs: patrones básicos", fr: "Phrasal verbs : modèles de base", pt: "Phrasal verbs: padrões básicos" } },
  { id: "035", level: "B1", title: { en: "Preposition Combinations with Adjectives and Verbs", es: "Combinaciones de preposiciones con adjetivos y verbos", fr: "Combinaisons de prépositions avec adjectifs et verbes", pt: "Combinações de preposições com adjetivos e verbos" } },
  { id: "036", level: "B1", title: { en: "Adverb Clauses of Time", es: "Oraciones adverbiales de tiempo", fr: "Propositions adverbiales de temps", pt: "Orações adverbiais de tempo" } },
  { id: "037", level: "B1", title: { en: "Adverb Clauses of Reason", es: "Oraciones adverbiales de causa", fr: "Propositions adverbiales de cause", pt: "Orações adverbiais de causa" } },
  { id: "038", level: "B1", title: { en: "Conditional Sentences: Future Real", es: "Oraciones condicionales: futuro real", fr: "Phrases conditionnelles : futur réel", pt: "Frases condicionais: futuro real" } },
  { id: "039", level: "B1", title: { en: "Conditional Sentences: Present/Future Unreal", es: "Oraciones condicionales: presente/futuro irreal", fr: "Phrases conditionnelles : présent/futur irréel", pt: "Frases condicionais: presente/futuro irreal" } },
  { id: "040", level: "B1", title: { en: "Tag Questions", es: "Preguntas confirmativas (Tag Questions)", fr: "Questions-tags", pt: "Perguntas confirmatórias (Tag Questions)" } },
  { id: "041", level: "B1", title: { en: "Negative Questions and Shortened Yes/No Questions", es: "Preguntas negativas y preguntas abreviadas de sí/no", fr: "Questions négatives et questions fermées abrégées", pt: "Perguntas negativas e perguntas abreviadas de sim/não" } },

  { id: "001", level: "B2", title: { en: "Conditional Sentences: Past Unreal", es: "Oraciones condicionales: pasado irreal", fr: "Phrases conditionnelles : passé irréel", pt: "Frases condicionais: passado irreal" } },
  { id: "002", level: "B2", title: { en: "Mixed Time in Conditional Sentences", es: "Condicionales con tiempos mixtos", fr: "Temps mixtes dans les phrases conditionnelles", pt: "Tempos mistos nas frases condicionais" } },
  { id: "003", level: "B2", title: { en: "Omitting \"If\" / Inverted Conditional Forms", es: "Omisión de \"If\" / formas condicionales invertidas", fr: "Suppression de « If » / formes conditionnelles inversées", pt: "Omissão de \"If\" / formas condicionais invertidas" } },
  { id: "004", level: "B2", title: { en: "Implied Conditions", es: "Condiciones implícitas", fr: "Conditions implicites", pt: "Condições implícitas" } },
  { id: "005", level: "B2", title: { en: "As If / As Though", es: "As If / As Though", fr: "As If / As Though", pt: "As If / As Though" } },
  { id: "006", level: "B2", title: { en: "As: Simultaneous and Causal Adverb Clauses", es: "As: oraciones adverbiales de simultaneidad y causa", fr: "As : propositions adverbiales de simultanéité et de cause", pt: "As: orações adverbiais de simultaneidade e causa" } },
  { id: "007", level: "B2", title: { en: "Like and As: Comparison and Role Expression", es: "Like y As: comparación y expresión de función", fr: "Like et As : comparaison et rôle", pt: "Like e As: comparação e função" } },
  { id: "008", level: "B2", title: { en: "Wish and Hoped-For Outcomes", es: "Wish y resultados esperados", fr: "Wish et résultats souhaités", pt: "Wish e resultados esperados" } },
  { id: "009", level: "B2", title: { en: "In Case: Precautionary Purpose Clauses", es: "In Case: oraciones de propósito preventivo", fr: "In Case : propositions exprimant la précaution", pt: "In Case: orações de finalidade preventiva" } },
  { id: "010", level: "B2", title: { en: "Unless, As Long As, and Provided: Conditional Variants", es: "Unless, As Long As y Provided: variantes condicionales", fr: "Unless, As Long As et Provided : variantes conditionnelles", pt: "Unless, As Long As e Provided: variantes condicionais" } },
  { id: "011", level: "B2", title: { en: "Future Progressive and Future Perfect", es: "Futuro continuo y futuro perfecto", fr: "Futur progressif et futur antérieur", pt: "Futuro contínuo e futuro perfeito" } },
  { id: "012", level: "B2", title: { en: "Past Perfect Progressive", es: "Pretérito pluscuamperfecto continuo", fr: "Plus-que-parfait progressif", pt: "Pretérito mais-que-perfeito contínuo" } },
  { id: "013", level: "B2", title: { en: "Degrees of Certainty: Present and Future", es: "Grados de certeza: presente y futuro", fr: "Degrés de certitude : présent et futur", pt: "Graus de certeza: presente e futuro" } },
  { id: "014", level: "B2", title: { en: "Degrees of Certainty: Past", es: "Grados de certeza: pasado", fr: "Degrés de certitude : passé", pt: "Graus de certeza: passado" } },
  { id: "015", level: "B2", title: { en: "Progressive Forms of Modal Verbs", es: "Formas progresivas de los verbos modales", fr: "Formes progressives des verbes modaux", pt: "Formas progressivas dos verbos modais" } },
  { id: "016", level: "B2", title: { en: "Combining Modals with Phrasal Modals", es: "Combinación de verbos modales y phrasal modals", fr: "Combinaison des verbes modaux et phrasal modals", pt: "Combinação de verbos modais e phrasal modals" } },
  { id: "017", level: "B2", title: { en: "Ability: Can and Could (Extended Use)", es: "Capacidad: Can y Could (uso ampliado)", fr: "Capacité : Can et Could (usage avancé)", pt: "Capacidade: Can e Could (uso ampliado)" } },
  { id: "018", level: "B2", title: { en: "Would for a Repeated Action in the Past", es: "Would para acciones repetidas en el pasado", fr: "Would pour les actions répétées dans le passé", pt: "Would para ações repetidas no passado" } },
  { id: "019", level: "B2", title: { en: "Expressing Preference: Would Rather", es: "Expresar preferencia: Would Rather", fr: "Exprimer une préférence : Would Rather", pt: "Expressando preferência: Would Rather" } },
  { id: "020", level: "B2", title: { en: "Each and Every: Distributive Reference", es: "Each y Every: referencia distributiva", fr: "Each et Every : référence distributive", pt: "Each e Every: referência distributiva" } },
  { id: "021", level: "B2", title: { en: "Even: Emphatic Addition and Contrast", es: "Even: énfasis y contraste", fr: "Even : emphase et contraste", pt: "Even: ênfase e contraste" } },
  { id: "022", level: "B2", title: { en: "By and Until: Expressing Deadline and Duration", es: "By y Until: plazo y duración", fr: "By et Until : échéance et durée", pt: "By e Until: prazo e duração" } },
  { id: "023", level: "B2", title: { en: "Prepositions: By and Other Fixed Uses", es: "Preposiciones: By y otros usos fijos", fr: "Prépositions : By et autres emplois fixes", pt: "Preposições: By e outros usos fixos" } },
  { id: "024", level: "B2", title: { en: "Noun + Preposition Combinations", es: "Combinaciones de sustantivo + preposición", fr: "Combinaisons nom + préposition", pt: "Combinações de substantivo + preposição" } },
  { id: "025", level: "B2", title: { en: "Verb + Preposition: Extended Patterns", es: "Verbo + preposición: patrones ampliados", fr: "Verbe + préposition : modèles avancés", pt: "Verbo + preposição: padrões avançados" } },
  { id: "026", level: "B2", title: { en: "Phrasal Verbs: Away and Back Patterns", es: "Phrasal verbs: patrones con Away y Back", fr: "Phrasal verbs : modèles avec Away et Back", pt: "Phrasal verbs: padrões com Away e Back" } },
  { id: "027", level: "B2", title: { en: "The Passive: Indirect Objects as Passive Subjects", es: "La voz pasiva: objetos indirectos como sujeto", fr: "La voix passive : objets indirects comme sujets", pt: "Voz passiva: objetos indiretos como sujeito" } },
  { id: "028", level: "B2", title: { en: "The Passive with Modals and Phrasal Modals", es: "La voz pasiva con verbos modales y phrasal modals", fr: "La voix passive avec verbes modaux et phrasal modals", pt: "Voz passiva com verbos modais e phrasal modals" } },
  { id: "029", level: "B2", title: { en: "Stative Passive", es: "Pasiva de estado", fr: "Passif d'état", pt: "Passiva estativa" } },
  { id: "030", level: "B2", title: { en: "The Passive with \"Get\"", es: "La voz pasiva con \"Get\"", fr: "La voix passive avec « Get »", pt: "Voz passiva com \"Get\"" } },
  { id: "031", level: "B2", title: { en: "Participial Adjectives", es: "Adjetivos participiales", fr: "Adjectifs participiaux", pt: "Adjetivos participiais" } },
  { id: "032", level: "B2", title: { en: "Gerunds as Objects of Prepositions", es: "Gerundios como objeto de preposiciones", fr: "Gérondifs comme compléments de prépositions", pt: "Gerúndios como objeto de preposições" } },
  { id: "033", level: "B2", title: { en: "Verbs Followed by Gerunds vs. Infinitives", es: "Verbos seguidos de gerundio o infinitivo", fr: "Verbes suivis d'un gérondif ou d'un infinitif", pt: "Verbos seguidos de gerúndio ou infinitivo" } },
  { id: "034", level: "B2", title: { en: "Special Expressions Followed by -ing", es: "Expresiones especiales seguidas de -ing", fr: "Expressions particulières suivies de -ing", pt: "Expressões especiais seguidas de -ing" } },
  { id: "035", level: "B2", title: { en: "It + Infinitive; Gerunds and Infinitives as Subjects", es: "It + infinitivo; gerundios e infinitivos como sujeto", fr: "It + infinitif ; gérondifs et infinitifs comme sujets", pt: "It + infinitivo; gerúndios e infinitivos como sujeito" } },
  { id: "036", level: "B2", title: { en: "Infinitive of Purpose", es: "Infinitivo de finalidad", fr: "Infinitif de but", pt: "Infinitivo de finalidade" } },
  { id: "037", level: "B2", title: { en: "Adjectives Followed by Infinitives", es: "Adjetivos seguidos de infinitivo", fr: "Adjectifs suivis d'un infinitif", pt: "Adjetivos seguidos de infinitivo" } },
  { id: "038", level: "B2", title: { en: "Too and Enough with Infinitives", es: "Too y Enough con infinitivos", fr: "Too et Enough avec les infinitifs", pt: "Too e Enough com infinitivos" } },
  { id: "039", level: "B2", title: { en: "Causative Verbs: Make, Have, Get", es: "Verbos causativos: Make, Have, Get", fr: "Verbes causatifs : Make, Have, Get", pt: "Verbos causativos: Make, Have, Get" } },

  { id: "001", level: "C1", title: { en: "Passive and Past Forms of Infinitives and Gerunds", es: "Formas pasivas y pasadas de infinitivos y gerundios", fr: "Formes passives et passées des infinitifs et gérondifs", pt: "Formas passivas e passadas de infinitivos e gerúndios" } },
  { id: "002", level: "C1", title: { en: "Gerunds and Passive Infinitives After \"Need\"", es: "Gerundios e infinitivos pasivos después de \"Need\"", fr: "Gérondifs et infinitifs passifs après « Need »", pt: "Gerúndios e infinitivos passivos após \"Need\"" } },
  { id: "003", level: "C1", title: { en: "Possessive Forms Modifying a Gerund", es: "Formas posesivas que modifican un gerundio", fr: "Formes possessives modifiant un gérondif", pt: "Formas possessivas modificando um gerúndio" } },
  { id: "004", level: "C1", title: { en: "Verbs of Perception + Object + Base Form/-ing", es: "Verbos de percepción + objeto + forma base/-ing", fr: "Verbes de perception + objet + forme de base/-ing", pt: "Verbos de percepção + objeto + forma base/-ing" } },
  { id: "005", level: "C1", title: { en: "Simple Form After \"Let\" and \"Help\"", es: "Forma base después de \"Let\" y \"Help\"", fr: "Forme de base après « Let » et « Help »", pt: "Forma básica após \"Let\" e \"Help\"" } },
  { id: "006", level: "C1", title: { en: "Relative Clauses with Expressions of Quantity", es: "Oraciones de relativo con expresiones de cantidad", fr: "Propositions relatives avec expressions de quantité", pt: "Orações relativas com expressões de quantidade" } },
  { id: "007", level: "C1", title: { en: "Noun + \"Of Which\"", es: "Sustantivo + \"Of Which\"", fr: "Nom + « Of Which »", pt: "Substantivo + \"Of Which\"" } },
  { id: "008", level: "C1", title: { en: "\"Which\" Modifying a Whole Sentence", es: "\"Which\" modificando una oración completa", fr: "« Which » modifiant une phrase entière", pt: "\"Which\" modificando uma frase inteira" } },
  { id: "009", level: "C1", title: { en: "Reducing Relative Clauses to Phrases", es: "Reducción de oraciones de relativo a frases", fr: "Réduction des propositions relatives en groupes de mots", pt: "Redução de orações relativas para frases" } },
  { id: "010", level: "C1", title: { en: "Reducing Adverb Clauses to Modifying Phrases", es: "Reducción de oraciones adverbiales a frases modificadoras", fr: "Réduction des propositions adverbiales en groupes modifiants", pt: "Redução de orações adverbiais para expressões modificadoras" } },
  { id: "011", level: "C1", title: { en: "Reported Speech: Verb Form Shifts in Noun Clauses", es: "Estilo indirecto: cambios verbales en oraciones sustantivas", fr: "Discours indirect : changements de temps dans les propositions nominales", pt: "Discurso indireto: mudanças verbais em orações substantivas" } },
  { id: "012", level: "C1", title: { en: "Using the Subjunctive in Noun Clauses", es: "Uso del subjuntivo en oraciones sustantivas", fr: "Utilisation du subjonctif dans les propositions nominales", pt: "Uso do subjuntivo em orações substantivas" } },
  { id: "013", level: "C1", title: { en: "Using \"-ever\" Words", es: "Uso de palabras terminadas en \"-ever\"", fr: "Utilisation des mots en « -ever »", pt: "Uso de palavras terminadas em \"-ever\"" } },
  { id: "014", level: "C1", title: { en: "Quoted Speech: Punctuation and Mechanics", es: "Discurso citado: puntuación y reglas de escritura", fr: "Discours cité : ponctuation et règles d'écriture", pt: "Discurso citado: pontuação e convenções" } },
  { id: "015", level: "C1", title: { en: "Information Structure: Cleft Sentences and Fronting", es: "Estructura de la información: oraciones hendidas y anticipación", fr: "Structure de l'information : phrases clivées et mise en avant", pt: "Estrutura da informação: cleft sentences e topicalização" } },
  { id: "016", level: "C1", title: { en: "Leaving Out Words: Ellipsis", es: "Elisión: omisión de palabras", fr: "Ellipse : omission de mots", pt: "Elipse: omissão de palavras" } },
  { id: "017", level: "C1", title: { en: "Replacing Words: Substitution Forms (do so, one, the same)", es: "Sustitución de palabras (do so, one, the same)", fr: "Substitution de mots (do so, one, the same)", pt: "Substituição de palavras (do so, one, the same)" } },
  { id: "018", level: "C1", title: { en: "Spoken English vs. Written English", es: "Inglés hablado vs. inglés escrito", fr: "Anglais parlé vs. anglais écrit", pt: "Inglês falado vs. inglês escrito" } },
  { id: "019", level: "C1", title: { en: "Word-Building: Forming New Words", es: "Formación de palabras", fr: "Formation des mots", pt: "Formação de palavras" } },
  { id: "020", level: "C1", title: { en: "Noun Phrase Structure and Modifiers", es: "Estructura del sintagma nominal y modificadores", fr: "Structure du groupe nominal et modificateurs", pt: "Estrutura do sintagma nominal e modificadores" } },
  { id: "021", level: "C1", title: { en: "Adverbials: Types and Position", es: "Adverbiales: tipos y posición", fr: "Compléments circonstanciels : types et position", pt: "Adjuntos adverbiais: tipos e posição" } },
  { id: "022", level: "C1", title: { en: "Numbers and Measurements", es: "Números y medidas", fr: "Nombres et mesures", pt: "Números e medidas" } },
  
  { id: "001", level: "C2", title: { en: "Cause-and-Effect Connectives: Because Of / Due To", es: "Conectores de causa y efecto: Because Of / Due To", fr: "Connecteurs de cause et de conséquence : Because Of / Due To", pt: "Conectores de causa e efeito: Because Of / Due To" } },
  { id: "002", level: "C2", title: { en: "Cause-and-Effect Connectives: Therefore / Consequently", es: "Conectores de causa y efecto: Therefore / Consequently", fr: "Connecteurs de cause et de conséquence : Therefore / Consequently", pt: "Conectores de causa e efeito: Therefore / Consequently" } },
  { id: "003", level: "C2", title: { en: "Result Structures: Such...That / So...That", es: "Estructuras de resultado: Such...That / So...That", fr: "Structures de résultat : Such...That / So...That", pt: "Estruturas de resultado: Such...That / So...That" } },
  { id: "004", level: "C2", title: { en: "Expressing Purpose: So That", es: "Expresar finalidad: So That", fr: "Exprimer le but : So That", pt: "Expressando finalidade: So That" } },
  { id: "005", level: "C2", title: { en: "Showing Contrast: Unexpected Result", es: "Expresar contraste: resultado inesperado", fr: "Exprimer le contraste : résultat inattendu", pt: "Expressando contraste: resultado inesperado" } },
  { id: "006", level: "C2", title: { en: "Showing Direct Contrast: While / Whereas", es: "Expresar contraste directo: While / Whereas", fr: "Exprimer un contraste direct : While / Whereas", pt: "Expressando contraste direto: While / Whereas" } },
  { id: "007", level: "C2", title: { en: "Expressing Conditions: Otherwise / Or Else", es: "Expresar condiciones: Otherwise / Or Else", fr: "Exprimer des conditions : Otherwise / Or Else", pt: "Expressando condições: Otherwise / Or Else" } },
  { id: "008", level: "C2", title: { en: "Negation: Avoiding Double Negatives and Negative Inversion", es: "Negación: evitar dobles negaciones e inversión negativa", fr: "Négation : éviter les doubles négations et l'inversion négative", pt: "Negação: evitando dupla negação e inversão negativa" } },
  { id: "009", level: "C2", title: { en: "Parallel Structure", es: "Estructura paralela", fr: "Structure parallèle", pt: "Estrutura paralela" } },
  { id: "010", level: "C2", title: { en: "Stative Passive Verbs + Prepositions (Advanced Patterns)", es: "Verbos pasivos de estado + preposiciones (patrones avanzados)", fr: "Verbes passifs d'état + prépositions (modèles avancés)", pt: "Verbos passivos de estado + preposições (padrões avançados)" } },
  { id: "011", level: "C2", title: { en: "Subject-Verb Agreement: Advanced Irregularities", es: "Concordancia entre sujeto y verbo: irregularidades avanzadas", fr: "Accord sujet-verbe : irrégularités avancées", pt: "Concordância entre sujeito e verbo: irregularidades avançadas" } },
  { id: "012", level: "C2", title: { en: "Advanced Article Usage: Generic Reference", es: "Uso avanzado de los artículos: referencia genérica", fr: "Utilisation avancée des articles : référence générique", pt: "Uso avançado dos artigos: referência genérica" } },
  { id: "013", level: "C2", title: { en: "Advanced Quantifiers and Determiners", es: "Cuantificadores y determinantes avanzados", fr: "Quantificateurs et déterminants avancés", pt: "Quantificadores e determinantes avançados" } },
  { id: "014", level: "C2", title: { en: "Comparison: Advanced and Idiomatic Patterns", es: "Comparación: patrones avanzados e idiomáticos", fr: "Comparaison : structures avancées et idiomatiques", pt: "Comparação: padrões avançados e idiomáticos" } },
  { id: "015", level: "C2", title: { en: "Phrasal Verbs and Prepositional Patterns: Advanced", es: "Phrasal verbs y patrones preposicionales: nivel avanzado", fr: "Phrasal verbs et structures prépositionnelles : niveau avancé", pt: "Phrasal verbs e padrões preposicionais: nível avançado" } },
  { id: "016", level: "C2", title: { en: "Connectives for Giving Examples and Continuing an Idea", es: "Conectores para dar ejemplos y desarrollar una idea", fr: "Connecteurs pour donner des exemples et développer une idée", pt: "Conectores para dar exemplos e desenvolver uma ideia" } },

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
                  {c.title.es} / {c.title.fr} / {c.title.pt}
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
