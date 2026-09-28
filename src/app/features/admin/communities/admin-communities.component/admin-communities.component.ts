import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { AdminCommunity } from '../../../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-admin-communities',
  imports: [CommonModule],
  template: `
    <section class="page-head">
      <div>
        <span class="eyebrow">ADMIN</span>
        <h1>Communities</h1>
        <p>Hide or restore any community.</p>
      </div>
    </section>

    <nav class="tabs">
      <button class="tab" [class.active]="filter() === 'all'"    (click)="setFilter('all')">All</button>
      <button class="tab" [class.active]="filter() === 'visible'"(click)="setFilter('visible')">Visible</button>
      <button class="tab" [class.active]="filter() === 'hidden'" (click)="setFilter('hidden')">Hidden</button>
    </nav>

    @if (loading()) {
      <div class="state">Loading…</div>
    } @else if (items().length === 0) {
      <div class="state">Nothing here.</div>
    } @else {
      <table class="table">
        <thead>
          <tr>
            <th>Icon</th><th>Name</th><th>Visibility</th>
            <th>Members</th><th>Posts</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (c of items(); track c.id) {
            <tr [class.hidden]="c.hidden">
              <td class="icon">{{ c.iconEmoji }}</td>
              <td>
                <strong>{{ c.name }}</strong>
                <small>{{ c.slug }}</small>
              </td>
              <td>{{ c.visibility }}</td>
              <td>{{ c.memberCount }}</td>
              <td>{{ c.postCount }}</td>
              <td>
                <span class="badge" [class.hidden]="c.hidden">
                  {{ c.hidden ? 'Hidden' : 'Visible' }}
                </span>
              </td>
              <td>
                @if (c.hidden) {
                  <button class="btn approve" (click)="restore(c)">Restore</button>
                } @else {
                  <button class="btn reject" (click)="hide(c)">Hide</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    .page-head { margin-bottom: 20px; }
    .eyebrow { font-size: 10px; letter-spacing: 2px; font-weight: 800; color: #8b42c9; }
    h1 { font: 700 26px Georgia, serif; margin: 6px 0; color: #2a1740; }
    p { margin: 0; color: #7b7188; font-size: 14px; }
    .tabs { display: flex; gap: 6px; margin-bottom: 16px; }
    .tab { height: 36px; padding: 0 16px; border-radius: 9px; border: 1px solid #e2d9ec;
           background: #fff; color: #6b5c7a; font-weight: 700; font-size: 12px; cursor: pointer; }
    .tab.active { background: linear-gradient(90deg, #8a31cf, #4e177e); color: #fff; border-color: transparent; }
    .state { text-align: center; padding: 40px; color: #8c8295; }
    .table { width: 100%; border-collapse: collapse; background: #fff;
             border: 1px solid #eee6f4; border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px 14px; text-align: left; font-size: 13px; border-bottom: 1px solid #f0ebf4; }
    th { background: #faf8fc; font-weight: 800; color: #6d22a4; font-size: 11px; letter-spacing: .5px; text-transform: uppercase; }
    .icon { font-size: 22px; text-align: center; }
    td strong { display: block; color: #2a1740; }
    td small  { display: block; color: #8c8295; font-size: 11px; margin-top: 2px; }
    tr.hidden { opacity: .55; }
    .badge { padding: 3px 10px; border-radius: 8px; font-size: 10px; font-weight: 800;
             background: #e7f8ef; color: #1f7a45; }
    .badge.hidden { background: #fdecec; color: #9f2440; }
    .btn { height: 32px; padding: 0 14px; border-radius: 8px; border: 0;
           font-weight: 800; font-size: 11px; cursor: pointer; color: #fff; }
    .btn.approve { background: #1f7a45; }
    .btn.reject  { background: #9f2440; }
  `],
})
export class AdminCommunitiesComponent implements OnInit {
  private api = inject(ApiService);

  items = signal<AdminCommunity[]>([]);
  loading = signal(false);
  filter = signal<'all' | 'visible' | 'hidden'>('all');

  ngOnInit() { this.load(); }

  setFilter(f: 'all' | 'visible' | 'hidden') {
    this.filter.set(f);
    this.load();
  }

  load() {
    this.loading.set(true);
    const hiddenParam =
      this.filter() === 'all' ? undefined : this.filter() === 'hidden';
    this.api.adminCommunities({ hidden: hiddenParam }).subscribe({
      next: (r) => { this.items.set(r.content); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  hide(c: AdminCommunity) {
    const reason = prompt('Reason for hiding?', 'Violates community guidelines');
    if (!reason) return;
    this.api.adminHideCommunity(c.id, reason).subscribe({
      next: (updated) => this.items.update((list) =>
        list.map((x) => x.id === c.id ? updated : x)),
    });
  }

  restore(c: AdminCommunity) {
    this.api.adminRestoreCommunity(c.id).subscribe({
      next: (updated) => this.items.update((list) =>
        list.map((x) => x.id === c.id ? updated : x)),
    });
  }
}