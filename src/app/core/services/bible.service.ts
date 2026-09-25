import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map, shareReplay } from 'rxjs';

const CDN = 'https://raw.githubusercontent.com/wldeh/bible-api/main';
export interface BibleVersion {
  id: string;
  identifier?: string;   // ← add this
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
  /** The API returns a flat array in some versions; normalize to this shape. */
  verses?: Array<{ verse: number | string; text: string }>;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class BibleService {
  private http = inject(HttpClient);

  /** In-memory cache: url → observable. */
  private cache = new Map<string, Observable<any>>();

  /* =========================================================
     Versions list
     ========================================================= */

  versions(): Observable<BibleVersion[]> {
    const url = `${CDN}/bibles/bibles.json`;
    return this.cached(url).pipe(
      map((list: any) => {
        if (Array.isArray(list)) return list as BibleVersion[];
        // Some mirrors wrap it in an object
        if (list?.bibles && Array.isArray(list.bibles)) return list.bibles as BibleVersion[];
        return [];
      })
    );
  }

  /* =========================================================
     Chapter (returns all verses in the chapter)
     ========================================================= */

  chapter(version: string, book: string, chapter: number): Observable<BibleChapterResponse> {
    const url = `${CDN}/bibles/${version}/books/${book}/chapters/${chapter}.json`;
    return this.cached(url);
  }

  /* =========================================================
     Single verse
     ========================================================= */

  verse(version: string, book: string, chapter: number, verse: number): Observable<BibleVerseResponse> {
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

    const obs$ = this.http.get(url).pipe(
      shareReplay(1)
    );

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