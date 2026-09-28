import {
  Component, EventEmitter, Output, signal, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { MediaService } from '../../../../core/services/media.service';
import { Media } from '../../../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-media-uploader',
  imports: [CommonModule],
  templateUrl: './media-uploader.component.html',
  styleUrl: './media-uploader.component.scss',
})
export class MediaUploaderComponent {
  @Output() uploaded = new EventEmitter<Media>();
  @Output() cleared = new EventEmitter<void>();

  private api = inject(MediaService);

  selected = signal<Media | null>(null);
  previewUrl = signal<string | null>(null);
  previewType = signal<'IMAGE' | 'VIDEO' | null>(null);
  progress = signal<number>(0);
  uploading = signal(false);
  error = signal('');

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  private handleFile(file: File) {
    this.error.set('');
    this.progress.set(0);
    this.uploading.set(true);

    // For videos, read duration client-side before uploading.
    const proceed = (duration?: number) => {
      this.api.upload(file, duration).subscribe({
        next: (ev) => {
          if (ev.type === HttpEventType.UploadProgress && ev.total) {
            this.progress.set(Math.round((ev.loaded / ev.total) * 100));
          } else if (ev.type === HttpEventType.Response && ev.body) {
            const media = ev.body;
            this.selected.set(media);
            this.previewUrl.set(this.api.rawUrl(media.id));
            this.previewType.set(media.type);
            this.uploading.set(false);
            this.uploaded.emit(media);
          }
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Upload failed');
          this.uploading.set(false);
        },
      });
    };

    if (file.type.startsWith('video/')) {
      this.readVideoDuration(file).then(proceed).catch(() => proceed());
    } else {
      proceed();
    }
  }

  /** Read the duration of a local video file using a hidden <video>. */
  private readVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(v.duration);
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Cannot read video'));
      };
      v.src = url;
    });
  }

  clear() {
    this.selected.set(null);
    this.previewUrl.set(null);
    this.previewType.set(null);
    this.progress.set(0);
    this.cleared.emit();
  }

  humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}