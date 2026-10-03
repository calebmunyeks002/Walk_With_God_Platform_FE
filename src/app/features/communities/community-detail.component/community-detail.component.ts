import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Community, CommunityMemberView, CommunityJoinRequestView,
  Post, FeedFilter,
} from '../../../core/models/models';
import { PostCardComponent } from '../../community/components/post-card.component/post-card.component';

@Component({
  standalone: true,
  selector: 'app-community-detail',
  imports: [CommonModule, FormsModule, PostCardComponent],
  templateUrl: './community-detail.component.html',
  styleUrl: './community-detail.component.scss',
})
export class CommunityDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  community = signal<Community | null>(null);
  posts = signal<Post[]>([]);
  members = signal<CommunityMemberView[]>([]);
  requests = signal<CommunityJoinRequestView[]>([]);

  loading = signal(true);
  tab = signal<'feed' | 'members' | 'requests'>('feed');

  /* Composer */
  composerOpen = signal(false);
  content = '';
  scripture = '';
  publishing = signal(false);

  constructor() {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) { return; }

    this.api.community(slug).subscribe({
      next: (c) => {
        this.community.set(c);
        this.loadFeed(c.id);
        if (c.isMember) {
          this.loadMembers(c.id);
          if (this.canManage(c)) this.loadRequests(c.id);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /* ---------- Feed ---------- */

  private loadFeed(communityId: string) {
    this.api.postsByCommunity(communityId).subscribe({
      next: (r) => this.posts.set(r.content),
      error: () => this.posts.set([]),
    });
  }

  loadMembers(id: string) {
    this.api.communityMembers(id).subscribe({
      next: (m) => this.members.set(m),
    });
  }

  loadRequests(id: string) {
    this.api.communityJoinRequests(id).subscribe({
      next: (r) => this.requests.set(r),
    });
  }

  /* ---------- Composer ---------- */

  publish() {
    if (!this.content.trim() || this.publishing()) return;
    this.publishing.set(true);

    this.api.createPostFull({
      content: this.content.trim(),
      scriptureReference: this.scripture.trim() || undefined,
      communityId: this.community()!.id,
    }).subscribe({
      next: (p) => {
        this.posts.update((list) => [p, ...list]);
        this.content = '';
        this.scripture = '';
        this.composerOpen.set(false);
        this.publishing.set(false);
      },
      error: () => this.publishing.set(false),
    });
  }

  /* ---------- Join / leave ---------- */

  join() {
    const c = this.community();
    if (!c) return;
    this.api.joinCommunity(c.id).subscribe({
      next: (updated) => {
        this.community.set(updated);
        if (updated.isMember) this.loadMembers(updated.id);
      },
    });
  }

  leave() {
    const c = this.community();
    if (!c) return;
    if (!confirm(`Leave "${c.name}"?`)) return;
    this.api.leaveCommunity(c.id).subscribe({
      next: () => this.community.update((x) => x ? { ...x, isMember: false, myRole: null } : x),
    });
  }

  /* ---------- Requests ---------- */

  approve(req: CommunityJoinRequestView) {
    const c = this.community();
    if (!c) return;
    this.api.approveJoinRequest(c.id, req.id).subscribe({
      next: () => {
        this.requests.update((list) => list.filter((x) => x.id !== req.id));
        this.loadMembers(c.id);
      },
    });
  }

  reject(req: CommunityJoinRequestView) {
    const c = this.community();
    if (!c) return;
    this.api.rejectJoinRequest(c.id, req.id).subscribe({
      next: () => this.requests.update((list) => list.filter((x) => x.id !== req.id)),
    });
  }

  /* ---------- Permissions ---------- */

  canManage(c?: Community | null): boolean {
    const cc = c ?? this.community();
    if (!cc) return false;
    const me = this.auth.user();
    if (!me) return false;
    if (me.role === 'ADMIN') return true;
    return cc.myRole === 'OWNER' || cc.myRole === 'MODERATOR';
  }

  canPost(): boolean {
    return this.community()?.isMember === true;
  }

  canDeleteMember(m: CommunityMemberView): boolean {
    const cc = this.community();
    if (!cc) return false;
    const me = this.auth.user();
    if (!me) return false;
    if (m.userId === me.id) return false;
    if (m.role === 'OWNER') return false;
    return this.canManage(cc);
  }

  removeMember(m: CommunityMemberView) {
    const c = this.community();
    if (!c) return;
    if (!confirm(`Remove ${m.name} from ${c.name}?`)) return;
    this.api.removeCommunityMember(c.id, m.userId).subscribe({
      next: () => this.members.update((list) => list.filter((x) => x.userId !== m.userId)),
    });
  }
}