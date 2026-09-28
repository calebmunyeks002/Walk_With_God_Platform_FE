export interface BibleBook {
  id: string;        // "genesis", "1-samuel", "psalms", "revelation"
  name: string;      // English name — always present as fallback
  chapters: number;  // how many chapters in this book
  testament: 'OT' | 'NT';
  /**
   * Optional per-language display names.
   * Key   = language code from BIBLE_LANGUAGES (e.g. 'sw', 'es', 'fr').
   * Value = localized book name.
   */
  localizedNames?: Record<string, string>;
}

export const BIBLE_BOOKS: BibleBook[] = [
  /* ============================================================
     OLD TESTAMENT
     ============================================================ */
  { id: 'genesis',         name: 'Genesis',         chapters: 50, testament: 'OT',
    localizedNames: { sw: 'Mwanzo' } },
  { id: 'exodus',          name: 'Exodus',          chapters: 40, testament: 'OT',
    localizedNames: { sw: 'Kutoka' } },
  { id: 'leviticus',       name: 'Leviticus',       chapters: 27, testament: 'OT',
    localizedNames: { sw: 'Mambo ya Walawi' } },
  { id: 'numbers',         name: 'Numbers',         chapters: 36, testament: 'OT',
    localizedNames: { sw: 'Hesabu' } },
  { id: 'deuteronomy',     name: 'Deuteronomy',     chapters: 34, testament: 'OT',
    localizedNames: { sw: 'Kumbukumbu la Torati' } },
  { id: 'joshua',          name: 'Joshua',          chapters: 24, testament: 'OT',
    localizedNames: { sw: 'Yoshua' } },
  { id: 'judges',          name: 'Judges',          chapters: 21, testament: 'OT',
    localizedNames: { sw: 'Waamuzi' } },
  { id: 'ruth',            name: 'Ruth',            chapters:  4, testament: 'OT',
    localizedNames: { sw: 'Ruthu' } },
  { id: '1-samuel',        name: '1 Samuel',        chapters: 31, testament: 'OT',
    localizedNames: { sw: '1 Samweli' } },
  { id: '2-samuel',        name: '2 Samuel',        chapters: 24, testament: 'OT',
    localizedNames: { sw: '2 Samweli' } },
  { id: '1-kings',         name: '1 Kings',         chapters: 22, testament: 'OT',
    localizedNames: { sw: '1 Wafalme' } },
  { id: '2-kings',         name: '2 Kings',         chapters: 25, testament: 'OT',
    localizedNames: { sw: '2 Wafalme' } },
  { id: '1-chronicles',    name: '1 Chronicles',    chapters: 29, testament: 'OT',
    localizedNames: { sw: '1 Mambo ya Nyakati' } },
  { id: '2-chronicles',    name: '2 Chronicles',    chapters: 36, testament: 'OT',
    localizedNames: { sw: '2 Mambo ya Nyakati' } },
  { id: 'ezra',            name: 'Ezra',            chapters: 10, testament: 'OT',
    localizedNames: { sw: 'Ezra' } },
  { id: 'nehemiah',        name: 'Nehemiah',        chapters: 13, testament: 'OT',
    localizedNames: { sw: 'Nehemia' } },
  { id: 'esther',          name: 'Esther',          chapters: 10, testament: 'OT',
    localizedNames: { sw: 'Esta' } },
  { id: 'job',             name: 'Job',             chapters: 42, testament: 'OT',
    localizedNames: { sw: 'Ayubu' } },
  { id: 'psalms',          name: 'Psalms',          chapters: 150, testament: 'OT',
    localizedNames: { sw: 'Zaburi' } },
  { id: 'proverbs',        name: 'Proverbs',        chapters: 31, testament: 'OT',
    localizedNames: { sw: 'Mithali' } },
  { id: 'ecclesiastes',    name: 'Ecclesiastes',    chapters: 12, testament: 'OT',
    localizedNames: { sw: 'Mhubiri' } },
  { id: 'song-of-solomon', name: 'Song of Solomon', chapters:  8, testament: 'OT',
    localizedNames: { sw: 'Wimbo Ulio Bora' } },
  { id: 'isaiah',          name: 'Isaiah',          chapters: 66, testament: 'OT',
    localizedNames: { sw: 'Isaya' } },
  { id: 'jeremiah',        name: 'Jeremiah',        chapters: 52, testament: 'OT',
    localizedNames: { sw: 'Yeremia' } },
  { id: 'lamentations',    name: 'Lamentations',    chapters:  5, testament: 'OT',
    localizedNames: { sw: 'Maombolezo' } },
  { id: 'ezekiel',         name: 'Ezekiel',         chapters: 48, testament: 'OT',
    localizedNames: { sw: 'Ezekieli' } },
  { id: 'daniel',          name: 'Daniel',          chapters: 12, testament: 'OT',
    localizedNames: { sw: 'Danieli' } },
  { id: 'hosea',           name: 'Hosea',           chapters: 14, testament: 'OT',
    localizedNames: { sw: 'Hosea' } },
  { id: 'joel',            name: 'Joel',            chapters:  3, testament: 'OT',
    localizedNames: { sw: 'Yoeli' } },
  { id: 'amos',            name: 'Amos',            chapters:  9, testament: 'OT',
    localizedNames: { sw: 'Amosi' } },
  { id: 'obadiah',         name: 'Obadiah',         chapters:  1, testament: 'OT',
    localizedNames: { sw: 'Obadia' } },
  { id: 'jonah',           name: 'Jonah',           chapters:  4, testament: 'OT',
    localizedNames: { sw: 'Yona' } },
  { id: 'micah',           name: 'Micah',           chapters:  7, testament: 'OT',
    localizedNames: { sw: 'Mika' } },
  { id: 'nahum',           name: 'Nahum',           chapters:  3, testament: 'OT',
    localizedNames: { sw: 'Nahumu' } },
  { id: 'habakkuk',        name: 'Habakkuk',        chapters:  3, testament: 'OT',
    localizedNames: { sw: 'Habakuki' } },
  { id: 'zephaniah',       name: 'Zephaniah',       chapters:  3, testament: 'OT',
    localizedNames: { sw: 'Sefania' } },
  { id: 'haggai',          name: 'Haggai',          chapters:  2, testament: 'OT',
    localizedNames: { sw: 'Hagai' } },
  { id: 'zechariah',       name: 'Zechariah',       chapters: 14, testament: 'OT',
    localizedNames: { sw: 'Zekaria' } },
  { id: 'malachi',         name: 'Malachi',         chapters:  4, testament: 'OT',
    localizedNames: { sw: 'Malaki' } },

  /* ============================================================
     NEW TESTAMENT
     ============================================================ */
  { id: 'matthew',         name: 'Matthew',         chapters: 28, testament: 'NT',
    localizedNames: { sw: 'Mathayo' } },
  { id: 'mark',            name: 'Mark',            chapters: 16, testament: 'NT',
    localizedNames: { sw: 'Marko' } },
  { id: 'luke',            name: 'Luke',            chapters: 24, testament: 'NT',
    localizedNames: { sw: 'Luka' } },
  { id: 'john',            name: 'John',            chapters: 21, testament: 'NT',
    localizedNames: { sw: 'Yohana' } },
  { id: 'acts',            name: 'Acts',            chapters: 28, testament: 'NT',
    localizedNames: { sw: 'Matendo ya Mitume' } },
  { id: 'romans',          name: 'Romans',          chapters: 16, testament: 'NT',
    localizedNames: { sw: 'Warumi' } },
  { id: '1-corinthians',   name: '1 Corinthians',   chapters: 16, testament: 'NT',
    localizedNames: { sw: '1 Wakorintho' } },
  { id: '2-corinthians',   name: '2 Corinthians',   chapters: 13, testament: 'NT',
    localizedNames: { sw: '2 Wakorintho' } },
  { id: 'galatians',       name: 'Galatians',       chapters:  6, testament: 'NT',
    localizedNames: { sw: 'Wagalatia' } },
  { id: 'ephesians',       name: 'Ephesians',       chapters:  6, testament: 'NT',
    localizedNames: { sw: 'Waefeso' } },
  { id: 'philippians',     name: 'Philippians',     chapters:  4, testament: 'NT',
    localizedNames: { sw: 'Wafilipi' } },
  { id: 'colossians',      name: 'Colossians',      chapters:  4, testament: 'NT',
    localizedNames: { sw: 'Wakolosai' } },
  { id: '1-thessalonians', name: '1 Thessalonians', chapters:  5, testament: 'NT',
    localizedNames: { sw: '1 Wathesalonike' } },
  { id: '2-thessalonians', name: '2 Thessalonians', chapters:  3, testament: 'NT',
    localizedNames: { sw: '2 Wathesalonike' } },
  { id: '1-timothy',       name: '1 Timothy',       chapters:  6, testament: 'NT',
    localizedNames: { sw: '1 Timotheo' } },
  { id: '2-timothy',       name: '2 Timothy',       chapters:  4, testament: 'NT',
    localizedNames: { sw: '2 Timotheo' } },
  { id: 'titus',           name: 'Titus',           chapters:  3, testament: 'NT',
    localizedNames: { sw: 'Tito' } },
  { id: 'philemon',        name: 'Philemon',        chapters:  1, testament: 'NT',
    localizedNames: { sw: 'Filemoni' } },
  { id: 'hebrews',         name: 'Hebrews',         chapters: 13, testament: 'NT',
    localizedNames: { sw: 'Waebrania' } },
  { id: 'james',           name: 'James',           chapters:  5, testament: 'NT',
    localizedNames: { sw: 'Yakobo' } },
  { id: '1-peter',         name: '1 Peter',         chapters:  5, testament: 'NT',
    localizedNames: { sw: '1 Petro' } },
  { id: '2-peter',         name: '2 Peter',         chapters:  3, testament: 'NT',
    localizedNames: { sw: '2 Petro' } },
  { id: '1-john',          name: '1 John',          chapters:  5, testament: 'NT',
    localizedNames: { sw: '1 Yohana' } },
  { id: '2-john',          name: '2 John',          chapters:  1, testament: 'NT',
    localizedNames: { sw: '2 Yohana' } },
  { id: '3-john',          name: '3 John',          chapters:  1, testament: 'NT',
    localizedNames: { sw: '3 Yohana' } },
  { id: 'jude',            name: 'Jude',            chapters:  1, testament: 'NT',
    localizedNames: { sw: 'Yuda' } },
  { id: 'revelation',      name: 'Revelation',      chapters: 22, testament: 'NT',
    localizedNames: { sw: 'Ufunuo' } },
];

/* ==============================================================
   Helpers
   ============================================================== */

/**
 * Returns the book name for the requested language, falling back to
 * English when no localized name is defined for that language.
 *
 * Usage:
 *   bookName(book, 'sw')  → "Mwanzo"
 *   bookName(book, 'es')  → "Genesis"  (not yet translated)
 *   bookName(book)        → "Genesis"
 */
export function bookName(
  book: BibleBook,
  languageCode?: string
): string {
  if (!languageCode) return book.name;
  return book.localizedNames?.[languageCode] ?? book.name;
}