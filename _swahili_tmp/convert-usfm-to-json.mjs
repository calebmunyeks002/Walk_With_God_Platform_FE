// convert-usfm-to-json.mjs
// Reads *.usfm files in cwd, writes ../bibles/swh-onen/<book-slug>/<chapter>.json

import fs from 'node:fs';
import path from 'node:path';

// USFM 3-letter code → project slug
const BOOK_MAP = {
  GEN: 'genesis', EXO: 'exodus', LEV: 'leviticus', NUM: 'numbers',
  DEU: 'deuteronomy', JOS: 'joshua', JDG: 'judges', RUT: 'ruth',
  '1SA': '1-samuel', '2SA': '2-samuel', '1KI': '1-kings', '2KI': '2-kings',
  '1CH': '1-chronicles', '2CH': '2-chronicles', EZR: 'ezra', NEH: 'nehemiah',
  EST: 'esther', JOB: 'job', PSA: 'psalms', PRO: 'proverbs',
  ECC: 'ecclesiastes', SNG: 'song-of-solomon', ISA: 'isaiah',
  JER: 'jeremiah', LAM: 'lamentations', EZK: 'ezekiel', DAN: 'daniel',
  HOS: 'hosea', JOL: 'joel', AMO: 'amos', OBA: 'obadiah', JON: 'jonah',
  MIC: 'micah', NAM: 'nahum', HAB: 'habakkuk', ZEP: 'zephaniah',
  HAG: 'haggai', ZEC: 'zechariah', MAL: 'malachi',
  MAT: 'matthew', MRK: 'mark', LUK: 'luke', JHN: 'john', ACT: 'acts',
  ROM: 'romans', '1CO': '1-corinthians', '2CO': '2-corinthians',
  GAL: 'galatians', EPH: 'ephesians', PHP: 'philippians',
  COL: 'colossians', '1TH': '1-thessalonians', '2TH': '2-thessalonians',
  '1TI': '1-timothy', '2TI': '2-timothy', TIT: 'titus', PHM: 'philemon',
  HEB: 'hebrews', JAS: 'james', '1PE': '1-peter', '2PE': '2-peter',
  '1JN': '1-john', '2JN': '2-john', '3JN': '3-john', JUD: 'jude',
  REV: 'revelation',
};

const OUT_ROOT = path.resolve('..', 'assets', 'bibles', 'swh-onen');
fs.mkdirSync(OUT_ROOT, { recursive: true });

const usfmFiles = fs.readdirSync('.').filter(f => f.endsWith('.usfm'));
let totalBooks = 0;

for (const file of usfmFiles) {
  const text = fs.readFileSync(file, 'utf8');

  // Extract book code from \id line
  const idMatch = text.match(/^\\id\s+([A-Z0-9]{3})/m);
  if (!idMatch) {
    console.warn(`⚠️  Skipping ${file} — no \\id line`);
    continue;
  }
  const bookCode = idMatch[1];
  const slug = BOOK_MAP[bookCode];
  if (!slug) {
    console.warn(`⚠️  Skipping ${file} — unknown book code ${bookCode}`);
    continue;
  }

  // Split into chapters by \c N
  const chapters = {};
  const lines = text.split(/\r?\n/);
  let currentChapter = null;
  let currentVerse = null;

  for (const raw of lines) {
    const line = raw.trim();

    const cMatch = line.match(/^\\c\s+(\d+)/);
    if (cMatch) {
      currentChapter = parseInt(cMatch[1], 10);
      chapters[currentChapter] = [];
      currentVerse = null;
      continue;
    }

    const vMatch = line.match(/^\\v\s+(\d+)\s+(.*)$/);
    if (vMatch && currentChapter !== null) {
      currentVerse = {
        verse: parseInt(vMatch[1], 10),
        text: vMatch[2].trim(),
      };
      chapters[currentChapter].push(currentVerse);
      continue;
    }

    // Continuation lines (no backslash marker, part of current verse)
    if (currentVerse && line && !line.startsWith('\\')) {
      currentVerse.text += ' ' + line;
    }
  }

  // Write per-chapter JSON
  const bookDir = path.join(OUT_ROOT, slug);
  fs.mkdirSync(bookDir, { recursive: true });

  for (const [num, verses] of Object.entries(chapters)) {
    verses.forEach(v => v.text = v.text.replace(/\s+/g, ' ').trim());
    fs.writeFileSync(
      path.join(bookDir, `${num}.json`),
      JSON.stringify({ verses })
    );
  }

  console.log(`✅ ${bookCode} → ${slug} (${Object.keys(chapters).length} chapters)`);
  totalBooks++;
}

console.log(`\n📖 Converted ${totalBooks} books. Output: ${OUT_ROOT}`);