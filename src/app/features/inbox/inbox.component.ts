import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  ApiService,
  ConversationView,
  MessageView,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService, LiveMessage } from '../../core/services/websocket.service';
import { NotificationService } from '../../core/services/notification.service';
import { CallService } from '../../core/services/call.service';

@Component({
  standalone: true,
  selector: 'app-inbox',
  imports: [CommonModule, FormsModule],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.scss',
})
export class InboxComponent {
  api = inject(ApiService);
  auth = inject(AuthService);
  ws = inject(WebSocketService);
  notif = inject(NotificationService);
  call = inject(CallService);
  private route = inject(ActivatedRoute);

  conversations = signal<ConversationView[]>([]);
  activeId = signal<string | null>(null);
  messages = signal<MessageView[]>([]);
  loadingConvos = signal(true);
  loadingMessages = signal(false);
  error = signal('');

  draft = '';
  sending = signal(false);
  searchText = '';

  private deepLinkHandled = false;

  activeConversation = computed(
    () => this.conversations().find((c) => c.id === this.activeId()) ?? null
  );

  filteredConversations = computed(() => {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.conversations();
    return this.conversations().filter((c) => {
      const title = (c.title ?? '').toLowerCase();
      const last = (c.lastMessage ?? '').toLowerCase();
      return title.includes(q) || last.includes(q);
    });
  });

  get canCall(): boolean {
    return !this.call.activeCall();
  }

  constructor() {
    this.loadConversations();

    this.route.queryParamMap.subscribe((params) => {
      const userId = params.get('user');
      if (userId && !this.deepLinkHandled) {
        this.deepLinkHandled = true;
        this.openWithUser(userId);
      }
    });

    effect(() => {
      const live = this.ws.lastMessage();
      if (!live) return;

      // Append to open conversation (if it belongs there)
      if (live.conversationId === this.activeId()) {
        if (!this.messages().some((m) => m.id === live.id)) {
          this.messages.update((list) => [...list, toMessageView(live)]);
        }
        // We're viewing it → treat as read
        this.api.markConversationRead(live.conversationId).subscribe({
          next: () => this.notif.refreshUnreadMessages(),
        });
      }

      // Always refresh the conversation list — sorts newest to top
      this.loadConversations();
      // Refresh the topbar ✉ badge
      this.notif.refreshUnreadMessages();
    });
  }

  /* =========================================================
     Conversation loading
     ========================================================= */

  loadConversations() {
    this.loadingConvos.set(true);
    this.api.conversations().subscribe({
      next: (list) => {
        // Newest activity first
        const sorted = [...list].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        this.conversations.set(sorted);
        this.loadingConvos.set(false);

        // Auto-select the top one if nothing is selected
        if (!this.activeId() && sorted.length > 0) {
          this.selectConversation(sorted[0]);
        }
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Failed to load conversations.');
        this.loadingConvos.set(false);
      },
    });
  }

  private openWithUser(userId: string) {
    const existing = this.conversations().find((c) =>
      c.participantIds?.includes(userId)
    );
    if (existing) {
      this.selectConversation(existing);
      return;
    }

    this.api.conversationWithUser(userId).subscribe({
      next: (c) => {
        this.api.conversations().subscribe({
          next: (list) => {
            const sorted = [...list].sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            this.conversations.set(sorted);
            const target = sorted.find((x) => x.id === c.id);
            if (target) this.selectConversation(target);
          },
        });
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Could not open conversation.');
      },
    });
  }

  selectConversation(c: ConversationView) {
    this.activeId.set(c.id);
    this.loadingMessages.set(true);
    this.messages.set([]);

    // Optimistically clear the unread badge on the list + topbar
    if (c.unreadCount > 0) {
      this.conversations.update((list) =>
        list.map((x) => (x.id === c.id ? { ...x, unreadCount: 0 } : x))
      );
    }

    this.api.messages(c.id).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.loadingMessages.set(false);
        // Backend marks as read on GET; refresh topbar count
        this.notif.refreshUnreadMessages();
      },
      error: () => {
        this.loadingMessages.set(false);
      },
    });
  }

  /* =========================================================
     Sending
     ========================================================= */

  send() {
    const content = this.draft.trim();
    const conv = this.activeConversation();
    if (!content || !conv || this.sending()) return;

    this.sending.set(true);

    const me = this.auth.user();
    const optimistic: MessageView = {
      id: 'temp-' + Date.now(),
      conversationId: conv.id,
      senderId: me?.id ?? '',
      senderName: me?.name ?? 'You',
      content,
      sentAt: new Date().toISOString(),
      read: false,
    };
    this.messages.update((list) => [...list, optimistic]);
    this.draft = '';

    this.api.sendMessage(conv.id, content).subscribe({
      next: (real) => {
        this.sending.set(false);
        this.messages.update((list) =>
          list.map((m) => (m.id === optimistic.id ? real : m))
        );
        // Bump this conversation to the top of the list
        this.loadConversations();
      },
      error: (e) => {
        this.sending.set(false);
        this.messages.update((list) =>
          list.filter((m) => m.id !== optimistic.id)
        );
        this.draft = content;
        this.error.set(e?.error?.message || 'Failed to send message.');
      },
    });
  }

  onEnterKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  isMine(m: MessageView): boolean {
    return m.senderId === this.auth.user()?.id;
  }

  startCall(mediaType: 'AUDIO' | 'VIDEO') {
    const conv = this.activeConversation();
    if (!conv || !this.canCall) return;

    const myId = this.auth.user()?.id;
    const peerId = conv.participantIds.find((id) => id !== myId);
    if (!peerId) return;

    const peerName = this.otherParticipantName(conv);
    this.call.startCall(peerId, peerName, mediaType);
  }

  otherParticipantName(c: ConversationView): string {
    const title = (c.title ?? '').trim();
    if (!title) return 'Conversation';

    const me = this.auth.user()?.name ?? '';
    const parts = title.split(' & ');
    if (parts.length === 1) return parts[0];
    return parts.find((p) => p !== me) ?? parts[0];
  }

  otherParticipantInitial(c: ConversationView): string {
    const name = this.otherParticipantName(c);
    return (name.charAt(0) || 'C').toUpperCase();
  }
}

function toMessageView(m: LiveMessage): MessageView {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.senderName,
    content: m.content,
    sentAt: m.sentAt,
    read: m.read,
  };
}