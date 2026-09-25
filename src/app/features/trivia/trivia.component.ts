import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface Question {
  id: string;
  question: string;
  options: string[];
  difficulty: string;
}

@Component({
  standalone: true,
  selector: 'app-trivia',
  imports: [CommonModule, FormsModule],
  templateUrl: './trivia.component.html',
  styleUrl: './trivia.scss',
})
export class TriviaComponent {
  private api = inject(ApiService);

  difficulty = signal<Difficulty>('EASY');
  questions = signal<Question[]>([]);
  loading = signal(true);
  error = signal('');

  completed = signal(false);
  passed = signal(false);
  previousScore = signal(0);

  // Quiz run state
  currentIndex = signal(0);
  selected = signal<number | null>(null);
  answers = signal<Array<{ questionId: string; selectedIndex: number }>>([]);
  finished = signal(false);
  score = signal(0);
  total = signal(0);
  submitting = signal(false);

  currentQuestion = computed(() => this.questions()[this.currentIndex()] ?? null);
  progressPct = computed(() => {
    const t = this.questions().length;
    if (!t) return 0;
    return Math.round(((this.currentIndex()) / t) * 100);
  });

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.reset();

    this.api.triviaToday(this.difficulty()).subscribe({
      next: (r) => {
        this.questions.set(r.questions ?? []);
        this.completed.set(r.completed);
        this.passed.set(r.passed);
        this.previousScore.set(r.score);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load today\'s trivia. Try again.');
        this.loading.set(false);
      },
    });
  }

  selectDifficulty(d: Difficulty) {
    if (this.difficulty() === d) return;
    this.difficulty.set(d);
    this.load();
  }

  reset() {
    this.currentIndex.set(0);
    this.selected.set(null);
    this.answers.set([]);
    this.finished.set(false);
    this.score.set(0);
    this.total.set(0);
    this.questions.set([]);
  }

  pickAnswer(idx: number) {
    if (this.selected() !== null || this.finished()) return;
    this.selected.set(idx);
  }

  next() {
    const q = this.currentQuestion();
    const s = this.selected();
    if (!q || s === null) return;

    this.answers.update((a) => [...a, { questionId: q.id, selectedIndex: s }]);
    this.selected.set(null);

    if (this.currentIndex() + 1 < this.questions().length) {
      this.currentIndex.update((i) => i + 1);
    } else {
      this.submit();
    }
  }

  submit() {
    this.submitting.set(true);
    this.api.triviaSubmit(this.difficulty(), this.answers()).subscribe({
      next: (r) => {
        this.score.set(r.score);
        this.total.set(r.total);
        this.passed.set(r.passed);
        this.completed.set(true);
        this.finished.set(true);
        this.submitting.set(false);
      },
      error: () => {
        this.error.set('Failed to submit. Try again.');
        this.submitting.set(false);
      },
    });
  }

  retake() {
    this.reset();
    this.load();
  }

  optionLetter(i: number): string {
    return ['A', 'B', 'C', 'D', 'E', 'F'][i] ?? '';
  }
}