import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Media } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private http = inject(HttpClient);
  private base = '/api/media';

  /** Uploads a file with progress reporting. Returns Media metadata on success. */
  upload(file: File, videoDuration?: number): Observable<HttpEvent<Media>> {
    const form = new FormData();
    form.append('file', file);
    if (videoDuration != null) form.append('duration', String(videoDuration));

    const req = new HttpRequest<FormData>('POST', `${this.base}/upload`, form, {
      reportProgress: true,
    });
    return this.http.request<Media>(req);
  }

  /** Direct URL for rendering in <img> or <video> — the JWT is added by your interceptor. */
  rawUrl(mediaId: string): string {
    return `${this.base}/${mediaId}/raw`;
  }

  delete(mediaId: string) {
    return this.http.delete<void>(`${this.base}/${mediaId}`);
  }
}