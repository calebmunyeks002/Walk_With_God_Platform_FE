import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BibleService } from '../../core/services/bible.service';
import { ApiService } from '../../core/services/api.service';
import { BIBLE_BOOKS } from '../../core/data/bible-books';

interface DisplayVerse {
  number: number;
  text: string;
  highlightId?: string;
  highlightColor?: string;
}

interface VersionOption {
  id: string;
  label: string;
}

const CURATED_ENGLISH_VERSIONS: VersionOption[] = [
  { id: 'en-kjv', label: 'King James Version (KJV)' },
  { id: 'en-asv', label: 'American Standard Version (ASV)' },
  { id: 'en-web', label: 'World English Bible (WEB)' },
  { id: 'en-bbe', label: 'Bible in Basic English (BBE)' },
  { id: 'en-dby', label: 'Darby Bible (DBY)' },
  { id: 'en-ylt', label: "Young's Literal Translation (YLT)" },
];

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

  // Default: Genesis 1 in KJV
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

  versions = signal<VersionOption[]>([...CURATED_ENGLISH_VERSIONS]);

  currentBook = computed(() =>
    this.books.find((b) => b.id === this.bookId()) ?? this.books[0]
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
      if (book && this.books.some((b) => b.id === book)) this.bookId.set(book);
      if (chapter && !isNaN(+chapter)) this.chapterNum.set(+chapter);
      if (version) this.versionId.set(version);
    });

    effect(() => {
      this.loadChapter();
    });

    // Load curated versions from API in background
    this.bible.versions().subscribe({
      next: (list) => {
        if (!list || list.length === 0) return;
        const allowed = CURATED_ENGLISH_VERSIONS.map((v) => v.id);
        const available: VersionOption[] = list
          .map((v) => ({
            id: String(v.id ?? v['identifier'] ?? ''),
            label: String(
              (v as any).version ?? v['name'] ?? v.id ?? v['identifier'] ?? ''
            ),
          }))
          .filter((v) => v.id && allowed.includes(v.id));
        available.sort((a, b) => allowed.indexOf(a.id) - allowed.indexOf(b.id));
        if (available.length > 0) {
          this.versions.set(available);
          if (!available.some((v) => v.id === this.versionId())) {
            this.versionId.set(available[0].id);
          }
        }
      },
      error: () => {},
    });
  }

  /* =========================================================
     Load chapter + annotations
     ========================================================= */

  loadChapter() {
    const version = this.versionId();
    const book = this.bookId();
    const chapter = this.chapterNum();

    this.loading.set(true);
    this.error.set('');
    this.verses.set([]);
    this.chapterRead.set(false);

    // Fetch chapter, read status, and highlights in parallel
    this.bible.chapter(version, book, chapter).subscribe({
      next: (res) => {
        const normalized = this.normalizeVerses(res);
        this.verses.set(normalized);
        this.loading.set(false);

        // Now fetch highlights + read status
        this.loadAnnotations(version, book, chapter);

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { book, chapter, version },
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
    // Read status
    this.api.readStatus(book, chapter).subscribe({
      next: (r) => this.chapterRead.set(r.read),
      error: () => {},
    });

    // Highlights — merge into verses
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
    if (Array.isArray(res?.data)) {
      return res.data.map((v: any) => ({
        number: parseInt(String(v.verse ?? 0), 10),
        text: String(v.text ?? '').trim(),
      }));
    }
    if (Array.isArray(res?.verses)) {
      return res.verses.map((v: any) => ({
        number: parseInt(String(v.verse ?? v.number ?? 0), 10),
        text: String(v.text ?? '').trim(),
      }));
    }
    if (Array.isArray(res?.chapter?.verses)) {
      return res.chapter.verses.map((v: any) => ({
        number: parseInt(String(v.verse ?? v.number ?? 0), 10),
        text: String(v.text ?? '').trim(),
      }));
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
    if (existing?.highlightId) {
      // Same color → remove
      if (existing.highlightColor === color) {
        this.removeHighlight(verseNum);
        return;
      }
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

  currentReference(): string {
    return `${this.currentBook().name} ${this.chapterNum()}`;
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
        `${this.currentBook().name} ${this.chapterNum()}\n\n${text}`
      );
    } catch {}
  }
}