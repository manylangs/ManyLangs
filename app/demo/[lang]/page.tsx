import DemoClient from "./DemoClient";
import { LANGUAGES } from "@/app/config/languages";

export default async function Page({
    params,
}: {
    params: Promise<{ lang: string }>;
}) {
    const { lang } = await params;

    // 유효하지 않은 lang이면 기본값(en)으로 처리
    const validLang = LANGUAGES.some((l) => l.code === lang) ? lang : "en";

    return <DemoClient lang={validLang} />;
}