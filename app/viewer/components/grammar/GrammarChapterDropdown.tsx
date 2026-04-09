"use client";

import { useRouter } from "next/navigation";

type Props = {
  target: string;
  level: string;
  current: string;
  chapters: string[];
};

export default function GrammarChapterDropdown({
  target,
  level,
  current,
  chapters,
}: Props) {
  const router = useRouter();

  return (
    <select
      value={current}
      onChange={(e) =>
        router.push(
          `/viewer/${target}/grammar/${level}/${e.target.value}`
        )
      }
    >
      {chapters.map((ch) => (
        <option key={ch} value={ch}>
          {ch}
        </option>
      ))}
    </select>
  );
}
