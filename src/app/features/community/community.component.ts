import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Post, FeedFilter, PostType, Media } from '../../core/models/models';
import { PostCardComponent } from './components/post-card.component/post-card.component';
import { ShareModalComponent } from './components/share-modal.component/share-modal.component';
import { MediaUploaderComponent } from './components/media-uploader.component/media-uploader.component';

@Component({
  standalone: true,
  selector: 'app-community',
  imports: [
    CommonModule,
    FormsModule,
    PostCardComponent,
    ShareModalComponent,
    MediaUploaderComponent,
  ],
  templateUrl: './community.component.html',
  styleUrl: './community.scss',
})
export class CommunityComponent {
  api = inject(ApiService);
  auth = inject(AuthService);

  posts = signal<Post[]>([]);
  loading = signal(false);
  filter = signal<FeedFilter>('ALL');

  /* Composer state */
  composerOpen = signal(false);
  content = '';
  scripture = '';
  postType = signal<PostType>('NORMAL');
  publishing = signal(false);

  /* Batch 3 — media */
  selectedMedia = signal<Media | null>(null);

  /* Share modal */
  shareTarget = signal<Post | null>(null);

  readonly filters: { key: FeedFilter; label: string; icon: string }[] = [
    { key: 'ALL',       label: 'All',       icon: '🌍' },
    { key: 'FOLLOWING', label: 'Following', icon: '👥' },
    { key: 'MENTORS',   label: 'Mentors',   icon: '🎓' },
    { key: 'MY_COMMUNITIES', label: 'My Communities', icon: '🏛' },
    { key: 'PRAYER',    label: 'Prayer',    icon: '🙏' },
  ];

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.postsFiltered(this.filter()).subscribe({
      next: (r) => {
        this.posts.set(r.content);
        this.loading.set(false);
      },
      error: () => {
        this.posts.set([]);
        this.loading.set(false);
      },
    });
  }

  setFilter(f: FeedFilter) {
    if (this.filter() === f) return;
    this.filter.set(f);
    this.load();
  }

  publish() {
    const hasText = this.content.trim().length > 0;
    const hasMedia = this.selectedMedia() !== null;
    if ((!hasText && !hasMedia) || this.publishing()) return;

    this.publishing.set(true);

    this.api
      .createPostFull({
        content: this.content.trim(),
        scriptureReference: this.scripture.trim() || undefined,
        type: this.postType(),
        mediaId: this.selectedMedia()?.id,
      })
      .subscribe({
        next: (p) => {
          this.posts.update((x) => [p, ...x]);
          this.resetComposer();
          this.composerOpen.set(false);
          this.publishing.set(false);
        },
        error: () => this.publishing.set(false),
      });
  }

  private resetComposer() {
    this.content = '';
    this.scripture = '';
    this.postType.set('NORMAL');
    this.selectedMedia.set(null);
  }

  /* ----- Media uploader events ----- */

  onMediaUploaded(m: Media) {
    this.selectedMedia.set(m);
  }

  onMediaCleared() {
    this.selectedMedia.set(null);
  }

  /* ----- Post card events ----- */

  onPostUpdated(updated: Post) {
    this.posts.update((list) =>
      list.map((p) => (p.id === updated.id ? updated : p))
    );
  }

  onPostDeleted(id: string) {
    this.posts.update((list) => list.filter((p) => p.id !== id));
  }

  onShareRequested(post: Post) {
    this.shareTarget.set(post);
  }

  onShared(newPost: Post) {
    this.posts.update((x) => [newPost, ...x]);
    this.shareTarget.set(null);
  }

  toggleComposer() {
    this.composerOpen.update((v) => !v);
  }
}