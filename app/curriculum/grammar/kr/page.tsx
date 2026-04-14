"use client";

import Link from "next/link";
import { useState } from "react";
import { copyLink } from "@/utils/share";
/* ================= 하드코딩 데이터 ================= */

const CHAPTERS = [

  // A1
  { id: "001", level: "A1", title: { kr: "한글 자음·모음", en: "Hangul Consonants and Vowels", es: "Consonantes y vocales del hangul", fr: "Consonnes et voyelles du hangeul", pt: "Consoantes e vogais do hangul" } },
  { id: "002", level: "A1", title: { kr: "받침 기본", en: "Basic Final Consonants (Batchim)", es: "Consonantes finales básicas (Batchim)", fr: "Consonnes finales de base (Batchim)", pt: "Consoantes finais básicas (Batchim)" } },
  { id: "003", level: "A1", title: { kr: "은/는", en: "Topic Marker 은/는", es: "Partícula temática 은/는", fr: "Particule thématique 은/는", pt: "Partícula temática 은/는" } },
  { id: "004", level: "A1", title: { kr: "이/가", en: "Subject Marker 이/가", es: "Partícula de sujeto 이/가", fr: "Particule du sujet 이/가", pt: "Partícula de sujeito 이/가" } },
  { id: "005", level: "A1", title: { kr: "을/를", en: "Object Marker 을/를", es: "Partícula de objeto 을/를", fr: "Particule d’objet 을/를", pt: "Partícula de objecto 을/를" } },
  { id: "006", level: "A1", title: { kr: "이다/아니다", en: "To Be / Not To Be (이다/아니다)", es: "Ser / No ser (이다/아니다)", fr: "Être / Ne pas être (이다/아니다)", pt: "Ser / Não ser (이다/아니다)" } },
  { id: "007", level: "A1", title: { kr: "있다/없다", en: "To Have / To Not Have (있다/없다)", es: "Tener / No tener (있다/없다)", fr: "Avoir / Ne pas avoir (있다/없다)", pt: "Ter / Não ter (있다/없다)" } },
  { id: "008", level: "A1", title: { kr: "-아요/어요", en: "-아요/어요 (Polite Present Tense)", es: "-아요/어요 (Presente formal)", fr: "-아요/어요 (Présent poli)", pt: "-아요/어요 (Presente formal)" } },
  { id: "009", level: "A1", title: { kr: "에 / 에서", en: "에 / 에서 (At / To / From)", es: "에 / 에서 (En / A / Desde)", fr: "에 / 에서 (À / Dans / Depuis)", pt: "에 / 에서 (Em / Para / De)" } },
  { id: "010", level: "A1", title: { kr: "에(시간)", en: "에 (Time Marker)", es: "에 (Marcador de tiempo)", fr: "에 (Marqueur de temps)", pt: "에 (Marcador de tempo)" } },
  { id: "011", level: "A1", title: { kr: "안 (부정)", en: "안 (Negative)", es: "안 (Negación)", fr: "안 (Négation)", pt: "안 (Negação)" } },
  { id: "012", level: "A1", title: { kr: "하고 (나열)", en: "하고 (Listing)", es: "하고 (Enumeración)", fr: "하고 (Énumération)", pt: "하고 (Enumeração)" } },

  { id: "001", level: "A2", title: { kr: "-(으)ㄹ 거예요 (미래)", en: "will / going to (Future)", es: "ir a + infinitivo (Futuro)", fr: "aller + infinitif (Futur proche)", pt: "ir + infinitivo (Futuro)" } },
  { id: "002", level: "A2", title: { kr: "-았/었- (과거)", en: "-았/었- (Past)", es: "-았/었- (Pasado)", fr: "-았/었- (Passé)", pt: "-았/었- (Passado)" } },
  { id: "003", level: "A2", title: { kr: "-고 있어요 (진행)", en: "-고 있어요 (Present Progressive)", es: "-고 있어요 (Progresivo Presente)", fr: "-고 있어요 (Progressif Présent)", pt: "-고 있어요 (Progressivo Presente)" } },
  { id: "004", level: "A2", title: { kr: "-지만 (대조)", en: "-지만 (But / Contrast)", es: "-지만 (Pero / Contraste)", fr: "-지만 (Mais / Contraste)", pt: "-지만 (Mas / Contraste)" } },
  { id: "005", level: "A2", title: { kr: "-고 (연결)", en: "-고 (And / Linking)", es: "-고 (Y / Conexión)", fr: "-고 (Et / Liaison)", pt: "-고 (E / Ligação)" } },
  { id: "006", level: "A2", title: { kr: "-아서/어서 (이유)", en: "-아서/어서 (Because / Reason)", es: "-아서/어서 (Porque / Razón)", fr: "-아서/어서 (Parce que / Raison)", pt: "-아서/어서 (Porque / Razão)" } },
  { id: "007", level: "A2", title: { kr: "-(으)면 (조건)", en: "-(으)면 (If / Condition)", es: "-(으)면 (Si / Condición)", fr: "-(으)면 (Si / Condition)", pt: "-(으)면 (Se / Condição)" } },
  { id: "008", level: "A2", title: { kr: "-보다 (비교)", en: "-보다 (Than / Comparison)", es: "-보다 (Más que / Comparación)", fr: "-보다 (Plus que / Comparaison)", pt: "-보다 (Mais do que / Comparação)" } },
  { id: "009", level: "A2", title: { kr: "-처럼/같이 (비유·비교)", en: "-처럼/같이 (Like / As)", es: "-처럼/같이 (Como / Igual que)", fr: "-처럼/같이 (Comme / Tel que)", pt: "-처럼/같이 (Como / Tal como)" } },
  { id: "010", level: "A2", title: { kr: "-게 (부사형)", en: "-게 (Adverb Form)", es: "-게 (Forma adverbial)", fr: "-게 (Forme adverbiale)", pt: "-게 (Forma adverbial)" } },
  { id: "011", level: "A2", title: { kr: "-(으)려고 해요 (의도)", en: "-(으)려고 해요 (Intention / Plan)", es: "-(으)려고 해요 (Intención / Plan)", fr: "-(으)려고 해요 (Intention / Plan)", pt: "-(으)려고 해요 (Intenção / Plano)" } },
  { id: "012", level: "A2", title: { kr: "-도 (부가)", en: "-도 (Also / Too)", es: "-도 (También)", fr: "-도 (Aussi)", pt: "-도 (Também)" } },
  { id: "013", level: "A2", title: { kr: "존댓말 기본 (-요, -(으)세요)", en: "Basic Polite Speech (-요, -(으)세요)", es: "Habla formal básica (-요, -(으)세요)", fr: "Parole polie de base (-요, -(으)세요)", pt: "Fala Polida Básica (-요, -(으)세요)" } },
  { id: "014", level: "A2", title: { kr: "높임법 전체 (주체·객체·상대 높임)", en: "Honorific System (Subject · Object · Addressee)", es: "Sistema Honorífico (Sujeto · Objeto · Receptor)", fr: "Système Honorifique (Sujet · Objet · Interlocuteur)", pt: "Sistema Honorífico (Sujeito · Objeto · Interlocutor)" } },
  { id: "015", level: "A2", title: { kr: "격식체 (합니다체 · 하십시오체)", en: "Formal Speech (합니다체 · 하십시오체)", es: "Habla Formal (Estilo 합니다 · Estilo 하십시오)", fr: "Style Formel (Style 합니다 · Style 하십시오)", pt: "Estilo Formal (Forma 합니다 · Forma 하십시오)" } },
  { id: "016", level: "A2", title: { kr: "받침 활용 규칙 (문법적 기능)", en: "Final consonant Usage Rules (Grammar Function)", es: "Reglas del Consonante final (Función Gramatical)", fr: "Règles du Consonne finale (Fonction grammaticale)", pt: "Regras do Consoante final (Função Gramatical)" } },
  // B1
  { id: "001", level: "B1", title: { kr: "-(으)ㄴ 것 / -(으)는 것 (명사화)", en: "Nominalization with -(으)ㄴ 것 / -(으)는 것", es: "Nominalización con -(으)ㄴ 것 / -(으)는 것", fr: "Nominalisation avec -(으)ㄴ 것 / -(으)는 것", pt: "Nominalização com -(으)ㄴ 것 / -(으)는 것" } },
  { id: "002", level: "B1", title: { kr: "-기 (명사형)", en: "Nominalization with -기", es: "Nominalización con -기", fr: "Nominalisation avec -기", pt: "Nominalização com -기" } },
  { id: "003", level: "B1", title: { kr: "-아/어 보다 (경험)", en: "Trying / Experiencing with -아/어 보다", es: "Expresar ‘probar / experimentar’ con -아/어 보다", fr: "Exprimer ‘essayer / faire l’expérience de’ avec -아/어 보다", pt: "Expressar ‘tentar / experimentar’ com -아/어 보다" } },
  { id: "004", level: "B1", title: { kr: "-아/어야 하다 (의무)", en: "Expressing Obligation with -아/어야 하다", es: "Expresar obligación con -아/어야 하다", fr: "Exprimer l’obligation avec -아/어야 하다", pt: "Expressar obrigação com -아/어야 하다" } },
  { id: "005", level: "B1", title: { kr: "-기 때문에 (이유)", en: "Expressing Reason with -기 때문에", es: "Expresar razón con -기 때문에", fr: "Exprimer la raison avec -기 때문에", pt: "Expressar razão com -기 때문에" } },
  { id: "006", level: "B1", title: { kr: "-(으)ㄴ 지 (경과)", en: "Expressing Elapsed Time with -(으)ㄴ 지", es: "Expresar tiempo transcurrido con -(으)ㄴ 지", fr: "Exprimer le temps écoulé avec -(으)ㄴ 지", pt: "Expressar tempo decorrido com -(으)ㄴ 지" } },
  { id: "007", level: "B1", title: { kr: "-다고 하다 (평서 인용)", en: "Reported Statements with -다고 하다", es: "Discurso indirecto (afirmaciones) con -다고 하다", fr: "Rapporter une affirmation avec -다고 하다", pt: "Relatar afirmações com -다고 하다" } },
  { id: "008", level: "B1", title: { kr: "-냐고 하다 (의문 인용)", en: "Reported Questions with -냐고 하다", es: "Preguntas indirectas con -냐고 하다", fr: "Questions rapportées avec -냐고 하다", pt: "Perguntas indiretas com -냐고 하다" } },
  { id: "009", level: "B1", title: { kr: "-자고 하다 (청유 인용)", en: "Reported Suggestions with -자고 하다", es: "Sugerencias indirectas con -자고 하다", fr: "Suggestions rapportées avec -자고 하다", pt: "Sugerir indiretamente com -자고 하다" } },
  { id: "010", level: "B1", title: { kr: "-라고 하다 (명령 인용)", en: "Reported Commands with -라고 하다", es: "Órdenes indirectas con -라고 하다", fr: "Ordres indirects avec -라고 하다", pt: "Ordens indiretas com -라고 하다" } },
  { id: "011", level: "B1", title: { kr: "-기는 하지만 (양보)", en: "Concessive Expression with -기는 하지만", es: "Expresión concesiva con -기는 하지만", fr: "Expression concessive avec -기는 하지만", pt: "Expressão concessiva com -기는 하지만" } },
  { id: "012", level: "B1", title: { kr: "-도록 (정도·목적)", en: "Expressing Degree and Purpose with -도록", es: "Expresar grado y propósito con -도록", fr: "Exprimer le degré et le but avec -도록", pt: "Expressar grau e propósito com -도록" } },
  { id: "013", level: "B1", title: { kr: "-아/어 보니 (경험 판단)", en: "Expressing Realizations After Experience with -아/어 보니", es: "Expresar conclusiones después de una experiencia con -아/어 보니", fr: "Exprimer une conclusion après expérience avec -아/어 보니", pt: "Expressar conclusões após a experiência com -아/어 보니" } },
  { id: "014", level: "B1", title: { kr: "-(으)니까 (이유)", en: "Expressing Reasons with -(으)니까", es: "Expresar razones con -(으)니까", fr: "Exprimer la raison avec -(으)니까", pt: "Expressar razão com -(으)니까" } },
  { id: "015", level: "B1", title: { kr: "-(으)면서 (동시에 두 행동)", en: "Expressing Two Actions Happening at the Same Time with -(으)면서", es: "Expresar dos acciones simultáneas con -(으)면서", fr: "Exprimer deux actions simultanées avec -(으)면서", pt: "Expressar duas ações simultâneas com -(으)면서" } },
  { id: "016", level: "B1", title: { kr: "-(으)러 가다/오다 (목적을 위한 이동)", en: "Expressing Purpose of Movement with -(으)러 가다/오다", es: "Expresar propósito de movimiento con -(으)러 가다/오다", fr: "Exprimer le but d’un déplacement avec -(으)러 가다/오다", pt: "Expressar o propósito de movimento com -(으)러 가다/오다" } },

  { id: "001", level: "B2", title: { kr: "-(으)ㄹ수록(비례)", en: "The more..., the more...", es: "Cuanto más ~, más ~", fr: "Plus ~, plus ~", pt: "Quanto mais ~, mais ~" } },
  { id: "002", level: "B2", title: { kr: "-(으)ㄹ 뻔하다(위험)", en: "Almost ~ (-(으)ㄹ 뻔하다)", es: "Casi ~ (-(으)ㄹ 뻔하다)", fr: "Avoir failli ~ (-(으)ㄹ 뻔하다)", pt: "Por pouco ~ (-(으)ㄹ 뻔하다)" } },
  { id: "003", level: "B2", title: { kr: "-(으)ㄴ 채로(상태 유지)", en: "While in a certain state (-(으)ㄴ 채로)", es: "Mientras se mantiene un estado (-(으)ㄴ 채로)", fr: "En gardant un certain état (-(으)ㄴ 채로)", pt: "Mantendo um certo estado (-(으)ㄴ 채로)" } },
  { id: "004", level: "B2", title: { kr: "-아/어 놓다·두다(준비·지속)", en: "To prepare or leave something as it is (-아/어 놓다·두다)", es: "Preparar o dejar algo como está (-아/어 놓다·두다)", fr: "Préparer ou laisser quelque chose en l’état (-아/어 놓다·두다)", pt: "Preparar ou deixar algo como está (-아/어 놓다·두다)" } },
  { id: "005", level: "B2", title: { kr: "-(으)ㄹ 뿐이다(한정)", en: "To be only / to merely ~ (-(으)ㄹ 뿐이다)", es: "Ser solo / simplemente ~ (-(으)ㄹ 뿐이다)", fr: "N’être que / simplement ~ (-(으)ㄹ 뿐이다)", pt: "Ser apenas / simplesmente ~ (-(으)ㄹ 뿐이다)" } },
  { id: "006", level: "B2", title: { kr: "-(으)ㄹ 테니(의지·추측·요청)", en: "Como yo voy a / supongo que ~, así que ~ (-(으)ㄹ 테니)", es: "Como yo voy a / supongo que ~, así que ~ (-(으)ㄹ 테니)", fr: "Comme je vais / je suppose que ~, alors ~ (-(으)ㄹ 테니)", pt: "Como eu vou / suponho que ~, por isso ~ (-(으)ㄹ 테니)" } },
  { id: "007", level: "B2", title: { kr: "-기는커녕(부정 강조)", en: "Far from ~ / Not even ~ (-기는커녕)", es: "Ni siquiera ~ / Mucho menos ~ (-기는커녕)", fr: "Même pas ~ / Encore moins ~ (-기는커녕)", pt: "Nem sequer ~ / Quanto mais ~ (-기는커녕)" } },
  { id: "008", level: "B2", title: { kr: "-아/어 가지고(구어 연결)", en: "Because / so (colloquial) (-아/어 가지고)", es: "Porque / así que (coloquial) (-아/어 가지고)", fr: "Parce que / du coup (familier) (-아/어 가지고)", pt: "Porque / por isso (coloquial) (-아/어 가지고)" } },
  { id: "009", level: "B2", title: { kr: "-(으)ㄹ 걸 그랬다(후회)", en: "I should have ~ / I shouldn’t have ~ (-(으)ㄹ 걸 그랬다)", es: "Debería haber ~ / No debería haber ~ (-(으)ㄹ 걸 그랬다)", fr: "J’aurais dû ~ / Je n’aurais pas dû ~ (-(으)ㄹ 걸 그랬다)", pt: "Devia ter ~ / Não devia ter ~ (-(으)ㄹ 걸 그랬다)" } },
  { id: "010", level: "B2", title: { kr: "-(으)ㄹ 만하다(가치·가능)", en: "To be worth doing / To be doable (-(으)ㄹ 만하다)", es: "Valer la pena / Ser posible (-(으)ㄹ 만하다)", fr: "Valoir le coup / Être faisable (-(으)ㄹ 만하다)", pt: "Valer a pena / Ser viável (-(으)ㄹ 만하다)" } },
  { id: "011", level: "B2", title: { kr: "-거든요(설명·강조)", en: "You see, / It's because ~ (-거든요)", es: "Es que / Verás, ~ (-거든요)", fr: "C’est que / Tu vois, ~ (-거든요)", pt: "É que / Sabes, ~ (-거든요)" } },
  { id: "012", level: "B2", title: { kr: "-다 보면(반복 결과)", en: "If you keep ~ing / As you continue to ~ (-다 보면)", es: "Si tu continues à ~ / À force de ~ (-다 보면)", fr: "Si tu continues à ~ / À force de ~ (-다 보면)", pt: "Se continuares a ~ / À força de ~ (-다 보면)" } },
  { id: "013", level: "B2", title: { kr: "-다 보니(누적 결과)", en: "As I kept ~ / After doing ~ for a while (-다 보니)", es: "A medida que seguía ~ / Después de hacerlo por un tiempo (-다 보니)", fr: "À force de ~ / En continuant à ~ (-다 보니)", pt: "À força de ~ / À medida que continuava a ~ (-다 보니)" } },
  { id: "014", level: "B2", title: { kr: "-(으)ㄹ지도 모르다(약한 추측)", en: "It might ~ / It could be that ~ (-(으)ㄹ지도 모르다)", es: "Puede que ~ / Quizás ~ (-(으)ㄹ지도 모르다)", fr: "Il se peut que ~ / Peut-être que ~ (-(으)ㄹ지도 모르다)", pt: "Pode ser que ~ / Talvez ~ (-(으)ㄹ지도 모르다)" } },
  { id: "015", level: "B2", title: { kr: "-(으)려면(조건+의도)", en: "If you want to ~ / In order to ~ (-(으)려면)", es: "Si quieres ~ / Para ~ (-(으)려면)", fr: "Si tu veux ~ / Pour ~ (-(으)려면)", pt: "Se quiseres ~ / Para ~ (-(으)려면)" } },
  { id: "016", level: "B2", title: { kr: "-(으)ㄴ 다음에(순서)", en: "After ~ / Once you have ~ (-(으)ㄴ 다음에)", es: "Después de ~ / Una vez que ~ (-(으)ㄴ 다음에)", fr: "Après ~ / Une fois que ~ (-(으)ㄴ 다음에)", pt: "Depois de ~ / Assim que ~ (-(으)ㄴ 다음에)" } },

  { id: "001", level: "C1", title: { kr: "-(으)ㄹ지언정", en: "Even if / Even though (strong concession)", es: "Aunque / Aun cuando (concesión fuerte)", fr: "Même si / Même quand (concession forte)", pt: "Mesmo que / Ainda que (concessão forte)" } },
  { id: "002", level: "C1", title: { kr: "-(으)리라고", en: "I thought/believed (strong prediction)", es: "Pensé/creí (fuerte predicción)", fr: "J'ai pensé/cru (forte prédiction)", pt: "Pensei/acreditei (forte previsão)" } },
  { id: "003", level: "C1", title: { kr: "-(으)ㄴ/는 듯하다", en: "It seems/appears (that)", es: "Parece que", fr: "Il semble que", pt: "Parece que" } },
  { id: "004", level: "C1", title: { kr: "-(으)ㄴ바", en: "As confirmed/As reported", es: "Según lo confirmado", fr: "Selon ce qui a été confirmé", pt: "Segundo o que foi confirmado" } },
  { id: "005", level: "C1", title: { kr: "-(으)므로", en: "-(eu)muro (because/since)", es: "-(eu)muro (porque/ya que)", fr: "-(eu)muro (parce que/étant donné que)", pt: "-(eu)muro (porque/já que)" } },
  { id: "006", level: "C1", title: { kr: "-(으)ㄴ/는 셈이다", en: "It amounts to / It is as if / It means that", es: "Equivale a / Es como si / Significa que", fr: "Cela revient à / C'est comme si / Cela signifie que", pt: "Equivale a / É como se / Significa que" } },
  { id: "007", level: "C1", title: { kr: "-(으)ㄴ/는 편이다", en: "Tend to be / Relatively / On the side of", es: "Tender a ser / Relativamente / Por el lado de", fr: "Avoir tendance à / Relativement / Du côté de", pt: "Tender a ser / Relativamente / Do lado de" } },
  { id: "008", level: "C1", title: { kr: "-(으)ㄴ/는 법이다", en: "That's how it is / The way things are", es: "Así es como son las cosas", fr: "C'est ainsi que les choses sont", pt: "É assim que as coisas são" } },
  { id: "009", level: "C1", title: { kr: "-(으)ㄴ/는 모양이다", en: "It seems/appears (that)", es: "Parece que", fr: "Il semble que", pt: "Parece que" } },
  { id: "010", level: "C1", title: { kr: "-더라고요", en: "I saw that... / I noticed that...", es: "Vi que... / Noté que...", fr: "J'ai vu que... / J'ai remarqué que...", pt: "Vi que... / Notei que..." } },
  { id: "011", level: "C1", title: { kr: "-다시피", en: "Practically / Almost as if", es: "Prácticamente / Casi como si", fr: "Pratiquement / Presque comme si", pt: "Praticamente / Quase como se" } },
  { id: "012", level: "C1", title: { kr: "-(으)ㄴ/는 탓에", en: "Because of / Due to", es: "A causa de / Debido a", fr: "À cause de / En raison de", pt: "Por causa de / Devido a" } },
  { id: "013", level: "C1", title: { kr: "-(으)ㄴ 데 비해", en: "Whereas / In contrast to", es: "Mientras que / En contraste con", fr: "Tandis que / Par rapport à", pt: "Ao passo que / Em contraste com" } },
  { id: "014", level: "C1", title: { kr: "-(으)ㄴ 반면에", en: "Whereas / While / On the other hand", es: "Mientras que / Por otro lado", fr: "Tandis que / En revanche", pt: "Ao passo que / Enquanto / Por outro lado" } },
  { id: "015", level: "C1", title: { kr: "-기는 하지만", en: "Although / Though", es: "Aunque", fr: "Bien que", pt: "Embora" } },
  { id: "016", level: "C1", title: { kr: "-(으)ㄴ 만큼", en: "To the extent that / In proportion to", es: "En la medida en que / En proporción a", fr: "Dans la mesure où / En proportion de", pt: "Na medida em que / Em proporção a" } },

  { id: "001", level: "C2", title: { kr: "-(으)ㄴ/는 가운데", en: "While / Amid", es: "Mientras / En medio de", fr: "Pendant que / Au milieu de", pt: "Enquanto / Em meio a" } },
  { id: "002", level: "C2", title: { kr: "-(으)ㄴ/는 바람에", en: "Due to / As a result of (unexpected cause)", es: "Debido a / A causa de (causa inesperada)", fr: "En raison de / À cause de (cause inattendue)", pt: "Devido a / Por causa de (causa inesperada)" } },
  { id: "003", level: "C2", title: { kr: "-(으)ㄴ/는 데다가", en: "In addition to / On top of that", es: "Además de / Encima de eso", fr: "En plus de / Par-dessus cela", pt: "Além de / Para além disso" } },
  { id: "004", level: "C2", title: { kr: "-(으)ㄹ락 말락 하다", en: "To be on the verge of / To almost (happen)", es: "Estar a punto de / Casi (ocurrir)", fr: "Être sur le point de / Faillir (se produire)", pt: "Estar prestes a / Por pouco (não acontecer)" } },
  { id: "005", level: "C2", title: { kr: "-(으)ㄴ/는 판에", en: "In a situation where / At a time when", es: "En una situación en la que / En un momento en que", fr: "Dans une situation où / Au moment où", pt: "Numa situação em que / No momento em que" } },
  { id: "006", level: "C2", title: { kr: "-(으)ㄹ 지경이다", en: "To the point where / To the extent that", es: "Hasta el punto de / Al grado de que", fr: "Au point de / Au point où", pt: "A tal ponto que / Ao ponto de" } },
  { id: "007", level: "C2", title: { kr: "-(으)ㄹ 따름이다", en: "It is merely that / It is simply that", es: "No es más que / Simplemente", fr: "Ce n’est que / Je n’ai fait que", pt: "Não é mais do que / Eu apenas" } },
  { id: "008", level: "C2", title: { kr: "-(으)로 말미암아", en: "Due to / Owing to (formal)", es: "Debido a / A causa de (formal)", fr: "En raison de / Du fait de (formel)", pt: "Devido a / Em virtude de (formal)" } }
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
        <h1 style={title}>🧩 Grammar Curriculum (KR)</h1>
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
                <div>{c.title.kr}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {c.title.en} / {c.title.es} / {c.title.fr} / {c.title.pt}
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
