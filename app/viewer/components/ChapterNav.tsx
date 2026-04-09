import Link from "next/link";

type Props = {
  target: string;
  level: string;
  chapter: string;
};

export default function ChapterNav({
  target,
  level,
  chapter,
}: Props) {
  const num = Number(chapter);
  const prev = num > 1 ? String(num - 1).padStart(3, "0") : null;
  const next = String(num + 1).padStart(3, "0");

  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      {prev ? (
        <Link href={`/viewer/${target}/grammar/${level}/${prev}`}>
          ← Prev
        </Link>
      ) : (
        <span />
      )}
      <Link href={`/viewer/${target}/grammar/${level}/${next}`}>
        Next →
      </Link>
    </div>
  );
}
