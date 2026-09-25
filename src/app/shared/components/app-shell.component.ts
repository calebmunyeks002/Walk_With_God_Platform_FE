import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CallService } from '../../core/services/call.service';
import { NotificationService } from '../../core/services/notification.service';
import { Role } from '../../core/models/models';
import { CallWidgetComponent } from './call-widget/call-widget.component/call-widget.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: Role[];
}

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, CallWidgetComponent, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  auth = inject(AuthService);
  router = inject(Router);
  call = inject(CallService);
  notif = inject(NotificationService);

  sidebarOpen = signal(true);
  userMenuOpen = signal(false);
  notifOpen = signal(false);

  private allNav: NavItem[] = [
    // Common
    { label: 'Home',            icon: '⌂', route: '/dashboard',                roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Community',       icon: '◉', route: '/community',                roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Mentors',         icon: '✦', route: '/mentors',                  roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Bible',           icon: '✝', route: '/bible',                    roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Bible Trivia',    icon: '?', route: '/trivia',                   roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Trivia Analytics', icon: '📊', route: '/admin/trivia-analytics', roles: ['ADMIN'] },
    { label: 'Devotions',       icon: '📖', route: '/devotions',               roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Inbox',           icon: '✉', route: '/inbox',                    roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'My Profile',      icon: '☺', route: '/profile',                  roles: ['MEMBER', 'MENTOR', 'ADMIN'] },

    // Mentor
    { label: 'My Requests',     icon: '✍', route: '/mentor/requests',          roles: ['MENTOR', 'ADMIN'] },
    { label: 'My Mentees',      icon: '☺', route: '/mentor/mentees',           roles: ['MENTOR', 'ADMIN'] },

    // Admin
    { label: 'Users',           icon: '◉', route: '/admin/users',              roles: ['ADMIN'] },
    { label: 'Mentor Applications', icon: '✍', route: '/admin/mentor-applications', roles: ['ADMIN'] },
    { label: 'Content Moderation', icon: '✎', route: '/admin/posts',           roles: ['ADMIN'] },
    { label: 'Reports',         icon: '⚠', route: '/admin/reports',            roles: ['ADMIN'] },
    { label: 'Report Builder',  icon: '⬇', route: '/admin/reports-builder',    roles: ['ADMIN'] },
    { label: 'Notifications',   icon: '🔔', route: '/admin/notifications',     roles: ['ADMIN'] },  // ← NEW
    { label: 'Devotions (Admin)', icon: '📖', route: '/admin/devotions',       roles: ['ADMIN'] },
    { label: 'Trivia (Admin)',  icon: '?', route: '/admin/trivia',             roles: ['ADMIN'] },
    { label: 'Audit Trail',     icon: '⏱', route: '/admin/audit',              roles: ['ADMIN'] },
    { label: 'Settings',        icon: '⚙', route: '/admin/settings',           roles: ['ADMIN'] },
  ];

  navItems = computed(() => {
    const role = this.auth.user()?.role;
    if (!role) return [];
    return this.allNav.filter((item) => item.roles.includes(role));
  });

  navSections = computed(() => {
    const items = this.navItems();
    const common = items.filter((i) => !i.route.startsWith('/admin') && !i.route.startsWith('/mentor'));
    const mentor = items.filter((i) => i.route.startsWith('/mentor'));
    const admin = items.filter((i) => i.route.startsWith('/admin'));

    const sections: { title: string; items: NavItem[] }[] = [];
    if (common.length) sections.push({ title: 'Journey', items: common });
    if (mentor.length) sections.push({ title: 'Mentorship', items: mentor });
    if (admin.length) sections.push({ title: 'Administration', items: admin });
    return sections;
  });

  constructor() {
    // Init CallService when a user is logged in
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.call.init();
      } else {
        this.call.disconnect();
      }
    });
  }

  toggleSidebar() { this.sidebarOpen.update((v) => !v); }
  toggleUserMenu() {
    this.userMenuOpen.update((v) => !v);
    if (this.userMenuOpen()) this.notifOpen.set(false);
  }
  closeUserMenu() { this.userMenuOpen.set(false); }

  toggleNotif() {
    this.notifOpen.update((v) => !v);
    if (this.notifOpen()) {
      this.userMenuOpen.set(false);
      // Mark-all-read shortly after opening, so the user still sees the highlight briefly
      setTimeout(() => {
        if (this.notifOpen()) this.notif.markAllRead();
      }, 800);
    }
  }
  closeNotif() { this.notifOpen.set(false); }

  openNotification(n: { id: string; link: string | null; read: boolean }) {
    if (!n.read) this.notif.markRead(n.id);
    if (n.link) this.router.navigateByUrl(n.link);
    this.closeNotif();
  }

  signOut() {
    this.userMenuOpen.set(false);
    this.notifOpen.set(false);
    this.call.disconnect();
    this.auth.logout();
  }

  initials(): string {
    const n = this.auth.user()?.name ?? '';
    return n ? n.charAt(0).toUpperCase() : 'U';
  }

  roleLabel(): string {
    const r = this.auth.user()?.role;
    if (r === 'ADMIN') return 'Administrator';
    if (r === 'MENTOR') return 'Mentor';
    return 'Member';
  }

  /** Icon for a notification type. */
  notifIcon(type: string): string {
    switch (type) {
      case 'WELCOME': return '✨';
      case 'MENTOR_REQUEST': return '✍';
      case 'MENTOR_ACCEPTED': return '✓';
      case 'MENTOR_DECLINED': return '✕';
      case 'ADMIN_BROADCAST': return '📢';
      case 'POST_REPORTED': return '⚠';
      case 'CALL_MISSED': return '📞';
      default: return '🔔';
    }
  }

  /** "3m ago" style relative time. */
  timeAgo(iso: string): string {
    const d = new Date(iso).getTime();
    const secs = Math.floor((Date.now() - d) / 1000);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }
}