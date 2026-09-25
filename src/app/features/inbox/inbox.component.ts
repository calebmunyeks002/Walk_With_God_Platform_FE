import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  ConversationView,
  MessageView,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService, LiveMessage } from '../../core/services/websocket.service';
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
  call = inject(CallService);

  conversations = signal<ConversationView[]>([]);
  activeId = signal<string | null>(null);
  messages = signal<MessageView[]>([]);
  loadingConvos = signal(true);
  loadingMessages = signal(false);
  error = signal('');

  draft = '';
  sending = signal(false);
  searchText = '';

  /** Active conversation object. */
  activeConversation = computed(
    () => this.conversations().find((c) => c.id === this.activeId()) ?? null
  );

  /** Filtered conversation list (null-safe). */
  filteredConversations = computed(() => {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.conversations();
    return this.conversations().filter((c) => {
      const title = (c.title ?? '').toLowerCase();
      const last = (c.lastMessage ?? '').toLowerCase();
      return title.includes(q) || last.includes(q);
    });
  });

  /** True if the current user can start a call (not already in one). */
  get canCall(): boolean {
    return !this.call.activeCall();
  }

  constructor() {
    this.loadConversations();

    // React to live messages from WebSocket
    effect(() => {
      const live = this.ws.lastMessage();
      if (!live) return;

      if (live.conversationId === this.activeId()) {
        if (!this.messages().some((m) => m.id === live.id)) {
          this.messages.update((list) => [...list, toMessageView(live)]);
        }
      }
      this.loadConversations();
    });
  }

  loadConversations() {
    this.loadingConvos.set(true);
    this.api.conversations().subscribe({
      next: (list) => {
        this.conversations.set(list);
        this.loadingConvos.set(false);
        if (!this.activeId() && list.length > 0) {
          this.selectConversation(list[0]);
        }
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Failed to load conversations.');
        this.loadingConvos.set(false);
      },
    });
  }

  selectConversation(c: ConversationView) {
    this.activeId.set(c.id);
    this.loadingMessages.set(true);
    this.messages.set([]);

    this.api.messages(c.id).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.loadingMessages.set(false);
      },
      error: () => {
        this.loadingMessages.set(false);
      },
    });
  }

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

  /** Start a WebRTC call with the other participant of the open conversation. */
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

/** Convert a WebSocket payload into a MessageView. */
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