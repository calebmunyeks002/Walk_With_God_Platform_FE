// ============================================================
// WalkWithGod — Core Models
// Mirrors backend DTOs and entity shapes.
// ============================================================

/* ---------- Roles & Auth ---------- */

export type Role = 'MEMBER' | 'MENTOR' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt?: string;

  // Admin-only fields (present when fetched via /api/admin/users)
  enabled?: boolean;
  suspended?: boolean;
  suspensionReason?: string | null;
  suspendedAt?: string | null;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

/* ---------- Community ---------- */

export interface Post {
  id: string;
  author: User;
  content: string;
  scriptureReference?: string | null;
  imageUrl?: string | null;
  reactions: number;
  comments: number;
  reacted?: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: User;
  content: string;
  createdAt: string;
}

export interface Reaction {
  id: string;
  user: User;
  postId: string;
  type: ReactionType;
  createdAt: string;
}

export type ReactionType = 'LIKE' | 'AMEN' | 'PRAY' | 'LOVE';

/* ---------- Mentorship ---------- */

export interface Mentor {
  id: string;
  user: User;
  denomination?: string | null;
  church?: string | null;
  specialties: string[];
  bio?: string | null;
  yearsExperience: number;
  verified: boolean;
  rating?: number | null;
}

export type MentorRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'COMPLETED';

export interface MentorRequest {
  id: string;
  /** On member's view: the mentor they requested. */
  mentor: Mentor;
  /** On mentor's view: the member who requested. */
  member: User;
  status: MentorRequestStatus;
  message?: string | null;
  createdAt: string;
}

export type MentorApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MentorApplication {
  id: string;
  applicant: User;
  qualifications: string;
  organization?: string | null;
  yearsExperience: number;
  documentUrl?: string | null;
  status: MentorApplicationStatus;
  createdAt: string;
}

/* ---------- Messaging ---------- */

export interface Conversation {
  id: string;
  participant: User;
  lastMessage?: string | null;
  unread: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  sentAt: string;
  read: boolean;
}

/* ---------- Devotions ---------- */

export interface Devotion {
  id: string;
  title: string;
  scripture: string;
  body: string;
  author: string;
  publishedAt: string;
}

/* ---------- Trivia ---------- */

export type TriviaDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string | null;
  difficulty: TriviaDifficulty;
}

/* ---------- Bible ---------- */

export interface BibleBook {
  id: string;
  name: string;
  chapters: number;
  testament: 'OLD' | 'NEW';
}

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleBookmark {
  id: string;
  reference: string;
  note?: string | null;
  createdAt: string;
}

/* ---------- Dashboard / Growth ---------- */

export interface GrowthStats {
  dayStreak: number;
  versesRead: number;
  devotionsRead: number;
}

/* ---------- Admin / System ---------- */

export interface SystemStats {
  totalUsers: number;
  totalMembers: number;
  totalMentors: number;
  totalAdmins: number;
  pendingMentorApplications: number;
  totalPosts: number;
  totalComments: number;
  totalDevotions: number;
  totalConversations: number;
  activeToday: number;
}

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_SUSPENDED'
  | 'USER_REACTIVATED'
  | 'ROLE_CHANGED'
  | 'MENTOR_APPLICATION_SUBMITTED'
  | 'MENTOR_APPLICATION_APPROVED'
  | 'MENTOR_APPLICATION_REJECTED'
  | 'MENTOR_REQUEST_SENT'
  | 'MENTOR_REQUEST_ACCEPTED'
  | 'MENTOR_REQUEST_DECLINED'
  | 'POST_CREATED'
  | 'POST_DELETED'
  | 'POST_REPORTED'
  | 'COMMENT_DELETED'
  | 'DEVOTION_PUBLISHED'
  | 'DEVOTION_DELETED'
  | 'TRIVIA_CREATED'
  | 'TRIVIA_DELETED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'ACCOUNT_LOCKED';

export interface AuditLog {
  id: string;
  createdAt: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: Role | null;
  action: AuditAction | string;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;      // ← ADD THIS
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  success: boolean;
}

/* ---------- Pagination (Spring Data style) ---------- */

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

/* ---------- API wrappers ---------- */

/** Standard error body returned by the backend. */
export interface ApiError {
  message: string;
  status?: number;
  path?: string;
  timestamp?: string;
  errors?: Record<string, string>;
}

/* ---------- Admin filters ---------- */

export interface UserFilter {
  role?: Role | 'ALL';
  enabled?: boolean | 'ALL';
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface AuditFilter {
  actorId?: string;
  action?: AuditAction | 'ALL';
  from?: string;
  to?: string;
  success?: boolean | 'ALL';
  page?: number;
  size?: number;
}