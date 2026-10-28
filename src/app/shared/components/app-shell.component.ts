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

  // Default to open on all screens
  sidebarOpen = signal(true);
  userMenuOpen = signal(false);
  notifOpen = signal(false);

  private allNav: NavItem[] = [
    { label: 'Home', icon: 'âŒ‚', route: '/dashboard', roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Community', icon: 'â—‰', route: '/community', roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Communities', icon: 'ðŸ›', route: '/communities', roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Communities (Admin)', icon: 'ðŸ›', route: '/admin/communities', roles: ['ADMIN'] },
    { label: 'Mentors', icon: 'âœ¦', route: '/mentors', roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Bible', icon: 'âœ', route: '/bible', roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Prayer', icon: 'ðŸ™', route: '/prayer', roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Bible Trivia', icon: '?', route: '/trivia', roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Trivia Analytics', icon: 'ðŸ“Š', route: '/admin/trivia-analytics', roles: ['ADMIN'] },
    { label: 'Devotions', icon: 'ðŸ“–', route: '/devotions', roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'Inbox', icon: 'âœ‰', route: '/inbox', roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'My Profile', icon: 'â˜º', route: '/profile', roles: ['MEMBER', 'MENTOR', 'ADMIN'] },
    { label: 'My Requests', icon: 'âœ', route: '/mentor/requests', roles: ['MENTOR', 'ADMIN'] },
    { label: 'My Mentees', icon: 'â˜º', route: '/mentor/mentees', roles: ['MENTOR', 'ADMIN'] },
    { label: 'Users', icon: 'â—‰', route: '/admin/users', roles: ['ADMIN'] },
    { label: 'Mentor Applications', icon: 'âœ', route: '/admin/mentor-applications', roles: ['ADMIN'] },
    { label: 'Content Moderation', icon: 'âœŽ', route: '/admin/posts', roles: ['ADMIN'] },
    { label: 'Reports', icon: 'âš ', route: '/admin/reports', roles: ['ADMIN'] },
    { label: 'Report Builder', icon: 'â¬‡', route: '/admin/reports-builder', roles: ['ADMIN'] },
    { label: 'Notifications', icon: 'ðŸ””', route: '/admin/notifications', roles: ['ADMIN'] },
    { label: 'Media Review', icon: 'ðŸ–¼', route: '/admin/media-review', roles: ['ADMIN'] },
    { label: 'Devotions (Admin)', icon: 'ðŸ“–', route: '/admin/devotions', roles: ['ADMIN'] },
    { label: 'Trivia (Admin)', icon: '?', route: '/admin/trivia', roles: ['ADMIN'] },
    { label: 'Audit Trail', icon: 'â±', route: '/admin/audit', roles: ['ADMIN'] },
    { label: 'Settings', icon: 'âš™', route: '/admin/settings', roles: ['ADMIN'] },
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
    effect(() => {
      if (this.auth.user()) this.call.init(); else this.call.disconnect();
    });
  }

  toggleSidebar() { this.sidebarOpen.update((v) => !v); }

  closeSidebarOnMobile() {
    if (window.innerWidth < 992) {
      this.sidebarOpen.set(false);
    }
  }
  toggleUserMenu() { this.userMenuOpen.update((v) => !v); if (this.userMenuOpen()) this.notifOpen.set(false); }
  closeUserMenu() { this.userMenuOpen.set(false); }
  toggleNotif() { this.notifOpen.update((v) => !v); if (this.notifOpen()) { this.userMenuOpen.set(false); setTimeout(() => { if (this.notifOpen()) this.notif.markAllRead(); }, 800); } }
  closeNotif() { this.notifOpen.set(false); }
  openNotification(n: { id: string; link: string | null; read: boolean }) { if (!n.read) this.notif.markRead(n.id); if (n.link) this.router.navigateByUrl(n.link); this.closeNotif(); }
  signOut() { this.userMenuOpen.set(false); this.notifOpen.set(false); this.call.disconnect(); this.auth.logout(); }
  initials() { const n = this.auth.user()?.name ?? ''; return n ? n.charAt(0).toUpperCase() : 'U'; }
  roleLabel() { const r = this.auth.user()?.role; return r === 'ADMIN' ? 'Administrator' : r === 'MENTOR' ? 'Mentor' : 'Member'; }

  notifIcon(type: string): string {
    switch (type) {
      case 'WELCOME': return 'âœ¨'; case 'MENTOR_REQUEST': return 'âœ'; case 'MENTOR_ACCEPTED': return 'âœ“'; case 'MENTOR_DECLINED': return 'âœ•';
      case 'ADMIN_BROADCAST': return 'ðŸ“¢'; case 'POST_REPORTED': return 'âš '; case 'CALL_MISSED': return 'ðŸ“ž';
      case 'POST_LIKE': return 'ðŸ‘'; case 'POST_LOVE': return 'â¤ï¸'; case 'POST_AMEN': return 'ðŸ™Œ'; case 'POST_PRAY': return 'ðŸ™';
      case 'POST_COMMENT': return 'ðŸ’¬'; case 'POST_SHARE': return 'â†—'; case 'NEW_FOLLOWER': return 'ðŸ‘¤'; case 'PRAYER': return 'ðŸ™'; case 'DEVOTION_PUBLISHED': return 'ðŸ“–';
      default: return 'ðŸ””';
    }
  }

  timeAgo(iso: string): string {
    const d = new Date(iso).getTime(); const secs = Math.floor((Date.now() - d) / 1000);
    if (secs < 60) return 'just now'; const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`; const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`; return new Date(iso).toLocaleDateString();
  }
}