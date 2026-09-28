import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MediaService } from '../../../../core/services/media.service';
import { Post, ReactionType, Comment } from '../../../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-post-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  @Input({ required: true }) post!: Post;
  @Output() updated = new EventEmitter<Post>();
  @Output() deleted = new EventEmitter<string>();
  @Output() shareRequested = new EventEmitter<Post>();

  private api = inject(ApiService);
  private mediaApi = inject(MediaService);
  auth = inject(AuthService);

  commentsOpen = signal(false);
  comments = signal<Comment[]>([]);
  newComment = '';
  commentsLoading = signal(false);
  reacting = signal(false);
  commentPosting = signal(false);

  readonly reactions: { type: ReactionType; emoji: string; label: string }[] = [
    { type: 'LIKE', emoji: '👍', label: 'Like' },
    { type: 'LOVE', emoji: '❤️', label: 'Love' },
    { type: 'AMEN', emoji: '🙌', label: 'Amen' },
    { type: 'PRAY', emoji: '🙏', label: 'Pray' },
  ];

  /* ---------- Batch 3 — media URL helper ---------- */

  mediaUrl(mediaId?: string | null): string {
    return mediaId ? this.mediaApi.rawUrl(mediaId) : '';
  }

  /* ---------- Reactions ---------- */

  react(type: ReactionType) {
    if (this.reacting()) return;
    this.reacting.set(true);

    this.api.reactToPost(this.post.id, type).subscribe({
      next: (breakdown) => {
        // Clicking the same emoji un-reacts; otherwise replace.
        const mine = this.post.myReaction === type ? null : type;
        const updated: Post = {
          ...this.post,
          reactionBreakdown: breakdown,
          myReaction: mine,
        };
        this.post = updated;
        this.updated.emit(updated);
        this.reacting.set(false);
      },
      error: () => this.reacting.set(false),
    });
  }

  /* ---------- Comments ---------- */

  toggleComments() {
    this.commentsOpen.update((v) => !v);
    if (this.commentsOpen() && this.comments().length === 0) {
      this.loadComments();
    }
  }

  loadComments() {
    this.commentsLoading.set(true);
    this.api.postComments(this.post.id).subscribe({
      next: (list) => {
        this.comments.set(list);
        this.commentsLoading.set(false);
      },
      error: () => this.commentsLoading.set(false),
    });
  }

  postComment() {
    const text = this.newComment.trim();
    if (!text || this.commentPosting()) return;
    this.commentPosting.set(true);

    this.api.addComment(this.post.id, text).subscribe({
      next: (c) => {
        this.comments.update((list) => [...list, c]);
        this.newComment = '';
        const updated: Post = { ...this.post, comments: this.post.comments + 1 };
        this.post = updated;
        this.updated.emit(updated);
        this.commentPosting.set(false);
      },
      error: () => this.commentPosting.set(false),
    });
  }

  deleteComment(c: Comment) {
    this.api.deleteComment(this.post.id, c.id).subscribe({
      next: () => {
        this.comments.update((list) => list.filter((x) => x.id !== c.id));
        const updated: Post = {
          ...this.post,
          comments: Math.max(0, this.post.comments - 1),
        };
        this.post = updated;
        this.updated.emit(updated);
      },
    });
  }

  canDeleteComment(c: Comment): boolean {
    const me = this.auth.user();
    if (!me) return false;
    return me.id === c.author.id || me.role === 'ADMIN';
  }

  /* ---------- Share / delete ---------- */

  share() {
    this.shareRequested.emit(this.post);
  }

  deletePost() {
    if (!confirm('Delete this post?')) return;
    this.api.deletePost(this.post.id).subscribe({
      next: () => this.deleted.emit(this.post.id),
    });
  }

  canDeletePost(): boolean {
    const me = this.auth.user();
    if (!me) return false;
    return me.id === this.post.author.id || me.role === 'ADMIN';
  }

  /* ---------- Helpers ---------- */

  isOwner(): boolean {
    return this.auth.user()?.id === this.post.author.id;
  }

  reactionEmoji(type?: ReactionType | null): string {
    if (!type) return '';
    return this.reactions.find((r) => r.type === type)?.emoji ?? '';
  }

  /** Initial letter of the author's name, uppercased — for avatar fallbacks. */
  initialOf(name: string | undefined | null): string {
    return (name?.charAt(0) ?? '?').toUpperCase();
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
  }
}