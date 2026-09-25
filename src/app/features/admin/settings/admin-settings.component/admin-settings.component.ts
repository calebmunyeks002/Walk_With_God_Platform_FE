import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';

interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  valueType: 'STRING' | 'BOOLEAN' | 'INT';
  category: string;
  description: string;
  updatedAt?: string | null;
}

@Component({
  standalone: true,
  selector: 'app-admin-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
})
export class AdminSettingsComponent {
  api = inject(ApiService);

  grouped = signal<Record<string, PlatformSetting[]>>({});
  loading = signal(true);
  error = signal('');
  saving = signal<string | null>(null);
  actionMessage = signal('');

  /** Local edit buffer: key → value */
  editBuffer: Record<string, string> = {};

  /** Category metadata for display */
  categoryMeta: Record<string, { label: string; icon: string; description: string }> = {
    GENERAL:     { label: 'General',      icon: '⚙', description: 'Site identity and contact information.' },
    COMMUNITY:   { label: 'Community',    icon: '💬', description: 'Posting, commenting, and content rules.' },
    MENTORSHIP:  { label: 'Mentorship',   icon: '✦', description: 'Mentor applications and limits.' },
    TRIVIA:      { label: 'Trivia',       icon: '?', description: 'Quiz settings and difficulty.' },
    DEVOTIONS:   { label: 'Devotions',    icon: '📖', description: 'Daily devotion publication rules.' },
    MODERATION:  { label: 'Moderation',   icon: '⚠', description: 'Auto-moderation thresholds.' },
    SAFETY:      { label: 'Safety',       icon: '🛡', description: 'Maintenance mode and platform availability.' },
  };

  /** Order in which categories are displayed */
  categoryOrder: string[] = ['GENERAL', 'COMMUNITY', 'MENTORSHIP', 'TRIVIA', 'DEVOTIONS', 'MODERATION', 'SAFETY'];

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.editBuffer = {};

    this.api.adminSettingsGrouped().subscribe({
      next: (groups) => {
        this.grouped.set(groups);
        // Initialize edit buffer with current values
        Object.values(groups).flat().forEach((s: any) => {
          this.editBuffer[s.key] = s.value;
        });
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Failed to load settings.');
        this.loading.set(false);
      },
    });
  }

  /** Categories in display order, filtered to those that actually exist. */
  visibleCategories(): string[] {
    const present = Object.keys(this.grouped());
    return this.categoryOrder.filter((c) => present.includes(c));
  }

  categoryLabel(cat: string): string {
    return this.categoryMeta[cat]?.label ?? cat;
  }
  categoryIcon(cat: string): string {
    return this.categoryMeta[cat]?.icon ?? '⚙';
  }
  categoryDescription(cat: string): string {
    return this.categoryMeta[cat]?.description ?? '';
  }

  /** Has this setting been changed in the buffer? */
  isDirty(s: PlatformSetting): boolean {
    return this.editBuffer[s.key] !== s.value;
  }

  /** Any setting dirty anywhere? */
  hasAnyDirty(): boolean {
    return Object.values(this.grouped()).flat().some((s: any) => this.isDirty(s));
  }

  /** Save a single setting. */
  saveOne(s: PlatformSetting) {
    if (!this.isDirty(s)) return;

    this.saving.set(s.key);
    const newValue = this.editBuffer[s.key];

    this.api.adminUpdateSetting(s.key, newValue).subscribe({
      next: () => {
        this.saving.set(null);
        this.actionMessage.set(`Saved: ${s.key}`);

        // Reflect in the source data
        const groups = { ...this.grouped() };
        const list = groups[s.category].map((item) =>
          item.key === s.key ? { ...item, value: newValue } : item
        );
        groups[s.category] = list;
        this.grouped.set(groups);
      },
      error: (e) => {
        this.saving.set(null);
        this.actionMessage.set(e?.error?.message || 'Failed to save.');
      },
    });
  }

  /** Save every dirty setting in bulk. */
  saveAll() {
    const updates: Record<string, string> = {};
    Object.values(this.grouped()).flat().forEach((s: any) => {
      if (this.isDirty(s)) updates[s.key] = this.editBuffer[s.key];
    });

    if (Object.keys(updates).length === 0) return;

    this.saving.set('__bulk__');
    this.api.adminBulkUpdateSettings(updates).subscribe({
      next: () => {
        this.saving.set(null);
        this.actionMessage.set(`Saved ${Object.keys(updates).length} settings.`);
        this.load();
      },
      error: (e) => {
        this.saving.set(null);
        this.actionMessage.set(e?.error?.message || 'Bulk save failed.');
      },
    });
  }

  /** Reset the local edit buffer to whatever's on the server. */
  resetChanges() {
    this.editBuffer = {};
    Object.values(this.grouped()).flat().forEach((s: any) => {
      this.editBuffer[s.key] = s.value;
    });
  }

  /** UI-friendly name from key. */
  humanKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  /** Boolean helper. */
  isBoolean(s: PlatformSetting): boolean {
    return s.valueType === 'BOOLEAN';
  }
  isInt(s: PlatformSetting): boolean {
    return s.valueType === 'INT';
  }

  /** Bool toggle. */
  toggleBoolean(s: PlatformSetting) {
    const current = this.editBuffer[s.key] === 'true';
    this.editBuffer[s.key] = current ? 'false' : 'true';
    this.saveOne(s);
  }

  /** Value as bool for checkbox. */
  boolValue(s: PlatformSetting): boolean {
    return this.editBuffer[s.key] === 'true';
  }
}