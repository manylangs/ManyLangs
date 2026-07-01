"use client";

import Link from "next/link";
import { useState } from "react";
import { copyLink } from "@/utils/share";
/* ================= 하드코딩 데이터 ================= */

const CHAPTERS = [

  { id: "001", level: "A1", title: { kr: "한글 읽기와 쓰기", en: "Reading and Writing Hangul", es: "Lectura y escritura del hangul", fr: "Lecture et écriture du hangeul", pt: "Leitura e escrita do hangul" } },
  { id: "002", level: "A1", title: { kr: "이다 / 아니다", en: "To Be / Not To Be (이다 / 아니다)", es: "Ser / No ser (이다 / 아니다)", fr: "Être / Ne pas être (이다 / 아니다)", pt: "Ser / Não ser (이다 / 아니다)" } },
  { id: "003", level: "A1", title: { kr: "있다 / 없다", en: "To Have / To Not Have (있다 / 없다)", es: "Tener / No tener (있다 / 없다)", fr: "Avoir / Ne pas avoir (있다 / 없다)", pt: "Ter / Não ter (있다 / 없다)" } },
  { id: "004", level: "A1", title: { kr: "이/가", en: "Subject Marker 이/가", es: "Partícula de sujeto 이/가", fr: "Particule du sujet 이/가", pt: "Partícula de sujeito 이/가" } },
  { id: "005", level: "A1", title: { kr: "은/는", en: "Topic Marker 은/는", es: "Partícula temática 은/는", fr: "Particule thématique 은/는", pt: "Partícula temática 은/는" } },
  { id: "006", level: "A1", title: { kr: "을/를", en: "Object Marker 을/를", es: "Partícula de objeto 을/를", fr: "Particule d’objet 을/를", pt: "Partícula de objeto 을/를" } },
  { id: "007", level: "A1", title: { kr: "에", en: "Location Particle 에", es: "Partícula de ubicación 에", fr: "Particule de lieu 에", pt: "Partícula de localização 에" } },
  { id: "008", level: "A1", title: { kr: "에서", en: "Location Particle 에서", es: "Partícula de ubicación 에서", fr: "Particule de lieu 에서", pt: "Partícula de localização 에서" } },
  { id: "009", level: "A1", title: { kr: "-(으)로", en: "Direction Particle -(으)로", es: "Partícula de dirección -(으)로", fr: "Particule de direction -(으)로", pt: "Partícula de direção -(으)로" } },
  { id: "010", level: "A1", title: { kr: "에게 / 한테", en: "Recipient Particles 에게 / 한테", es: "Partículas de destinatario 에게 / 한테", fr: "Particules de destinataire 에게 / 한테", pt: "Partículas de destinatário 에게 / 한테" } },
  { id: "011", level: "A1", title: { kr: "하고 / (이)랑", en: "Comitative Particles 하고 / (이)랑", es: "Partículas comitativas 하고 / (이)랑", fr: "Particules comitatives 하고 / (이)랑", pt: "Partículas comitativas 하고 / (이)랑" } },
  { id: "012", level: "A1", title: { kr: "도", en: "Additive Particle 도", es: "Partícula aditiva 도", fr: "Particule additive 도", pt: "Partícula aditiva 도" } },
  { id: "013", level: "A1", title: { kr: "만", en: "Limiting Particle 만", es: "Partícula restrictiva 만", fr: "Particule restrictive 만", pt: "Partícula limitativa 만" } },
  { id: "014", level: "A1", title: { kr: "의", en: "Possessive Particle 의", es: "Partícula posesiva 의", fr: "Particule possessive 의", pt: "Partícula possessiva 의" } },
  { id: "015", level: "A1", title: { kr: "-아요/-어요", en: "Polite Present Tense -아요/-어요", es: "Presente formal -아요/-어요", fr: "Présent poli -아요/-어요", pt: "Presente formal -아요/-어요" } },
  { id: "016", level: "A1", title: { kr: "-습니다/-ㅂ니다", en: "Formal Present Tense -습니다/-ㅂ니다", es: "Presente formal -습니다/-ㅂ니다", fr: "Présent formel -습니다/-ㅂ니다", pt: "Presente formal -습니다/-ㅂ니다" } },
  { id: "017", level: "A1", title: { kr: "안 / -지 않다", en: "Negative Forms 안 / -지 않다", es: "Formas negativas 안 / -지 않다", fr: "Formes négatives 안 / -지 않다", pt: "Formas negativas 안 / -지 않다" } },
  { id: "018", level: "A1", title: { kr: "-았/었어요", en: "Past Tense -았/었어요", es: "Pasado -았/었어요", fr: "Passé -았/었어요", pt: "Passado -았/었어요" } },
  { id: "019", level: "A1", title: { kr: "-(으)ㄹ 거예요", en: "Future Tense -(으)ㄹ 거예요", es: "Futuro -(으)ㄹ 거예요", fr: "Futur -(으)ㄹ 거예요", pt: "Futuro -(으)ㄹ 거예요" } },
  { id: "020", level: "A1", title: { kr: "-고 있다", en: "Present Progressive -고 있다", es: "Presente progresivo -고 있다", fr: "Progressif présent -고 있다", pt: "Presente progressivo -고 있다" } },
  { id: "021", level: "A1", title: { kr: "-(으)세요", en: "Imperative -(으)세요", es: "Imperativo -(으)세요", fr: "Impératif -(으)세요", pt: "Imperativo -(으)세요" } },
  { id: "022", level: "A1", title: { kr: "-(으)ㅂ시다", en: "Propositive -(으)ㅂ시다", es: "Propositivo -(으)ㅂ시다", fr: "Propositif -(으)ㅂ시다", pt: "Propositivo -(으)ㅂ시다" } },
  { id: "023", level: "A1", title: { kr: "-아요/어요?", en: "Polite Questions -아요/어요?", es: "Preguntas formales -아요/어요?", fr: "Questions polies -아요/어요?", pt: "Perguntas formais -아요/어요?" } },
  { id: "024", level: "A1", title: { kr: "의문사(누구, 무엇, 어디, 언제, 왜, 어떻게)", en: "Question Words (Who, What, Where, When, Why, How)", es: "Palabras interrogativas (quién, qué, dónde, cuándo, por qué, cómo)", fr: "Mots interrogatifs (qui, quoi, où, quand, pourquoi, comment)", pt: "Palavras interrogativas (quem, o quê, onde, quando, por que, como)" } },
  { id: "025", level: "A1", title: { kr: "고유어 수", en: "Native Korean Numbers", es: "Números nativos coreanos", fr: "Nombres coréens natifs", pt: "Números nativos coreanos" } },
  { id: "026", level: "A1", title: { kr: "한자어 수", en: "Sino-Korean Numbers", es: "Números sino-coreanos", fr: "Nombres sino-coréens", pt: "Números sino-coreanos" } },
  { id: "027", level: "A1", title: { kr: "단위 명사(개, 명, 권 등)", en: "Counters (Measure Words)", es: "Clasificadores (contadores)", fr: "Classificateurs (mots de comptage)", pt: "Classificadores (palavras de contagem)" } },
  { id: "028", level: "A1", title: { kr: "날짜와 시간 표현", en: "Date and Time Expressions", es: "Expresiones de fecha y hora", fr: "Expressions de date et d'heure", pt: "Expressões de data e hora" } },
  { id: "029", level: "A1", title: { kr: "기본 높임말 -(으)시-", en: "Basic Honorific -(으)시-", es: "Honorífico básico -(으)시-", fr: "Honorifique de base -(으)시-", pt: "Honorífico básico -(으)시-" } },
  { id: "030", level: "A1", title: { kr: "A/V-고 (나열)", en: "A/V-고 (Listing)", es: "A/V-고 (Listing)", fr: "A/V-고 (Énumération)", pt: "A/V-고 (Enumeração)" } },
  { id: "031", level: "A1", title: { kr: "V-아서/어서 (순차)", en: "V-아서/어서 (Sequence)", es: "V-아서/어서 (Secuencia)", fr: "V-아서/어서 (Séquence)", pt: "V-아서/어서 (Sequência)" } },
  { id: "032", level: "A1", title: { kr: "A/V-아서/어서 (이유)", en: "A/V-아서/어서 (Reason)", es: "A/V-아서/어서 (Razón)", fr: "A/V-아서/어서 (Raison)", pt: "A/V-아서/어서 (Razão)" } },
  { id: "033", level: "A1", title: { kr: "V-아/어 보다", en: "V-아/어 보다 (Try Doing)", es: "V-아/어 보다 (Intentar)", fr: "V-아/어 보다 (Essayer)", pt: "V-아/어 보다 (Experimentar)" } },
  { id: "034", level: "A1", title: { kr: "V-(으)ㄹ 수 있다 / 없다", en: "Can / Cannot V-(으)ㄹ 수 있다 / 없다", es: "Poder / No poder V-(으)ㄹ 수 있다 / 없다", fr: "Pouvoir / Ne pas pouvoir V-(으)ㄹ 수 있다 / 없다", pt: "Poder / Não poder V-(으)ㄹ 수 있다 / 없다" } },
  { id: "035", level: "A1", title: { kr: "V-고 싶다", en: "Want to V-고 싶다", es: "Querer V-고 싶다", fr: "Vouloir V-고 싶다", pt: "Querer V-고 싶다" } },

  { id: "036", level: "A2", title: { kr: "V-지 말다", en: "Do Not V-지 말다", es: "No V-지 말다", fr: "Ne pas V-지 말다", pt: "Não V-지 말다" } },
  { id: "037", level: "A2", title: { kr: "A/V-아/어야 하다", en: "Have to A/V-아/어야 하다", es: "Tener que A/V-아/어야 하다", fr: "Devoir A/V-아/어야 하다", pt: "Ter que A/V-아/어야 하다" } },
  { id: "038", level: "A2", title: { kr: "A/V-아/어도 되다", en: "May / Be Allowed to A/V-아/어도 되다", es: "Poder / Estar permitido A/V-아/어도 되다", fr: "Pouvoir / Être autorisé à A/V-아/어도 되다", pt: "Poder / Ter permissão para A/V-아/어도 되다" } },
  { id: "039", level: "A2", title: { kr: "A/V-(으)면 안 되다", en: "Must Not A/V-(으)면 안 되다", es: "No debe A/V-(으)면 안 되다", fr: "Ne pas devoir A/V-(으)면 안 되다", pt: "Não deve A/V-(으)면 안 되다" } },
  { id: "040", level: "A2", title: { kr: "A/V-기 때문에", en: "A/V-기 때문에 (Because)", es: "A/V-기 때문에 (Porque)", fr: "A/V-기 때문에 (Parce que)", pt: "A/V-기 때문에 (Porque)" } },
  { id: "041", level: "A2", title: { kr: "A/V-아서/어서 그래서", en: "A/V-아서/어서, 그래서 (So / Therefore)", es: "A/V-아서/어서, 그래서 (Por eso)", fr: "A/V-아서/어서, 그래서 (Donc)", pt: "A/V-아서/어서, 그래서 (Por isso)" } },
  { id: "042", level: "A2", title: { kr: "V-(으)ㄹ 때", en: "V-(으)ㄹ 때 (When)", es: "V-(으)ㄹ 때 (Cuando)", fr: "V-(으)ㄹ 때 (Quand)", pt: "V-(으)ㄹ 때 (Quando)" } },
  { id: "043", level: "A2", title: { kr: "V-기 전에", en: "V-기 전에 (Before)", es: "V-기 전에 (Antes de)", fr: "V-기 전에 (Avant de)", pt: "V-기 전에 (Antes de)" } },
  { id: "044", level: "A2", title: { kr: "V-(으)ㄴ 후에 / 뒤에", en: "V-(으)ㄴ 후에 / 뒤에 (After)", es: "V-(으)ㄴ 후에 / 뒤에 (Después de)", fr: "V-(으)ㄴ 후에 / 뒤에 (Après)", pt: "V-(으)ㄴ 후에 / 뒤에 (Depois de)" } },
  { id: "045", level: "A2", title: { kr: "V-는 동안", en: "V-는 동안 (While)", es: "V-는 동안 (Mientras)", fr: "V-는 동안 (Pendant que)", pt: "V-는 동안 (Enquanto)" } },
  { id: "046", level: "A2", title: { kr: "N까지 / V-까지", en: "N까지 / V-까지 (Until)", es: "N까지 / V-까지 (Hasta)", fr: "N까지 / V-까지 (Jusqu'à)", pt: "N까지 / V-까지 (Até)" } },
  { id: "047", level: "A2", title: { kr: "N부터", en: "N부터 (From)", es: "N부터 (Desde)", fr: "N부터 (À partir de)", pt: "N부터 (A partir de)" } },
  { id: "048", level: "A2", title: { kr: "V-아/어 보다 (경험)", en: "V-아/어 보다 (Experience)", es: "V-아/어 보다 (Experiencia)", fr: "V-아/어 보다 (Expérience)", pt: "V-아/어 보다 (Experiência)" } },
  { id: "049", level: "A2", title: { kr: "V-(으)려고 하다", en: "V-(으)려고 하다 (Intention)", es: "V-(으)려고 하다 (Intención)", fr: "V-(으)려고 하다 (Intention)", pt: "V-(으)려고 하다 (Intenção)" } },
  { id: "050", level: "A2", title: { kr: "V-(으)ㄹ 예정이다", en: "V-(으)ㄹ 예정이다 (Plan)", es: "V-(으)ㄹ 예정이다 (Plan)", fr: "V-(으)ㄹ 예정이다 (Projet)", pt: "V-(으)ㄹ 예정이다 (Plano)" } },
  { id: "051", level: "A2", title: { kr: "V-(으)ㄹ게요", en: "V-(으)ㄹ게요 (Promise)", es: "V-(으)ㄹ게요 (Promesa)", fr: "V-(으)ㄹ게요 (Promesse)", pt: "V-(으)ㄹ게요 (Promessa)" } },
  { id: "052", level: "A2", title: { kr: "V-(으)ㄹ까요?", en: "V-(으)ㄹ까요? (Suggestion)", es: "V-(으)ㄹ까요? (Sugerencia)", fr: "V-(으)ㄹ까요? (Suggestion)", pt: "V-(으)ㄹ까요? (Sugestão)" } },
  { id: "053", level: "A2", title: { kr: "V-(으)ㄹ래요", en: "V-(으)ㄹ래요 (Intention)", es: "V-(으)ㄹ래요 (Intención)", fr: "V-(으)ㄹ래요 (Intention)", pt: "V-(으)ㄹ래요 (Intenção)" } },
  { id: "054", level: "A2", title: { kr: "V-아/어 주세요", en: "V-아/어 주세요 (Request)", es: "V-아/어 주세요 (Petición)", fr: "V-아/어 주세요 (Demande)", pt: "V-아/어 주세요 (Pedido)" } },
  { id: "055", level: "A2", title: { kr: "V-아/어 주다", en: "V-아/어 주다 (Doing a Favor)", es: "V-아/어 주다 (Hacer un favor)", fr: "V-아/어 주다 (Rendre service)", pt: "V-아/어 주다 (Fazer um favor)" } },
  { id: "056", level: "A2", title: { kr: "V-고 나서", en: "V-고 나서 (After Doing)", es: "V-고 나서 (Después de hacer)", fr: "V-고 나서 (Après avoir fait)", pt: "V-고 나서 (Depois de fazer)" } },
  { id: "057", level: "A2", title: { kr: "V-(으)면서", en: "V-(으)면서 (While Doing)", es: "V-(으)면서 (Mientras hace)", fr: "V-(으)면서 (Tout en faisant)", pt: "V-(으)면서 (Enquanto faz)" } },
  { id: "058", level: "A2", title: { kr: "A/V-아/어지다", en: "A/V-아/어지다 (Become)", es: "A/V-아/어지다 (Volverse)", fr: "A/V-아/어지다 (Devenir)", pt: "A/V-아/어지다 (Tornar-se)" } },
  { id: "059", level: "A2", title: { kr: "V-게 되다", en: "V-게 되다 (Come to)", es: "V-게 되다 (Llegar a)", fr: "V-게 되다 (En venir à)", pt: "V-게 되다 (Acabar por)" } },
  { id: "060", level: "A2", title: { kr: "V-(으)러 가다 / 오다", en: "V-(으)러 가다 / 오다 (Purpose of Movement)", es: "V-(으)러 가다 / 오다 (Propósito de movimiento)", fr: "V-(으)러 가다 / 오다 (But du déplacement)", pt: "V-(으)러 가다 / 오다 (Objetivo do movimento)" } },
  { id: "061", level: "A2", title: { kr: "V-기 위해(서)", en: "V-기 위해(서) (In Order To)", es: "V-기 위해(서) (Para)", fr: "V-기 위해(서) (Afin de)", pt: "V-기 위해(서) (Para)" } },
  { id: "062", level: "A2", title: { kr: "A/V-(으)면", en: "A/V-(으)면 (If)", es: "A/V-(으)면 (Si)", fr: "A/V-(으)면 (Si)", pt: "A/V-(으)면 (Se)" } },
  { id: "063", level: "A2", title: { kr: "A/V-아/어도", en: "A/V-아/어도 (Even If)", es: "A/V-아/어도 (Aunque)", fr: "A/V-아/어도 (Même si)", pt: "A/V-아/어도 (Mesmo que)" } },
  { id: "064", level: "A2", title: { kr: "V-지 못하다", en: "V-지 못하다 (Cannot)", es: "V-지 못하다 (No poder)", fr: "V-지 못하다 (Ne pas pouvoir)", pt: "V-지 못하다 (Não conseguir)" } },
  { id: "065", level: "A2", title: { kr: "V-(으)ㄹ 수 없다 (심화)", en: "V-(으)ㄹ 수 없다 (Advanced)", es: "V-(으)ㄹ 수 없다 (Avanzado)", fr: "V-(으)ㄹ 수 없다 (Avancé)", pt: "V-(으)ㄹ 수 없다 (Avançado)" } },
  { id: "066", level: "A2", title: { kr: "A/V-보다", en: "A/V-보다 (Comparison)", es: "A/V-보다 (Comparación)", fr: "A/V-보다 (Comparaison)", pt: "A/V-보다 (Comparação)" } },
  { id: "067", level: "A2", title: { kr: "N 중에서", en: "N 중에서 (Among)", es: "N 중에서 (Entre)", fr: "N 중에서 (Parmi)", pt: "N 중에서 (Entre)" } },
  { id: "068", level: "A2", title: { kr: "A/V-지만", en: "A/V-지만 (Although)", es: "A/V-지만 (Aunque)", fr: "A/V-지만 (Bien que)", pt: "A/V-지만 (Embora)" } },
  { id: "069", level: "A2", title: { kr: "A/V-는데", en: "A/V-는데 (But / Background)", es: "A/V-는데 (Pero / Contexto)", fr: "A/V-는데 (Mais / Contexte)", pt: "A/V-는데 (Mas / Contexto)" } },
  { id: "070", level: "A2", title: { kr: "A/V-(으)니까", en: "A/V-(으)니까 (Reason)", es: "A/V-(으)니까 (Razón)", fr: "A/V-(으)니까 (Raison)", pt: "A/V-(으)니까 (Razão)" } },

  { id: "071", level: "B1", title: { kr: "-아/어 보이다", en: "-아/어 보이다 (Seem / Look)", es: "-아/어 보이다 (Parecer)", fr: "-아/어 보이다 (Avoir l'air)", pt: "-아/어 보이다 (Parecer)" } },
{ id: "072", level: "B1", title: { kr: "-(으)ㄴ/는 모양이다", en: "-(으)ㄴ/는 모양이다 (It Seems)", es: "-(으)ㄴ/는 모양이다 (Parece que)", fr: "-(으)ㄴ/는 모양이다 (Il semble que)", pt: "-(으)ㄴ/는 모양이다 (Parece que)" } },
{ id: "073", level: "B1", title: { kr: "-(으)ㄹ 텐데", en: "-(으)ㄹ 텐데 (Probably / I Expect)", es: "-(으)ㄹ 텐데 (Probablemente)", fr: "-(으)ㄹ 텐데 (Probablement)", pt: "-(으)ㄹ 텐데 (Provavelmente)" } },
{ id: "074", level: "B1", title: { kr: "-(으)ㄹ 테니까", en: "-(으)ㄹ 테니까 (Since It Will Be)", es: "-(으)ㄹ 테니까 (Como será)", fr: "-(으)ㄹ 테니까 (Puisque ce sera)", pt: "-(으)ㄹ 테니까 (Como será)" } },
{ id: "075", level: "B1", title: { kr: "-(으)ㄹ걸요", en: "-(으)ㄹ걸요 (I Guess)", es: "-(으)ㄹ걸요 (Supongo que)", fr: "-(으)ㄹ걸요 (Je pense que)", pt: "-(으)ㄹ걸요 (Acho que)" } },
{ id: "076", level: "B1", title: { kr: "-(으)ㄹ지도 모르다", en: "-(으)ㄹ지도 모르다 (Might)", es: "-(으)ㄹ지도 모르다 (Puede que)", fr: "-(으)ㄹ지도 모르다 (Il se peut que)", pt: "-(으)ㄹ지도 모르다 (Pode ser que)" } },
{ id: "077", level: "B1", title: { kr: "-다고 하다 (간접화법 기초)", en: "-다고 하다 (Reported Speech)", es: "-다고 하다 (Estilo indirecto)", fr: "-다고 하다 (Discours indirect)", pt: "-다고 하다 (Discurso indireto)" } },
{ id: "078", level: "B1", title: { kr: "-냐고 하다", en: "-냐고 하다 (Reported Question)", es: "-냐고 하다 (Pregunta indirecta)", fr: "-냐고 하다 (Question rapportée)", pt: "-냐고 하다 (Pergunta indireta)" } },
{ id: "079", level: "B1", title: { kr: "-자고 하다 / -(으)라고 하다", en: "-자고 하다 / -(으)라고 하다 (Reported Suggestion & Command)", es: "-자고 하다 / -(으)라고 하다 (Sugerencia y mandato indirectos)", fr: "-자고 하다 / -(으)라고 하다 (Suggestion et ordre rapportés)", pt: "-자고 하다 / -(으)라고 하다 (Sugestão e ordem indiretas)" } },
{ id: "080", level: "B1", title: { kr: "-(으)기로 하다", en: "-(으)기로 하다 (Decide To)", es: "-(으)기로 하다 (Decidir)", fr: "-(으)기로 하다 (Décider de)", pt: "-(으)기로 하다 (Decidir)" } },
{ id: "081", level: "B1", title: { kr: "-(으)기로 마음먹다", en: "-(으)기로 마음먹다 (Make Up One's Mind)", es: "-(으)기로 마음먹다 (Tomar la decisión)", fr: "-(으)기로 마음먹다 (Se décider)", pt: "-(으)기로 마음먹다 (Tomar uma decisão)" } },
{ id: "082", level: "B1", title: { kr: "-(으)면 좋겠다", en: "-(으)면 좋겠다 (I Wish)", es: "-(으)면 좋겠다 (Ojalá)", fr: "-(으)면 좋겠다 (J'aimerais que)", pt: "-(으)면 좋겠다 (Tomara que)" } },
{ id: "083", level: "B1", title: { kr: "-는 게 좋다", en: "-는 게 좋다 (It's Better To)", es: "-는 게 좋다 (Es mejor)", fr: "-는 게 좋다 (Il vaut mieux)", pt: "-는 게 좋다 (É melhor)" } },
{ id: "084", level: "B1", title: { kr: "-더라고요", en: "-더라고요 (I Noticed)", es: "-더라고요 (Me di cuenta)", fr: "-더라고요 (J'ai remarqué)", pt: "-더라고요 (Percebi que)" } },
{ id: "085", level: "B1", title: { kr: "-던", en: "-던 (Recollection)", es: "-던 (Recuerdo)", fr: "-던 (Souvenir)", pt: "-던 (Recordação)" } },
{ id: "086", level: "B1", title: { kr: "V-(으)ㄴ 적이 있다 / 없다", en: "Experience: V-(으)ㄴ 적이 있다 / 없다", es: "Experiencia: V-(으)ㄴ 적이 있다 / 없다", fr: "Expérience : V-(으)ㄴ 적이 있다 / 없다", pt: "Experiência: V-(으)ㄴ 적이 있다 / 없다" } },
{ id: "087", level: "B1", title: { kr: "피동 표현", en: "Passive Voice", es: "Voz pasiva", fr: "Voix passive", pt: "Voz passiva" } },
{ id: "088", level: "B1", title: { kr: "사동 표현", en: "Causative Expressions", es: "Expresiones causativas", fr: "Expressions causatives", pt: "Expressões causativas" } },
{ id: "089", level: "B1", title: { kr: "V-아/어 가다", en: "V-아/어 가다 (Continue Going)", es: "V-아/어 가다 (Continuar)", fr: "V-아/어 가다 (Continuer)", pt: "V-아/어 가다 (Continuar)" } },
{ id: "090", level: "B1", title: { kr: "V-아/어 오다", en: "V-아/어 오다 (Continue Coming)", es: "V-아/어 오다 (Continuar)", fr: "V-아/어 오다 (Continuer)", pt: "V-아/어 오다 (Continuar)" } },
{ id: "091", level: "B1", title: { kr: "-(으)ㄴ/는 데다가", en: "-(으)ㄴ/는 데다가 (In Addition)", es: "-(으)ㄴ/는 데다가 (Además)", fr: "-(으)ㄴ/는 데다가 (En plus)", pt: "-(으)ㄴ/는 데다가 (Além disso)" } },
{ id: "092", level: "B1", title: { kr: "-뿐만 아니라", en: "-뿐만 아니라 (Not Only)", es: "-뿐만 아니라 (No solo)", fr: "-뿐만 아니라 (Non seulement)", pt: "-뿐만 아니라 (Não apenas)" } },
{ id: "093", level: "B1", title: { kr: "V-다가", en: "V-다가 (While Doing)", es: "V-다가 (Mientras)", fr: "V-다가 (Pendant que)", pt: "V-다가 (Enquanto)" } },
{ id: "094", level: "B1", title: { kr: "V-는 중이다", en: "V-는 중이다 (Be in the Middle of)", es: "V-는 중이다 (Estar en medio de)", fr: "V-는 중이다 (Être en train de)", pt: "V-는 중이다 (Estar no meio de)" } },
{ id: "095", level: "B1", title: { kr: "-(으)ㄹ 정도로", en: "-(으)ㄹ 정도로 (To the Extent That)", es: "-(으)ㄹ 정도로 (Hasta el punto de)", fr: "-(으)ㄹ 정도로 (Au point de)", pt: "-(으)ㄹ 정도로 (A ponto de)" } },
{ id: "096", level: "B1", title: { kr: "-(으)ㄴ/는 만큼", en: "-(으)ㄴ/는 만큼 (As Much As)", es: "-(으)ㄴ/는 만큼 (Tanto como)", fr: "-(으)ㄴ/는 만큼 (Autant que)", pt: "-(으)ㄴ/는 만큼 (Tanto quanto)" } },
{ id: "097", level: "B1", title: { kr: "-(이)나 / 아무나", en: "-(이)나 / 아무나 (Any / Either)", es: "-(이)나 / 아무나 (Cualquiera)", fr: "-(이)나 / 아무나 (N'importe lequel)", pt: "-(이)나 / 아무나 (Qualquer)" } },
{ id: "098", level: "B1", title: { kr: "-든지", en: "-든지 (Either / No Matter Which)", es: "-든지 (Cualquiera que)", fr: "-든지 (Peu importe lequel)", pt: "-든지 (Qualquer que seja)" } },
{ id: "099", level: "B1", title: { kr: "-고 보니", en: "-고 보니 (After Realizing)", es: "-고 보니 (Al darme cuenta)", fr: "-고 보니 (Après m'être rendu compte)", pt: "-고 보니 (Ao perceber)" } },
{ id: "100", level: "B1", title: { kr: "-게 마련이다", en: "-게 마련이다 (Naturally Bound To)", es: "-게 마련이다 (Es natural que)", fr: "-게 마련이다 (Il est naturel que)", pt: "-게 마련이다 (É natural que)" } },
{ id: "101", level: "B1", title: { kr: "-아/어 있다", en: "-아/어 있다 (Resulting State)", es: "-아/어 있다 (Estado resultante)", fr: "-아/어 있다 (État résultant)", pt: "-아/어 있다 (Estado resultante)" } },
{ id: "102", level: "B1", title: { kr: "-(으)ㄴ 편이다", en: "-(으)ㄴ 편이다 (Tend To)", es: "-(으)ㄴ 편이다 (Tender a)", fr: "-(으)ㄴ 편이다 (Avoir tendance à)", pt: "-(으)ㄴ 편이다 (Tender a)" } },
{ id: "103", level: "B1", title: { kr: "얼마나 -(으)ㄴ/는지 모르다", en: "How ... I Can't Describe", es: "No sabes cuánto...", fr: "Tu ne peux pas imaginer à quel point...", pt: "Você não imagina o quanto..." } },
{ id: "104", level: "B1", title: { kr: "V-도록", en: "V-도록 (Purpose / Degree)", es: "V-도록 (Propósito / Grado)", fr: "V-도록 (But / Degré)", pt: "V-도록 (Propósito / Grau)" } },
{ id: "105", level: "B1", title: { kr: "-곤 하다", en: "-곤 하다 (Used To / Habitually)", es: "-곤 하다 (Solía)", fr: "-곤 하다 (Avoir l'habitude de)", pt: "-곤 하다 (Costumar)" } },

{ id: "106", level: "B2", title: { kr: "-(으)ㄴ/는 반면(에)", en: "-(으)ㄴ/는 반면(에) (Whereas / On the Other Hand)", es: "-(으)ㄴ/는 반면(에) (Mientras que)", fr: "-(으)ㄴ/는 반면(에) (Alors que)", pt: "-(으)ㄴ/는 반면(에) (Enquanto)" } },
{ id: "107", level: "B2", title: { kr: "-(으)ㄴ/는 데 비해", en: "-(으)ㄴ/는 데 비해 (Compared With)", es: "-(으)ㄴ/는 데 비해 (En comparación con)", fr: "-(으)ㄴ/는 데 비해 (Comparé à)", pt: "-(으)ㄴ/는 데 비해 (Comparado com)" } },
{ id: "108", level: "B2", title: { kr: "-(으)려면", en: "-(으)려면 (If You Want To)", es: "-(으)려면 (Si quieres)", fr: "-(으)려면 (Si tu veux)", pt: "-(으)려면 (Se quiser)" } },
{ id: "109", level: "B2", title: { kr: "-(으)ㄴ 이상", en: "-(으)ㄴ 이상 (Now That / Since)", es: "-(으)ㄴ 이상 (Ya que)", fr: "-(으)ㄴ 이상 (Puisque)", pt: "-(으)ㄴ 이상 (Já que)" } },
{ id: "110", level: "B2", title: { kr: "-(으)ㄴ다면", en: "-(으)ㄴ다면 (If, Assuming)", es: "-(으)ㄴ다면 (Si)", fr: "-(으)ㄴ다면 (Si)", pt: "-(으)ㄴ다면 (Se)" } },
{ id: "111", level: "B2", title: { kr: "-(으)ㄹ 리가 없다", en: "-(으)ㄹ 리가 없다 (There Is No Way)", es: "-(으)ㄹ 리가 없다 (No hay manera)", fr: "-(으)ㄹ 리가 없다 (Il n'y a aucune chance)", pt: "-(으)ㄹ 리가 없다 (Não há como)" } },
{ id: "112", level: "B2", title: { kr: "-(으)ㄹ 리가 있다", en: "-(으)ㄹ 리가 있다 (There Is a Possibility)", es: "-(으)ㄹ 리가 있다 (Es posible)", fr: "-(으)ㄹ 리가 있다 (Il est possible)", pt: "-(으)ㄹ 리가 있다 (É possível)" } },
{ id: "113", level: "B2", title: { kr: "-(으)ㄴ 듯하다", en: "-(으)ㄴ 듯하다 (It Seems)", es: "-(으)ㄴ 듯하다 (Parece)", fr: "-(으)ㄴ 듯하다 (Il semble)", pt: "-(으)ㄴ 듯하다 (Parece)" } },
{ id: "114", level: "B2", title: { kr: "다면서요?", en: "다면서요? (I Heard That...)", es: "다면서요? (He oído que...)", fr: "다면서요? (J'ai entendu dire que...)", pt: "다면서요? (Ouvi dizer que...)" } },
{ id: "115", level: "B2", title: { kr: "다니요", en: "다니요 (Expressing Surprise or Denial)", es: "다니요 (Sorpresa o negación)", fr: "다니요 (Surprise ou dénégation)", pt: "다니요 (Surpresa ou negação)" } },
{ id: "116", level: "B2", title: { kr: "다가는", en: "다가는 (If This Continues)", es: "다가는 (Si esto continúa)", fr: "다가는 (Si cela continue)", pt: "다가는 (Se isso continuar)" } },
{ id: "117", level: "B2", title: { kr: "-고 말다", en: "-고 말다 (Finally / End Up)", es: "-고 말다 (Terminar por)", fr: "-고 말다 (Finir par)", pt: "-고 말다 (Acabar por)" } },
{ id: "118", level: "B2", title: { kr: "-아/어 버리다", en: "-아/어 버리다 (Completely / Unfortunately)", es: "-아/어 버리다 (Completamente / Desgraciadamente)", fr: "-아/어 버리다 (Complètement / Malheureusement)", pt: "-아/어 버리다 (Completamente / Infelizmente)" } },
{ id: "119", level: "B2", title: { kr: "-아/어 내다", en: "-아/어 내다 (Accomplish Successfully)", es: "-아/어 내다 (Lograr)", fr: "-아/어 내다 (Réussir à)", pt: "-아/어 내다 (Conseguir)" } },
{ id: "120", level: "B2", title: { kr: "-아/어 봤자", en: "-아/어 봤자 (Even If You Try)", es: "-아/어 봤자 (Aunque lo intentes)", fr: "-아/어 봤자 (Même si tu essaies)", pt: "-아/어 봤자 (Mesmo que tente)" } },
{ id: "121", level: "B2", title: { kr: "-(으)나 마나", en: "-(으)나 마나 (Makes No Difference)", es: "-(으)나 마나 (Da igual)", fr: "-(으)나 마나 (Cela ne change rien)", pt: "-(으)나 마나 (Tanto faz)" } },
{ id: "122", level: "B2", title: { kr: "-(으)ㄹ걸 그랬다", en: "-(으)ㄹ걸 그랬다 (I Should Have)", es: "-(으)ㄹ걸 그랬다 (Debería haber)", fr: "-(으)ㄹ걸 그랬다 (J'aurais dû)", pt: "-(으)ㄹ걸 그랬다 (Eu deveria ter)" } },
{ id: "123", level: "B2", title: { kr: "-았/었어야 했는데", en: "-았/었어야 했는데 (Should Have)", es: "-았/었어야 했는데 (Debería haber)", fr: "-았/었어야 했는데 (J'aurais dû)", pt: "-았/었어야 했는데 (Deveria ter)" } },
{ id: "124", level: "B2", title: { kr: "-(이)야말로", en: "-(이)야말로 (Indeed / Exactly)", es: "-(이)야말로 (Precisamente)", fr: "-(이)야말로 (Précisément)", pt: "-(이)야말로 (Exatamente)" } },
{ id: "125", level: "B2", title: { kr: "-(이)라고는", en: "-(이)라고는 (Nothing but)", es: "-(이)라고는 (Nada más que)", fr: "-(이)라고는 (Rien d'autre que)", pt: "-(이)라고는 (Nada além de)" } },
{ id: "126", level: "B2", title: { kr: "-(으)ㄹ 뿐이다", en: "-(으)ㄹ 뿐이다 (Only / Merely)", es: "-(으)ㄹ 뿐이다 (Solo)", fr: "-(으)ㄹ 뿐이다 (Seulement)", pt: "-(으)ㄹ 뿐이다 (Apenas)" } },
{ id: "127", level: "B2", title: { kr: "-(이)기만 하다", en: "-(이)기만 하다 (Do Nothing but)", es: "-(이)기만 하다 (No hacer más que)", fr: "-(이)기만 하다 (Ne faire que)", pt: "-(이)기만 하다 (Apenas)" } },
{ id: "128", level: "B2", title: { kr: "자마자", en: "자마자 (As Soon As)", es: "자마자 (En cuanto)", fr: "자마자 (Dès que)", pt: "자마자 (Assim que)" } },
{ id: "129", level: "B2", title: { kr: "는 즉시", en: "는 즉시 (Immediately After)", es: "는 즉시 (Inmediatamente después)", fr: "는 즉시 (Immédiatement après)", pt: "는 즉시 (Imediatamente após)" } },
{ id: "130", level: "B2", title: { kr: "-(으)ㄹ수록", en: "-(으)ㄹ수록 (The More..., The More...)", es: "-(으)ㄹ수록 (Cuanto más..., más...)", fr: "-(으)ㄹ수록 (Plus..., plus...)", pt: "-(으)ㄹ수록 (Quanto mais..., mais...)" } },
{ id: "131", level: "B2", title: { kr: "-아/어 가면서", en: "-아/어 가면서 (While Gradually)", es: "-아/어 가면서 (Mientras gradualmente)", fr: "-아/어 가면서 (Tout en évoluant)", pt: "-아/어 가면서 (Enquanto gradualmente)" } },
{ id: "132", level: "B2", title: { kr: "에 따르면", en: "에 따르면 (According to)", es: "에 따르면 (Según)", fr: "에 따르면 (Selon)", pt: "에 따르면 (Segundo)" } },
{ id: "133", level: "B2", title: { kr: "에 비추어", en: "에 비추어 (In Light of)", es: "에 비추어 (A la luz de)", fr: "에 비추어 (À la lumière de)", pt: "에 비추어 (À luz de)" } },
{ id: "134", level: "B2", title: { kr: "을/를 통해(서)", en: "을/를 통해(서) (Through)", es: "을/를 통해(서) (A través de)", fr: "을/를 통해(서) (Par l'intermédiaire de)", pt: "을/를 통해(서) (Através de)" } },
{ id: "135", level: "B2", title: { kr: "에 비하면", en: "에 비하면 (Compared to)", es: "에 비하면 (Comparado con)", fr: "에 비하면 (Comparé à)", pt: "에 비하면 (Comparado com)" } },
{ id: "136", level: "B2", title: { kr: "은/는 물론", en: "은/는 물론 (Not to Mention)", es: "은/는 물론 (Sin mencionar)", fr: "은/는 물론 (Sans parler de)", pt: "은/는 물론 (Sem falar de)" } },
{ id: "137", level: "B2", title: { kr: "뿐만 아니라 ...도", en: "뿐만 아니라 ...도 (Not Only... But Also)", es: "뿐만 아니라 ...도 (No solo... sino también)", fr: "뿐만 아니라 ...도 (Non seulement... mais aussi)", pt: "뿐만 아니라 ...도 (Não apenas... mas também)" } },
{ id: "138", level: "B2", title: { kr: "차라리", en: "차라리 (Rather)", es: "차라리 (Más bien)", fr: "차라리 (Plutôt)", pt: "차라리 (Antes)" } },
{ id: "139", level: "B2", title: { kr: "-(으)ㄹ까 말까 하다", en: "-(으)ㄹ까 말까 하다 (Be Undecided)", es: "-(으)ㄹ까 말까 하다 (Estar indeciso)", fr: "-(으)ㄹ까 말까 하다 (Hésiter)", pt: "-(으)ㄹ까 말까 하다 (Estar indeciso)" } },
{ id: "140", level: "B2", title: { kr: "-(으)려던 참이다", en: "-(으)려던 참이다 (Be About To)", es: "-(으)려던 참이다 (Estar a punto de)", fr: "-(으)려던 참이다 (Être sur le point de)", pt: "-(으)려던 참이다 (Estar prestes a)" } },

{ id: "141", level: "C1", title: { kr: "-(으)ㄴ/는 만큼", en: "-(으)ㄴ/는 만큼 (To the Extent That)", es: "-(으)ㄴ/는 만큼 (En la medida en que)", fr: "-(으)ㄴ/는 만큼 (Dans la mesure où)", pt: "-(으)ㄴ/는 만큼 (Na medida em que)" } },
{ id: "142", level: "C1", title: { kr: "-(으)ㄹ지라도", en: "-(으)ㄹ지라도 (Even If)", es: "-(으)ㄹ지라도 (Aunque)", fr: "-(으)ㄹ지라도 (Même si)", pt: "-(으)ㄹ지라도 (Mesmo que)" } },
{ id: "143", level: "C1", title: { kr: "-(으)ㄴ들", en: "-(으)ㄴ들 (Even If)", es: "-(으)ㄴ들 (Aunque)", fr: "-(으)ㄴ들 (Même si)", pt: "-(으)ㄴ들 (Mesmo que)" } },
{ id: "144", level: "C1", title: { kr: "-(으)ㄹ 따름이다", en: "-(으)ㄹ 따름이다 (Merely / Nothing More Than)", es: "-(으)ㄹ 따름이다 (No es más que)", fr: "-(으)ㄹ 따름이다 (Ce n'est que)", pt: "-(으)ㄹ 따름이다 (Nada mais do que)" } },
{ id: "145", level: "C1", title: { kr: "-(으)ㄹ 법하다", en: "-(으)ㄹ 법하다 (Likely / Probable)", es: "-(으)ㄹ 법하다 (Probablemente)", fr: "-(으)ㄹ 법하다 (Il est probable que)", pt: "-(으)ㄹ 법하다 (Provavelmente)" } },
{ id: "146", level: "C1", title: { kr: "-(으)ㄹ 성싶다", en: "-(으)ㄹ 성싶다 (It Seems Likely)", es: "-(으)ㄹ 성싶다 (Parece probable)", fr: "-(으)ㄹ 성싶다 (Il semble probable)", pt: "-(으)ㄹ 성싶다 (Parece provável)" } },
{ id: "147", level: "C1", title: { kr: "-(으)ㄴ가 보다", en: "-(으)ㄴ가 보다 (Apparently)", es: "-(으)ㄴ가 보다 (Al parecer)", fr: "-(으)ㄴ가 보다 (Apparemment)", pt: "-(으)ㄴ가 보다 (Ao que parece)" } },
{ id: "148", level: "C1", title: { kr: "-(으)ㄴ 모양이다 (심화)", en: "-(으)ㄴ 모양이다 (Advanced Appearance)", es: "-(으)ㄴ 모양이다 (Apariencia avanzada)", fr: "-(으)ㄴ 모양이다 (Apparence avancée)", pt: "-(으)ㄴ 모양이다 (Aparência avançada)" } },
{ id: "149", level: "C1", title: { kr: "-(으)ㄴ 바", en: "-(으)ㄴ 바 (As / According to)", es: "-(으)ㄴ 바 (Según)", fr: "-(으)ㄴ 바 (Selon)", pt: "-(으)ㄴ 바 (Conforme)" } },
{ id: "150", level: "C1", title: { kr: "-(으)ㄴ바에야", en: "-(으)ㄴ바에야 (Since Anyway)", es: "-(으)ㄴ바에야 (Ya que)", fr: "-(으)ㄴ바에야 (Puisque)", pt: "-(으)ㄴ바에야 (Já que)" } },
{ id: "151", level: "C1", title: { kr: "-(으)ㄹ 바에는", en: "-(으)ㄹ 바에는 (Rather Than)", es: "-(으)ㄹ 바에는 (Antes que)", fr: "-(으)ㄹ 바에는 (Plutôt que)", pt: "-(으)ㄹ 바에는 (Em vez de)" } },
{ id: "152", level: "C1", title: { kr: "-(으)ㄹ 뿐더러", en: "-(으)ㄹ 뿐더러 (Not Only... But Also)", es: "-(으)ㄹ 뿐더러 (No solo... sino también)", fr: "-(으)ㄹ 뿐더러 (Non seulement... mais aussi)", pt: "-(으)ㄹ 뿐더러 (Não apenas... mas também)" } },
{ id: "153", level: "C1", title: { kr: "-(으)ㄴ 데다(가)", en: "-(으)ㄴ 데다(가) (In Addition)", es: "-(으)ㄴ 데다(가) (Además)", fr: "-(으)ㄴ 데다(가) (En plus)", pt: "-(으)ㄴ 데다(가) (Além disso)" } },
{ id: "154", level: "C1", title: { kr: "-(으)면서도", en: "-(으)면서도 (Even Though While)", es: "-(으)면서도 (Aunque)", fr: "-(으)면서도 (Bien que)", pt: "-(으)면서도 (Embora)" } },
{ id: "155", level: "C1", title: { kr: "-(으)ㄴ 끝에", en: "-(으)ㄴ 끝에 (After Much Effort)", es: "-(으)ㄴ 끝에 (Después de mucho esfuerzo)", fr: "-(으)ㄴ 끝에 (Après de nombreux efforts)", pt: "-(으)ㄴ 끝에 (Após muito esforço)" } },
{ id: "156", level: "C1", title: { kr: "-(으)ㄴ 나머지", en: "-(으)ㄴ 나머지 (As a Result)", es: "-(으)ㄴ 나머지 (Como resultado)", fr: "-(으)ㄴ 나머지 (Par conséquent)", pt: "-(으)ㄴ 나머지 (Como resultado)" } },
{ id: "157", level: "C1", title: { kr: "-(으)ㄴ 탓에", en: "-(으)ㄴ 탓에 (Because of)", es: "-(으)ㄴ 탓에 (A causa de)", fr: "-(으)ㄴ 탓에 (À cause de)", pt: "-(으)ㄴ 탓에 (Por causa de)" } },
{ id: "158", level: "C1", title: { kr: "-(으)ㄴ 김에", en: "-(으)ㄴ 김에 (While You're At It)", es: "-(으)ㄴ 김에 (Ya que)", fr: "-(으)ㄴ 김에 (Puisque tu y es)", pt: "-(으)ㄴ 김에 (Já que)" } },
{ id: "159", level: "C1", title: { kr: "-(으)ㄴ 채(로)", en: "-(으)ㄴ 채(로) (While Remaining)", es: "-(으)ㄴ 채(로) (Permaneciendo)", fr: "-(으)ㄴ 채(로) (En restant)", pt: "-(으)ㄴ 채(로) (Permanecendo)" } },
{ id: "160", level: "C1", title: { kr: "-(으)ㄴ 상태에서", en: "-(으)ㄴ 상태에서 (In a State of)", es: "-(으)ㄴ 상태에서 (En estado de)", fr: "-(으)ㄴ 상태에서 (Dans un état de)", pt: "-(으)ㄴ 상태에서 (Em estado de)" } },
{ id: "161", level: "C1", title: { kr: "-(으)기에", en: "-(으)기에 (Because / Since)", es: "-(으)기에 (Porque)", fr: "-(으)기에 (Puisque)", pt: "-(으)기에 (Porque)" } },
{ id: "162", level: "C1", title: { kr: "-(으)므로", en: "-(으)므로 (Since / Therefore)", es: "-(으)므로 (Puesto que)", fr: "-(으)므로 (Puisque)", pt: "-(으)므로 (Visto que)" } },
{ id: "163", level: "C1", title: { kr: "-(으)로 말미암아", en: "-(으)로 말미암아 (Owing to)", es: "-(으)로 말미암아 (Debido a)", fr: "-(으)로 말미암아 (En raison de)", pt: "-(으)로 말미암아 (Em virtude de)" } },
{ id: "164", level: "C1", title: { kr: "고자", en: "고자 (In Order To)", es: "고자 (Con el fin de)", fr: "고자 (Afin de)", pt: "고자 (A fim de)" } },
{ id: "165", level: "C1", title: { kr: "고자 하다", en: "고자 하다 (Intend To)", es: "고자 하다 (Tener la intención de)", fr: "고자 하다 (Avoir l'intention de)", pt: "고자 하다 (Ter a intenção de)" } },
{ id: "166", level: "C1", title: { kr: "인용 표현 -기에 따르면", en: "Quotation Expression -기에 따르면 (According to)", es: "Expresión de cita -기에 따르면", fr: "Expression de citation -기에 따르면", pt: "Expressão de citação -기에 따르면" } },
{ id: "167", level: "C1", title: { kr: "-(이)야", en: "-(이)야 (Emphasis)", es: "-(이)야 (Énfasis)", fr: "-(이)야 (Mise en emphase)", pt: "-(이)야 (Ênfase)" } },
{ id: "168", level: "C1", title: { kr: "-(이)라야", en: "-(이)라야 (Only If)", es: "-(이)라야 (Solo si)", fr: "-(이)라야 (Seulement si)", pt: "-(이)라야 (Somente se)" } },
{ id: "169", level: "C1", title: { kr: "-(이)나마", en: "-(이)나마 (At Least)", es: "-(이)나마 (Al menos)", fr: "-(이)나마 (Au moins)", pt: "-(이)나마 (Pelo menos)" } },
{ id: "170", level: "C1", title: { kr: "-(으)ㄹ수록 더욱", en: "-(으)ㄹ수록 더욱 (Even More as)", es: "-(으)ㄹ수록 더욱 (Cada vez más)", fr: "-(으)ㄹ수록 더욱 (D'autant plus)", pt: "-(으)ㄹ수록 더욱 (Cada vez mais)" } },
{ id: "171", level: "C1", title: { kr: "-(으)면 -(으)ㄹ수록", en: "-(으)면 -(으)ㄹ수록 (The More..., The More...)", es: "-(으)면 -(으)ㄹ수록 (Cuanto más..., más...)", fr: "-(으)면 -(으)ㄹ수록 (Plus..., plus...)", pt: "-(으)면 -(으)ㄹ수록 (Quanto mais..., mais...)" } },
{ id: "172", level: "C1", title: { kr: "-(으)ㄴ 반면에", en: "-(으)ㄴ 반면에 (Whereas)", es: "-(으)ㄴ 반면에 (Mientras que)", fr: "-(으)ㄴ 반면에 (Alors que)", pt: "-(으)ㄴ 반면에 (Enquanto)" } },
{ id: "173", level: "C1", title: { kr: "더욱이 / 게다가", en: "Moreover / Furthermore", es: "Además / Es más", fr: "De plus / En outre", pt: "Além disso / Ademais" } },
{ id: "174", level: "C1", title: { kr: "결국 / 이처럼", en: "Eventually / Thus", es: "Al final / De esta manera", fr: "Finalement / Ainsi", pt: "Por fim / Assim" } },
{ id: "175", level: "C1", title: { kr: "한편 / 반면에 / 즉", en: "Meanwhile / On the Other Hand / That Is", es: "Mientras tanto / Por otro lado / Es decir", fr: "Pendant ce temps / En revanche / C'est-à-dire", pt: "Enquanto isso / Por outro lado / Ou seja" } },

{ id: "176", level: "C2", title: { kr: "-(으)랴", en: "-(으)랴 (Rhetorical Question)", es: "-(으)랴 (Pregunta retórica)", fr: "-(으)랴 (Question rhétorique)", pt: "-(으)랴 (Pergunta retórica)" } },
{ id: "177", level: "C2", title: { kr: "-(으)랴 -(으)랴", en: "-(으)랴 -(으)랴 (Multiple Simultaneous Actions)", es: "-(으)랴 -(으)랴 (Acciones múltiples)", fr: "-(으)랴 -(으)랴 (Actions multiples)", pt: "-(으)랴 -(으)랴 (Ações múltiplas)" } },
{ id: "178", level: "C2", title: { kr: "-(으)ㄴ들 어떠하랴", en: "-(으)ㄴ들 어떠하랴 (Even If, What Difference Does It Make?)", es: "-(으)ㄴ들 어떠하랴 (Aunque sea así)", fr: "-(으)ㄴ들 어떠하랴 (Même si c'était le cas)", pt: "-(으)ㄴ들 어떠하랴 (Mesmo que seja assim)" } },
{ id: "179", level: "C2", title: { kr: "-(으)ㄹ 턱이 없다", en: "-(으)ㄹ 턱이 없다 (There Is No Way)", es: "-(으)ㄹ 턱이 없다 (No hay manera)", fr: "-(으)ㄹ 턱이 없다 (Il est impossible que)", pt: "-(으)ㄹ 턱이 없다 (Não há como)" } },
{ id: "180", level: "C2", title: { kr: "-(으)ㄴ 셈이다", en: "-(으)ㄴ 셈이다 (It Means That)", es: "-(으)ㄴ 셈이다 (Significa que)", fr: "-(으)ㄴ 셈이다 (Cela revient à dire que)", pt: "-(으)ㄴ 셈이다 (Significa que)" } },
{ id: "181", level: "C2", title: { kr: "-(으)ㄴ 결과", en: "-(으)ㄴ 결과 (As a Result)", es: "-(으)ㄴ 결과 (Como resultado)", fr: "-(으)ㄴ 결과 (À la suite de)", pt: "-(으)ㄴ 결과 (Como resultado)" } },
{ id: "182", level: "C2", title: { kr: "-(으)ㄴ 이유로", en: "-(으)ㄴ 이유로 (For the Reason That)", es: "-(으)ㄴ 이유로 (Por la razón de)", fr: "-(으)ㄴ 이유로 (Pour la raison que)", pt: "-(으)ㄴ 이유로 (Pelo motivo de)" } },
{ id: "183", level: "C2", title: { kr: "-(으)ㄴ 것으로 보아", en: "-(으)ㄴ 것으로 보아 (Judging From)", es: "-(으)ㄴ 것으로 보아 (A juzgar por)", fr: "-(으)ㄴ 것으로 보아 (À en juger par)", pt: "-(으)ㄴ 것으로 보아 (A julgar por)" } },
{ id: "184", level: "C2", title: { kr: "-(으)ㄴ 점으로 미루어", en: "-(으)ㄴ 점으로 미루어 (Based on the Fact That)", es: "-(으)ㄴ 점으로 미루어 (Basándose en)", fr: "-(으)ㄴ 점으로 미루어 (À partir du fait que)", pt: "-(으)ㄴ 점으로 미루어 (Com base no fato de)" } },
{ id: "185", level: "C2", title: { kr: "-(으)ㄹ 수밖에 없다", en: "-(으)ㄹ 수밖에 없다 (Have No Choice But To)", es: "-(으)ㄹ 수밖에 없다 (No tener más remedio que)", fr: "-(으)ㄹ 수밖에 없다 (Ne pas avoir d'autre choix que)", pt: "-(으)ㄹ 수밖에 없다 (Não ter outra escolha senão)" } },
{ id: "186", level: "C2", title: { kr: "-(으)ㄹ 수밖에 없게 되다", en: "-(으)ㄹ 수밖에 없게 되다 (Come to Have No Choice)", es: "-(으)ㄹ 수밖에 없게 되다", fr: "-(으)ㄹ 수밖에 없게 되다", pt: "-(으)ㄹ 수밖에 없게 되다" } },
{ id: "187", level: "C2", title: { kr: "-(으)ㄹ 지경이다", en: "-(으)ㄹ 지경이다 (To the Point Of)", es: "-(으)ㄹ 지경이다 (Hasta el punto de)", fr: "-(으)ㄹ 지경이다 (Au point de)", pt: "-(으)ㄹ 지경이다 (A ponto de)" } },
{ id: "188", level: "C2", title: { kr: "-(으)ㄹ 정도에 이르다", en: "-(으)ㄹ 정도에 이르다 (Reach the Point Where)", es: "-(으)ㄹ 정도에 이르다 (Llegar al punto de)", fr: "-(으)ㄹ 정도에 이르다 (En arriver au point de)", pt: "-(으)ㄹ 정도에 이르다 (Chegar ao ponto de)" } },
{ id: "189", level: "C2", title: { kr: "-(으)ㅁ으로써", en: "-(으)ㅁ으로써 (By Means of)", es: "-(으)ㅁ으로써 (Mediante)", fr: "-(으)ㅁ으로써 (Au moyen de)", pt: "-(으)ㅁ으로써 (Por meio de)" } },
{ id: "190", level: "C2", title: { kr: "-(으)ㅁ으로 인하여", en: "-(으)ㅁ으로 인하여 (Due to)", es: "-(으)ㅁ으로 인하여 (Debido a)", fr: "-(으)ㅁ으로 인하여 (En raison de)", pt: "-(으)ㅁ으로 인하여 (Devido a)" } },
{ id: "191", level: "C2", title: { kr: "-(으)ㅁ으로", en: "-(으)ㅁ으로 (By Doing)", es: "-(으)ㅁ으로 (Mediante)", fr: "-(으)ㅁ으로 (En faisant)", pt: "-(으)ㅁ으로 (Ao fazer)" } },
{ id: "192", level: "C2", title: { kr: "-(으)ㅁ", en: "Nominalization -(으)ㅁ", es: "Nominalización -(으)ㅁ", fr: "Nominalisation -(으)ㅁ", pt: "Nominalização -(으)ㅁ" } },
{ id: "193", level: "C2", title: { kr: "기에 이르다", en: "기에 이르다 (Come to the Point Of)", es: "기에 이르다 (Llegar a)", fr: "기에 이르다 (En arriver à)", pt: "기에 이르다 (Chegar a)" } },
{ id: "194", level: "C2", title: { kr: "고 보면", en: "고 보면 (Considering That)", es: "고 보면 (Considerando que)", fr: "고 보면 (Si l'on considère)", pt: "고 보면 (Considerando que)" } },
{ id: "195", level: "C2", title: { kr: "고 보면 결국", en: "고 보면 결국 (Ultimately, Considering That)", es: "고 보면 결국 (En definitiva)", fr: "고 보면 결국 (En fin de compte)", pt: "고 보면 결국 (No fim das contas)" } },
{ id: "196", level: "C2", title: { kr: "돌이켜 보면", en: "Looking Back", es: "Mirando hacia atrás", fr: "En y repensant", pt: "Olhando para trás" } },
{ id: "197", level: "C2", title: { kr: "말하자면", en: "So to Speak", es: "Por así decirlo", fr: "Pour ainsi dire", pt: "Por assim dizer" } },
{ id: "198", level: "C2", title: { kr: "다시 말하면", en: "In Other Words", es: "En otras palabras", fr: "Autrement dit", pt: "Em outras palavras" } },
{ id: "199", level: "C2", title: { kr: "요컨대", en: "In Short / In Conclusion", es: "En resumen", fr: "En bref", pt: "Em resumo" } },
{ id: "200", level: "C2", title: { kr: "반대로", en: "On the Contrary", es: "Por el contrario", fr: "Au contraire", pt: "Pelo contrário" } },
{ id: "201", level: "C2", title: { kr: "그럼에도 불구하고", en: "Nevertheless", es: "Sin embargo", fr: "Néanmoins", pt: "Mesmo assim" } },
{ id: "202", level: "C2", title: { kr: "전제로 하다", en: "Assume / Presuppose", es: "Suponer como premisa", fr: "Présupposer", pt: "Pressupor" } },
{ id: "203", level: "C2", title: { kr: "근거로 하다", en: "Base On", es: "Basarse en", fr: "Se fonder sur", pt: "Basear-se em" } },
{ id: "204", level: "C2", title: { kr: "~에 의하면", en: "According to ~", es: "Según ~", fr: "Selon ~", pt: "Segundo ~" } },
{ id: "205", level: "C2", title: { kr: "~의 입장에서", en: "From the Perspective of ~", es: "Desde la perspectiva de ~", fr: "Du point de vue de ~", pt: "Do ponto de vista de ~" } },
{ id: "206", level: "C2", title: { kr: "~의 관점에서", en: "From the Viewpoint of ~", es: "Desde el punto de vista de ~", fr: "Du point de vue de ~", pt: "Sob a perspectiva de ~" } },
{ id: "207", level: "C2", title: { kr: "~에 비추어 볼 때", en: "In Light of ~", es: "A la luz de ~", fr: "À la lumière de ~", pt: "À luz de ~" } },
{ id: "208", level: "C2", title: { kr: "~을 전제로", en: "On the Premise That ~", es: "Bajo la premisa de ~", fr: "En supposant que ~", pt: "Partindo da premissa de ~" } },
{ id: "209", level: "C2", title: { kr: "~에 따라", en: "According to / Depending on ~", es: "Según / Dependiendo de ~", fr: "Selon / En fonction de ~", pt: "De acordo com / Dependendo de ~" } },
{ id: "210", level: "C2", title: { kr: "비록 ~일지라도 / 설령 ~일지라도", en: "Even Though / Even If ~", es: "Aunque / Incluso si ~", fr: "Même si ~", pt: "Mesmo que ~" } },

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
