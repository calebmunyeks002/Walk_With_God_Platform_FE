import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Community, CommunityMode, CommunityVisibility } from '../../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-communities',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './communities.component.html',
  styleUrl: './communities.component.scss',
})
export class CommunitiesComponent {
  api = inject(ApiService);
  auth = inject(AuthService);

  communities = signal<Community[]>([]);
  loading = signal(false);
  mode = signal<CommunityMode>('discover');

  /* Create modal */
  creating = signal(false);
  saving = signal(false);
  error = signal('');

  newName = '';
  newDescription = '';
  newIcon = '🏛';
  newVisibility: CommunityVisibility = 'PUBLIC';

  readonly emojiChoices = ['🏛', '🙏', '📖', '🎓', '❤️', '🔥', '🌱', '🎵', '☕', '👨‍👩‍👧'];

  constructor() { this.load(); }

  canCreate(): boolean {
    const r = this.auth.user()?.role;
    return r === 'ADMIN' || r === 'MENTOR';
  }

  load() {
    this.loading.set(true);
    this.api.communities(this.mode()).subscribe({
      next: (r) => { this.communities.set(r.content); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setMode(m: CommunityMode) {
    if (this.mode() === m) return;
    this.mode.set(m);
    this.load();
  }

  /* ----- Create ----- */

  openCreate() {
    this.creating.set(true);
    this.error.set('');
    this.newName = '';
    this.newDescription = '';
    this.newIcon = '🏛';
    this.newVisibility = 'PUBLIC';
  }

  closeCreate() { this.creating.set(false); }

  save() {
    const name = this.newName.trim();
    if (name.length < 3) { this.error.set('Name must be at least 3 characters'); return; }

    this.saving.set(true);
    this.error.set('');

    this.api.createCommunity({
      name,
      description: this.newDescription.trim() || undefined,
      iconEmoji: this.newIcon,
      visibility: this.newVisibility,
    }).subscribe({
      next: (c) => {
        this.communities.update((list) => [c, ...list]);
        this.creating.set(false);
        this.saving.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.message ?? 'Could not create community');
        this.saving.set(false);
      },
    });
  }

  /* ----- Join / leave ----- */

  join(c: Community) {
    this.api.joinCommunity(c.id).subscribe({
      next: (updated) => this.replace(updated),
    });
  }

  leave(c: Community) {
    if (!confirm(`Leave "${c.name}"?`)) return;
    this.api.leaveCommunity(c.id).subscribe({
      next: () => {
        this.communities.update((list) =>
          list.map((x) => x.id === c.id
            ? { ...x, isMember: false, myRole: null, memberCount: x.memberCount - 1 }
            : x)
        );
      },
    });
  }

  private replace(updated: Community) {
    this.communities.update((list) =>
      list.map((x) => (x.id === updated.id ? updated : x))
    );
  }
}