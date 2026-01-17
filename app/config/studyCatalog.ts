export type StudyCatalog = {
  lang: string;
  label: string;
  series: {
    key: string;
    label: string;
    levels: string[];
  }[];
};

export const STUDY_CATALOG: StudyCatalog[] = [
  {
    lang: "kr",
    label: "Korean",
    series: [
      {
        key: "grammar",
        label: "Grammar",
        levels: ["a1", "a2", "b1", "b2", "c1"],
      },
      {
        key: "conversation",
        label: "Conversation",
        levels: ["a1", "a2", "b1"],
      },
    ],
  },
  {
    lang: "en",
    label: "English",
    series: [
      {
        key: "grammar",
        label: "Grammar",
        levels: ["a1", "a2", "b1", "b2"],
      },
    ],
  },
  {
    lang: "ja",
    label: "Japanese",
    series: [
      {
        key: "grammar",
        label: "Grammar",
        levels: ["a1", "a2"],
      },
    ],
  },
];
