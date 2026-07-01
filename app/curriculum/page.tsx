import { redirect } from "next/navigation";

/**
 * /curriculum
 *
 * The bare /curriculum path has no language of its own — English is the
 * default. We redirect (not render) so there is only ever ONE canonical
 * URL per language (/curriculum/en, /curriculum/kr, ...), which keeps the
 * URL as the single source of truth and avoids duplicate-content issues
 * for SEO.
 */
export default function CurriculumIndexPage() {
  redirect("/curriculum/en");
}
