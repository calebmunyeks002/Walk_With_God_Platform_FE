import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/auth/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
  },

  // Protected shell
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/components/app-shell.component').then(
        (m) => m.AppShellComponent
      ),
    children: [
      // Common routes
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'community',
        loadComponent: () =>
          import('./features/community/community.component').then(
            (m) => m.CommunityComponent
          ),
      },
      {
        path: 'mentors',
        loadComponent: () =>
          import('./features/mentors/mentors.component').then(
            (m) => m.MentorsComponent
          ),
      },
      {
  path: 'mentor/requests',
  canActivate: [roleGuard(['MENTOR', 'ADMIN'])],
  loadComponent: () =>
    import('./features/mentors/requests/mentor-requests.component/mentor-requests.component').then(
      (m) => m.MentorRequestsComponent
    ),
},
{
  path: 'mentor/mentees',
  canActivate: [roleGuard(['MENTOR', 'ADMIN'])],
  loadComponent: () =>
    import('./features/mentors/mentees/mentor-mentees.component/mentor-mentees.component').then(
      (m) => m.MentorMenteesComponent
    ),
},
      {
        path: 'bible',
        loadComponent: () =>
          import('./features/bible/bible.component').then(
            (m) => m.BibleComponent
          ),
      },
      {
        path: 'trivia',
        loadComponent: () =>
          import('./features/trivia/trivia.component').then(
            (m) => m.TriviaComponent
          ),
      },
      {
        path: 'devotions',
        loadComponent: () =>
          import('./features/devotions/devotions.component').then(
            (m) => m.DevotionsComponent
          ),
      },
      {
        path: 'inbox',
        loadComponent: () =>
          import('./features/inbox/inbox.component').then(
            (m) => m.InboxComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },

      // Admin — flat children under the main shell
      {
        path: 'admin',
        canActivate: [roleGuard(['ADMIN'])],
        children: [
          { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
          { path: 'overview', redirectTo: '/dashboard', pathMatch: 'full' },
          // {
          //   path: 'overview',
          //   loadComponent: () =>
          //     import(
          //       './features/admin/overview/admin-overview.component/admin-overview.component'
          //     ).then((m) => m.AdminOverviewComponent),
          // },
          {
            path: 'users',
            loadComponent: () =>
              import(
                './features/admin/users/admin-users.component/admin-users.component'
              ).then((m) => m.AdminUsersComponent),
          },
          {
            path: 'mentor-applications',
            loadComponent: () =>
              import(
                './features/admin/mentor-applications/admin-mentor-applications.component/admin-mentor-applications.component'
              ).then((m) => m.AdminMentorApplicationsComponent),
          },
          {
            path: 'posts',
            loadComponent: () =>
              import(
                './features/admin/posts/admin-posts.component/admin-posts.component'
              ).then((m) => m.AdminPostsComponent),
          },
          {
            path: 'reports',
            loadComponent: () =>
              import(
                './features/admin/reports/admin-reports.component/admin-reports.component'
              ).then((m) => m.AdminReportsComponent),
          },
          {
            path: 'reports-builder',
            loadComponent: () =>
              import(
                './features/admin/reports-builder/admin-report-builder.component/admin-report-builder.component'
              ).then((m) => m.AdminReportBuilderComponent),
          },
          {
            path: 'devotions',
            loadComponent: () =>
              import(
                './features/admin/devotions/admin-devotions.component/admin-devotions.component'
              ).then((m) => m.AdminDevotionsComponent),
          },
          {
            path: 'trivia',
            loadComponent: () =>
              import(
                './features/admin/trivia/admin-trivia.component/admin-trivia.component'
              ).then((m) => m.AdminTriviaComponent),
          },
          {
  path: 'trivia-analytics',
  loadComponent: () =>
    import('./features/admin/trivia/analytics/admin-trivia-analytics.component/admin-trivia-analytics.component').then(
      (m) => m.AdminTriviaAnalyticsComponent
    ),
},
          {
  path: 'notifications',
  loadComponent: () =>
    import('./features/admin/notifications/admin-notifications.component/admin-notifications.component').then(
      (m) => m.AdminNotificationsComponent
    ),
},
          {
            path: 'audit',
            loadComponent: () =>
              import(
                './features/admin/audit/admin-audit.component/admin-audit.component'
              ).then((m) => m.AdminAuditComponent),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import(
                './features/admin/settings/admin-settings.component/admin-settings.component'
              ).then((m) => m.AdminSettingsComponent),
          },
        ],
      },
    ],
  },

  // Fallback
  { path: '**', redirectTo: 'dashboard' },
];