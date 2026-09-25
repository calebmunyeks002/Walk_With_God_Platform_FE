import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';

type ReportType =
  | 'USERS'
  | 'MENTORS'
  | 'COMMUNITY'
  | 'MODERATION'
  | 'AUDIT'
  | 'DEVOTIONS'
  | 'TRIVIA';
  
type ExportFormat = 'CSV' | 'XLSX' | 'PDF';

interface PreviewResult {
  title: string;
  subtitle: string;
  columns: string[];
  rows: string[][];
  totalRows: number;
}

@Component({
  standalone: true,
  selector: 'app-admin-report-builder',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-report-builder.component.html',
  styleUrl: './admin-report-builder.component.scss',
})
export class AdminReportBuilderComponent {
  api = inject(ApiService);

  // Form
  reportType: ReportType = 'USERS';
  format: ExportFormat = 'CSV';
  fromDate = '';
  toDate = '';
  searchText = '';

  // Preview state
  preview = signal<PreviewResult | null>(null);
  previewLoading = signal(false);
  previewError = signal('');
  downloading = signal(false);
  downloadMessage = signal('');

    readonly reportTypes: { value: ReportType; label: string; description: string }[] = [
    { value: 'USERS',      label: 'Users Report',            description: 'All users with roles, status, and join dates.' },
    { value: 'MENTORS',    label: 'Mentor Activity Report',  description: 'Mentorship requests, statuses, and responses.' },
    { value: 'COMMUNITY',  label: 'Community Activity Report', description: 'All posts with author and engagement data.' },
    { value: 'MODERATION', label: 'Moderation Report',       description: 'Posts hidden by moderators with reasons.' },
    { value: 'AUDIT',      label: 'Audit Trail Report',      description: 'Full system audit log with actor and IP.' },
    { value: 'DEVOTIONS',  label: 'Devotions Report',        description: 'All devotions with publish and featured status.' },
    { value: 'TRIVIA',     label: 'Trivia Report',           description: 'All trivia questions by difficulty.' },
  ];

  readonly formats: { value: ExportFormat; label: string }[] = [
    { value: 'CSV', label: 'CSV (.csv)' },
    { value: 'XLSX', label: 'Excel (.xlsx)' },
    { value: 'PDF', label: 'PDF (.pdf)' },
  ];

  loadPreview() {
    this.previewLoading.set(true);
    this.previewError.set('');
    this.preview.set(null);

    this.api
      .reportPreview({
        type: this.reportType,
        from: this.fromDate || undefined,
        to: this.toDate || undefined,
        search: this.searchText.trim() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.preview.set(r);
          this.previewLoading.set(false);
        },
        error: (e) => {
          this.previewError.set(
            e?.error?.message || 'Failed to load preview.'
          );
          this.previewLoading.set(false);
        },
      });
  }

  download() {
    this.downloading.set(true);
    this.downloadMessage.set('');

    try {
      this.api.downloadReport({
        type: this.reportType,
        format: this.format,
        from: this.fromDate || undefined,
        to: this.toDate || undefined,
        search: this.searchText.trim() || undefined,
      });

      this.downloadMessage.set(
        `Download started — ${this.reportType} as ${this.format}.`
      );
    } catch (e) {
      this.downloadMessage.set('Download failed.');
    } finally {
      this.downloading.set(false);
    }
  }

  clearFilters() {
    this.fromDate = '';
    this.toDate = '';
    this.searchText = '';
    this.preview.set(null);
  }

  selectedReportDescription(): string {
    return (
      this.reportTypes.find((r) => r.value === this.reportType)?.description ??
      ''
    );
  }
}