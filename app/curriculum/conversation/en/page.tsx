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
  pt: string; // 추가
};

const DATA: Item[] = [
  { en: "Greetings", es: "Saludos", fr: "Salutations", pt: "Saudações" },
  { en: "Self Introduction", es: "Presentación personal", fr: "Présentation personnelle", pt: "Autoapresentação" },
  { en: "Nationality and Languages", es: "Nacionalidad e idiomas", fr: "Nationalité et langues", pt: "Nacionalidade e línguas" },
  { en: "Jobs and Occupations", es: "Empleos y ocupaciones", fr: "Métiers et professions", pt: "Empregos e ocupações" },
  { en: "Family Introduction", es: "Presentación de la familia", fr: "Présentation de la famille", pt: "Apresentação da família" },
  { en: "Numbers and Prices", es: "Números y precios", fr: "Nombres et prix", pt: "Números e preços" },
  { en: "Asking for Directions", es: "Pedir direcciones", fr: "Demander son chemin", pt: "Pedir direções" },
  { en: "Describing Places", es: "Describir lugares", fr: "Décrire des lieux", pt: "Descrever lugares" },
  { en: "Ordering Food", es: "Pedir comida", fr: "Commander à manger", pt: "Pedir comida" },
  { en: "Ordering at a Cafe", es: "Pedir en una cafetería", fr: "Commander dans un café", pt: "Pedir num café" },

  { en: "Shopping", es: "Ir de compras", fr: "Faire du shopping", pt: "Fazer compras" },
  { en: "Tastes and Preferences", es: "Gustos y preferencias", fr: "Goûts et préférences", pt: "Gostos e preferências" },
  { en: "Time and Days", es: "Tiempo y días", fr: "Heure et jours", pt: "Tempo e dias" },
  { en: "Making Appointments", es: "Hacer citas", fr: "Prendre un rendez-vous", pt: "Marcar compromissos" },
  { en: "Describing Home and Room", es: "Describir la casa", fr: "Décrire la maison", pt: "Descrever a casa e o quarto" },
  { en: "Talking about Weather", es: "Hablar del clima", fr: "Parler de la météo", pt: "Falar sobre o tempo" },
  { en: "Using Transportation", es: "Usar el transporte", fr: "Utiliser les transports", pt: "Usar transportes" },
  { en: "Hobbies", es: "Pasatiempos", fr: "Loisirs", pt: "Passatempos" },
  { en: "Health and Symptoms", es: "Salud y síntomas", fr: "Santé et symptômes", pt: "Saúde e sintomas" },
  { en: "Asking for Help", es: "Pedir ayuda", fr: "Demander de l’aide", pt: "Pedir ajuda" },

  { en: "Dormitory Life", es: "Vida en el dormitorio", fr: "Vie en résidence universitaire", pt: "Vida no dormitório" },
  { en: "Attending Classes", es: "Asistir a clases", fr: "Assister aux cours", pt: "Assistir às aulas" },
  { en: "Professor Consultation", es: "Consulta con el profesor", fr: "Consultation avec le professeur", pt: "Consulta com o professor" },
  { en: "Assignments and Submissions", es: "Tareas y entregas", fr: "Devoirs et rendus", pt: "Trabalhos e entregas" },
  { en: "Team Projects", es: "Proyectos en equipo", fr: "Projets en équipe", pt: "Projetos em equipa" },
  { en: "Presentation Preparation", es: "Preparación de presentaciones", fr: "Préparation de présentation", pt: "Preparação de apresentações" },
  { en: "Exam Preparation", es: "Preparación de exámenes", fr: "Préparation aux examens", pt: "Preparação para exames" },
  { en: "College Friends", es: "Amigos de la universidad", fr: "Amis à l’université", pt: "Amigos da universidade" },
  { en: "Club Activities", es: "Actividades de clubes", fr: "Activités de clubs", pt: "Atividades de clubes" },
  { en: "School Events", es: "Eventos escolares", fr: "Événements scolaires", pt: "Eventos escolares" },

  { en: "Bank Services", es: "Servicios bancarios", fr: "Services bancaires", pt: "Serviços bancários" },
  { en: "Hospital and Pharmacy", es: "Hospital y farmacia", fr: "Hôpital et pharmacie", pt: "Hospital e farmácia" },
  { en: "Government Office", es: "Oficina gubernamental", fr: "Bureau administratif", pt: "Serviço governamental" },
  { en: "Part-Time Jobs", es: "Trabajos a tiempo parcial", fr: "Travail à temps partiel", pt: "Trabalhos a tempo parcial" },
  { en: "Travel Planning", es: "Planificación de viajes", fr: "Planification de voyage", pt: "Planeamento de viagens" },
  { en: "Accommodation Booking", es: "Reservar alojamiento", fr: "Réservation d’hébergement", pt: "Reserva de alojamento" },
  { en: "Finding Restaurants", es: "Buscar restaurantes", fr: "Trouver des restaurants", pt: "Encontrar restaurantes" },
  { en: "Shopping Details", es: "Detalles de compras", fr: "Détails du shopping", pt: "Detalhes de compras" },
  { en: "Smartphones and Apps", es: "Smartphones y aplicaciones", fr: "Smartphones et applications", pt: "Smartphones e aplicações" },
  { en: "SNS and Online Communities", es: "Redes sociales", fr: "Réseaux sociaux", pt: "Redes sociais e comunidades online" },

  { en: "Job Interview", es: "Entrevista de trabajo", fr: "Entretien d’embauche", pt: "Entrevista de emprego" },
  { en: "First Day at Work", es: "Primer día en el trabajo", fr: "Premier jour au travail", pt: "Primeiro dia de trabalho" },
  { en: "Talking with Coworkers", es: "Conversar con compañeros", fr: "Parler avec des collègues", pt: "Conversar com colegas" },
  { en: "Work Instructions and Reports", es: "Instrucciones de trabajo", fr: "Instructions de travail", pt: "Instruções de trabalho e relatórios" },
  { en: "Leading Meetings", es: "Dirigir reuniones", fr: "Diriger des réunions", pt: "Conduzir reuniões" },
  { en: "Client Communication", es: "Comunicación con clientes", fr: "Communication avec les clients", pt: "Comunicação com clientes" },
  { en: "Email Discussion", es: "Comunicación por correo", fr: "Communication par e-mail", pt: "Comunicação por e-mail" },
  { en: "Issue Solving", es: "Resolución de problemas", fr: "Résolution de problèmes", pt: "Resolução de problemas" },
  { en: "Schedule Management", es: "Gestión de horarios", fr: "Gestion des horaires", pt: "Gestão de horários" },
  { en: "Business Trip Preparation", es: "Preparación de viajes", fr: "Préparation de voyage d’affaires", pt: "Preparação de viagem de negócios" },

  { en: "Exhibitions and Fairs", es: "Exposiciones y ferias", fr: "Expositions et salons", pt: "Exposições e feiras" },
  { en: "Business Networking", es: "Networking empresarial", fr: "Réseautage professionnel", pt: "Networking empresarial" },
  { en: "Presentation Preparation (Business)", es: "Presentaciones empresariales", fr: "Présentation professionnelle", pt: "Preparação de apresentações (negócios)" },
  { en: "Marketing and PR", es: "Marketing y relaciones públicas", fr: "Marketing et relations publiques", pt: "Marketing e relações públicas" },
  { en: "Project Planning", es: "Planificación de proyectos", fr: "Planification de projets", pt: "Planeamento de projetos" },
  { en: "Data and Analytics", es: "Datos y análisis", fr: "Données et analyses", pt: "Dados e análises" },
  { en: "Company Policies", es: "Políticas de la empresa", fr: "Politiques de l’entreprise", pt: "Políticas da empresa" },
  { en: "Travel and Vacation", es: "Viajes y vacaciones", fr: "Voyage et vacances", pt: "Viagem e férias" },
  { en: "Career and Growth", es: "Carrera profesional", fr: "Carrière et développement", pt: "Carreira e crescimento" },
  { en: "Work Culture and Adaptation", es: "Cultura laboral", fr: "Culture du travail", pt: "Cultura de trabalho e adaptação" },];
/* ================= 페이지 ================= */

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
