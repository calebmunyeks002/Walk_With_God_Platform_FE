import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { MemberDashboardComponent } from './member/member-dashboard.component/member-dashboard.component';
import { MentorDashboardComponent } from './mentor/mentor-dashboard.component/mentor-dashboard.component';
import { AdminOverviewComponent } from '../admin/overview/admin-overview.component/admin-overview.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MemberDashboardComponent,
    MentorDashboardComponent,
    AdminOverviewComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  auth = inject(AuthService);
  role = computed(() => this.auth.user()?.role ?? 'MEMBER');
}