import { koreanConfig }     from "./korean";
import { englishConfig }    from "./english";
import { spanishConfig }    from "./spanish";
import { frenchConfig }     from "./french";
import { portugueseConfig } from "./portuguese";

export type YouTubeLanguageConfig = {
  language: string;
  label: string;
  flag: string;
  nativeSearchKeywords: string[];
  englishSearchKeywords: string[];
  recruitmentKeywords: string[];
  negativeKeywords: string[];
};

export const youtubeConfigs: YouTubeLanguageConfig[] = [
  koreanConfig,
  englishConfig,
  spanishConfig,
  frenchConfig,
  portugueseConfig,
];

export const youtubeConfigMap: Record<string, YouTubeLanguageConfig> =
  Object.fromEntries(youtubeConfigs.map((c) => [c.language, c]));
