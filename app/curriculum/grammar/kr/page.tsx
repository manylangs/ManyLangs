"use client";

import Link from "next/link";
import { useState } from "react";
import { copyLink } from "@/utils/share";
/* ================= 하드코딩 데이터 ================= */
const CHAPTERS = [

  { id: "001", level: "A1", title: { kr: "한글 읽기와 쓰기", en: "Reading and Writing Hangul", es: "Lectura y escritura del hangul", fr: "Lecture et écriture du hangeul", pt: "Leitura e escrita do hangul", zh: "韩文的读写", jp: "ハングルの読み書き" } },
  { id: "002", level: "A1", title: { kr: "이다 / 아니다", en: "To Be / Not To Be (이다 / 아니다)", es: "Ser / No ser (이다 / 아니다)", fr: "Être / Ne pas être (이다 / 아니다)", pt: "Ser / Não ser (이다 / 아니다)", zh: "是 / 不是 (이다 / 아니다)", jp: "〜だ / 〜ではない（이다 / 아니다）" } },
  { id: "003", level: "A1", title: { kr: "있다 / 없다", en: "To Have / To Not Have (있다 / 없다)", es: "Tener / No tener (있다 / 없다)", fr: "Avoir / Ne pas avoir (있다 / 없다)", pt: "Ter / Não ter (있다 / 없다)", zh: "有 / 没有 (있다 / 없다)", jp: "ある / ない（있다 / 없다）" } },
  { id: "004", level: "A1", title: { kr: "이/가", en: "Subject Marker 이/가", es: "Partícula de sujeto 이/가", fr: "Particule du sujet 이/가", pt: "Partícula de sujeito 이/가", zh: "主格助词 이/가", jp: "主格助詞 이/가" } },
  { id: "005", level: "A1", title: { kr: "은/는", en: "Topic Marker 은/는", es: "Partícula temática 은/는", fr: "Particule thématique 은/는", pt: "Partícula temática 은/는", zh: "主题助词 은/는", jp: "主題助詞 은/는" } },
  { id: "006", level: "A1", title: { kr: "을/를", en: "Object Marker 을/를", es: "Partícula de objeto 을/를", fr: "Particule d'objet 을/를", pt: "Partícula de objeto 을/를", zh: "宾格助词 을/를", jp: "目的格助詞 을/를" } },
  { id: "007", level: "A1", title: { kr: "에", en: "Location Particle 에", es: "Partícula de ubicación 에", fr: "Particule de lieu 에", pt: "Partícula de localização 에", zh: "位置助词 에", jp: "場所の助詞 에" } },
  { id: "008", level: "A1", title: { kr: "에서", en: "Location Particle 에서", es: "Partícula de ubicación 에서", fr: "Particule de lieu 에서", pt: "Partícula de localização 에서", zh: "位置助词 에서", jp: "場所の助詞 에서" } },
  { id: "009", level: "A1", title: { kr: "-(으)로", en: "Direction Particle -(으)로", es: "Partícula de dirección -(으)로", fr: "Particule de direction -(으)로", pt: "Partícula de direção -(으)로", zh: "方向助词 -(으)로", jp: "方向の助詞 -(으)로" } },
  { id: "010", level: "A1", title: { kr: "에게 / 한테", en: "Recipient Particles 에게 / 한테", es: "Partículas de destinatario 에게 / 한테", fr: "Particules de destinataire 에게 / 한테", pt: "Partículas de destinatário 에게 / 한테", zh: "对象助词 에게 / 한테", jp: "相手を表す助詞 에게 / 한테" } },
  { id: "011", level: "A1", title: { kr: "하고 / (이)랑", en: "Comitative Particles 하고 / (이)랑", es: "Partículas comitativas 하고 / (이)랑", fr: "Particules comitatives 하고 / (이)랑", pt: "Partículas comitativas 하고 / (이)랑", zh: "并列助词 하고 / (이)랑", jp: "並列助詞 하고 / (이)랑" } },
  { id: "012", level: "A1", title: { kr: "도", en: "Additive Particle 도", es: "Partícula aditiva 도", fr: "Particule additive 도", pt: "Partícula aditiva 도", zh: "添加助词 도", jp: "追加の助詞 도" } },
  { id: "013", level: "A1", title: { kr: "만", en: "Limiting Particle 만", es: "Partícula restrictiva 만", fr: "Particule restrictive 만", pt: "Partícula limitativa 만", zh: "限定助词 만", jp: "限定の助詞 만" } },
  { id: "014", level: "A1", title: { kr: "의", en: "Possessive Particle 의", es: "Partícula posesiva 의", fr: "Particule possessive 의", pt: "Partícula possessiva 의", zh: "所有格助词 의", jp: "所有を表す助詞 의" } },
  { id: "015", level: "A1", title: { kr: "-아요/-어요", en: "Polite Present Tense -아요/-어요", es: "Presente formal -아요/-어요", fr: "Présent poli -아요/-어요", pt: "Presente formal -아요/-어요", zh: "尊敬阶现在时 -아요/-어요", jp: "丁寧な現在形 -아요/-어요" } },
  { id: "016", level: "A1", title: { kr: "-습니다/-ㅂ니다", en: "Formal Present Tense -습니다/-ㅂ니다", es: "Presente formal -습니다/-ㅂ니다", fr: "Présent formel -습니다/-ㅂ니다", pt: "Presente formal -습니다/-ㅂ니다", zh: "正式阶现在时 -습니다/-ㅂ니다", jp: "フォーマルな現在形 -습니다/-ㅂ니다" } },
  { id: "017", level: "A1", title: { kr: "안 / -지 않다", en: "Negative Forms 안 / -지 않다", es: "Formas negativas 안 / -지 않다", fr: "Formes négatives 안 / -지 않다", pt: "Formas negativas 안 / -지 않다", zh: "否定形式 안 / -지 않다", jp: "否定形 안 / -지 않다" } },
  { id: "018", level: "A1", title: { kr: "-았/었어요", en: "Past Tense -았/었어요", es: "Pasado -았/었어요", fr: "Passé -았/었어요", pt: "Passado -았/었어요", zh: "过去时 -았/었어요", jp: "過去形 -았/었어요" } },
  { id: "019", level: "A1", title: { kr: "-(으)ㄹ 거예요", en: "Future Tense -(으)ㄹ 거예요", es: "Futuro -(으)ㄹ 거예요", fr: "Futur -(으)ㄹ 거예요", pt: "Futuro -(으)ㄹ 거예요", zh: "将来时 -(으)ㄹ 거예요", jp: "未来形 -(으)ㄹ 거예요" } },
  { id: "020", level: "A1", title: { kr: "-고 있다", en: "Present Progressive -고 있다", es: "Presente progresivo -고 있다", fr: "Progressif présent -고 있다", pt: "Presente progressivo -고 있다", zh: "现在进行时 -고 있다", jp: "現在進行形 -고 있다" } },
  { id: "021", level: "A1", title: { kr: "-(으)세요", en: "Imperative -(으)세요", es: "Imperativo -(으)세요", fr: "Impératif -(으)세요", pt: "Imperativo -(으)세요", zh: "命令形 -(으)세요", jp: "命令形 -(으)세요" } },
  { id: "022", level: "A1", title: { kr: "-(으)ㅂ시다", en: "Propositive -(으)ㅂ시다", es: "Propositivo -(으)ㅂ시다", fr: "Propositif -(으)ㅂ시다", pt: "Propositivo -(으)ㅂ시다", zh: "共动形 -(으)ㅂ시다", jp: "勧誘形 -(으)ㅂ시다" } },
  { id: "023", level: "A1", title: { kr: "-아요/어요?", en: "Polite Questions -아요/어요?", es: "Preguntas formales -아요/어요?", fr: "Questions polies -아요/어요?", pt: "Perguntas formais -아요/어요?", zh: "尊敬阶疑问句 -아요/어요?", jp: "丁寧な疑問形 -아요/어요?" } },
  { id: "024", level: "A1", title: { kr: "의문사(누구, 무엇, 어디, 언제, 왜, 어떻게)", en: "Question Words (Who, What, Where, When, Why, How)", es: "Palabras interrogativas (quién, qué, dónde, cuándo, por qué, cómo)", fr: "Mots interrogatifs (qui, quoi, où, quand, pourquoi, comment)", pt: "Palavras interrogativas (quem, o quê, onde, quando, por que, como)", zh: "疑问词（谁、什么、哪里、何时、为什么、怎么样）", jp: "疑問詞（誰、何、どこ、いつ、なぜ、どう）" } },
  { id: "025", level: "A1", title: { kr: "고유어 수", en: "Native Korean Numbers", es: "Números nativos coreanos", fr: "Nombres coréens natifs", pt: "Números nativos coreanos", zh: "固有词数字", jp: "固有語数詞" } },
  { id: "026", level: "A1", title: { kr: "한자어 수", en: "Sino-Korean Numbers", es: "Números sino-coreanos", fr: "Nombres sino-coréens", pt: "Números sino-coreanos", zh: "汉字词数字", jp: "漢字語数詞" } },
  { id: "027", level: "A1", title: { kr: "단위 명사(개, 명, 권 등)", en: "Counters (Measure Words)", es: "Clasificadores (contadores)", fr: "Classificateurs (mots de comptage)", pt: "Classificadores (palavras de contagem)", zh: "量词（개、명、권等）", jp: "助数詞（개、명、권など）" } },
  { id: "028", level: "A1", title: { kr: "날짜와 시간 표현", en: "Date and Time Expressions", es: "Expresiones de fecha y hora", fr: "Expressions de date et d'heure", pt: "Expressões de data e hora", zh: "日期和时间表达", jp: "日付と時間の表現" } },
  { id: "029", level: "A1", title: { kr: "기본 높임말 -(으)시-", en: "Basic Honorific -(으)시-", es: "Honorífico básico -(으)시-", fr: "Honorifique de base -(으)시-", pt: "Honorífico básico -(으)시-", zh: "基本敬语 -(으)시-", jp: "基本の尊敬語 -(으)시-" } },
  { id: "030", level: "A1", title: { kr: "A/V-고 (나열)", en: "A/V-고 (Listing)", es: "A/V-고 (Listing)", fr: "A/V-고 (Énumération)", pt: "A/V-고 (Enumeração)", zh: "A/V-고（并列）", jp: "A/V-고（列挙）" } },
  { id: "031", level: "A1", title: { kr: "V-아서/어서 (순차)", en: "V-아서/어서 (Sequence)", es: "V-아서/어서 (Secuencia)", fr: "V-아서/어서 (Séquence)", pt: "V-아서/어서 (Sequência)", zh: "V-아서/어서（顺序）", jp: "V-아서/어서（順序）" } },
  { id: "032", level: "A1", title: { kr: "A/V-아서/어서 (이유)", en: "A/V-아서/어서 (Reason)", es: "A/V-아서/어서 (Razón)", fr: "A/V-아서/어서 (Raison)", pt: "A/V-아서/어서 (Razão)", zh: "A/V-아서/어서（原因）", jp: "A/V-아서/어서（理由）" } },
  { id: "033", level: "A1", title: { kr: "V-아/어 보다", en: "V-아/어 보다 (Try Doing)", es: "V-아/어 보다 (Intentar)", fr: "V-아/어 보다 (Essayer)", pt: "V-아/어 보다 (Experimentar)", zh: "V-아/어 보다（尝试）", jp: "V-아/어 보다（試しにする）" } },
  { id: "034", level: "A1", title: { kr: "V-(으)ㄹ 수 있다 / 없다", en: "Can / Cannot V-(으)ㄹ 수 있다 / 없다", es: "Poder / No poder V-(으)ㄹ 수 있다 / 없다", fr: "Pouvoir / Ne pas pouvoir V-(으)ㄹ 수 있다 / 없다", pt: "Poder / Não poder V-(으)ㄹ 수 있다 / 없다", zh: "能 / 不能 V-(으)ㄹ 수 있다 / 없다", jp: "できる / できない V-(으)ㄹ 수 있다 / 없다" } },
  { id: "035", level: "A1", title: { kr: "V-고 싶다", en: "Want to V-고 싶다", es: "Querer V-고 싶다", fr: "Vouloir V-고 싶다", pt: "Querer V-고 싶다", zh: "想要 V-고 싶다", jp: "〜したい V-고 싶다" } },

  { id: "001", level: "A2", title: { kr: "V-지 말다", en: "Do Not V-지 말다", es: "No V-지 말다", fr: "Ne pas V-지 말다", pt: "Não V-지 말다", zh: "不要 V-지 말다", jp: "〜しないで V-지 말다" } },
  { id: "002", level: "A2", title: { kr: "A/V-아/어야 하다", en: "Have to A/V-아/어야 하다", es: "Tener que A/V-아/어야 하다", fr: "Devoir A/V-아/어야 하다", pt: "Ter que A/V-아/어야 하다", zh: "必须 A/V-아/어야 하다", jp: "〜しなければならない A/V-아/어야 하다" } },
  { id: "003", level: "A2", title: { kr: "A/V-아/어도 되다", en: "May / Be Allowed to A/V-아/어도 되다", es: "Poder / Estar permitido A/V-아/어도 되다", fr: "Pouvoir / Être autorisé à A/V-아/어도 되다", pt: "Poder / Ter permissão para A/V-아/어도 되다", zh: "可以 A/V-아/어도 되다", jp: "〜してもいい A/V-아/어도 되다" } },
  { id: "004", level: "A2", title: { kr: "A/V-(으)면 안 되다", en: "Must Not A/V-(으)면 안 되다", es: "No debe A/V-(으)면 안 되다", fr: "Ne pas devoir A/V-(으)면 안 되다", pt: "Não deve A/V-(으)면 안 되다", zh: "不可以 A/V-(으)면 안 되다", jp: "〜してはいけない A/V-(으)면 안 되다" } },
  { id: "005", level: "A2", title: { kr: "A/V-기 때문에", en: "A/V-기 때문에 (Because)", es: "A/V-기 때문에 (Porque)", fr: "A/V-기 때문에 (Parce que)", pt: "A/V-기 때문에 (Porque)", zh: "A/V-기 때문에（因为）", jp: "A/V-기 때문에（〜だから）" } },
  { id: "006", level: "A2", title: { kr: "A/V-아서/어서 그래서", en: "A/V-아서/어서, 그래서 (So / Therefore)", es: "A/V-아서/어서, 그래서 (Por eso)", fr: "A/V-아서/어서, 그래서 (Donc)", pt: "A/V-아서/어서, 그래서 (Por isso)", zh: "A/V-아서/어서, 그래서（所以）", jp: "A/V-아서/어서、그래서（だから）" } },
  { id: "007", level: "A2", title: { kr: "V-(으)ㄹ 때", en: "V-(으)ㄹ 때 (When)", es: "V-(으)ㄹ 때 (Cuando)", fr: "V-(으)ㄹ 때 (Quand)", pt: "V-(으)ㄹ 때 (Quando)", zh: "V-(으)ㄹ 때（……的时候）", jp: "V-(으)ㄹ 때（〜する時）" } },
  { id: "008", level: "A2", title: { kr: "V-기 전에", en: "V-기 전에 (Before)", es: "V-기 전에 (Antes de)", fr: "V-기 전에 (Avant de)", pt: "V-기 전에 (Antes de)", zh: "V-기 전에（之前）", jp: "V-기 전에（〜する前に）" } },
  { id: "009", level: "A2", title: { kr: "V-(으)ㄴ 후에 / 뒤에", en: "V-(으)ㄴ 후에 / 뒤에 (After)", es: "V-(으)ㄴ 후에 / 뒤에 (Después de)", fr: "V-(으)ㄴ 후에 / 뒤에 (Après)", pt: "V-(으)ㄴ 후에 / 뒤에 (Depois de)", zh: "V-(으)ㄴ 후에 / 뒤에（之后）", jp: "V-(으)ㄴ 후에 / 뒤에（〜した後に）" } },
  { id: "010", level: "A2", title: { kr: "V-는 동안", en: "V-는 동안 (While)", es: "V-는 동안 (Mientras)", fr: "V-는 동안 (Pendant que)", pt: "V-는 동안 (Enquanto)", zh: "V-는 동안（……的期间）", jp: "V-는 동안（〜する間）" } },
  { id: "011", level: "A2", title: { kr: "N까지 / V-까지", en: "N까지 / V-까지 (Until)", es: "N까지 / V-까지 (Hasta)", fr: "N까지 / V-까지 (Jusqu'à)", pt: "N까지 / V-까지 (Até)", zh: "N까지 / V-까지（到……为止）", jp: "N까지 / V-까지（〜まで）" } },
  { id: "012", level: "A2", title: { kr: "N부터", en: "N부터 (From)", es: "N부터 (Desde)", fr: "N부터 (À partir de)", pt: "N부터 (A partir de)", zh: "N부터（从……开始）", jp: "N부터（〜から）" } },
  { id: "013", level: "A2", title: { kr: "V-아/어 보다 (경험)", en: "V-아/어 보다 (Experience)", es: "V-아/어 보다 (Experiencia)", fr: "V-아/어 보다 (Expérience)", pt: "V-아/어 보다 (Experiência)", zh: "V-아/어 보다（经验）", jp: "V-아/어 보다（経験）" } },
  { id: "014", level: "A2", title: { kr: "V-(으)려고 하다", en: "V-(으)려고 하다 (Intention)", es: "V-(으)려고 하다 (Intención)", fr: "V-(으)려고 하다 (Intention)", pt: "V-(으)려고 하다 (Intenção)", zh: "V-(으)려고 하다（打算）", jp: "V-(으)려고 하다（〜しようと思う）" } },
  { id: "015", level: "A2", title: { kr: "V-(으)ㄹ 예정이다", en: "V-(으)ㄹ 예정이다 (Plan)", es: "V-(으)ㄹ 예정이다 (Plan)", fr: "V-(으)ㄹ 예정이다 (Projet)", pt: "V-(으)ㄹ 예정이다 (Plano)", zh: "V-(으)ㄹ 예정이다（计划）", jp: "V-(으)ㄹ 예정이다（予定）" } },
  { id: "016", level: "A2", title: { kr: "V-(으)ㄹ게요", en: "V-(으)ㄹ게요 (Promise)", es: "V-(으)ㄹ게요 (Promesa)", fr: "V-(으)ㄹ게요 (Promesse)", pt: "V-(으)ㄹ게요 (Promessa)", zh: "V-(으)ㄹ게요（承诺）", jp: "V-(으)ㄹ게요（約束）" } },
  { id: "017", level: "A2", title: { kr: "V-(으)ㄹ까요?", en: "V-(으)ㄹ까요? (Suggestion)", es: "V-(으)ㄹ까요? (Sugerencia)", fr: "V-(으)ㄹ까요? (Suggestion)", pt: "V-(으)ㄹ까요? (Sugestão)", zh: "V-(으)ㄹ까요?（建议）", jp: "V-(으)ㄹ까요?（提案）" } },
  { id: "018", level: "A2", title: { kr: "V-(으)ㄹ래요", en: "V-(으)ㄹ래요 (Intention)", es: "V-(으)ㄹ래요 (Intención)", fr: "V-(으)ㄹ래요 (Intention)", pt: "V-(으)ㄹ래요 (Intenção)", zh: "V-(으)ㄹ래요（意向）", jp: "V-(으)ㄹ래요（意向）" } },
  { id: "019", level: "A2", title: { kr: "V-아/어 주세요", en: "V-아/어 주세요 (Request)", es: "V-아/어 주세요 (Petición)", fr: "V-아/어 주세요 (Demande)", pt: "V-아/어 주세요 (Pedido)", zh: "V-아/어 주세요（请求）", jp: "V-아/어 주세요（お願い）" } },
  { id: "020", level: "A2", title: { kr: "V-아/어 주다", en: "V-아/어 주다 (Doing a Favor)", es: "V-아/어 주다 (Hacer un favor)", fr: "V-아/어 주다 (Rendre service)", pt: "V-아/어 주다 (Fazer um favor)", zh: "V-아/어 주다（帮忙做）", jp: "V-아/어 주다（〜してあげる／くれる）" } },
  { id: "021", level: "A2", title: { kr: "V-고 나서", en: "V-고 나서 (After Doing)", es: "V-고 나서 (Después de hacer)", fr: "V-고 나서 (Après avoir fait)", pt: "V-고 나서 (Depois de fazer)", zh: "V-고 나서（做完之后）", jp: "V-고 나서（〜してから）" } },
  { id: "022", level: "A2", title: { kr: "V-(으)면서", en: "V-(으)면서 (While Doing)", es: "V-(으)면서 (Mientras hace)", fr: "V-(으)면서 (Tout en faisant)", pt: "V-(으)면서 (Enquanto faz)", zh: "V-(으)면서（一边……一边……）", jp: "V-(으)면서（〜しながら）" } },
  { id: "023", level: "A2", title: { kr: "A/V-아/어지다", en: "A/V-아/어지다 (Become)", es: "A/V-아/어지다 (Volverse)", fr: "A/V-아/어지다 (Devenir)", pt: "A/V-아/어지다 (Tornar-se)", zh: "A/V-아/어지다（变得）", jp: "A/V-아/어지다（〜くなる／になる）" } },
  { id: "024", level: "A2", title: { kr: "V-게 되다", en: "V-게 되다 (Come to)", es: "V-게 되다 (Llegar a)", fr: "V-게 되다 (En venir à)", pt: "V-게 되다 (Acabar por)", zh: "V-게 되다（变成/结果变为）", jp: "V-게 되다（〜することになる）" } },
  { id: "025", level: "A2", title: { kr: "V-(으)러 가다 / 오다", en: "V-(으)러 가다 / 오다 (Purpose of Movement)", es: "V-(으)러 가다 / 오다 (Propósito de movimiento)", fr: "V-(으)러 가다 / 오다 (But du déplacement)", pt: "V-(으)러 가다 / 오다 (Objetivo do movimento)", zh: "V-(으)러 가다 / 오다（移动的目的）", jp: "V-(으)러 가다 / 오다（移動の目的）" } },
  { id: "026", level: "A2", title: { kr: "V-기 위해(서)", en: "V-기 위해(서) (In Order To)", es: "V-기 위해(서) (Para)", fr: "V-기 위해(서) (Afin de)", pt: "V-기 위해(서) (Para)", zh: "V-기 위해(서)（为了）", jp: "V-기 위해(서)（〜するために）" } },
  { id: "027", level: "A2", title: { kr: "A/V-(으)면", en: "A/V-(으)면 (If)", es: "A/V-(으)면 (Si)", fr: "A/V-(으)면 (Si)", pt: "A/V-(으)면 (Se)", zh: "A/V-(으)면（如果）", jp: "A/V-(으)면（もし〜なら）" } },
  { id: "028", level: "A2", title: { kr: "A/V-아/어도", en: "A/V-아/어도 (Even If)", es: "A/V-아/어도 (Aunque)", fr: "A/V-아/어도 (Même si)", pt: "A/V-아/어도 (Mesmo que)", zh: "A/V-아/어도（即使）", jp: "A/V-아/어도（〜しても）" } },
  { id: "029", level: "A2", title: { kr: "V-지 못하다", en: "V-지 못하다 (Cannot)", es: "V-지 못하다 (No poder)", fr: "V-지 못하다 (Ne pas pouvoir)", pt: "V-지 못하다 (Não conseguir)", zh: "V-지 못하다（不能）", jp: "V-지 못하다（〜できない）" } },
  { id: "030", level: "A2", title: { kr: "V-(으)ㄹ 수 없다 (심화)", en: "V-(으)ㄹ 수 없다 (Advanced)", es: "V-(으)ㄹ 수 없다 (Avanzado)", fr: "V-(으)ㄹ 수 없다 (Avancé)", pt: "V-(으)ㄹ 수 없다 (Avançado)", zh: "V-(으)ㄹ 수 없다（进阶）", jp: "V-(으)ㄹ 수 없다（応用）" } },
  { id: "031", level: "A2", title: { kr: "A/V-보다", en: "A/V-보다 (Comparison)", es: "A/V-보다 (Comparación)", fr: "A/V-보다 (Comparaison)", pt: "A/V-보다 (Comparação)", zh: "A/V-보다（比较）", jp: "A/V-보다（比較）" } },
  { id: "032", level: "A2", title: { kr: "N 중에서", en: "N 중에서 (Among)", es: "N 중에서 (Entre)", fr: "N 중에서 (Parmi)", pt: "N 중에서 (Entre)", zh: "N 중에서（在……之中）", jp: "N 중에서（〜の中で）" } },
  { id: "033", level: "A2", title: { kr: "A/V-지만", en: "A/V-지만 (Although)", es: "A/V-지만 (Aunque)", fr: "A/V-지만 (Bien que)", pt: "A/V-지만 (Embora)", zh: "A/V-지만（虽然）", jp: "A/V-지만（〜だが）" } },
  { id: "034", level: "A2", title: { kr: "A/V-는데", en: "A/V-는데 (But / Background)", es: "A/V-는데 (Pero / Contexto)", fr: "A/V-는데 (Mais / Contexte)", pt: "A/V-는데 (Mas / Contexto)", zh: "A/V-는데（但是/背景说明）", jp: "A/V-는데（〜けど／背景説明）" } },
  { id: "035", level: "A2", title: { kr: "A/V-(으)니까", en: "A/V-(으)니까 (Reason)", es: "A/V-(으)니까 (Razón)", fr: "A/V-(으)니까 (Raison)", pt: "A/V-(으)니까 (Razão)", zh: "A/V-(으)니까（原因）", jp: "A/V-(으)니까（理由）" } },

  { id: "001", level: "B1", title: { kr: "-아/어 보이다", en: "-아/어 보이다 (Seem / Look)", es: "-아/어 보이다 (Parecer)", fr: "-아/어 보이다 (Avoir l'air)", pt: "-아/어 보이다 (Parecer)", zh: "-아/어 보이다（看起来）", jp: "-아/어 보이다（〜に見える）" } },
  { id: "002", level: "B1", title: { kr: "-(으)ㄴ/는 모양이다", en: "-(으)ㄴ/는 모양이다 (It Seems)", es: "-(으)ㄴ/는 모양이다 (Parece que)", fr: "-(으)ㄴ/는 모양이다 (Il semble que)", pt: "-(으)ㄴ/는 모양이다 (Parece que)", zh: "-(으)ㄴ/는 모양이다（看样子）", jp: "-(으)ㄴ/는 모양이다（〜ようだ）" } },
  { id: "003", level: "B1", title: { kr: "-(으)ㄹ 텐데", en: "-(으)ㄹ 텐데 (Probably / I Expect)", es: "-(으)ㄹ 텐데 (Probablemente)", fr: "-(으)ㄹ 텐데 (Probablement)", pt: "-(으)ㄹ 텐데 (Provavelmente)", zh: "-(으)ㄹ 텐데（大概/我猜）", jp: "-(으)ㄹ 텐데（〜だろうに）" } },
  { id: "004", level: "B1", title: { kr: "-(으)ㄹ 테니까", en: "-(으)ㄹ 테니까 (Since It Will Be)", es: "-(으)ㄹ 테니까 (Como será)", fr: "-(으)ㄹ 테니까 (Puisque ce sera)", pt: "-(으)ㄹ 테니까 (Como será)", zh: "-(으)ㄹ 테니까（因为将会）", jp: "-(으)ㄹ 테니까（〜だろうから）" } },
  { id: "005", level: "B1", title: { kr: "-(으)ㄹ걸요", en: "-(으)ㄹ걸요 (I Guess)", es: "-(으)ㄹ걸요 (Supongo que)", fr: "-(으)ㄹ걸요 (Je pense que)", pt: "-(으)ㄹ걸요 (Acho que)", zh: "-(으)ㄹ걸요（我猜/大概）", jp: "-(으)ㄹ걸요（〜と思う）" } },
  { id: "006", level: "B1", title: { kr: "-(으)ㄹ지도 모르다", en: "-(으)ㄹ지도 모르다 (Might)", es: "-(으)ㄹ지도 모르다 (Puede que)", fr: "-(으)ㄹ지도 모르다 (Il se peut que)", pt: "-(으)ㄹ지도 모르다 (Pode ser que)", zh: "-(으)ㄹ지도 모르다（也许）", jp: "-(으)ㄹ지도 모르다（〜かもしれない）" } },
  { id: "007", level: "B1", title: { kr: "-다고 하다 (간접화법 기초)", en: "-다고 하다 (Reported Speech)", es: "-다고 하다 (Estilo indirecto)", fr: "-다고 하다 (Discours indirect)", pt: "-다고 하다 (Discurso indireto)", zh: "-다고 하다（间接引语基础）", jp: "-다고 하다（間接話法の基礎）" } },
  { id: "008", level: "B1", title: { kr: "-냐고 하다", en: "-냐고 하다 (Reported Question)", es: "-냐고 하다 (Pregunta indirecta)", fr: "-냐고 하다 (Question rapportée)", pt: "-냐고 하다 (Pergunta indireta)", zh: "-냐고 하다（间接疑问句）", jp: "-냐고 하다（間接疑問文）" } },
  { id: "009", level: "B1", title: { kr: "-자고 하다 / -(으)라고 하다", en: "-자고 하다 / -(으)라고 하다 (Reported Suggestion & Command)", es: "-자고 하다 / -(으)라고 하다 (Sugerencia y mandato indirectos)", fr: "-자고 하다 / -(으)라고 하다 (Suggestion et ordre rapportés)", pt: "-자고 하다 / -(으)라고 하다 (Sugestão e ordem indiretas)", zh: "-자고 하다 / -(으)라고 하다（间接建议与命令）", jp: "-자고 하다 / -(으)라고 하다（間接的な勧誘と命令）" } },
  { id: "010", level: "B1", title: { kr: "-(으)기로 하다", en: "-(으)기로 하다 (Decide To)", es: "-(으)기로 하다 (Decidir)", fr: "-(으)기로 하다 (Décider de)", pt: "-(으)기로 하다 (Decidir)", zh: "-(으)기로 하다（决定）", jp: "-(으)기로 하다（〜することにする）" } },
  { id: "011", level: "B1", title: { kr: "-(으)기로 마음먹다", en: "-(으)기로 마음먹다 (Make Up One's Mind)", es: "-(으)기로 마음먹다 (Tomar la decisión)", fr: "-(으)기로 마음먹다 (Se décider)", pt: "-(으)기로 마음먹다 (Tomar uma decisão)", zh: "-(으)기로 마음먹다（下定决心）", jp: "-(으)기로 마음먹다（決心する）" } },
  { id: "012", level: "B1", title: { kr: "-(으)면 좋겠다", en: "-(으)면 좋겠다 (I Wish)", es: "-(으)면 좋겠다 (Ojalá)", fr: "-(으)면 좋겠다 (J'aimerais que)", pt: "-(으)면 좋겠다 (Tomara que)", zh: "-(으)면 좋겠다（希望）", jp: "-(으)면 좋겠다（〜だといいな）" } },
  { id: "013", level: "B1", title: { kr: "-는 게 좋다", en: "-는 게 좋다 (It's Better To)", es: "-는 게 좋다 (Es mejor)", fr: "-는 게 좋다 (Il vaut mieux)", pt: "-는 게 좋다 (É melhor)", zh: "-는 게 좋다（最好）", jp: "-는 게 좋다（〜する方がいい）" } },
  { id: "014", level: "B1", title: { kr: "-더라고요", en: "-더라고요 (I Noticed)", es: "-더라고요 (Me di cuenta)", fr: "-더라고요 (J'ai remarqué)", pt: "-더라고요 (Percebi que)", zh: "-더라고요（我发现/注意到）", jp: "-더라고요（〜だったよ〈気づき〉）" } },
  { id: "015", level: "B1", title: { kr: "-던", en: "-던 (Recollection)", es: "-던 (Recuerdo)", fr: "-던 (Souvenir)", pt: "-던 (Recordação)", zh: "-던（回想）", jp: "-던（回想）" } },
  { id: "016", level: "B1", title: { kr: "V-(으)ㄴ 적이 있다 / 없다", en: "Experience: V-(으)ㄴ 적이 있다 / 없다", es: "Experiencia: V-(으)ㄴ 적이 있다 / 없다", fr: "Expérience : V-(으)ㄴ 적이 있다 / 없다", pt: "Experiência: V-(으)ㄴ 적이 있다 / 없다", zh: "经验：V-(으)ㄴ 적이 있다 / 없다", jp: "経験：V-(으)ㄴ 적이 있다 / 없다" } },
  { id: "017", level: "B1", title: { kr: "피동 표현", en: "Passive Voice", es: "Voz pasiva", fr: "Voix passive", pt: "Voz passiva", zh: "被动表达", jp: "受身表現" } },
  { id: "018", level: "B1", title: { kr: "사동 표현", en: "Causative Expressions", es: "Expresiones causativas", fr: "Expressions causatives", pt: "Expressões causativas", zh: "使动表达", jp: "使役表現" } },
  { id: "019", level: "B1", title: { kr: "V-아/어 가다", en: "V-아/어 가다 (Continue Going)", es: "V-아/어 가다 (Continuar)", fr: "V-아/어 가다 (Continuer)", pt: "V-아/어 가다 (Continuar)", zh: "V-아/어 가다（持续下去）", jp: "V-아/어 가다（〜していく）" } },
  { id: "020", level: "B1", title: { kr: "V-아/어 오다", en: "V-아/어 오다 (Continue Coming)", es: "V-아/어 오다 (Continuar)", fr: "V-아/어 오다 (Continuer)", pt: "V-아/어 오다 (Continuar)", zh: "V-아/어 오다（持续至今）", jp: "V-아/어 오다（〜してくる）" } },
  { id: "021", level: "B1", title: { kr: "-(으)ㄴ/는 데다가", en: "-(으)ㄴ/는 데다가 (In Addition)", es: "-(으)ㄴ/는 데다가 (Además)", fr: "-(으)ㄴ/는 데다가 (En plus)", pt: "-(으)ㄴ/는 데다가 (Além disso)", zh: "-(으)ㄴ/는 데다가（而且/再加上）", jp: "-(으)ㄴ/는 데다가（その上）" } },
  { id: "022", level: "B1", title: { kr: "-뿐만 아니라", en: "-뿐만 아니라 (Not Only)", es: "-뿐만 아니라 (No solo)", fr: "-뿐만 아니라 (Non seulement)", pt: "-뿐만 아니라 (Não apenas)", zh: "-뿐만 아니라（不仅）", jp: "-뿐만 아니라（〜だけでなく）" } },
  { id: "023", level: "B1", title: { kr: "V-다가", en: "V-다가 (While Doing)", es: "V-다가 (Mientras)", fr: "V-다가 (Pendant que)", pt: "V-다가 (Enquanto)", zh: "V-다가（做着做着）", jp: "V-다가（〜している途中で）" } },
  { id: "024", level: "B1", title: { kr: "V-는 중이다", en: "V-는 중이다 (Be in the Middle of)", es: "V-는 중이다 (Estar en medio de)", fr: "V-는 중이다 (Être en train de)", pt: "V-는 중이다 (Estar no meio de)", zh: "V-는 중이다（正在……中）", jp: "V-는 중이다（〜している最中だ）" } },
  { id: "025", level: "B1", title: { kr: "-(으)ㄹ 정도로", en: "-(으)ㄹ 정도로 (To the Extent That)", es: "-(으)ㄹ 정도로 (Hasta el punto de)", fr: "-(으)ㄹ 정도로 (Au point de)", pt: "-(으)ㄹ 정도로 (A ponto de)", zh: "-(으)ㄹ 정도로（到……的程度）", jp: "-(으)ㄹ 정도로（〜くらい）" } },
  { id: "026", level: "B1", title: { kr: "-(으)ㄴ/는 만큼", en: "-(으)ㄴ/는 만큼 (As Much As)", es: "-(으)ㄴ/는 만큼 (Tanto como)", fr: "-(으)ㄴ/는 만큼 (Autant que)", pt: "-(으)ㄴ/는 만큼 (Tanto quanto)", zh: "-(으)ㄴ/는 만큼（和……程度相当）", jp: "-(으)ㄴ/는 만큼（〜だけ／くらい）" } },
  { id: "027", level: "B1", title: { kr: "-(이)나 / 아무나", en: "-(이)나 / 아무나 (Any / Either)", es: "-(이)나 / 아무나 (Cualquiera)", fr: "-(이)나 / 아무나 (N'importe lequel)", pt: "-(이)나 / 아무나 (Qualquer)", zh: "-(이)나 / 아무나（任何/随便）", jp: "-(이)나 / 아무나（どれでも）" } },
  { id: "028", level: "B1", title: { kr: "-든지", en: "-든지 (Either / No Matter Which)", es: "-든지 (Cualquiera que)", fr: "-든지 (Peu importe lequel)", pt: "-든지 (Qualquer que seja)", zh: "-든지（无论哪个）", jp: "-든지（〜でも／であろうと）" } },
  { id: "029", level: "B1", title: { kr: "-고 보니", en: "-고 보니 (After Realizing)", es: "-고 보니 (Al darme cuenta)", fr: "-고 보니 (Après m'être rendu compte)", pt: "-고 보니 (Ao perceber)", zh: "-고 보니（做了之后才发现）", jp: "-고 보니（〜してみると）" } },
  { id: "030", level: "B1", title: { kr: "-게 마련이다", en: "-게 마련이다 (Naturally Bound To)", es: "-게 마련이다 (Es natural que)", fr: "-게 마련이다 (Il est naturel que)", pt: "-게 마련이다 (É natural que)", zh: "-게 마련이다（理所当然）", jp: "-게 마련이다（〜するものだ）" } },
  { id: "031", level: "B1", title: { kr: "-아/어 있다", en: "-아/어 있다 (Resulting State)", es: "-아/어 있다 (Estado resultante)", fr: "-아/어 있다 (État résultant)", pt: "-아/어 있다 (Estado resultante)", zh: "-아/어 있다（状态持续）", jp: "-아/어 있다（結果状態）" } },
  { id: "032", level: "B1", title: { kr: "-(으)ㄴ 편이다", en: "-(으)ㄴ 편이다 (Tend To)", es: "-(으)ㄴ 편이다 (Tender a)", fr: "-(으)ㄴ 편이다 (Avoir tendance à)", pt: "-(으)ㄴ 편이다 (Tender a)", zh: "-(으)ㄴ 편이다（算是……的一类）", jp: "-(으)ㄴ 편이다（〜する方だ）" } },
  { id: "033", level: "B1", title: { kr: "얼마나 -(으)ㄴ/는지 모르다", en: "How ... I Can't Describe", es: "No sabes cuánto...", fr: "Tu ne peux pas imaginer à quel point...", pt: "Você não imagina o quanto...", zh: "不知道有多么……", jp: "どれほど〜か分からない" } },
  { id: "034", level: "B1", title: { kr: "V-도록", en: "V-도록 (Purpose / Degree)", es: "V-도록 (Propósito / Grado)", fr: "V-도록 (But / Degré)", pt: "V-도록 (Propósito / Grau)", zh: "V-도록（目的/程度）", jp: "V-도록（目的・程度）" } },
  { id: "035", level: "B1", title: { kr: "-곤 하다", en: "-곤 하다 (Used To / Habitually)", es: "-곤 하다 (Solía)", fr: "-곤 하다 (Avoir l'habitude de)", pt: "-곤 하다 (Costumar)", zh: "-곤 하다（常常/习惯性地）", jp: "-곤 하다（よく〜したものだ）" } },

  { id: "001", level: "B2", title: { kr: "-(으)ㄴ/는 반면(에)", en: "-(으)ㄴ/는 반면(에) (Whereas / On the Other Hand)", es: "-(으)ㄴ/는 반면(에) (Mientras que)", fr: "-(으)ㄴ/는 반면(에) (Alors que)", pt: "-(으)ㄴ/는 반면(에) (Enquanto)", zh: "-(으)ㄴ/는 반면(에)（相反/而）", jp: "-(으)ㄴ/는 반면(에)（反面）" } },
  { id: "002", level: "B2", title: { kr: "-(으)ㄴ/는 데 비해", en: "-(으)ㄴ/는 데 비해 (Compared With)", es: "-(으)ㄴ/는 데 비해 (En comparación con)", fr: "-(으)ㄴ/는 데 비해 (Comparé à)", pt: "-(으)ㄴ/는 데 비해 (Comparado com)", zh: "-(으)ㄴ/는 데 비해（与……相比）", jp: "-(으)ㄴ/는 데 비해（〜に比べて）" } },
  { id: "003", level: "B2", title: { kr: "-(으)려면", en: "-(으)려면 (If You Want To)", es: "-(으)려면 (Si quieres)", fr: "-(으)려면 (Si tu veux)", pt: "-(으)려면 (Se quiser)", zh: "-(으)려면（如果想要）", jp: "-(으)려면（〜しようとすれば）" } },
  { id: "004", level: "B2", title: { kr: "-(으)ㄴ 이상", en: "-(으)ㄴ 이상 (Now That / Since)", es: "-(으)ㄴ 이상 (Ya que)", fr: "-(으)ㄴ 이상 (Puisque)", pt: "-(으)ㄴ 이상 (Já que)", zh: "-(으)ㄴ 이상（既然）", jp: "-(으)ㄴ 이상（〜する以上）" } },
  { id: "005", level: "B2", title: { kr: "-(으)ㄴ다면", en: "-(으)ㄴ다면 (If, Assuming)", es: "-(으)ㄴ다면 (Si)", fr: "-(으)ㄴ다면 (Si)", pt: "-(으)ㄴ다면 (Se)", zh: "-(으)ㄴ다면（假如）", jp: "-(으)ㄴ다면（もし〜なら）" } },
  { id: "006", level: "B2", title: { kr: "-(으)ㄹ 리가 없다", en: "-(으)ㄹ 리가 없다 (There Is No Way)", es: "-(으)ㄹ 리가 없다 (No hay manera)", fr: "-(으)ㄹ 리가 없다 (Il n'y a aucune chance)", pt: "-(으)ㄹ 리가 없다 (Não há como)", zh: "-(으)ㄹ 리가 없다（不可能）", jp: "-(으)ㄹ 리가 없다（〜のはずがない）" } },
  { id: "007", level: "B2", title: { kr: "-(으)ㄹ 리가 있다", en: "-(으)ㄹ 리가 있다 (There Is a Possibility)", es: "-(으)ㄹ 리가 있다 (Es posible)", fr: "-(으)ㄹ 리가 있다 (Il est possible)", pt: "-(으)ㄹ 리가 있다 (É possível)", zh: "-(으)ㄹ 리가 있다（有可能）", jp: "-(으)ㄹ 리가 있다（〜の可能性がある）" } },
  { id: "008", level: "B2", title: { kr: "-(으)ㄴ 듯하다", en: "-(으)ㄴ 듯하다 (It Seems)", es: "-(으)ㄴ 듯하다 (Parece)", fr: "-(으)ㄴ 듯하다 (Il semble)", pt: "-(으)ㄴ 듯하다 (Parece)", zh: "-(으)ㄴ 듯하다（似乎）", jp: "-(으)ㄴ 듯하다（〜のようだ）" } },
  { id: "009", level: "B2", title: { kr: "다면서요?", en: "다면서요? (I Heard That...)", es: "다면서요? (He oído que...)", fr: "다면서요? (J'ai entendu dire que...)", pt: "다면서요? (Ouvi dizer que...)", zh: "다면서요?（听说……对吧？）", jp: "다면서요?（〜だそうですね？）" } },
  { id: "010", level: "B2", title: { kr: "다니요", en: "다니요 (Expressing Surprise or Denial)", es: "다니요 (Sorpresa o negación)", fr: "다니요 (Surprise ou dénégation)", pt: "다니요 (Surpresa ou negação)", zh: "다니요（表示惊讶或否定）", jp: "다니요（驚きや否定を表す）" } },
  { id: "011", level: "B2", title: { kr: "다가는", en: "다가는 (If This Continues)", es: "다가는 (Si esto continúa)", fr: "다가는 (Si cela continue)", pt: "다가는 (Se isso continuar)", zh: "다가는（照这样下去的话）", jp: "다가는（このままだと）" } },
  { id: "012", level: "B2", title: { kr: "-고 말다", en: "-고 말다 (Finally / End Up)", es: "-고 말다 (Terminar por)", fr: "-고 말다 (Finir par)", pt: "-고 말다 (Acabar por)", zh: "-고 말다（终于/最终）", jp: "-고 말다（〜してしまう）" } },
  { id: "013", level: "B2", title: { kr: "-아/어 버리다", en: "-아/어 버리다 (Completely / Unfortunately)", es: "-아/어 버리다 (Completamente / Desgraciadamente)", fr: "-아/어 버리다 (Complètement / Malheureusement)", pt: "-아/어 버리다 (Completamente / Infelizmente)", zh: "-아/어 버리다（完全地/遗憾地）", jp: "-아/어 버리다（〜してしまう〈完了・残念〉）" } },
  { id: "014", level: "B2", title: { kr: "-아/어 내다", en: "-아/어 내다 (Accomplish Successfully)", es: "-아/어 내다 (Lograr)", fr: "-아/어 내다 (Réussir à)", pt: "-아/어 내다 (Conseguir)", zh: "-아/어 내다（成功完成）", jp: "-아/어 내다（成し遂げる）" } },
  { id: "015", level: "B2", title: { kr: "-아/어 봤자", en: "-아/어 봤자 (Even If You Try)", es: "-아/어 봤자 (Aunque lo intentes)", fr: "-아/어 봤자 (Même si tu essaies)", pt: "-아/어 봤자 (Mesmo que tente)", zh: "-아/어 봤자（即使尝试也……）", jp: "-아/어 봤자（〜してみたところで）" } },
  { id: "016", level: "B2", title: { kr: "-(으)나 마나", en: "-(으)나 마나 (Makes No Difference)", es: "-(으)나 마나 (Da igual)", fr: "-(으)나 마나 (Cela ne change rien)", pt: "-(으)나 마나 (Tanto faz)", zh: "-(으)나 마나（做不做都一样）", jp: "-(으)나 마나（〜しても仕方ない）" } },
  { id: "017", level: "B2", title: { kr: "-(으)ㄹ걸 그랬다", en: "-(으)ㄹ걸 그랬다 (I Should Have)", es: "-(으)ㄹ걸 그랬다 (Debería haber)", fr: "-(으)ㄹ걸 그랬다 (J'aurais dû)", pt: "-(으)ㄹ걸 그랬다 (Eu deveria ter)", zh: "-(으)ㄹ걸 그랬다（早知道就……了）", jp: "-(으)ㄹ걸 그랬다（〜すればよかった）" } },
  { id: "018", level: "B2", title: { kr: "-았/었어야 했는데", en: "-았/었어야 했는데 (Should Have)", es: "-았/었어야 했는데 (Debería haber)", fr: "-았/었어야 했는데 (J'aurais dû)", pt: "-았/었어야 했는데 (Deveria ter)", zh: "-았/었어야 했는데（本应该……）", jp: "-았/었어야 했는데（〜すべきだったのに）" } },
  { id: "019", level: "B2", title: { kr: "-(이)야말로", en: "-(이)야말로 (Indeed / Exactly)", es: "-(이)야말로 (Precisamente)", fr: "-(이)야말로 (Précisément)", pt: "-(이)야말로 (Exatamente)", zh: "-(이)야말로（正是/确实）", jp: "-(이)야말로（〜こそ）" } },
  { id: "020", level: "B2", title: { kr: "-(이)라고는", en: "-(이)라고는 (Nothing but)", es: "-(이)라고는 (Nada más que)", fr: "-(이)라고는 (Rien d'autre que)", pt: "-(이)라고는 (Nada além de)", zh: "-(이)라고는（除……之外什么都没有）", jp: "-(이)라고는（〜としては）" } },
  { id: "021", level: "B2", title: { kr: "-(으)ㄹ 뿐이다", en: "-(으)ㄹ 뿐이다 (Only / Merely)", es: "-(으)ㄹ 뿐이다 (Solo)", fr: "-(으)ㄹ 뿐이다 (Seulement)", pt: "-(으)ㄹ 뿐이다 (Apenas)", zh: "-(으)ㄹ 뿐이다（只不过）", jp: "-(으)ㄹ 뿐이다（〜するだけだ）" } },
  { id: "022", level: "B2", title: { kr: "-(이)기만 하다", en: "-(이)기만 하다 (Do Nothing but)", es: "-(이)기만 하다 (No hacer más que)", fr: "-(이)기만 하다 (Ne faire que)", pt: "-(이)기만 하다 (Apenas)", zh: "-(이)기만 하다（只是……）", jp: "-(이)기만 하다（〜してばかりいる）" } },
  { id: "023", level: "B2", title: { kr: "자마자", en: "자마자 (As Soon As)", es: "자마자 (En cuanto)", fr: "자마자 (Dès que)", pt: "자마자 (Assim que)", zh: "자마자（一……就……）", jp: "자마자（〜するとすぐに）" } },
  { id: "024", level: "B2", title: { kr: "는 즉시", en: "는 즉시 (Immediately After)", es: "는 즉시 (Inmediatamente después)", fr: "는 즉시 (Immédiatement après)", pt: "는 즉시 (Imediatamente após)", zh: "는 즉시（立即）", jp: "는 즉시（〜次第すぐに）" } },
  { id: "025", level: "B2", title: { kr: "-(으)ㄹ수록", en: "-(으)ㄹ수록 (The More..., The More...)", es: "-(으)ㄹ수록 (Cuanto más..., más...)", fr: "-(으)ㄹ수록 (Plus..., plus...)", pt: "-(으)ㄹ수록 (Quanto mais..., mais...)", zh: "-(으)ㄹ수록（越……越……）", jp: "-(으)ㄹ수록（〜すればするほど）" } },
  { id: "026", level: "B2", title: { kr: "-아/어 가면서", en: "-아/어 가면서 (While Gradually)", es: "-아/어 가면서 (Mientras gradualmente)", fr: "-아/어 가면서 (Tout en évoluant)", pt: "-아/어 가면서 (Enquanto gradualmente)", zh: "-아/어 가면서（逐渐地）", jp: "-아/어 가면서（〜していきながら）" } },
  { id: "027", level: "B2", title: { kr: "에 따르면", en: "에 따르면 (According to)", es: "에 따르면 (Según)", fr: "에 따르면 (Selon)", pt: "에 따르면 (Segundo)", zh: "에 따르면（根据）", jp: "에 따르면（〜によると）" } },
  { id: "028", level: "B2", title: { kr: "에 비추어", en: "에 비추어 (In Light of)", es: "에 비추어 (A la luz de)", fr: "에 비추어 (À la lumière de)", pt: "에 비추어 (À luz de)", zh: "에 비추어（鉴于）", jp: "에 비추어（〜に照らして）" } },
  { id: "029", level: "B2", title: { kr: "을/를 통해(서)", en: "을/를 통해(서) (Through)", es: "을/를 통해(서) (A través de)", fr: "을/를 통해(서) (Par l'intermédiaire de)", pt: "을/를 통해(서) (Através de)", zh: "을/를 통해(서)（通过）", jp: "을/를 통해(서)（〜を通じて）" } },
  { id: "030", level: "B2", title: { kr: "에 비하면", en: "에 비하면 (Compared to)", es: "에 비하면 (Comparado con)", fr: "에 비하면 (Comparé à)", pt: "에 비하면 (Comparado com)", zh: "에 비하면（相比）", jp: "에 비하면（〜に比べれば）" } },
  { id: "031", level: "B2", title: { kr: "은/는 물론", en: "은/는 물론 (Not to Mention)", es: "은/는 물론 (Sin mencionar)", fr: "은/는 물론 (Sans parler de)", pt: "은/는 물론 (Sem falar de)", zh: "은/는 물론（不用说）", jp: "은/는 물론（〜はもちろん）" } },
  { id: "032", level: "B2", title: { kr: "뿐만 아니라 ...도", en: "뿐만 아니라 ...도 (Not Only... But Also)", es: "뿐만 아니라 ...도 (No solo... sino también)", fr: "뿐만 아니라 ...도 (Non seulement... mais aussi)", pt: "뿐만 아니라 ...도 (Não apenas... mas também)", zh: "뿐만 아니라 ...도（不仅……而且……）", jp: "뿐만 아니라 ...도（〜だけでなく…も）" } },
  { id: "033", level: "B2", title: { kr: "차라리", en: "차라리 (Rather)", es: "차라리 (Más bien)", fr: "차라리 (Plutôt)", pt: "차라리 (Antes)", zh: "차라리（宁可/不如）", jp: "차라리（むしろ）" } },
  { id: "034", level: "B2", title: { kr: "-(으)ㄹ까 말까 하다", en: "-(으)ㄹ까 말까 하다 (Be Undecided)", es: "-(으)ㄹ까 말까 하다 (Estar indeciso)", fr: "-(으)ㄹ까 말까 하다 (Hésiter)", pt: "-(으)ㄹ까 말까 하다 (Estar indeciso)", zh: "-(으)ㄹ까 말까 하다（犹豫不决）", jp: "-(으)ㄹ까 말까 하다（〜しようかどうか迷う）" } },
  { id: "035", level: "B2", title: { kr: "-(으)려던 참이다", en: "-(으)려던 참이다 (Be About To)", es: "-(으)려던 참이다 (Estar a punto de)", fr: "-(으)려던 참이다 (Être sur le point de)", pt: "-(으)려던 참이다 (Estar prestes a)", zh: "-(으)려던 참이다（正打算……）", jp: "-(으)려던 참이다（〜しようとしていたところだ）" } },

  { id: "001", level: "C1", title: { kr: "-(으)ㄴ/는 만큼", en: "-(으)ㄴ/는 만큼 (To the Extent That)", es: "-(으)ㄴ/는 만큼 (En la medida en que)", fr: "-(으)ㄴ/는 만큼 (Dans la mesure où)", pt: "-(으)ㄴ/는 만큼 (Na medida em que)", zh: "-(으)ㄴ/는 만큼（在……程度上）", jp: "-(으)ㄴ/는 만큼（〜だけに）" } },
  { id: "002", level: "C1", title: { kr: "-(으)ㄹ지라도", en: "-(으)ㄹ지라도 (Even If)", es: "-(으)ㄹ지라도 (Aunque)", fr: "-(으)ㄹ지라도 (Même si)", pt: "-(으)ㄹ지라도 (Mesmo que)", zh: "-(으)ㄹ지라도（即使）", jp: "-(으)ㄹ지라도（〜であっても）" } },
  { id: "003", level: "C1", title: { kr: "-(으)ㄴ들", en: "-(으)ㄴ들 (Even If)", es: "-(으)ㄴ들 (Aunque)", fr: "-(으)ㄴ들 (Même si)", pt: "-(으)ㄴ들 (Mesmo que)", zh: "-(으)ㄴ들（即使……又怎样）", jp: "-(으)ㄴ들（〜たところで）" } },
  { id: "004", level: "C1", title: { kr: "-(으)ㄹ 따름이다", en: "-(으)ㄹ 따름이다 (Merely / Nothing More Than)", es: "-(으)ㄹ 따름이다 (No es más que)", fr: "-(으)ㄹ 따름이다 (Ce n'est que)", pt: "-(으)ㄹ 따름이다 (Nada mais do que)", zh: "-(으)ㄹ 따름이다（只不过/仅仅）", jp: "-(으)ㄹ 따름이다（〜するだけだ）" } },
  { id: "005", level: "C1", title: { kr: "-(으)ㄹ 법하다", en: "-(으)ㄹ 법하다 (Likely / Probable)", es: "-(으)ㄹ 법하다 (Probablemente)", fr: "-(으)ㄹ 법하다 (Il est probable que)", pt: "-(으)ㄹ 법하다 (Provavelmente)", zh: "-(으)ㄹ 법하다（很可能）", jp: "-(으)ㄹ 법하다（〜しそうだ）" } },
  { id: "006", level: "C1", title: { kr: "-(으)ㄹ 성싶다", en: "-(으)ㄹ 성싶다 (It Seems Likely)", es: "-(으)ㄹ 성싶다 (Parece probable)", fr: "-(으)ㄹ 성싶다 (Il semble probable)", pt: "-(으)ㄹ 성싶다 (Parece provável)", zh: "-(으)ㄹ 성싶다（似乎可能）", jp: "-(으)ㄹ 성싶다（〜のようだ〈推量〉）" } },
  { id: "007", level: "C1", title: { kr: "-(으)ㄴ가 보다", en: "-(으)ㄴ가 보다 (Apparently)", es: "-(으)ㄴ가 보다 (Al parecer)", fr: "-(으)ㄴ가 보다 (Apparemment)", pt: "-(으)ㄴ가 보다 (Ao que parece)", zh: "-(으)ㄴ가 보다（看来）", jp: "-(으)ㄴ가 보다（〜みたいだ）" } },
  { id: "008", level: "C1", title: { kr: "-(으)ㄴ 모양이다 (심화)", en: "-(으)ㄴ 모양이다 (Advanced Appearance)", es: "-(으)ㄴ 모양이다 (Apariencia avanzada)", fr: "-(으)ㄴ 모양이다 (Apparence avancée)", pt: "-(으)ㄴ 모양이다 (Aparência avançada)", zh: "-(으)ㄴ 모양이다（进阶）", jp: "-(으)ㄴ 모양이다（応用）" } },
  { id: "009", level: "C1", title: { kr: "-(으)ㄴ 바", en: "-(으)ㄴ 바 (As / According to)", es: "-(으)ㄴ 바 (Según)", fr: "-(으)ㄴ 바 (Selon)", pt: "-(으)ㄴ 바 (Conforme)", zh: "-(으)ㄴ 바（根据/所……的内容）", jp: "-(으)ㄴ 바（〜したところ）" } },
  { id: "010", level: "C1", title: { kr: "-(으)ㄴ바에야", en: "-(으)ㄴ바에야 (Since Anyway)", es: "-(으)ㄴ바에야 (Ya que)", fr: "-(으)ㄴ바에야 (Puisque)", pt: "-(으)ㄴ바에야 (Já que)", zh: "-(으)ㄴ바에야（既然如此）", jp: "-(으)ㄴ바에야（〜する以上は）" } },
  { id: "011", level: "C1", title: { kr: "-(으)ㄹ 바에는", en: "-(으)ㄹ 바에는 (Rather Than)", es: "-(으)ㄹ 바에는 (Antes que)", fr: "-(으)ㄹ 바에는 (Plutôt que)", pt: "-(으)ㄹ 바에는 (Em vez de)", zh: "-(으)ㄹ 바에는（与其……不如）", jp: "-(으)ㄹ 바에는（〜するくらいなら）" } },
  { id: "012", level: "C1", title: { kr: "-(으)ㄹ 뿐더러", en: "-(으)ㄹ 뿐더러 (Not Only... But Also)", es: "-(으)ㄹ 뿐더러 (No solo... sino también)", fr: "-(으)ㄹ 뿐더러 (Non seulement... mais aussi)", pt: "-(으)ㄹ 뿐더러 (Não apenas... mas também)", zh: "-(으)ㄹ 뿐더러（不仅……而且……）", jp: "-(으)ㄹ 뿐더러（〜だけでなく）" } },
  { id: "013", level: "C1", title: { kr: "-(으)ㄴ 데다(가)", en: "-(으)ㄴ 데다(가) (In Addition)", es: "-(으)ㄴ 데다(가) (Además)", fr: "-(으)ㄴ 데다(가) (En plus)", pt: "-(으)ㄴ 데다(가) (Além disso)", zh: "-(으)ㄴ 데다(가)（再加上）", jp: "-(으)ㄴ 데다(가)（その上）" } },
  { id: "014", level: "C1", title: { kr: "-(으)면서도", en: "-(으)면서도 (Even Though While)", es: "-(으)면서도 (Aunque)", fr: "-(으)면서도 (Bien que)", pt: "-(으)면서도 (Embora)", zh: "-(으)면서도（尽管……却）", jp: "-(으)면서도（〜しながらも）" } },
  { id: "015", level: "C1", title: { kr: "-(으)ㄴ 끝에", en: "-(으)ㄴ 끝에 (After Much Effort)", es: "-(으)ㄴ 끝에 (Después de mucho esfuerzo)", fr: "-(으)ㄴ 끝에 (Après de nombreux efforts)", pt: "-(으)ㄴ 끝에 (Após muito esforço)", zh: "-(으)ㄴ 끝에（经过一番努力后）", jp: "-(으)ㄴ 끝에（〜した末に）" } },
  { id: "016", level: "C1", title: { kr: "-(으)ㄴ 나머지", en: "-(으)ㄴ 나머지 (As a Result)", es: "-(으)ㄴ 나머지 (Como resultado)", fr: "-(으)ㄴ 나머지 (Par conséquent)", pt: "-(으)ㄴ 나머지 (Como resultado)", zh: "-(으)ㄴ 나머지（结果导致）", jp: "-(으)ㄴ 나머지（〜した挙句／あまり）" } },
  { id: "017", level: "C1", title: { kr: "-(으)ㄴ 탓에", en: "-(으)ㄴ 탓에 (Because of)", es: "-(으)ㄴ 탓에 (A causa de)", fr: "-(으)ㄴ 탓에 (À cause de)", pt: "-(으)ㄴ 탓에 (Por causa de)", zh: "-(으)ㄴ 탓에（都怪/因为）", jp: "-(으)ㄴ 탓에（〜のせいで）" } },
  { id: "018", level: "C1", title: { kr: "-(으)ㄴ 김에", en: "-(으)ㄴ 김에 (While You're At It)", es: "-(으)ㄴ 김에 (Ya que)", fr: "-(으)ㄴ 김에 (Puisque tu y es)", pt: "-(으)ㄴ 김에 (Já que)", zh: "-(으)ㄴ 김에（趁着）", jp: "-(으)ㄴ 김에（〜するついでに）" } },
  { id: "019", level: "C1", title: { kr: "-(으)ㄴ 채(로)", en: "-(으)ㄴ 채(로) (While Remaining)", es: "-(으)ㄴ 채(로) (Permaneciendo)", fr: "-(으)ㄴ 채(로) (En restant)", pt: "-(으)ㄴ 채(로) (Permanecendo)", zh: "-(으)ㄴ 채(로)（保持……状态）", jp: "-(으)ㄴ 채(로)（〜したまま）" } },
  { id: "020", level: "C1", title: { kr: "-(으)ㄴ 상태에서", en: "-(으)ㄴ 상태에서 (In a State of)", es: "-(으)ㄴ 상태에서 (En estado de)", fr: "-(으)ㄴ 상태에서 (Dans un état de)", pt: "-(으)ㄴ 상태에서 (Em estado de)", zh: "-(으)ㄴ 상태에서（在……状态下）", jp: "-(으)ㄴ 상태에서（〜した状態で）" } },
  { id: "021", level: "C1", title: { kr: "-(으)기에", en: "-(으)기에 (Because / Since)", es: "-(으)기에 (Porque)", fr: "-(으)기에 (Puisque)", pt: "-(으)기에 (Porque)", zh: "-(으)기에（因为）", jp: "-(으)기에（〜なので）" } },
  { id: "022", level: "C1", title: { kr: "-(으)므로", en: "-(으)므로 (Since / Therefore)", es: "-(으)므로 (Puesto que)", fr: "-(으)므로 (Puisque)", pt: "-(으)므로 (Visto que)", zh: "-(으)므로（因此/所以）", jp: "-(으)므로（〜なので）" } },
  { id: "023", level: "C1", title: { kr: "-(으)로 말미암아", en: "-(으)로 말미암아 (Owing to)", es: "-(으)로 말미암아 (Debido a)", fr: "-(으)로 말미암아 (En raison de)", pt: "-(으)로 말미암아 (Em virtude de)", zh: "-(으)로 말미암아（由于）", jp: "-(으)로 말미암아（〜に起因して）" } },
  { id: "024", level: "C1", title: { kr: "고자", en: "고자 (In Order To)", es: "고자 (Con el fin de)", fr: "고자 (Afin de)", pt: "고자 (A fim de)", zh: "고자（为了）", jp: "고자（〜しようと）" } },
  { id: "025", level: "C1", title: { kr: "고자 하다", en: "고자 하다 (Intend To)", es: "고자 하다 (Tener la intención de)", fr: "고자 하다 (Avoir l'intention de)", pt: "고자 하다 (Ter a intenção de)", zh: "고자 하다（打算/意图）", jp: "고자 하다（〜しようとする）" } },
  { id: "026", level: "C1", title: { kr: "인용 표현 -기에 따르면", en: "Quotation Expression -기에 따르면 (According to)", es: "Expresión de cita -기에 따르면", fr: "Expression de citation -기에 따르면", pt: "Expressão de citação -기에 따르면", zh: "引用表达 -기에 따르면（根据）", jp: "引用表現 -기에 따르면（〜によると）" } },
  { id: "027", level: "C1", title: { kr: "-(이)야", en: "-(이)야 (Emphasis)", es: "-(이)야 (Énfasis)", fr: "-(이)야 (Mise en emphase)", pt: "-(이)야 (Ênfase)", zh: "-(이)야（强调）", jp: "-(이)야（強調）" } },
  { id: "028", level: "C1", title: { kr: "-(이)라야", en: "-(이)라야 (Only If)", es: "-(이)라야 (Solo si)", fr: "-(이)라야 (Seulement si)", pt: "-(이)라야 (Somente se)", zh: "-(이)라야（只有……才）", jp: "-(이)라야（〜でなければ）" } },
  { id: "029", level: "C1", title: { kr: "-(이)나마", en: "-(이)나마 (At Least)", es: "-(이)나마 (Al menos)", fr: "-(이)나마 (Au moins)", pt: "-(이)나마 (Pelo menos)", zh: "-(이)나마（至少）", jp: "-(이)나마（せめて）" } },
  { id: "030", level: "C1", title: { kr: "-(으)ㄹ수록 더욱", en: "-(으)ㄹ수록 더욱 (Even More as)", es: "-(으)ㄹ수록 더욱 (Cada vez más)", fr: "-(으)ㄹ수록 더욱 (D'autant plus)", pt: "-(으)ㄹ수록 더욱 (Cada vez mais)", zh: "-(으)ㄹ수록 더욱（越……越加）", jp: "-(으)ㄹ수록 더욱（〜するほどさらに）" } },
  { id: "031", level: "C1", title: { kr: "-(으)면 -(으)ㄹ수록", en: "-(으)면 -(으)ㄹ수록 (The More..., The More...)", es: "-(으)면 -(으)ㄹ수록 (Cuanto más..., más...)", fr: "-(으)면 -(으)ㄹ수록 (Plus..., plus...)", pt: "-(으)면 -(으)ㄹ수록 (Quanto mais..., mais...)", zh: "-(으)면 -(으)ㄹ수록（越……越……）", jp: "-(으)면 -(으)ㄹ수록（〜すればするほど）" } },
  { id: "032", level: "C1", title: { kr: "-(으)ㄴ 반면에", en: "-(으)ㄴ 반면에 (Whereas)", es: "-(으)ㄴ 반면에 (Mientras que)", fr: "-(으)ㄴ 반면에 (Alors que)", pt: "-(으)ㄴ 반면에 (Enquanto)", zh: "-(으)ㄴ 반면에（而/相反）", jp: "-(으)ㄴ 반면에（反面）" } },
  { id: "033", level: "C1", title: { kr: "더욱이 / 게다가", en: "Moreover / Furthermore", es: "Además / Es más", fr: "De plus / En outre", pt: "Além disso / Ademais", zh: "更加 / 而且", jp: "さらに ／ その上" } },
  { id: "034", level: "C1", title: { kr: "결국 / 이처럼", en: "Eventually / Thus", es: "Al final / De esta manera", fr: "Finalement / Ainsi", pt: "Por fim / Assim", zh: "最终 / 像这样", jp: "結局 ／ このように" } },
  { id: "035", level: "C1", title: { kr: "한편 / 반면에 / 즉", en: "Meanwhile / On the Other Hand / That Is", es: "Mientras tanto / Por otro lado / Es decir", fr: "Pendant ce temps / En revanche / C'est-à-dire", pt: "Enquanto isso / Por outro lado / Ou seja", zh: "另一方面 / 相反 / 即", jp: "一方 ／ 反面 ／ つまり" } },

  { id: "001", level: "C2", title: { kr: "-(으)랴", en: "-(으)랴 (Rhetorical Question)", es: "-(으)랴 (Pregunta retórica)", fr: "-(으)랴 (Question rhétorique)", pt: "-(으)랴 (Pergunta retórica)", zh: "-(으)랴（反问）", jp: "-(으)랴（反語）" } },
  { id: "002", level: "C2", title: { kr: "-(으)랴 -(으)랴", en: "-(으)랴 -(으)랴 (Multiple Simultaneous Actions)", es: "-(으)랴 -(으)랴 (Acciones múltiples)", fr: "-(으)랴 -(으)랴 (Actions multiples)", pt: "-(으)랴 -(으)랴 (Ações múltiplas)", zh: "-(으)랴 -(으)랴（同时进行多个动作）", jp: "-(으)랴 -(으)랴（同時に複数の動作）" } },
  { id: "003", level: "C2", title: { kr: "-(으)ㄴ들 어떠하랴", en: "-(으)ㄴ들 어떠하랴 (Even If, What Difference Does It Make?)", es: "-(으)ㄴ들 어떠하랴 (Aunque sea así)", fr: "-(으)ㄴ들 어떠하랴 (Même si c'était le cas)", pt: "-(으)ㄴ들 어떠하랴 (Mesmo que seja assim)", zh: "-(으)ㄴ들 어떠하랴（即使那样又如何）", jp: "-(으)ㄴ들 어떠하랴（〜たところでどうだというのか）" } },
  { id: "004", level: "C2", title: { kr: "-(으)ㄹ 턱이 없다", en: "-(으)ㄹ 턱이 없다 (There Is No Way)", es: "-(으)ㄹ 턱이 없다 (No hay manera)", fr: "-(으)ㄹ 턱이 없다 (Il est impossible que)", pt: "-(으)ㄹ 턱이 없다 (Não há como)", zh: "-(으)ㄹ 턱이 없다（不可能）", jp: "-(으)ㄹ 턱이 없다（〜はずがない）" } },
  { id: "005", level: "C2", title: { kr: "-(으)ㄴ 셈이다", en: "-(으)ㄴ 셈이다 (It Means That)", es: "-(으)ㄴ 셈이다 (Significa que)", fr: "-(으)ㄴ 셈이다 (Cela revient à dire que)", pt: "-(으)ㄴ 셈이다 (Significa que)", zh: "-(으)ㄴ 셈이다（相当于/算是）", jp: "-(으)ㄴ 셈이다（〜というわけだ）" } },
  { id: "006", level: "C2", title: { kr: "-(으)ㄴ 결과", en: "-(으)ㄴ 결과 (As a Result)", es: "-(으)ㄴ 결과 (Como resultado)", fr: "-(으)ㄴ 결과 (À la suite de)", pt: "-(으)ㄴ 결과 (Como resultado)", zh: "-(으)ㄴ 결과（结果）", jp: "-(으)ㄴ 결과（〜した結果）" } },
  { id: "007", level: "C2", title: { kr: "-(으)ㄴ 이유로", en: "-(으)ㄴ 이유로 (For the Reason That)", es: "-(으)ㄴ 이유로 (Por la razón de)", fr: "-(으)ㄴ 이유로 (Pour la raison que)", pt: "-(으)ㄴ 이유로 (Pelo motivo de)", zh: "-(으)ㄴ 이유로（因为……的原因）", jp: "-(으)ㄴ 이유로（〜という理由で）" } },
  { id: "008", level: "C2", title: { kr: "-(으)ㄴ 것으로 보아", en: "-(으)ㄴ 것으로 보아 (Judging From)", es: "-(으)ㄴ 것으로 보아 (A juzgar por)", fr: "-(으)ㄴ 것으로 보아 (À en juger par)", pt: "-(으)ㄴ 것으로 보아 (A julgar por)", zh: "-(으)ㄴ 것으로 보아（从……来看）", jp: "-(으)ㄴ 것으로 보아（〜ことから見て）" } },
  { id: "009", level: "C2", title: { kr: "-(으)ㄴ 점으로 미루어", en: "-(으)ㄴ 점으로 미루어 (Based on the Fact That)", es: "-(으)ㄴ 점으로 미루어 (Basándose en)", fr: "-(으)ㄴ 점으로 미루어 (À partir du fait que)", pt: "-(으)ㄴ 점으로 미루어 (Com base no fato de)", zh: "-(으)ㄴ 점으로 미루어（根据……推测）", jp: "-(으)ㄴ 점으로 미루어（〜点から推して）" } },
  { id: "010", level: "C2", title: { kr: "-(으)ㄹ 수밖에 없다 (Have No Choice But To)", en: "-(으)ㄹ 수밖에 없다 (Have No Choice But To)", es: "-(으)ㄹ 수밖에 없다 (No tener más remedio que)", fr: "-(으)ㄹ 수밖에 없다 (Ne pas avoir d'autre choix que)", pt: "-(으)ㄹ 수밖에 없다 (Não ter outra escolha senão)", zh: "-(으)ㄹ 수밖에 없다（不得不）", jp: "-(으)ㄹ 수밖에 없다（〜するしかない）" } },
  { id: "011", level: "C2", title: { kr: "-(으)ㄹ 수밖에 없게 되다", en: "-(으)ㄹ 수밖에 없게 되다 (Come to Have No Choice)", es: "-(으)ㄹ 수밖에 없게 되다", fr: "-(으)ㄹ 수밖에 없게 되다", pt: "-(으)ㄹ 수밖에 없게 되다", zh: "-(으)ㄹ 수밖에 없게 되다（变得不得不）", jp: "-(으)ㄹ 수밖에 없게 되다（〜するしかなくなる）" } },
  { id: "012", level: "C2", title: { kr: "-(으)ㄹ 지경이다", en: "-(으)ㄹ 지경이다 (To the Point Of)", es: "-(으)ㄹ 지경이다 (Hasta el punto de)", fr: "-(으)ㄹ 지경이다 (Au point de)", pt: "-(으)ㄹ 지경이다 (A ponto de)", zh: "-(으)ㄹ 지경이다（到了……的地步）", jp: "-(으)ㄹ 지경이다（〜するほどだ）" } },
  { id: "013", level: "C2", title: { kr: "-(으)ㄹ 정도에 이르다", en: "-(으)ㄹ 정도에 이르다 (Reach the Point Where)", es: "-(으)ㄹ 정도에 이르다 (Llegar al punto de)", fr: "-(으)ㄹ 정도에 이르다 (En arriver au point de)", pt: "-(으)ㄹ 정도에 이르다 (Chegar ao ponto de)", zh: "-(으)ㄹ 정도에 이르다（达到……的程度）", jp: "-(으)ㄹ 정도에 이르다（〜する程度に至る）" } },
  { id: "014", level: "C2", title: { kr: "-(으)ㅁ으로써", en: "-(으)ㅁ으로써 (By Means of)", es: "-(으)ㅁ으로써 (Mediante)", fr: "-(으)ㅁ으로써 (Au moyen de)", pt: "-(으)ㅁ으로써 (Por meio de)", zh: "-(으)ㅁ으로써（通过）", jp: "-(으)ㅁ으로써（〜することによって）" } },
  { id: "015", level: "C2", title: { kr: "-(으)ㅁ으로 인하여", en: "-(으)ㅁ으로 인하여 (Due to)", es: "-(으)ㅁ으로 인하여 (Debido a)", fr: "-(으)ㅁ으로 인하여 (En raison de)", pt: "-(으)ㅁ으로 인하여 (Devido a)", zh: "-(으)ㅁ으로 인하여（由于）", jp: "-(으)ㅁ으로 인하여（〜によって）" } },
  { id: "016", level: "C2", title: { kr: "-(으)ㅁ으로", en: "-(으)ㅁ으로 (By Doing)", es: "-(으)ㅁ으로 (Mediante)", fr: "-(으)ㅁ으로 (En faisant)", pt: "-(으)ㅁ으로 (Ao fazer)", zh: "-(으)ㅁ으로（通过做……）", jp: "-(으)ㅁ으로（〜することで）" } },
  { id: "017", level: "C2", title: { kr: "-(으)ㅁ", en: "Nominalization -(으)ㅁ", es: "Nominalización -(으)ㅁ", fr: "Nominalisation -(으)ㅁ", pt: "Nominalização -(으)ㅁ", zh: "名词化 -(으)ㅁ", jp: "名詞化 -(으)ㅁ" } },
  { id: "018", level: "C2", title: { kr: "기에 이르다", en: "기에 이르다 (Come to the Point Of)", es: "기에 이르다 (Llegar a)", fr: "기에 이르다 (En arriver à)", pt: "기에 이르다 (Chegar a)", zh: "기에 이르다（达到……的地步）", jp: "기에 이르다（〜するに至る）" } },
  { id: "019", level: "C2", title: { kr: "고 보면", en: "고 보면 (Considering That)", es: "고 보면 (Considerando que)", fr: "고 보면 (Si l'on considère)", pt: "고 보면 (Considerando que)", zh: "고 보면（考虑到）", jp: "고 보면（考えてみると）" } },
  { id: "020", level: "C2", title: { kr: "고 보면 결국", en: "고 보면 결국 (Ultimately, Considering That)", es: "고 보면 결국 (En definitiva)", fr: "고 보면 결국 (En fin de compte)", pt: "고 보면 결국 (No fim das contas)", zh: "고 보면 결국（最终来说）", jp: "고 보면 결국（結局のところ）" } },
  { id: "021", level: "C2", title: { kr: "돌이켜 보면", en: "Looking Back", es: "Mirando hacia atrás", fr: "En y repensant", pt: "Olhando para trás", zh: "回顾起来", jp: "振り返ってみると" } },
  { id: "022", level: "C2", title: { kr: "말하자면", en: "So to Speak", es: "Por así decirlo", fr: "Pour ainsi dire", pt: "Por assim dizer", zh: "可以说", jp: "言ってみれば" } },
  { id: "023", level: "C2", title: { kr: "다시 말하면", en: "In Other Words", es: "En otras palabras", fr: "Autrement dit", pt: "Em outras palavras", zh: "换句话说", jp: "言い換えれば" } },
  { id: "024", level: "C2", title: { kr: "요컨대", en: "In Short / In Conclusion", es: "En resumen", fr: "En bref", pt: "Em resumo", zh: "总而言之", jp: "要するに" } },
  { id: "025", level: "C2", title: { kr: "반대로", en: "On the Contrary", es: "Por el contrario", fr: "Au contraire", pt: "Pelo contrário", zh: "相反地", jp: "逆に" } },
  { id: "026", level: "C2", title: { kr: "그럼에도 불구하고", en: "Nevertheless", es: "Sin embargo", fr: "Néanmoins", pt: "Mesmo assim", zh: "尽管如此", jp: "それにもかかわらず" } },
  { id: "027", level: "C2", title: { kr: "전제로 하다", en: "Assume / Presuppose", es: "Suponer como premisa", fr: "Présupposer", pt: "Pressupor", zh: "以……为前提", jp: "前提とする" } },
  { id: "028", level: "C2", title: { kr: "근거로 하다", en: "Base On", es: "Basarse en", fr: "Se fonder sur", pt: "Basear-se em", zh: "以……为依据", jp: "根拠とする" } },
  { id: "029", level: "C2", title: { kr: "~에 의하면", en: "According to ~", es: "Según ~", fr: "Selon ~", pt: "Segundo ~", zh: "根据~", jp: "~によれば" } },
  { id: "030", level: "C2", title: { kr: "~의 입장에서", en: "From the Perspective of ~", es: "Desde la perspectiva de ~", fr: "Du point de vue de ~", pt: "Do ponto de vista de ~", zh: "从~的立场来看", jp: "~の立場から" } },
  { id: "031", level: "C2", title: { kr: "~의 관점에서", en: "From the Viewpoint of ~", es: "Desde el punto de vista de ~", fr: "Du point de vue de ~", pt: "Sob a perspectiva de ~", zh: "从~的观点来看", jp: "~の観点から" } },
  { id: "032", level: "C2", title: { kr: "~에 비추어 볼 때", en: "In Light of ~", es: "A la luz de ~", fr: "À la lumière de ~", pt: "À luz de ~", zh: "鉴于~", jp: "~に照らしてみると" } },
  { id: "033", level: "C2", title: { kr: "~을 전제로", en: "On the Premise That ~", es: "Bajo la premisa de ~", fr: "En supposant que ~", pt: "Partindo da premissa de ~", zh: "以~为前提", jp: "~を前提として" } },
  { id: "034", level: "C2", title: { kr: "~에 따라", en: "According to / Depending on ~", es: "Según / Dependiendo de ~", fr: "Selon / En fonction de ~", pt: "De acordo com / Dependendo de ~", zh: "根据 / 取决于~", jp: "~によって / ~次第で" } },
  { id: "035", level: "C2", title: { kr: "비록 ~일지라도 / 설령 ~일지라도", en: "Even Though / Even If ~", es: "Aunque / Incluso si ~", fr: "Même si ~", pt: "Mesmo que ~", zh: "即使~", jp: "たとえ~であっても" } },
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

        {/* HEADER (conversation curriculum 헤더 이식) */}
        <div style={headerWrap}>
          {/* 1줄: Sign In / Create Account — 좌우 꽉 채움 */}
          <div style={authRow}>
            <Link href="/login" style={{ flex: 1, textDecoration: "none" }}>
              <button type="button" style={{ ...btnBack, width: "100%" }}>
                Sign In
              </button>
            </Link>

            <Link href="/signup" style={{ flex: 1, textDecoration: "none" }}>
              <button type="button" style={{ ...btnHeaderPrimary, width: "100%" }}>
                Create Account
              </button>
            </Link>
          </div>

          {/* 2줄: Back / Copy link */}
          <div style={secondaryRow}>
            <button
              type="button"
              onClick={() => { window.location.href = "/curriculum"; }}
              style={btnBack}
            >
              ← Back
            </button>

            <button type="button" onClick={handleCopy} style={btnSecondary}>
              Copy link
            </button>
          </div>
        </div>

        {/* TITLE */}
        <h1 style={title}>🧩 Grammar Curriculum (Korean)</h1>
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
                  <div>{c.title.en}</div>
                  <div>{c.title.es}</div>
                  <div>{c.title.fr}</div>
                  <div>{c.title.pt}</div>
                  <div>{c.title.kr}</div>
                  <div>{c.title.zh}</div>
                  <div>{c.title.jp}</div>
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

/* 헤더 전체 래퍼 (conversation curriculum과 동일) */
const headerWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 20,
  paddingTop: "calc(env(safe-area-inset-top) + 8px)",
};

/* 1줄: Sign In / Create Account — 좌우 꽉 채움, 같은 너비 */
const authRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  width: "100%",
};

/* 2줄: Back / Copy link */
const secondaryRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
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