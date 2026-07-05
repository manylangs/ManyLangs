"use client";

import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";
import { useState } from "react";
import { copyLink } from "@/utils/share";


/* ================= 데이터 ================= */
type Item = {
  en: string;
  es: string;
  fr: string;
  pt: string;
  ko: String; // 추가
};

const DATA: Item[] = [
  { en: "Greetings", es: "Saludos", fr: "Salutations", pt: "Saudações", ko: "인사" },
  { en: "Self Introduction", es: "Presentación personal", fr: "Présentation personnelle", pt: "Autoapresentação", ko: "자기소개" },
  { en: "Nationality and Languages", es: "Nacionalidad e idiomas", fr: "Nationalité et langues", pt: "Nacionalidade e línguas", ko: "국적과 언어" },
  { en: "Jobs and Occupations", es: "Empleos y ocupaciones", fr: "Métiers et professions", pt: "Empregos e ocupações", ko: "직업" },
  { en: "Family Introduction", es: "Presentación de la familia", fr: "Présentation de la famille", pt: "Apresentação da família", ko: "가족 소개" },
  { en: "Numbers and Prices", es: "Números y precios", fr: "Nombres et prix", pt: "Números e preços", ko: "숫자와 가격" },
  { en: "Asking for Directions", es: "Pedir direcciones", fr: "Demander son chemin", pt: "Pedir direções", ko: "길 묻기" },
  { en: "Describing Places", es: "Describir lugares", fr: "Décrire des lieux", pt: "Descrever lugares", ko: "장소 묘사" },
  { en: "Ordering Food", es: "Pedir comida", fr: "Commander à manger", pt: "Pedir comida", ko: "음식 주문" },
  { en: "Ordering at a Cafe", es: "Pedir en una cafetería", fr: "Commander dans un café", pt: "Pedir num café", ko: "카페에서 주문하기" },

  { en: "Shopping", es: "Ir de compras", fr: "Faire du shopping", pt: "Fazer compras", ko: "쇼핑" },
  { en: "Tastes and Preferences", es: "Gustos y preferencias", fr: "Goûts et préférences", pt: "Gostos e preferências", ko: "취향과 선호" },
  { en: "Time and Days", es: "Tiempo y días", fr: "Heure et jours", pt: "Tempo e dias", ko: "시간과 요일" },
  { en: "Making Appointments", es: "Hacer citas", fr: "Prendre un rendez-vous", pt: "Marcar compromissos", ko: "약속 잡기" },
  { en: "Describing Home and Room", es: "Describir la casa", fr: "Décrire la maison", pt: "Descrever a casa e o quarto", ko: "집과 방 묘사" },
  { en: "Talking about Weather", es: "Hablar del clima", fr: "Parler de la météo", pt: "Falar sobre o tempo", ko: "날씨 이야기" },
  { en: "Using Transportation", es: "Usar el transporte", fr: "Utiliser les transports", pt: "Usar transportes", ko: "교통수단 이용" },
  { en: "Hobbies", es: "Pasatiempos", fr: "Loisirs", pt: "Passatempos", ko: "취미" },
  { en: "Health and Symptoms", es: "Salud y síntomas", fr: "Santé et symptômes", pt: "Saúde e sintomas", ko: "건강과 증상" },
  { en: "Asking for Help", es: "Pedir ayuda", fr: "Demander de l’aide", pt: "Pedir ajuda", ko: "도움 요청" },

  { en: "Dormitory Life", es: "Vida en el dormitorio", fr: "Vie en résidence universitaire", pt: "Vida no dormitório", ko: "기숙사 생활" },
  { en: "Attending Classes", es: "Asistir a clases", fr: "Assister aux cours", pt: "Assistir às aulas", ko: "수업 참여" },
  { en: "Professor Consultation", es: "Consulta con el profesor", fr: "Consultation avec le professeur", pt: "Consulta com o professor", ko: "교수 상담" },
  { en: "Assignments and Submissions", es: "Tareas y entregas", fr: "Devoirs et rendus", pt: "Trabalhos e entregas", ko: "과제와 제출" },
  { en: "Team Projects", es: "Proyectos en equipo", fr: "Projets en équipe", pt: "Projetos em equipa", ko: "팀 프로젝트" },
  { en: "Presentation Preparation", es: "Preparación de presentaciones", fr: "Préparation de présentation", pt: "Preparação de apresentações", ko: "발표 준비" },
  { en: "Exam Preparation", es: "Preparación de exámenes", fr: "Préparation aux examens", pt: "Preparação para exames", ko: "시험 준비" },
  { en: "College Friends", es: "Amigos de la universidad", fr: "Amis à l’université", pt: "Amigos da universidade", ko: "대학 친구" },
  { en: "Club Activities", es: "Actividades de clubes", fr: "Activités de clubs", pt: "Atividades de clubes", ko: "동아리 활동" },
  { en: "School Events", es: "Eventos escolares", fr: "Événements scolaires", pt: "Eventos escolares", ko: "학교 행사" },

  { en: "Bank Services", es: "Servicios bancarios", fr: "Services bancaires", pt: "Serviços bancários", ko: "은행 업무" },
  { en: "Hospital and Pharmacy", es: "Hospital y farmacia", fr: "Hôpital et pharmacie", pt: "Hospital e farmácia", ko: "병원과 약국" },
  { en: "Government Office", es: "Oficina gubernamental", fr: "Bureau administratif", pt: "Serviço governamental", ko: "관공서" },
  { en: "Part-Time Jobs", es: "Trabajos a tiempo parcial", fr: "Travail à temps partiel", pt: "Trabalhos a tempo parcial", ko: "아르바이트" },
  { en: "Travel Planning", es: "Planificación de viajes", fr: "Planification de voyage", pt: "Planeamento de viagens", ko: "여행 계획" },
  { en: "Accommodation Booking", es: "Reservar alojamiento", fr: "Réservation d’hébergement", pt: "Reserva de alojamento", ko: "숙소 예약" },
  { en: "Finding Restaurants", es: "Buscar restaurantes", fr: "Trouver des restaurants", pt: "Encontrar restaurantes", ko: "식당 찾기" },
  { en: "Shopping Details", es: "Detalles de compras", fr: "Détails du shopping", pt: "Detalhes de compras", ko: "쇼핑 세부사항" },
  { en: "Smartphones and Apps", es: "Smartphones y aplicaciones", fr: "Smartphones et applications", pt: "Smartphones e aplicações", ko: "스마트폰과 앱" },
  { en: "SNS and Online Communities", es: "Redes sociales", fr: "Réseaux sociaux", pt: "Redes sociais e comunidades online", ko: "SNS와 온라인 커뮤니티" },

  { en: "Job Interview", es: "Entrevista de trabajo", fr: "Entretien d’embauche", pt: "Entrevista de emprego", ko: "취업 면접" },
  { en: "First Day at Work", es: "Primer día en el trabajo", fr: "Premier jour au travail", pt: "Primeiro dia de trabalho", ko: "출근 첫날" },
  { en: "Talking with Coworkers", es: "Conversar con compañeros", fr: "Parler avec des collègues", pt: "Conversar com colegas", ko: "동료와 대화" },
  { en: "Work Instructions and Reports", es: "Instrucciones de trabajo", fr: "Instructions de travail", pt: "Instruções de trabalho e relatórios", ko: "업무 지시와 보고" },
  { en: "Leading Meetings", es: "Dirigir reuniones", fr: "Diriger des réunions", pt: "Conduzir reuniões", ko: "회의 주재" },
  { en: "Client Communication", es: "Comunicación con clientes", fr: "Communication avec les clients", pt: "Comunicação com clientes", ko: "고객 소통" },
  { en: "Email Discussion", es: "Comunicación por correo", fr: "Communication par e-mail", pt: "Comunicação por e-mail", ko: "이메일 논의" },
  { en: "Issue Solving", es: "Resolución de problemas", fr: "Résolution de problèmes", pt: "Resolução de problemas", ko: "문제 해결" },
  { en: "Schedule Management", es: "Gestión de horarios", fr: "Gestion des horaires", pt: "Gestão de horários", ko: "일정 관리" },
  { en: "Business Trip Preparation", es: "Preparación de viajes", fr: "Préparation de voyage d’affaires", pt: "Preparação de viagem de negócios", ko: "출장 준비" },

  { en: "Exhibitions and Fairs", es: "Exposiciones y ferias", fr: "Expositions et salons", pt: "Exposições e feiras", ko: "전시회와 박람회" },
  { en: "Business Networking", es: "Networking empresarial", fr: "Réseautage professionnel", pt: "Networking empresarial", ko: "비즈니스 네트워킹" },
  { en: "Presentation Preparation (Business)", es: "Presentaciones empresariales", fr: "Présentation professionnelle", pt: "Preparação de apresentações (negócios)", ko: "발표 준비(비즈니스)" },
  { en: "Marketing and PR", es: "Marketing y relaciones públicas", fr: "Marketing et relations publiques", pt: "Marketing e relações públicas", ko: "마케팅과 홍보" },
  { en: "Project Planning", es: "Planificación de proyectos", fr: "Planification de projets", pt: "Planeamento de projetos", ko: "프로젝트 기획" },
  { en: "Data and Analytics", es: "Datos y análisis", fr: "Données et analyses", pt: "Dados e análises", ko: "데이터와 분석" },
  { en: "Company Policies", es: "Políticas de la empresa", fr: "Politiques de l’entreprise", pt: "Políticas da empresa", ko: "회사 정책" },
  { en: "Travel and Vacation", es: "Viajes y vacaciones", fr: "Voyage et vacances", pt: "Viagem e férias", ko: "여행과 휴가" },
  { en: "Career and Growth", es: "Carrera profesional", fr: "Carrière et développement", pt: "Carreira e crescimento", ko: "경력과 성장" },
  { en: "Work Culture and Adaptation", es: "Cultura laboral", fr: "Culture du travail", pt: "Cultura de trabalho e adaptação", ko: "직장 문화와 적응" },
];/* ================= 페이지 ================= */

export default function Page() {
  const { targetLang } = useViewerTarget();
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
        <h1 style={title}>🗣️ Conversation Curriculum (English)</h1>


        <p style={descStrong}>
          With <b>one coupon</b>, you can study <b>one level (A1–C2)</b> for <b>30 days</b>.
        </p>

        {/* LIST */}
        <div style={listWrap}>
          {(() => {
            const grouped = {
              A1: DATA.slice(0, 10),
              A2: DATA.slice(10, 20),
              B1: DATA.slice(20, 30),
              B2: DATA.slice(30, 40),
              C1: DATA.slice(40, 50),
              C2: DATA.slice(50, 60),
            };

            return Object.entries(grouped).map(([level, list]) =>
              list.map((item, i) => {
                const num = i + 1;

                return (
                  <div key={level + num} style={card}>
                    <div style={left}>
                      <div style={numStyle}>{num}</div>
                    </div>

                    <div style={right}>
                      <div style={topRow}>
                        <span style={levelBadge}>{level}</span>
                      </div>

                      <div style={primary}>{item.en}</div>
                      <div style={sub}>{item.es}</div>
                      <div style={sub}>{item.fr}</div>
                      <div style={sub}>{item.pt}</div>
                    </div>
                  </div>
                );
              })
            );
          })()}
        </div>

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
  marginBottom: 6,
};

const descStrong: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#111",
  marginBottom: 24,
  lineHeight: 1.6,
};

const listWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const card: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: 14,
  borderRadius: 12,
  background: "#fff",
  border: "1px solid #eee",
};

const left: React.CSSProperties = {
  width: 30,
};

const numStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 14,
};

const right: React.CSSProperties = {
  flex: 1,
};

const topRow: React.CSSProperties = {
  marginBottom: 4,
};

const levelBadge: React.CSSProperties = {
  fontSize: 11,
  color: "#4f46e5",
  fontWeight: 700,
};

const primary: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 4,
};

const sub: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
};

const linkReset: React.CSSProperties = {
  textDecoration: "none",
};
