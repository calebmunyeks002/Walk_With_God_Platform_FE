import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

/* Primary CDN — English + most major languages. */
const CDN = 'https://raw.githubusercontent.com/wldeh/bible-api/main';

/**
 * Versions served from local assets instead of the CDN.
 * Key = version id in your catalog, value = path under /assets/.
 *
 * The Swahili Neno files live at:
 *   frontend/src/assets/bibles/swh-onen/<book-slug>/<chapter>.json
 * and were generated from the eBible.org swhonen USFM package.
 */
const LOCAL_VERSIONS: Record<string, string> = {
  'swh-onen': 'assets/bibles/swh-onen',
};

export interface BibleVersion {
  id: string;
  identifier?: string;
  name: string;
  language?: string;
  description?: string;
  [key: string]: any;
}

export interface BibleVerseResponse {
  translation?: { identifier?: string; name?: string; language?: string };
  book?: { id?: string; name?: string };
  chapter?: { id?: string; number?: string | number };
  verse?: { id?: string; number?: string | number };
  text: string;
  [key: string]: any;
}

export interface BibleChapterResponse {
  translation?: { identifier?: string; name?: string; language?: string };
  book?: { id?: string; name?: string };
  chapter?: {
    id?: string;
    number?: string | number;
    verses?: Array<{ verse: number | string; text: string }>;
  };
  verses?: Array<{ verse: number | string; text: string }>;
  data?: Array<{
    book?: string;
    chapter?: string | number;
    verse?: string | number;
    text?: string;
  }>;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class BibleService {
  private http = inject(HttpClient);

  /** In-memory cache: url → observable. */
  private cache = new Map<string, Observable<any>>();

  /* =========================================================
     Versions list — always from the primary CDN.
     (Our local Swahili entry is already declared in BIBLE_LANGUAGES.)
     ========================================================= */

  versions(): Observable<BibleVersion[]> {
    const url = `${CDN}/bibles/bibles.json`;
    return this.cached(url).pipe(
      map((list: any) => {
        if (Array.isArray(list)) return list as BibleVersion[];
        if (list?.bibles && Array.isArray(list.bibles)) {
          return list.bibles as BibleVersion[];
        }
        return [];
      })
    );
  }

  /* =========================================================
     Chapter — dual-source router (local assets OR wldeh CDN)
     ========================================================= */

  chapter(
    version: string,
    book: string,
    chapter: number
  ): Observable<BibleChapterResponse> {
    // --- Local asset path (Swahili Neno, etc.) ---
    const localBase = LOCAL_VERSIONS[version];
    if (localBase) {
      const url = `${localBase}/${book}/${chapter}.json`;
      return this.cached(url).pipe(
        map((res: any) => this.normalizeLocal(res, version, book, chapter))
      );
    }

    // --- Primary wldeh CDN (English, Spanish, French, …) ---
    const url = `${CDN}/bibles/${version}/books/${book}/chapters/${chapter}.json`;
    return this.cached(url).pipe(
      map((res: any) => this.filterToChapter(res, chapter))
    );
  }

  /* =========================================================
     Local-asset adapter
     ========================================================= */

  /**
   * Local JSON files use a minimal shape:
   *
   *   { "verses": [ { "verse": 1, "text": "Hapo mwanzo…" }, … ] }
   *
   * BibleComponent.normalizeVerses() already reads `res.verses`
   * as a fallback, so we just wrap the payload in the
   * BibleChapterResponse envelope with correct book/chapter metadata.
   */
  private normalizeLocal(
    res: any,
    version: string,
    book: string,
    chapterNum: number
  ): BibleChapterResponse {
    const rawVerses = Array.isArray(res?.verses) ? res.verses : [];

    const verses = rawVerses
      .map((v: any) => ({
        verse: parseInt(String(v.verse ?? v.number), 10),
        text: String(v.text ?? '').trim(),
      }))
      .filter((v: any) => !isNaN(v.verse) && v.text.length > 0);

    return {
      translation: { identifier: version },
      book: { id: book },
      chapter: { number: chapterNum, verses },
      verses,
    };
  }

  /* =========================================================
     wldeh CDN — dedupe doubled verse lists
     ========================================================= */

  /**
   * The wldeh CDN sometimes returns a doubled verse list — the same
   * chapter twice, back-to-back, with verse numbers restarting at 1.
   * Trim to the first complete sequence of verses 1, 2, 3… up to the
   * point where verse 1 appears again.
   *
   * Also strips stray footnote-marker rows by only keeping verses
   * that match the expected incremental number.
   */
  private filterToChapter(res: any, requestedChapter: number): any {
    const arr: any[] | undefined =
      res?.data ?? res?.verses ?? res?.chapter?.verses;
    if (!Array.isArray(arr)) return res;

    // First filter by chapter field if it exists
    const byChapter = arr.filter(
      (v: any) =>
        v.chapter === undefined ||
        String(v.chapter) === String(requestedChapter)
    );

    // Then cut off at the first repeated verse 1
    const cleaned: any[] = [];
    let expectedVerse = 1;
    let seenFirstVerse = false;

    for (const v of byChapter) {
      const num = parseInt(String(v.verse ?? v.number), 10);
      if (isNaN(num)) continue;

      if (num === 1) {
        if (seenFirstVerse) break; // second chapter 1 starts → stop
        seenFirstVerse = true;
      }

      if (num === expectedVerse) {
        cleaned.push(v);
        expectedVerse++;
      }
      // If num != expectedVerse we silently skip — protects against
      // stray rows like inline footnote markers.
    }

    // Write the cleaned array back into whichever slot existed
    if (Array.isArray(res?.data)) res.data = cleaned;
    else if (Array.isArray(res?.verses)) res.verses = cleaned;
    else if (Array.isArray(res?.chapter?.verses)) res.chapter.verses = cleaned;

    return res;
  }

  /* =========================================================
     Single verse
     ========================================================= */

  verse(
    version: string,
    book: string,
    chapter: number,
    verse: number
  ): Observable<BibleVerseResponse> {
    // --- Local versions: slice the verse out of the chapter payload ---
    if (LOCAL_VERSIONS[version]) {
      return this.chapter(version, book, chapter).pipe(
        map((ch) => {
          const found = (ch.verses ?? []).find(
            (v) => Number(v.verse) === verse
          );
          if (!found) {
            throw {
              status: 404,
              message: `Verse ${verse} not found in ${book} ${chapter}`,
            };
          }
          return {
            translation: ch.translation,
            book: ch.book,
            chapter: { number: chapter },
            verse: { number: verse },
            text: found.text,
          } as BibleVerseResponse;
        })
      );
    }

    // --- Primary wldeh CDN ---
    const url = `${CDN}/bibles/${version}/books/${book}/chapters/${chapter}/verses/${verse}.json`;
    return this.cached(url);
  }

  /* =========================================================
     Cache helper — 15-minute memoization
     ========================================================= */

  private cacheTtl = 15 * 60 * 1000;
  private cacheExpiry = new Map<string, number>();

  private cached(url: string): Observable<any> {
    const now = Date.now();
    const expiry = this.cacheExpiry.get(url) ?? 0;

    if (this.cache.has(url) && expiry > now) {
      return this.cache.get(url)!;
    }

    const obs$ = this.http.get(url).pipe(shareReplay(1));

    this.cache.set(url, obs$);
    this.cacheExpiry.set(url, now + this.cacheTtl);
    return obs$;
  }

  /** Clear the whole cache (rarely needed). */
  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}