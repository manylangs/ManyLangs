"use client";

import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";

/* ================= 레벨 ================= */
function getLevel(num: number) {
  if (num <= 10) return "A1";
  if (num <= 20) return "A2";
  if (num <= 30) return "B1";
  if (num <= 40) return "B2";
  if (num <= 50) return "C1";
  return "C2";
}

/* ================= 데이터 ================= */
type Item = {
  kr: string;
  en: string;
  es: string;
  fr: string;
};

const DATA: Item[] = [
  { kr: "인사하기", en: "Greetings", es: "Saludos", fr: "Salutations" },
  { kr: "자기소개", en: "Self Introduction", es: "Presentación personal", fr: "Présentation personnelle" },
  { kr: "국적과 사용 언어", en: "Nationality and Languages", es: "Nacionalidad e idiomas", fr: "Nationalité et langues" },
  { kr: "직업과 업무", en: "Jobs and Occupations", es: "Empleos y ocupaciones", fr: "Métiers et professions" },
  { kr: "가족 소개", en: "Family Introduction", es: "Presentación de la familia", fr: "Présentation de la famille" },
  { kr: "숫자와 가격", en: "Numbers and Prices", es: "Números y precios", fr: "Nombres et prix" },
  { kr: "길 묻기", en: "Asking for Directions", es: "Pedir direcciones", fr: "Demander son chemin" },
  { kr: "장소 묘사하기", en: "Describing Places", es: "Describir lugares", fr: "Décrire des lieux" },
  { kr: "음식 주문하기", en: "Ordering Food", es: "Pedir comida", fr: "Commander à manger" },
  { kr: "카페에서 주문하기", en: "Ordering at a Cafe", es: "Pedir en una cafetería", fr: "Commander dans un café" },

  { kr: "쇼핑하기", en: "Shopping", es: "Ir de compras", fr: "Faire du shopping" },
  { kr: "취향과 선호", en: "Tastes and Preferences", es: "Gustos y preferencias", fr: "Goûts et préférences" },
  { kr: "시간과 요일", en: "Time and Days", es: "Tiempo y días", fr: "Heure et jours" },
  { kr: "약속 잡기", en: "Making Appointments", es: "Hacer citas", fr: "Prendre un rendez-vous" },
  { kr: "집과 방 묘사하기", en: "Describing Home and Room", es: "Describir la casa", fr: "Décrire la maison" },
  { kr: "날씨 이야기하기", en: "Talking about Weather", es: "Hablar del clima", fr: "Parler de la météo" },
  { kr: "교통수단 이용하기", en: "Using Transportation", es: "Usar el transporte", fr: "Utiliser les transports" },
  { kr: "취미 이야기하기", en: "Hobbies", es: "Pasatiempos", fr: "Loisirs" },
  { kr: "건강과 증상", en: "Health and Symptoms", es: "Salud y síntomas", fr: "Santé et symptômes" },
  { kr: "도움 요청하기", en: "Asking for Help", es: "Pedir ayuda", fr: "Demander de l’aide" },

  { kr: "기숙사 생활", en: "Dormitory Life", es: "Vida en el dormitorio", fr: "Vie en résidence universitaire" },
  { kr: "수업 듣기", en: "Attending Classes", es: "Asistir a clases", fr: "Assister aux cours" },
  { kr: "교수님 상담", en: "Professor Consultation", es: "Consulta con el profesor", fr: "Consultation avec le professeur" },
  { kr: "과제 및 제출", en: "Assignments and Submissions", es: "Tareas y entregas", fr: "Devoirs et rendus" },
  { kr: "팀 프로젝트", en: "Team Projects", es: "Proyectos en equipo", fr: "Projets en équipe" },
  { kr: "발표 준비", en: "Presentation Preparation", es: "Preparación de presentaciones", fr: "Préparation de présentation" },
  { kr: "시험 준비", en: "Exam Preparation", es: "Preparación de exámenes", fr: "Préparation aux examens" },
  { kr: "대학 친구들", en: "College Friends", es: "Amigos de la universidad", fr: "Amis à l’université" },
  { kr: "동아리 활동", en: "Club Activities", es: "Actividades de clubes", fr: "Activités de clubs" },
  { kr: "학교 행사", en: "School Events", es: "Eventos escolares", fr: "Événements scolaires" },

  { kr: "은행 업무", en: "Bank Services", es: "Servicios bancarios", fr: "Services bancaires" },
  { kr: "병원과 약국", en: "Hospital and Pharmacy", es: "Hospital y farmacia", fr: "Hôpital et pharmacie" },
  { kr: "관공서 이용", en: "Government Office", es: "Oficina gubernamental", fr: "Bureau administratif" },
  { kr: "아르바이트", en: "Part-Time Jobs", es: "Trabajos a tiempo parcial", fr: "Travail à temps partiel" },
  { kr: "여행 계획하기", en: "Travel Planning", es: "Planificación de viajes", fr: "Planification de voyage" },
  { kr: "숙소 예약하기", en: "Accommodation Booking", es: "Reservar alojamiento", fr: "Réservation d’hébergement" },
  { kr: "맛집 찾기", en: "Finding Restaurants", es: "Buscar restaurantes", fr: "Trouver des restaurants" },
  { kr: "쇼핑 세부 표현", en: "Shopping Details", es: "Detalles de compras", fr: "Détails du shopping" },
  { kr: "스마트폰과 앱", en: "Smartphones and Apps", es: "Smartphones y aplicaciones", fr: "Smartphones et applications" },
  { kr: "SNS와 온라인 커뮤니티", en: "SNS and Online Communities", es: "Redes sociales", fr: "Réseaux sociaux" },

  { kr: "면접 보기", en: "Job Interview", es: "Entrevista de trabajo", fr: "Entretien d’embauche" },
  { kr: "첫 출근", en: "First Day at Work", es: "Primer día en el trabajo", fr: "Premier jour au travail" },
  { kr: "직장 동료와 대화", en: "Talking with Coworkers", es: "Conversar con compañeros", fr: "Parler avec des collègues" },
  { kr: "업무 지시와 보고", en: "Work Instructions and Reports", es: "Instrucciones de trabajo", fr: "Instructions de travail" },
  { kr: "회의 진행하기", en: "Leading Meetings", es: "Dirigir reuniones", fr: "Diriger des réunions" },
  { kr: "고객 커뮤니케이션", en: "Client Communication", es: "Comunicación con clientes", fr: "Communication avec les clients" },
  { kr: "이메일 커뮤니케이션", en: "Email Discussion", es: "Comunicación por correo", fr: "Communication par e-mail" },
  { kr: "문제 해결하기", en: "Issue Solving", es: "Resolución de problemas", fr: "Résolution de problèmes" },
  { kr: "일정 관리", en: "Schedule Management", es: "Gestión de horarios", fr: "Gestion des horaires" },
  { kr: "출장 준비", en: "Business Trip Preparation", es: "Preparación de viajes", fr: "Préparation de voyage d’affaires" },

  { kr: "박람회 및 전시회", en: "Exhibitions and Fairs", es: "Exposiciones y ferias", fr: "Expositions et salons" },
  { kr: "비즈니스 네트워킹", en: "Business Networking", es: "Networking empresarial", fr: "Réseautage professionnel" },
  { kr: "발표 준비(비즈니스)", en: "Presentation Preparation (Business)", es: "Presentaciones empresariales", fr: "Présentation professionnelle" },
  { kr: "마케팅 및 홍보", en: "Marketing and PR", es: "Marketing y relaciones públicas", fr: "Marketing et relations publiques" },
  { kr: "프로젝트 기획", en: "Project Planning", es: "Planificación de proyectos", fr: "Planification de projets" },
  { kr: "데이터와 분석", en: "Data and Analytics", es: "Datos y análisis", fr: "Données et analyses" },
  { kr: "회사 규정", en: "Company Policies", es: "Políticas de la empresa", fr: "Politiques de l’entreprise" },
  { kr: "여행과 휴가", en: "Travel and Vacation", es: "Viajes y vacaciones", fr: "Voyage et vacances" },
  { kr: "커리어와 성장", en: "Career and Growth", es: "Carrera profesional", fr: "Carrière et développement" },
  { kr: "직장 문화와 적응", en: "Work Culture and Adaptation", es: "Cultura laboral", fr: "Culture du travail" }
];
/* ================= 페이지 ================= */

export default function Page() {
  const { targetLang } = useViewerTarget();

  return (
    <main style={main}>
      <div style={container}>

        {/* HEADER */}
        <div style={header}>
          <Link href="/curriculum" style={linkReset}>
            <button style={backBtn}>← Back</button>
          </Link>

          <div style={headerRight}>
            <button
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: "Curriculum",
                      url: window.location.href,
                    });
                  } catch { }
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }
              }}
              style={copyBtn}
            >
               Copy link
            </button>

            <a href="/app" style={linkReset}>
              <button style={btnHeaderPrimary}>
                Unlock Full Access
              </button>
            </a>
          </div>
        </div>

        {/* TITLE */}
        <h1 style={title}>🗣️ Conversation Curriculum (KR)</h1>


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

                      <div style={kr}>{item.kr}</div>
                      <div style={sub}>{item.en}</div>
                      <div style={sub}>{item.es}</div>
                      <div style={sub}>{item.fr}</div>
                    </div>
                  </div>
                );
              })
            );
          })()}
        </div>

      </div>
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

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const headerRight: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const backBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};

const copyBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#f3f4f6",
  cursor: "pointer",
};

const btnHeaderPrimary: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  border: "none",
  fontWeight: 600,
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

const kr: React.CSSProperties = {
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