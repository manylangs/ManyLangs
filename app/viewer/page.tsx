import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getUserLicenses, hasValidLicense } from "@/lib/licenses.server";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; level: string }>;
}) {
  const user = await currentUser(); // ✅ auth() 대신

  if (!user) {
    redirect("/sign-in");
  }

  const userId = user.id; // ✅ 여기서 100% 안전

  const { lang, level } = await params;

  const requiredProductId = `grammar_${lang}_${level}`;

  const licenses = await getUserLicenses(userId);
  const ok = hasValidLicense(licenses, requiredProductId);

  if (!ok) {
    redirect("/select-books");
  }

  redirect(`/viewer/${lang}/grammar/${level}/001`);
}
