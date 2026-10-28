import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Mentor, MentorshipRequest, MyMentorshipState } from '../../core/models/models';

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

  // Request Modal
  requestOpen = signal(false);
  requestTarget = signal<Mentor | null>(null);
  requestMessage = '';
  sending = signal(false);
  errorMsg = signal('');

  // Apply Modal
  applyOpen = signal(false);
  applyForm = {
    qualifications: '',
    organization: '',
    yearsExperience: 1,
    documentUrl: ''
  };
  applying = signal(false);
  applyError = signal('');
  applySuccess = signal(false);

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
            if (s.activeMentorship) {
              // Show only my active mentor
              this.mentors.set(list.filter(m => m.user.id === s.activeMentorship!.mentor.userId));
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

  filtered(): Mentor[] {
    let out = this.mentors();
    const q = this.search.trim().toLowerCase();
    if (q) {
      out = out.filter((m) =>
        m.user.name.toLowerCase().includes(q) ||
        (m.church ?? '').toLowerCase().includes(q) ||
        (m.specialties ?? []).some(s => s.toLowerCase().includes(q))
      );
    }
    if (this.specialty !== 'all') {
      out = out.filter((m) => m.specialties.includes(this.specialty));
    }
    if (this.experience !== 'any') {
      const min = parseInt(this.experience, 10);
      out = out.filter((m) => m.yearsExperience >= min);
    }
    if (this.sort === 'name') {
      out.sort((a, b) => a.user.name.localeCompare(b.user.name));
    } else if (this.sort === 'rating') {
      out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return out;
  }

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

  openChatWithMentor() {
    const active = this.state().activeMentorship;
    if (!active) return;
    this.router.navigate(['/inbox'], { queryParams: { user: active.mentor.userId } });
  }

  endMentorship() {
    const active = this.state().activeMentorship;
    if (!active) return;
    const reason = prompt('Why do you want to end this mentorship?', '');
    if (reason === null) return;
    this.api.endMentorship(active.id, reason || undefined).subscribe({
      next: () => this.load(),
    });
  }

  // --- Apply as Mentor ---
  openApply() {
    this.applyForm = { qualifications: '', organization: '', yearsExperience: 1, documentUrl: '' };
    this.applyError.set('');
    this.applySuccess.set(false);
    this.applyOpen.set(true);
  }

  closeApply() {
    this.applyOpen.set(false);
  }

  submitApply() {
    if (!this.applyForm.qualifications.trim()) {
      this.applyError.set('Please provide your qualifications.');
      return;
    }
    this.applying.set(true);
    this.applyError.set('');

    this.api.applyAsMentor({
      qualifications: this.applyForm.qualifications,
      organization: this.applyForm.organization || undefined,
      yearsExperience: this.applyForm.yearsExperience,
      documentUrl: this.applyForm.documentUrl || undefined,
    }).subscribe({
      next: () => {
        this.applying.set(false);
        this.applySuccess.set(true);
      },
      error: (e) => {
        this.applyError.set(e?.error?.message ?? 'Failed to submit application.');
        this.applying.set(false);
      },
    });
  }
}