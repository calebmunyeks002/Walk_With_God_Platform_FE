import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BibleService } from '../../core/services/bible.service';
import { ApiService } from '../../core/services/api.service';
import { BIBLE_BOOKS, BibleBook, bookName } from '../../core/data/bible-books';
import {
  BIBLE_LANGUAGES,
  BibleLanguage,
  BibleVersionOption,
  findLanguageForVersion,
} from '../../core/data/bible-versions';

interface DisplayVerse {
  number: number;
  text: string;
  highlightId?: string;
  highlightColor?: string;
}

@Component({
  standalone: true,
  selector: 'app-bible',
  imports: [CommonModule, FormsModule],
  templateUrl: './bible.component.html',
  styleUrl: './bible.scss',
})
export class BibleComponent {
  private bible = inject(BibleService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  books = BIBLE_BOOKS;
  languages: BibleLanguage[] = BIBLE_LANGUAGES;

  // Selection state
  languageCode = signal('en');
  versionId = signal('en-kjv');
  bookId = signal('genesis');
  chapterNum = signal(1);

  verses = signal<DisplayVerse[]>([]);
  loading = signal(false);
  error = signal('');

  // Reading + highlight state
  chapterRead = signal(false);
  readBusy = signal(false);
  highlightBusy = signal<number | null>(null);
  highlightMenuVerse = signal<number | null>(null);
  readonly highlightColors = [
    { key: 'yellow', label: 'Yellow', hex: '#fef3c7' },
    { key: 'green',  label: 'Green',  hex: '#d1fae5' },
    { key: 'blue',   label: 'Blue',   hex: '#dbeafe' },
    { key: 'pink',   label: 'Pink',   hex: '#fce7f3' },
    { key: 'purple', label: 'Purple', hex: '#ede9fe' },
  ];

  /** Versions available for the currently selected language. */
  availableVersions = computed<BibleVersionOption[]>(() => {
    const lang = this.languages.find((l) => l.code === this.languageCode());
    return lang?.versions ?? [];
  });

  currentBook = computed(
    () => this.books.find((b) => b.id === this.bookId()) ?? this.books[0]
  );

  /**
   * Localized display name for the current book.
   * Falls back to the English name when the active language has no override.
   */
  currentBookName = computed(() =>
    bookName(this.currentBook(), this.languageCode())
  );

  totalChapters = computed(() => this.currentBook().chapters);
  chapterNumbers = computed(() =>
    Array.from({ length: this.totalChapters() }, (_, i) => i + 1)
  );
  otBooks = this.books.filter((b) => b.testament === 'OT');
  ntBooks = this.books.filter((b) => b.testament === 'NT');

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const book = params.get('book');
      const chapter = params.get('chapter');
      const version = params.get('version');
      const lang = params.get('lang');

      if (book && this.books.some((b) => b.id === book)) this.bookId.set(book);
      if (chapter && !isNaN(+chapter)) this.chapterNum.set(+chapter);

      if (version) {
        this.versionId.set(version);
        const detectedLang = findLanguageForVersion(version);
        if (detectedLang) this.languageCode.set(detectedLang.code);
      } else if (lang && this.languages.some((l) => l.code === lang)) {
        this.languageCode.set(lang);
        const first = this.availableVersions()[0];
        if (first) this.versionId.set(first.id);
      }
    });

    effect(() => {
      this.loadChapter();
    });
  }

  /* =========================================================
     Language / version changes
     ========================================================= */

  onLanguageChange(code: string) {
    this.languageCode.set(code);
    const first = this.availableVersions()[0];
    if (first) {
      this.versionId.set(first.id);
      // The effect() above will trigger loadChapter when versionId changes
    }
  }

  onVersionChange(id: string) {
    this.versionId.set(id);
  }

  /* =========================================================
     Load chapter + annotations
     ========================================================= */

  loadChapter() {
    const version = this.versionId();
    const book = this.bookId();
    const chapter = this.chapterNum();
    const lang = this.languageCode();

    this.loading.set(true);
    this.error.set('');
    this.verses.set([]);
    this.chapterRead.set(false);

    this.bible.chapter(version, book, chapter).subscribe({
      next: (res) => {
        const normalized = this.normalizeVerses(res);
        this.verses.set(normalized);
        this.loading.set(false);

        this.loadAnnotations(version, book, chapter);

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { book, chapter, version, lang },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      },
      error: (e) => {
        this.error.set(
          e?.status === 404
            ? `This chapter isn't available in "${version}". Try a different translation.`
            : 'Could not load this chapter. Check your connection and try again.'
        );
        this.loading.set(false);
      },
    });
  }

  private loadAnnotations(version: string, book: string, chapter: number) {
    this.api.readStatus(book, chapter).subscribe({
      next: (r) => this.chapterRead.set(r.read),
      error: () => {},
    });

    this.api.chapterHighlights(version, book, chapter).subscribe({
      next: (list) => {
        const byVerse = new Map<number, { id: string; color: string }>();
        list.forEach((h) => byVerse.set(h.verse, { id: h.id, color: h.color }));

        this.verses.update((vs) =>
          vs.map((v) => ({
            ...v,
            highlightId: byVerse.get(v.number)?.id,
            highlightColor: byVerse.get(v.number)?.color,
          }))
        );
      },
      error: () => {},
    });
  }

  private normalizeVerses(res: any): DisplayVerse[] {
    const arr: any[] | undefined =
      res?.data ?? res?.verses ?? res?.chapter?.verses;

    if (Array.isArray(arr)) {
      const cleaned: any[] = [];
      let expected = 1;
      let seenFirst = false;

      for (const v of arr) {
        const num = parseInt(String(v.verse ?? v.number), 10);
        if (isNaN(num)) continue;

        // Guard: stop when verse 1 repeats (duplicated chapter in the JSON)
        if (num === 1) {
          if (seenFirst) break;
          seenFirst = true;
        }

        if (num === expected) {
          cleaned.push({
            number: num,
            text: String(v.text ?? '').trim(),
          });
          expected++;
        }
      }
      return cleaned;
    }

    if (res?.text) {
      return [{
        number: parseInt(String(res?.verse?.number ?? res?.verse ?? 1), 10),
        text: String(res.text).trim(),
      }];
    }

    return [];
  }

  /* =========================================================
     Read tracking
     ========================================================= */

  toggleChapterRead() {
    if (this.readBusy()) return;
    const version = this.versionId();
    const book = this.bookId();
    const chapter = this.chapterNum();

    this.readBusy.set(true);

    if (this.chapterRead()) {
      this.api.unmarkChapterRead(book, chapter).subscribe({
        next: () => {
          this.chapterRead.set(false);
          this.readBusy.set(false);
        },
        error: () => this.readBusy.set(false),
      });
    } else {
      this.api.markChapterRead(version, book, chapter).subscribe({
        next: () => {
          this.chapterRead.set(true);
          this.readBusy.set(false);
        },
        error: () => this.readBusy.set(false),
      });
    }
  }

  /* =========================================================
     Highlights
     ========================================================= */

  openHighlightMenu(verseNum: number) {
    this.highlightMenuVerse.update((c) => (c === verseNum ? null : verseNum));
  }

  applyHighlight(verseNum: number, color: string) {
    const existing = this.verses().find((v) => v.number === verseNum);
    if (existing?.highlightId && existing.highlightColor === color) {
      this.removeHighlight(verseNum);
      return;
    }

    this.highlightBusy.set(verseNum);
    this.api
      .saveHighlight({
        version: this.versionId(),
        book: this.bookId(),
        chapter: this.chapterNum(),
        verse: verseNum,
        color,
      })
      .subscribe({
        next: (saved) => {
          this.verses.update((vs) =>
            vs.map((v) =>
              v.number === verseNum
                ? { ...v, highlightId: saved.id, highlightColor: saved.color }
                : v
            )
          );
          this.highlightBusy.set(null);
          this.highlightMenuVerse.set(null);
        },
        error: () => this.highlightBusy.set(null),
      });
  }

  removeHighlight(verseNum: number) {
    const v = this.verses().find((x) => x.number === verseNum);
    if (!v?.highlightId) return;

    this.highlightBusy.set(verseNum);
    this.api.deleteHighlight(v.highlightId).subscribe({
      next: () => {
        this.verses.update((vs) =>
          vs.map((x) =>
            x.number === verseNum
              ? { ...x, highlightId: undefined, highlightColor: undefined }
              : x
          )
        );
        this.highlightBusy.set(null);
        this.highlightMenuVerse.set(null);
      },
      error: () => this.highlightBusy.set(null),
    });
  }

  colorHex(color?: string): string | null {
    if (!color) return null;
    return this.highlightColors.find((c) => c.key === color)?.hex ?? null;
  }

  /* =========================================================
     Navigation
     ========================================================= */

  prevChapter() {
    const n = this.chapterNum();
    if (n > 1) {
      this.chapterNum.set(n - 1);
      this.scrollToTop();
    } else {
      const idx = this.books.findIndex((b) => b.id === this.bookId());
      if (idx > 0) {
        const prev = this.books[idx - 1];
        this.bookId.set(prev.id);
        this.chapterNum.set(prev.chapters);
        this.scrollToTop();
      }
    }
  }

  nextChapter() {
    const n = this.chapterNum();
    if (n < this.totalChapters()) {
      this.chapterNum.set(n + 1);
      this.scrollToTop();
    } else {
      const idx = this.books.findIndex((b) => b.id === this.bookId());
      if (idx < this.books.length - 1) {
        const next = this.books[idx + 1];
        this.bookId.set(next.id);
        this.chapterNum.set(1);
        this.scrollToTop();
      }
    }
  }

  goToChapter(n: number) {
    this.chapterNum.set(n);
  }

  onBookChange(id: string) {
    this.bookId.set(id);
    this.chapterNum.set(1);
  }

  private scrollToTop() {
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);
  }

  /* =========================================================
     Helpers
     ========================================================= */

  /** Display helper for the book <select> dropdown. */
  displayBookName(book: BibleBook): string {
    return bookName(book, this.languageCode());
  }

  /** e.g. "Mwanzo 1" in Swahili, "Genesis 1" in English. */
  currentReference(): string {
    return `${this.currentBookName()} ${this.chapterNum()}`;
  }

  isPrevDisabled(): boolean {
    const first = this.books[0];
    return this.bookId() === first.id && this.chapterNum() === 1;
  }

  isNextDisabled(): boolean {
    const last = this.books[this.books.length - 1];
    return this.bookId() === last.id && this.chapterNum() === last.chapters;
  }

  async copyChapter() {
    const text = this.verses().map((v) => `${v.number}. ${v.text}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(
        `${this.currentBookName()} ${this.chapterNum()}\n\n${text}`
      );
    } catch {}
  }
}