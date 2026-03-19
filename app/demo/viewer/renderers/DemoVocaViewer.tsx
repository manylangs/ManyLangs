"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConversationAudioController from "@/components/audio/controllers/ConversationAudioController";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";

type StudyLang = "en" | "es" | "fr" | "pt";

const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

// 👉 중요: 헤더 높이 (대략 맞추면 됨)
const HEADER_HEIGHT = 110;

type Line = {
    speaker: string;
    sentences: Record<string, string>;
};

type Block = {
    set_id: string;
    lines: Line[];
};

type Props = {
    level: string;
    chapter: string;
};

type Status = "loading" | "ready" | "error";

export default function DemoConversationViewer({
    level,
    chapter,
}: Props) {
    const { targetLang } = useViewerTarget();
    const lang = targetLang || "kr";

    const [showTargetText, setShowTargetText] = useState(true);
    const [studyLang, setStudyLang] = useState<StudyLang>("en");
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [status, setStatus] = useState<Status>("loading");


    const guideTexts: Record<StudyLang, string[]> = {
        en: [
            "1. You can change the study language using the buttons above.",
            "2. You can move to the next set using the <> buttons below the audio.",
            "3. Press Toggle Target to hide the target language and practice translating.",
            "4. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, C2.",
            "5. As the level increases, situations, sentence length, vocabulary, and expressions become more advanced.",
        ],
        es: [
            "1. Puedes cambiar el idioma de estudio usando los botones de arriba.",
            "2. Puedes moverte al siguiente set usando los botones <> debajo del audio.",
            "3. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
            "4. Actualmente estás viendo A1 Chapter 1. Puedes elegir niveles A1, A2, B1, B2, C1, C2.",
            "5. A medida que sube el nivel, aumentan las situaciones, la longitud de las frases, el vocabulario y las expresiones.",
        ],
        fr: [
            "1. Vous pouvez changer la langue d’étude avec les boutons ci-dessus.",
            "2. Vous pouvez passer au set suivant avec les boutons <> sous l’audio.",
            "3. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
            "4. Vous regardez actuellement A1 Chapter 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1, C2.",
            "5. Plus le niveau augmente, plus les situations, les phrases et le vocabulaire deviennent complexes.",
        ],
        pt: [
            "1. Você pode mudar o idioma de estudo usando os botões acima.",
            "2. Você pode ir para o próximo set usando os botões <> abaixo do áudio.",
            "3. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
            "4. Você está vendo A1 Chapter 1. Pode escolher níveis A1, A2, B1, B2, C1, C2.",
            "5. À medida que o nível aumenta, aumentam as situações, o tamanho das frases e o vocabulário.",
        ],
    };

    useEffect(() => {
        const filtered = ALL_STUDY_LANGS.filter((l) => l !== targetLang);
        if (filtered.length > 0) setStudyLang(filtered[0]);
    }, [targetLang]);

    useEffect(() => {
        if (!lang) return;

        let cancelled = false;

        const load = async () => {
            try {
                setStatus("loading");

                const res = await fetch(
                    `/api/content/manifest?lang=${lang}&series=conversation&level=${level}&chapter=${chapter}&mode=demo`
                );

                if (!res.ok) throw new Error("manifest fetch failed");

                const manifest = await res.json();

                if (cancelled) return;

                const data = manifest.assets?.find((a: any) => a.kind === "data");

                if (!data?.path) throw new Error("data asset missing");

                const dataRes = await fetch(data.path);

                if (!dataRes.ok) throw new Error("data fetch failed");

                const dataJson = await dataRes.json();

                if (cancelled) return;

                setBlocks(Array.isArray(dataJson.blocks) ? dataJson.blocks : []);
                setStatus("ready");
            } catch (e) {
                console.error("❌ ERROR:", e);
                if (!cancelled) setStatus("error");
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [lang, level, chapter]);

    if (status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;
    if (status === "error") return <div style={{ padding: 24, color: "red" }}>Failed to load</div>;

    return (
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

            {/* ✅ 1. HEADER (고정) */}
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    background: "#fff",
                    padding: "16px 24px",
                    borderBottom: "1px solid #eee",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                        {ALL_STUDY_LANGS
                            .filter((l) => l !== targetLang)
                            .map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setStudyLang(l)}
                                    style={{
                                        padding: "6px 10px",
                                        borderRadius: 6,
                                        background: studyLang === l ? "#111" : "#eee",
                                        color: studyLang === l ? "#fff" : "#111",
                                        border: "none",
                                    }}
                                >
                                    {l.toUpperCase()}
                                </button>
                            ))}

                        <button onClick={() => setShowTargetText(!showTargetText)}>
                            Toggle Target
                        </button>
                    </div>

                    <Link href="/demo">← Back</Link>
                </div>
            </div>

            {/* ✅ 2. PLAYER (고정) */}
            <div
                style={{
                    position: "sticky",
                    top: HEADER_HEIGHT,
                    zIndex: 15,
                    background: "#fff",
                    padding: "12px 24px",
                    borderBottom: "1px solid #eee",
                }}
            >
                <ConversationAudioController
                    lang={lang}
                    level={level}
                    chapter={chapter}
                />
            </div>

            {/* ✅ 3. CONTENT (밀기) */}
            <div
                style={{
                    padding: "24px",
                    paddingTop: HEADER_HEIGHT + 80, // 🔥 핵심
                }}
            >
                {blocks.map((block, idx) => (
                    <section key={block.set_id || idx} style={{ marginBottom: 40 }}>
                        <div style={{ fontWeight: 700, marginBottom: 12 }}>
                            Set {idx + 1}
                        </div>

                        {(block.lines || []).map((line, i) => {
                            const targetText =
                                line.sentences?.[targetLang] ??
                                line.sentences?.target ??
                                "";

                            const studyText =
                                line.sentences?.[studyLang] ?? "";

                            return (
                                <div key={i} style={{ marginBottom: 12 }}>
                                    {showTargetText && (
                                        <div>
                                            <strong>{line.speaker}:</strong> {targetText}
                                        </div>
                                    )}

                                    <div style={{ color: "#555" }}>
                                        <strong>{line.speaker}:</strong> {studyText}
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                ))}
            </div>
        </div>
    );
}