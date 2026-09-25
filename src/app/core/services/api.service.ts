import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Post,
  Mentor,
  Conversation,
  Message,
  Devotion,
  TriviaQuestion,
  User,
  Role,
  Page,
  SystemStats,
  AuditLog,
  AuditFilter,
  UserFilter,
  MentorApplication,
} from '../models/models';

/** Backend conversation shape (from ConversationController). */
export interface ConversationView {
  id: string;
  participantIds: string[];
  title: string;
  lastMessage: string | null;
  updatedAt: string;
}

/** Backend message shape (from ConversationController). */
export interface MessageView {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  /* ---------------- Generic helpers ---------------- */

  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Observable<T> {
    let p = new HttpParams();
    Object.entries(params ?? {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) p = p.set(k, String(v));
    });
    return this.http.get<T>(this.base + path, { params: p });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.base + path, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.base + path, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.base + path, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.base + path);
  }

  /* ---------------- Community ---------------- */

  posts(page = 0, size = 20) {
    return this.get<Page<Post>>('/posts', { page, size });
  }

  createPost(content: string, scriptureReference?: string) {
    return this.post<Post>('/posts', { content, scriptureReference });
  }

  react(postId: string, type = 'LIKE') {
    return this.post<void>(`/posts/${postId}/reactions`, { type });
  }

  /* ---------------- Mentors (public) ---------------- */

  mentors() {
    return this.get<Mentor[]>('/mentors');
  }

  requestMentor(mentorId: string, message: string) {
    return this.post<void>('/mentor-requests', { mentorId, message });
  }

  applyAsMentor(body: {
    qualifications: string;
    organization?: string;
    yearsExperience: number;
    documentUrl?: string;
  }) {
    return this.post<MentorApplication>('/mentor-applications', body);
  }

  /* ---------------- Mentor dashboard ---------------- */

  mentorMe() {
    return this.get<any>('/mentor/me');
  }

  mentorRequests() {
    return this.get<any[]>('/mentor/requests');
  }

  mentorRequestHistory() {
    return this.get<any[]>('/mentor/requests/history');
  }

  mentorAcceptRequest(id: string, note?: string) {
    return this.post<any>(`/mentor/requests/${id}/accept`, { note });
  }

  mentorDeclineRequest(id: string, reason: string) {
    return this.post<any>(`/mentor/requests/${id}/decline`, { reason });
  }

  mentorMentees() {
    return this.get<any[]>('/mentor/mentees');
  }

  mentorStats() {
    return this.get<{
      activeMentees: number;
      pendingRequests: number;
      totalAccepted: number;
      totalCompleted: number;
      averageRating: number;
      yearsExperience: number;
      verified: boolean;
    }>('/mentor/stats');
  }

  /* ---------------- Messaging ---------------- */

  conversations() {
    return this.get<ConversationView[]>('/conversations');
  }

  messages(conversationId: string) {
    return this.get<MessageView[]>(`/conversations/${conversationId}/messages`);
  }

  sendMessage(conversationId: string, content: string) {
    return this.post<MessageView>(
      `/conversations/${conversationId}/messages`,
      { content }
    );
  }

  createConversation(participantId: string) {
    return this.post<ConversationView>('/conversations', { participantId });
  }

  /* ---------------- Devotions (public) ---------------- */

  devotions() {
    return this.get<Devotion[]>('/devotions');
  }

  /* =========================================================
     Trivia — daily quiz
     ========================================================= */

  triviaToday(difficulty: 'EASY' | 'MEDIUM' | 'HARD') {
    return this.get<{
      difficulty: string;
      total: number;
      completed: boolean;
      passed: boolean;
      score: number;
      questions: Array<{
        id: string;
        question: string;
        options: string[];
        difficulty: string;
      }>;
    }>('/trivia/today', { difficulty });
  }

  triviaSubmit(
    difficulty: 'EASY' | 'MEDIUM' | 'HARD',
    answers: Array<{ questionId: string; selectedIndex: number }>
  ) {
    return this.post<{
      score: number;
      total: number;
      passed: boolean;
      newlyPassed: boolean;
    }>('/trivia/today/submit', { difficulty, answers });
  }

  /** Kept for backwards compatibility — returns questions from the daily pool. */
  trivia(difficulty?: string) {
    return this.get<TriviaQuestion[]>('/trivia/questions', { difficulty });
  }

  /* ---------------- Auth / Profile ---------------- */

  me() {
    return this.get<User>('/auth/me');
  }

  /* =========================================================
     User — personal stats
     ========================================================= */

    myStats() {
    return this.get<{
      dayStreak: number;
      versesRead: number;
      devotionsRead: number;
      postsCreated: number;
      triviaAnswered: number;
      chaptersRead: number;
      highlights: number;
      triviaPassedTotal: number;
      triviaPassedToday: number;
      triviaPassedTodayEasy: boolean;
      triviaPassedTodayMedium: boolean;
      triviaPassedTodayHard: boolean;
    }>('/users/me/stats');
  }
  /* =========================================================
     ADMIN — Statistics
     ========================================================= */

  adminStats() {
    return this.get<SystemStats>('/admin/stats');
  }

  /* =========================================================
     ADMIN — User management
     ========================================================= */

  adminUsers(filter: UserFilter) {
    return this.get<Page<User>>('/admin/users', {
      search: filter.search,
      role: filter.role && filter.role !== 'ALL' ? filter.role : undefined,
      enabled:
        filter.enabled === undefined || filter.enabled === 'ALL'
          ? undefined
          : filter.enabled,
      page: filter.page ?? 0,
      size: filter.size ?? 20,
      sort: filter.sort,
    });
  }

  adminSuspendUser(id: string, reason: string) {
    return this.post<any>(`/admin/users/${id}/suspend`, { reason });
  }

  adminReactivateUser(id: string, reason?: string) {
    return this.post<any>(`/admin/users/${id}/reactivate`, { reason });
  }

  adminChangeRole(id: string, role: Role, reason?: string) {
    return this.patch<any>(`/admin/users/${id}/role`, { role, reason });
  }

  /* =========================================================
     ADMIN — Mentor applications
     ========================================================= */

  adminMentorApplications(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.get<any[]>('/admin/mentor-applications', { status });
  }

  adminReviewApplication(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string
  ) {
    return this.put<void>(`/admin/mentor-applications/${id}`, {
      status,
      reason,
    });
  }

  /* =========================================================
     ADMIN — Content moderation
     ========================================================= */

  adminPosts(filter: {
    hidden?: boolean;
    search?: string;
    page?: number;
    size?: number;
  }) {
    return this.get<Page<any>>('/admin/posts', {
      hidden: filter.hidden,
      search: filter.search,
      page: filter.page ?? 0,
      size: filter.size ?? 20,
    });
  }

  adminDeletePost(id: string, reason: string) {
    return this.post<any>(`/admin/posts/${id}/delete`, { reason });
  }

  adminRestorePost(id: string, reason?: string) {
    return this.post<any>(`/admin/posts/${id}/restore`, { reason });
  }

  /* =========================================================
     ADMIN — Reports
     ========================================================= */

  adminReports(filter: {
    status?: string;
    targetType?: string;
    page?: number;
    size?: number;
  }) {
    return this.get<Page<any>>('/admin/reports', {
      status: filter.status,
      targetType: filter.targetType,
      page: filter.page ?? 0,
      size: filter.size ?? 20,
    });
  }

  adminResolveReport(
    id: string,
    status: 'RESOLVED' | 'DISMISSED' | 'UNDER_REVIEW',
    note?: string
  ) {
    return this.post<any>(`/admin/reports/${id}/resolve`, { status, note });
  }

  /* =========================================================
     ADMIN — Report Builder
     ========================================================= */

  reportPreview(params: {
    type:
      | 'USERS'
      | 'MENTORS'
      | 'COMMUNITY'
      | 'MODERATION'
      | 'AUDIT'
      | 'DEVOTIONS'
      | 'TRIVIA';
    from?: string;
    to?: string;
    search?: string;
  }) {
    return this.get<{
      title: string;
      subtitle: string;
      columns: string[];
      rows: string[][];
      totalRows: number;
    }>('/admin/reports-builder/preview', {
      type: params.type,
      from: params.from,
      to: params.to,
      search: params.search,
    });
  }

  /** Triggers a file download in the browser. */
  downloadReport(params: {
    type:
      | 'USERS'
      | 'MENTORS'
      | 'COMMUNITY'
      | 'MODERATION'
      | 'AUDIT'
      | 'DEVOTIONS'
      | 'TRIVIA';
    format: 'CSV' | 'XLSX' | 'PDF';
    from?: string;
    to?: string;
    search?: string;
  }): void {
    const qs = new URLSearchParams({
      type: params.type,
      format: params.format,
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
      ...(params.search ? { search: params.search } : {}),
    });

    const token = localStorage.getItem('wwg_token') ?? '';

    fetch(`/api/admin/reports-builder/export?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wwg-${params.type.toLowerCase()}-report.${params.format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch((err) => console.error('Report download failed', err));
  }

  /* =========================================================
     ADMIN — Settings
     ========================================================= */

  adminSettings() {
    return this.get<any[]>('/admin/settings');
  }

  adminSettingsGrouped() {
    return this.get<Record<string, any[]>>('/admin/settings/grouped');
  }

  adminUpdateSetting(key: string, value: string) {
    return this.put<any>(`/admin/settings/${key}`, { value });
  }

  adminBulkUpdateSettings(updates: Record<string, string>) {
    return this.put<any[]>('/admin/settings/bulk', updates);
  }

  /* =========================================================
     ADMIN — Devotions
     ========================================================= */

  adminDevotions(filter: {
    published?: boolean;
    hidden?: boolean;
    featured?: boolean;
    search?: string;
    page?: number;
    size?: number;
  }) {
    return this.get<Page<any>>('/admin/devotions', {
      published: filter.published,
      hidden: filter.hidden,
      featured: filter.featured,
      search: filter.search,
      page: filter.page ?? 0,
      size: filter.size ?? 20,
    });
  }

  adminCreateDevotion(body: {
    title: string;
    scripture: string;
    body: string;
    published?: boolean;
    featured?: boolean;
  }) {
    return this.post<any>('/admin/devotions', body);
  }

  adminUpdateDevotion(
    id: string,
    body: Partial<{
      title: string;
      scripture: string;
      body: string;
      published: boolean;
      featured: boolean;
    }>
  ) {
    return this.put<any>(`/admin/devotions/${id}`, body);
  }

  adminDeleteDevotion(id: string, reason?: string) {
    return this.http.delete<any>(
      `${this.base}/admin/devotions/${id}${
        reason ? '?reason=' + encodeURIComponent(reason) : ''
      }`
    );
  }

  /* =========================================================
     ADMIN — Trivia (question management)
     ========================================================= */

  adminTrivia(filter: {
    difficulty?: string;
    hidden?: boolean;
    search?: string;
    page?: number;
    size?: number;
  }) {
    return this.get<Page<any>>('/admin/trivia', {
      difficulty: filter.difficulty,
      hidden: filter.hidden,
      search: filter.search,
      page: filter.page ?? 0,
      size: filter.size ?? 20,
    });
  }

  adminCreateTrivia(body: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation?: string;
    difficulty: string;
  }) {
    return this.post<any>('/admin/trivia', body);
  }

  adminUpdateTrivia(
    id: string,
    body: Partial<{
      question: string;
      options: string[];
      answerIndex: number;
      explanation: string;
      difficulty: string;
    }>
  ) {
    return this.put<any>(`/admin/trivia/${id}`, body);
  }

  adminDeleteTrivia(id: string, reason?: string) {
    return this.http.delete<any>(
      `${this.base}/admin/trivia/${id}${
        reason ? '?reason=' + encodeURIComponent(reason) : ''
      }`
    );
  }

  /* =========================================================
     ADMIN — Trivia analytics (daily sessions)
     ========================================================= */

  adminTriviaOverview(date?: string) {
    return this.get<{
      date: string;
      totalSessions: number;
      completedSessions: number;
      passedSessions: number;
      failedSessions: number;
      completionRate: number;
      passRate: number;
      avgScoreRatio: number;
      byDifficulty: Record<string, number>;
    }>('/admin/trivia/overview', { date });
  }

  adminTriviaSessions(filter: {
    date?: string;
    difficulty?: string;
    completed?: boolean;
    passed?: boolean;
    userId?: string;
    search?: string;
    page?: number;
    size?: number;
  }) {
    return this.get<{
      content: Array<{
        id: string;
        userId: string;
        userName: string;
        userEmail: string;
        date: string;
        difficulty: string;
        completed: boolean;
        passed: boolean;
        score: number;
        total: number;
        completedAt: string | null;
      }>;
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
      first: boolean;
      last: boolean;
    }>('/admin/trivia/sessions', {
      date: filter.date,
      difficulty: filter.difficulty,
      completed: filter.completed,
      passed: filter.passed,
      userId: filter.userId,
      search: filter.search,
      page: filter.page ?? 0,
      size: filter.size ?? 50,
    });
  }

  /* =========================================================
     Calls — history
     ========================================================= */

  callHistory(page = 0, size = 30) {
    return this.get<Page<{
      id: string;
      callerId: string;
      callerName: string;
      calleeId: string;
      calleeName: string;
      direction: 'OUTGOING' | 'INCOMING';
      status: string;
      mediaType: string;
      durationSeconds: number | null;
      startedAt: string | null;
      answeredAt: string | null;
      endedAt: string | null;
      endReason: string | null;
    }>>('/calls', { page, size });
  }

  missedCallCount() {
    return this.get<{ count: number }>('/calls/missed-count');
  }

  /* =========================================================
     Notifications — user's own
     ========================================================= */

  notifications(page = 0, size = 20) {
    return this.get<{
      content: Array<{
        id: string;
        type: string;
        title: string;
        body: string | null;
        link: string | null;
        read: boolean;
        createdAt: string;
      }>;
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
      first: boolean;
      last: boolean;
    }>('/notifications', { page, size });
  }

  notificationsUnreadCount() {
    return this.get<{ count: number }>('/notifications/unread-count');
  }

  markNotificationRead(id: string) {
    return this.post<void>(`/notifications/${id}/read`, {});
  }

  markAllNotificationsRead() {
    return this.post<{ updated: number }>('/notifications/mark-all-read', {});
  }

  /* =========================================================
     Notifications — admin
     ========================================================= */

  adminNotifications(filter: {
    type?: string;
    read?: boolean;
    recipientId?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }) {
    return this.get<{
      content: Array<{
        id: string;
        recipientId: string;
        recipientName: string;
        recipientEmail: string;
        senderId: string | null;
        type: string;
        title: string;
        body: string | null;
        link: string | null;
        read: boolean;
        emailSent: boolean;
        readAt: string | null;
        createdAt: string;
      }>;
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
      first: boolean;
      last: boolean;
    }>('/admin/notifications', {
      type: filter.type,
      read: filter.read,
      recipientId: filter.recipientId,
      search: filter.search,
      from: filter.from,
      to: filter.to,
      page: filter.page ?? 0,
      size: filter.size ?? 50,
    });
  }

  adminSendNotification(body: {
    target: 'USER' | 'ROLE' | 'ALL';
    userId?: string;
    role?: string;
    title: string;
    body?: string;
    link?: string;
    sendEmail?: boolean;
  }) {
    return this.post<{ recipients: number }>('/admin/notifications/send', body);
  }

  /* =========================================================
     Bible — reading progress + highlights
     ========================================================= */

  markChapterRead(version: string, book: string, chapter: number) {
    return this.post<{ book: string; chapter: number; readAt: string }>(
      '/bible/read',
      { version, book, chapter }
    );
  }

  unmarkChapterRead(book: string, chapter: number) {
    return this.delete<void>(`/bible/read?book=${book}&chapter=${chapter}`);
  }

  readStatus(book: string, chapter: number) {
    return this.get<{ read: boolean }>(
      `/bible/read/status?book=${book}&chapter=${chapter}`
    );
  }

  readChapters() {
    return this.get<Array<{ book: string; chapter: number; readAt: string }>>(
      '/bible/read'
    );
  }

  chapterHighlights(version: string, book: string, chapter: number) {
    return this.get<Array<{
      id: string; version: string; book: string;
      chapter: number; verse: number; color: string;
      note: string | null; createdAt: string;
    }>>(
      `/bible/highlights?version=${version}&book=${book}&chapter=${chapter}`
    );
  }

  saveHighlight(body: {
    version: string; book: string; chapter: number;
    verse: number; color?: string; note?: string;
  }) {
    return this.post<{
      id: string; version: string; book: string;
      chapter: number; verse: number; color: string;
      note: string | null; createdAt: string;
    }>('/bible/highlights', body);
  }

  deleteHighlight(id: string) {
    return this.delete<void>(`/bible/highlights/${id}`);
  }

  /* =========================================================
     ADMIN — Audit trail
     ========================================================= */

  adminAudit(filter: AuditFilter) {
    return this.get<Page<AuditLog>>('/admin/audit', {
      actorId: filter.actorId,
      action:
        filter.action && filter.action !== 'ALL' ? filter.action : undefined,
      from: filter.from,
      to: filter.to,
      success:
        filter.success === undefined || filter.success === 'ALL'
          ? undefined
          : filter.success,
      page: filter.page ?? 0,
      size: filter.size ?? 50,
    });
  }
}