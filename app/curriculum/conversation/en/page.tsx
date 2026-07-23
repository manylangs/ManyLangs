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
  kr: string; // 추가
  zh: string;
  jp: string;
};

const DATA: Item[] = [
  { en: "Greetings", es: "Saludos", fr: "Salutations", pt: "Saudações", kr: "인사", zh: "問候", jp: "挨拶" },
  { en: "Self Introduction", es: "Presentación personal", fr: "Présentation personnelle", pt: "Autoapresentação", kr: "자기소개", zh: "自我介紹", jp: "自己紹介" },
  { en: "Nationality and Languages", es: "Nacionalidad e idiomas", fr: "Nationalité et langues", pt: "Nacionalidade e línguas", kr: "국적과 언어", zh: "國籍與語言", jp: "国籍と言語" },
  { en: "Jobs and Occupations", es: "Empleos y ocupaciones", fr: "Métiers et professions", pt: "Empregos e ocupações", kr: "직업", zh: "工作與職業", jp: "仕事と職業" },
  { en: "Family Introduction", es: "Presentación de la familia", fr: "Présentation de la famille", pt: "Apresentação da família", kr: "가족 소개", zh: "家庭介紹", jp: "家族紹介" },
  { en: "Numbers and Prices", es: "Números y precios", fr: "Nombres et prix", pt: "Números e preços", kr: "숫자와 가격", zh: "數字與價格", jp: "数字と価格" },
  { en: "Asking for Directions", es: "Pedir direcciones", fr: "Demander son chemin", pt: "Pedir direções", kr: "길 묻기", zh: "問路", jp: "道を尋ねる" },
  { en: "Describing Places", es: "Describir lugares", fr: "Décrire des lieux", pt: "Descrever lugares", kr: "장소 묘사", zh: "描述地點", jp: "場所の説明" },
  { en: "Ordering Food", es: "Pedir comida", fr: "Commander à manger", pt: "Pedir comida", kr: "음식 주문", zh: "點餐", jp: "食事の注文" },
  { en: "Ordering at a Cafe", es: "Pedir en una cafetería", fr: "Commander dans un café", pt: "Pedir num café", kr: "카페에서 주문하기", zh: "在咖啡廳點餐", jp: "カフェでの注文" },

  { en: "Shopping", es: "Ir de compras", fr: "Faire du shopping", pt: "Fazer compras", kr: "쇼핑", zh: "購物", jp: "買い物" },
  { en: "Tastes and Preferences", es: "Gustos y preferencias", fr: "Goûts et préférences", pt: "Gostos e preferências", kr: "취향과 선호", zh: "喜好與偏好", jp: "好みと嗜好" },
  { en: "Time and Days", es: "Tiempo y días", fr: "Heure et jours", pt: "Tempo e dias", kr: "시간과 요일", zh: "時間與星期", jp: "時間と曜日" },
  { en: "Making Appointments", es: "Hacer citas", fr: "Prendre un rendez-vous", pt: "Marcar compromissos", kr: "약속 잡기", zh: "預約安排", jp: "約束を取る" },
  { en: "Describing Home and Room", es: "Describir la casa", fr: "Décrire la maison", pt: "Descrever a casa e o quarto", kr: "집과 방 묘사", zh: "描述住家與房間", jp: "家と部屋の説明" },
  { en: "Talking about Weather", es: "Hablar del clima", fr: "Parler de la météo", pt: "Falar sobre o tempo", kr: "날씨 이야기", zh: "談論天氣", jp: "天気について話す" },
  { en: "Using Transportation", es: "Usar el transporte", fr: "Utiliser les transports", pt: "Usar transportes", kr: "교통수단 이용", zh: "使用交通工具", jp: "交通機関の利用" },
  { en: "Hobbies", es: "Pasatiempos", fr: "Loisirs", pt: "Passatempos", kr: "취미", zh: "興趣愛好", jp: "趣味" },
  { en: "Health and Symptoms", es: "Salud y síntomas", fr: "Santé et symptômes", pt: "Saúde e sintomas", kr: "건강과 증상", zh: "健康與症狀", jp: "健康と症状" },
  { en: "Asking for Help", es: "Pedir ayuda", fr: "Demander de l’aide", pt: "Pedir ajuda", kr: "도움 요청", zh: "尋求幫助", jp: "助けを求める" },

  { en: "Dormitory Life", es: "Vida en el dormitorio", fr: "Vie en résidence universitaire", pt: "Vida no dormitório", kr: "기숙사 생활", zh: "宿舍生活", jp: "寮生活" },
  { en: "Attending Classes", es: "Asistir a clases", fr: "Assister aux cours", pt: "Assistir às aulas", kr: "수업 참여", zh: "上課", jp: "授業への出席" },
  { en: "Professor Consultation", es: "Consulta con el profesor", fr: "Consultation avec le professeur", pt: "Consulta com o professor", kr: "교수 상담", zh: "與教授諮詢", jp: "教授との相談" },
  { en: "Assignments and Submissions", es: "Tareas y entregas", fr: "Devoirs et rendus", pt: "Trabalhos e entregas", kr: "과제와 제출", zh: "作業與繳交", jp: "課題と提出" },
  { en: "Team Projects", es: "Proyectos en equipo", fr: "Projets en équipe", pt: "Projetos em equipa", kr: "팀 프로젝트", zh: "團隊專案", jp: "チームプロジェクト" },
  { en: "Presentation Preparation", es: "Preparación de presentaciones", fr: "Préparation de présentation", pt: "Preparação de apresentações", kr: "발표 준비", zh: "簡報準備", jp: "プレゼンテーションの準備" },
  { en: "Exam Preparation", es: "Preparación de exámenes", fr: "Préparation aux examens", pt: "Preparação para exames", kr: "시험 준비", zh: "考試準備", jp: "試験の準備" },
  { en: "College Friends", es: "Amigos de la universidad", fr: "Amis à l’université", pt: "Amigos da universidade", kr: "대학 친구", zh: "大學朋友", jp: "大学の友人" },
  { en: "Club Activities", es: "Actividades de clubes", fr: "Activités de clubs", pt: "Atividades de clubes", kr: "동아리 활동", zh: "社團活動", jp: "サークル活動" },
  { en: "School Events", es: "Eventos escolares", fr: "Événements scolaires", pt: "Eventos escolares", kr: "학교 행사", zh: "學校活動", jp: "学校行事" },

  { en: "Bank Services", es: "Servicios bancarios", fr: "Services bancaires", pt: "Serviços bancários", kr: "은행 업무", zh: "銀行服務", jp: "銀行の利用" },
  { en: "Hospital and Pharmacy", es: "Hospital y farmacia", fr: "Hôpital et pharmacie", pt: "Hospital e farmácia", kr: "병원과 약국", zh: "醫院與藥局", jp: "病院と薬局" },
  { en: "Government Office", es: "Oficina gubernamental", fr: "Bureau administratif", pt: "Serviço governamental", kr: "관공서", zh: "政府機關", jp: "役所" },
  { en: "Part-Time Jobs", es: "Trabajos a tiempo parcial", fr: "Travail à temps partiel", pt: "Trabalhos a tempo parcial", kr: "아르바이트", zh: "打工", jp: "アルバイト" },
  { en: "Travel Planning", es: "Planificación de viajes", fr: "Planification de voyage", pt: "Planeamento de viagens", kr: "여행 계획", zh: "旅行規劃", jp: "旅行計画" },
  { en: "Accommodation Booking", es: "Reservar alojamiento", fr: "Réservation d’hébergement", pt: "Reserva de alojamento", kr: "숙소 예약", zh: "住宿預訂", jp: "宿泊予約" },
  { en: "Finding Restaurants", es: "Buscar restaurantes", fr: "Trouver des restaurants", pt: "Encontrar restaurantes", kr: "식당 찾기", zh: "尋找餐廳", jp: "レストラン探し" },
  { en: "Shopping Details", es: "Detalles de compras", fr: "Détails du shopping", pt: "Detalhes de compras", kr: "쇼핑 세부사항", zh: "購物細節", jp: "買い物の詳細" },
  { en: "Smartphones and Apps", es: "Smartphones y aplicaciones", fr: "Smartphones et applications", pt: "Smartphones e aplicações", kr: "스마트폰과 앱", zh: "智慧型手機與應用程式", jp: "スマートフォンとアプリ" },
  { en: "SNS and Online Communities", es: "Redes sociales", fr: "Réseaux sociaux", pt: "Redes sociais e comunidades online", kr: "SNS와 온라인 커뮤니티", zh: "社群媒體與線上社群", jp: "SNSとオンラインコミュニティ" },

  { en: "Job Interview", es: "Entrevista de trabajo", fr: "Entretien d’embauche", pt: "Entrevista de emprego", kr: "취업 면접", zh: "求職面試", jp: "就職面接" },
  { en: "First Day at Work", es: "Primer día en el trabajo", fr: "Premier jour au travail", pt: "Primeiro dia de trabalho", kr: "출근 첫날", zh: "上班第一天", jp: "出勤初日" },
  { en: "Talking with Coworkers", es: "Conversar con compañeros", fr: "Parler avec des collègues", pt: "Conversar com colegas", kr: "동료와 대화", zh: "與同事交談", jp: "同僚との会話" },
  { en: "Work Instructions and Reports", es: "Instrucciones de trabajo", fr: "Instructions de travail", pt: "Instruções de trabalho e relatórios", kr: "업무 지시와 보고", zh: "工作指示與報告", jp: "業務指示と報告" },
  { en: "Leading Meetings", es: "Dirigir reuniones", fr: "Diriger des réunions", pt: "Conduzir reuniões", kr: "회의 주재", zh: "主持會議", jp: "会議の進行" },
  { en: "Client Communication", es: "Comunicación con clientes", fr: "Communication avec les clients", pt: "Comunicação com clientes", kr: "고객 소통", zh: "與客戶溝通", jp: "顧客とのコミュニケーション" },
  { en: "Email Discussion", es: "Comunicación por correo", fr: "Communication par e-mail", pt: "Comunicação por e-mail", kr: "이메일 논의", zh: "電子郵件討論", jp: "メールでのやり取り" },
  { en: "Issue Solving", es: "Resolución de problemas", fr: "Résolution de problèmes", pt: "Resolução de problemas", kr: "문제 해결", zh: "問題解決", jp: "問題解決" },
  { en: "Schedule Management", es: "Gestión de horarios", fr: "Gestion des horaires", pt: "Gestão de horários", kr: "일정 관리", zh: "行程管理", jp: "スケジュール管理" },
  { en: "Business Trip Preparation", es: "Preparación de viajes", fr: "Préparation de voyage d’affaires", pt: "Preparação de viagem de negócios", kr: "출장 준비", zh: "出差準備", jp: "出張準備" },

  { en: "Exhibitions and Fairs", es: "Exposiciones y ferias", fr: "Expositions et salons", pt: "Exposições e feiras", kr: "전시회와 박람회", zh: "展覽與博覽會", jp: "展示会と見本市" },
  { en: "Business Networking", es: "Networking empresarial", fr: "Réseautage professionnel", pt: "Networking empresarial", kr: "비즈니스 네트워킹", zh: "商務人脈拓展", jp: "ビジネスネットワーキング" },
  { en: "Presentation Preparation (Business)", es: "Presentaciones empresariales", fr: "Présentation professionnelle", pt: "Preparação de apresentações (negócios)", kr: "발표 준비(비즈니스)", zh: "簡報準備(商務)", jp: "プレゼンテーションの準備(ビジネス)" },
  { en: "Marketing and PR", es: "Marketing y relaciones públicas", fr: "Marketing et relations publiques", pt: "Marketing e relações públicas", kr: "마케팅과 홍보", zh: "行銷與公關", jp: "マーケティングと広報" },
  { en: "Project Planning", es: "Planificación de proyectos", fr: "Planification de projets", pt: "Planeamento de projetos", kr: "프로젝트 기획", zh: "專案企劃", jp: "プロジェクト企画" },
  { en: "Data and Analytics", es: "Datos y análisis", fr: "Données et analyses", pt: "Dados e análises", kr: "데이터와 분석", zh: "資料與分析", jp: "データと分析" },
  { en: "Company Policies", es: "Políticas de la empresa", fr: "Politiques de l’entreprise", pt: "Políticas da empresa", kr: "회사 정책", zh: "公司政策", jp: "会社の方針" },
  { en: "Travel and Vacation", es: "Viajes y vacaciones", fr: "Voyage et vacances", pt: "Viagem e férias", kr: "여행과 휴가", zh: "旅行與休假", jp: "旅行と休暇" },
  { en: "Career and Growth", es: "Carrera profesional", fr: "Carrière et développement", pt: "Carreira e crescimento", kr: "경력과 성장", zh: "職涯與成長", jp: "キャリアと成長" },
  { en: "Work Culture and Adaptation", es: "Cultura laboral", fr: "Culture du travail", pt: "Cultura de trabalho e adaptação", kr: "직장 문화와 적응", zh: "職場文化與適應", jp: "職場文化と適応" },
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

        {/* HEADER */}
        <div style={headerWrap}>
          {/* 🔥 1줄: Sign In / Create Account — 좌우 꽉 채움 */}
          <div style={authRow}>
            <Link href="/login" style={linkReset}>
              <button type="button" style={{ ...btnBack, width: "100%" }}>
                Sign In
              </button>
            </Link>

            <Link href="/signup" style={linkReset}>
              <button type="button" style={{ ...btnHeaderPrimary, width: "100%" }}>
                Create Account
              </button>
            </Link>
          </div>

          {/* 🔥 2줄: Back / Copy link */}
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
                      <div style={sub}>{item.kr}</div>
                      <div style={sub}>{item.zh}</div>
                      <div style={sub}>{item.jp}</div>
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

/* 🔥 헤더 전체 래퍼 */
const headerWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 20,
  paddingTop: "calc(env(safe-area-inset-top) + 8px)",
};

/* 🔥 1줄: Sign In / Create Account — 좌우 꽉 채움, 같은 너비 */
const authRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  width: "100%",
};

/* 🔥 2줄: Back / Copy link */
const secondaryRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
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