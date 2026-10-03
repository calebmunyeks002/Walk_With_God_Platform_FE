import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Mentor, MentorshipRequest, MyMentorshipState,
} from '../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-mentors',
  imports: [CommonModule, FormsModule],
  templateUrl: './mentors.component.html',
  styleUrl: './mentors.scss',
})
export class MentorsComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  mentors = signal<Mentor[]>([]);
  loading = signal(true);
  state = signal<MyMentorshipState>({
    activeMentorship: null,
    pendingRequest: null,
    canRequestNew: true,
  });

  search = '';
  specialty = 'all';
  experience = 'any';
  sort = 'name';

  /* Request modal */
  requestOpen = signal(false);
  requestTarget = signal<Mentor | null>(null);
  requestMessage = '';
  sending = signal(false);
  errorMsg = signal('');

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.myMentorship().subscribe({
      next: (s) => {
        this.state.set(s);
        this.api.mentors().subscribe({
          next: (list) => {
            // If I have an active mentor → show only that mentor
            if (s.activeMentorship) {
              const mine = list.filter(
                (m) => m.user.id === s.activeMentorship!.mentor.userId
              );
              this.mentors.set(mine);
            } else {
              this.mentors.set(list);
            }
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  /* ----- Filtering (client-side for v1) ----- */

  filtered(): Mentor[] {
    let out = this.mentors();
    const q = this.search.trim().toLowerCase();
    if (q) {
      out = out.filter((m) =>
        m.user.name.toLowerCase().includes(q) ||
        (m.church ?? '').toLowerCase().includes(q)
      );
    }
    if (this.specialty !== 'all') {
      out = out.filter((m) => m.specialties.includes(this.specialty));
    }
    return out;
  }

  /* ----- Request flow ----- */

  canRequestMentor(m: Mentor): boolean {
    const s = this.state();
    if (s.activeMentorship) return false;
    if (s.pendingRequest) return false;
    return true;
  }

  requestPendingFor(m: Mentor): boolean {
    const p = this.state().pendingRequest;
    return !!p && p.mentor.userId === m.user.id;
  }

  openRequest(m: Mentor) {
    this.requestTarget.set(m);
    this.requestMessage = '';
    this.errorMsg.set('');
    this.requestOpen.set(true);
  }

  closeRequest() {
    this.requestOpen.set(false);
    this.requestTarget.set(null);
  }

  submitRequest() {
    const mentor = this.requestTarget();
    if (!mentor) return;

    this.sending.set(true);
    this.errorMsg.set('');

    this.api.sendMentorRequest(mentor.id, this.requestMessage.trim() || undefined).subscribe({
      next: (req) => {
        this.state.update((s) => ({ ...s, pendingRequest: req, canRequestNew: false }));
        this.sending.set(false);
        this.closeRequest();
      },
      error: (e) => {
        this.errorMsg.set(e?.error?.message ?? 'Could not send request');
        this.sending.set(false);
      },
    });
  }

  /* ----- Chat with active mentor ----- */

  openChatWithMentor() {
    const active = this.state().activeMentorship;
    if (!active) return;
    this.router.navigate(['/inbox'], {
      queryParams: { user: active.mentor.userId },
    });
  }

  /* ----- End mentorship ----- */

  endMentorship() {
    const active = this.state().activeMentorship;
    if (!active) return;
    const reason = prompt('Why do you want to end this mentorship?', '');
    if (reason === null) return;
    this.api.endMentorship(active.id, reason || undefined).subscribe({
      next: () => this.load(),
    });
  }
}