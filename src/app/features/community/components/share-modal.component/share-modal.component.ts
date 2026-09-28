import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { Post } from '../../../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-share-modal',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="overlay" (click)="close.emit()"></div>
    <div class="modal">
      <header>
        <h3>Share Post</h3>
        <button class="x" (click)="close.emit()">✕</button>
      </header>

      <div class="origin">
        <strong>{{ post.author.name }}</strong>
        <p>{{ post.content }}</p>
      </div>

      @if (mode() === 'repost') {
        <textarea
          [(ngModel)]="caption"
          placeholder="Add a comment (optional)…"
          rows="3"
          maxlength="5000"></textarea>
      }

      <div class="actions">
        @if (mode() === 'repost') {
          <button class="btn ghost" (click)="mode.set('link')">Copy link instead</button>
          <button class="btn primary" [disabled]="busy()" (click)="doRepost()">
            {{ busy() ? 'Sharing…' : 'Share to feed' }}
          </button>
        } @else {
          <button class="btn ghost" (click)="mode.set('repost')">Share to feed instead</button>
          <button class="btn primary" (click)="doCopy()">
            {{ copied() ? '✓ Copied' : 'Copy link' }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; background: rgba(20, 10, 30, .45);
      z-index: 100; backdrop-filter: blur(2px);
    }
    .modal {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: min(520px, 92vw); background: #fff; border-radius: 16px;
      padding: 22px; z-index: 101;
      box-shadow: 0 20px 60px rgba(54, 22, 78, .35);
      display: flex; flex-direction: column; gap: 12px;
    }
    header { display: flex; justify-content: space-between; align-items: center; }
    h3 { margin: 0; font: 700 18px Georgia, serif; color: #2a1740; }
    .x { border: 0; background: transparent; font-size: 16px; cursor: pointer; color: #8c8295; }
    .origin {
      background: #faf8fc; border-radius: 10px; padding: 12px;
      border-left: 3px solid #d8c5f0;
    }
    .origin strong { font-size: 13px; color: #2a1740; }
    .origin p { margin: 6px 0 0; font-size: 13px; color: #3b2a52; line-height: 1.4; }
    textarea {
      border: 1px solid #e2d9ec; border-radius: 10px; padding: 10px 12px;
      font: 14px/1.5 inherit; resize: vertical; outline: none;
    }
    textarea:focus { border-color: #8a31cf; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .btn {
      height: 40px; padding: 0 18px; border-radius: 10px; border: 0;
      font-weight: 800; font-size: 13px; cursor: pointer;
    }
    .btn.ghost { background: #f3eafb; color: #6d22a4; }
    .btn.primary { background: linear-gradient(90deg, #8a31cf, #4e177e); color: #fff; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class ShareModalComponent {
  @Input({ required: true }) post!: Post;
  @Output() close = new EventEmitter<void>();
  @Output() shared = new EventEmitter<Post>();

  private api = inject(ApiService);

  mode = signal<'repost' | 'link'>('repost');
  caption = '';
  busy = signal(false);
  copied = signal(false);

  doRepost() {
    this.busy.set(true);
    this.api.sharePost(this.post.id, this.caption.trim() || undefined).subscribe({
      next: (p) => {
        this.shared.emit(p);
        this.busy.set(false);
      },
      error: () => this.busy.set(false),
    });
  }

  async doCopy() {
    const url = `${window.location.origin}/community?post=${this.post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.close.emit(), 900);
    } catch {
      alert('Could not copy link');
    }
  }
}