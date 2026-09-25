import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';

interface PendingApplication {
  id: string;
  applicantId: string;
  name: string;
  email: string;
  qualifications: string;
  organization: string;
  yearsExperience: number;
  documentUrl: string;
  status: string;
  createdAt: string;
}

@Component({
  standalone: true,
  selector: 'app-admin-mentor-applications',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-mentor-applications.component.html',
  styleUrl: './admin-mentor-applications.component.scss',
})
export class AdminMentorApplicationsComponent {
  api = inject(ApiService);

  applications = signal<PendingApplication[]>([]);
  loading = signal(true);
  error = signal('');
  actionBusy = signal<string | null>(null);
  actionMessage = signal('');

  // Review dialog
  reviewDialogFor = signal<PendingApplication | null>(null);
  reviewDecision: 'APPROVED' | 'REJECTED' = 'APPROVED';
  reviewReason = '';

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api.adminMentorApplications('PENDING').subscribe({
      next: (list) => {
        this.applications.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Failed to load applications.');
        this.loading.set(false);
      },
    });
  }

  openReview(app: PendingApplication, decision: 'APPROVED' | 'REJECTED') {
    this.reviewDialogFor.set(app);
    this.reviewDecision = decision;
    this.reviewReason = '';
  }

  cancelReview() {
    this.reviewDialogFor.set(null);
    this.reviewReason = '';
  }

  confirmReview() {
    const app = this.reviewDialogFor();
    if (!app) return;

    if (this.reviewDecision === 'REJECTED' && !this.reviewReason.trim()) {
      return; // reason required for rejection
    }

    this.actionBusy.set(app.id);
    this.api
      .adminReviewApplication(app.id, this.reviewDecision, this.reviewReason.trim())
      .subscribe({
        next: () => {
          this.actionBusy.set(null);
          this.actionMessage.set(
            this.reviewDecision === 'APPROVED'
              ? `${app.name} is now a mentor.`
              : `${app.name}'s application was rejected.`
          );
          this.cancelReview();
          this.load();
        },
        error: (e) => {
          this.actionBusy.set(null);
          this.actionMessage.set(
            e?.error?.message || 'Failed to process application.'
          );
        },
      });
  }

  openDocument(url: string) {
    if (url) window.open(url, '_blank', 'noopener');
  }
}