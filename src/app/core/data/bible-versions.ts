export interface BibleVersionOption {
  id: string;        // e.g. "en-kjv" — matches the CDN folder
  label: string;     // e.g. "King James Version (KJV)"
}

export interface BibleLanguage {
  code: string;      // ISO 639-1 or ISO 639-3
  name: string;      // "English"
  nativeName: string; // "English", "Kiswahili", etc.
  versions: BibleVersionOption[];
}

/**
 * Curated catalog of Bible languages and versions available on the
 * wldeh/bible-api CDN. Only includes versions we've verified exist
 * and cover the full Bible (or substantial portions).
 */
export const BIBLE_LANGUAGES: BibleLanguage[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    versions: [
      { id: 'en-kjv',  label: 'King James Version (KJV)' },
      { id: 'en-asv',  label: 'American Standard Version (ASV)' },
      { id: 'en-web',  label: 'World English Bible (WEB)' },
      { id: 'en-bbe',  label: 'Bible in Basic English (BBE)' },
      { id: 'en-dby',  label: 'Darby Bible (DBY)' },
      { id: 'en-ylt',  label: "Young's Literal Translation (YLT)" },
      { id: 'en-wmb',  label: 'World Messianic Bible (WMB)' },
      { id: 'en-gnv',  label: 'Geneva Bible 1599 (GNV)' },
      { id: 'en-lsv',  label: 'Literal Standard Version (LSV)' },
      { id: 'en-fbv',  label: 'Free Bible Version (FBV)' },
    ],
  },
  {
    code: 'sw',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    versions: [
      { id: 'swh-onen', label: 'Neno: Biblia Takatifu (Swahili)' },
    ],
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    versions: [
      { id: 'es-rv09', label: 'Reina Valera 1909 (RV09)' },
      { id: 'es-bes',  label: 'La Biblia en Español Sencillo (BES)' },
      { id: 'es-vbl',  label: 'Versión Biblia Libre (VBL)' },
    ],
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    versions: [
      { id: 'fr-apee', label: 'La Bible de l\'Épée (French)' },
    ],
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    versions: [
      { id: 'de-luther1912', label: 'Luther Bibel 1912 (Deutsch)' },
      { id: 'de-elo',        label: 'Elberfelder 1905 (Deutsch)' },
      { id: 'de-tkw',        label: 'Textbibel 1906 (Deutsch)' },
    ],
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    versions: [
      { id: 'pt-tftp',   label: 'Tradução para Tradutores (Portugues)' },
      { id: 'pt-BR-blt', label: 'Bíblia Livre Para Todos (BR)' },
    ],
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    versions: [
      { id: 'it-db1885', label: 'Diodati Bibbia 1885 (Italiano)' },
    ],
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    versions: [
      { id: 'nl-nld1939', label: 'Petrus Canisiusvertaling 1939' },
    ],
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    versions: [
      { id: 'ru-synodal', label: 'Синодальный перевод (Russian)' },
    ],
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    versions: [
      { id: 'cmn-Hans-CN-feb', label: 'Free Easy-to-read Bible (简体中文)' },
    ],
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    versions: [
      { id: 'arb-kehm', label: 'Ketab El Hayat (Open Arabic)' },
    ],
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    versions: [
      { id: 'hi-ohss',   label: 'Open Hindi Contemporary Version' },
      { id: 'hi-IN-irvhin', label: 'Indian Revised Version (Hindi)' },
    ],
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    versions: [
      { id: 'ko-krv', label: 'Korean Revised Version (한국어)' },
    ],
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    versions: [
      { id: 'ja-kougo', label: 'Japanese Kougo (日本語)' },
    ],
  },
  {
    code: 'tl',
    name: 'Tagalog',
    nativeName: 'Tagalog',
    versions: [
      { id: 'tl-ulb', label: 'Unlocked Literal Bible (Tagalog)' },
    ],
  },
  {
    code: 'yo',
    name: 'Yoruba',
    nativeName: 'Yorùbá',
    versions: [
      { id: 'yo-oycb', label: 'Open Yoruba Contemporary Bible' },
    ],
  },
  {
    code: 'ig',
    name: 'Igbo',
    nativeName: 'Igbo',
    versions: [
      { id: 'ig-biuo', label: 'Open Igbo Contemporary Bible' },
    ],
  },
  {
    code: 'am',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    versions: [
      { id: 'amh-otnt', label: 'Amharic Bible (አማርኛ)' },
    ],
  },
];

/** All versions flattened — useful when you don't want the language picker. */
export const ALL_VERSIONS: BibleVersionOption[] = BIBLE_LANGUAGES.flatMap(
  (l) => l.versions
);

/** Find the language a version belongs to. */
export function findLanguageForVersion(
  versionId: string
): BibleLanguage | undefined {
  return BIBLE_LANGUAGES.find((l) =>
    l.versions.some((v) => v.id === versionId)
  );
}