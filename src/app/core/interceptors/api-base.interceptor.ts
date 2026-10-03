import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Rewrites relative API URLs (/api/...) to the absolute backend URL
 * when running in production.
 *
 * In development, environment.apiUrl is '' so requests stay relative
 * and the Angular dev proxy forwards them to localhost:8080.
 *
 * In production, environment.apiUrl is the Render backend URL and
 * requests become absolute — bypassing the proxy which doesn't exist
 * on a static host.
 *
 * Non-API requests (external CDNs, jsdelivr, etc.) are left untouched.
 */
export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBase = environment.apiUrl;

  // Only rewrite relative requests that start with /api (and only when
  // we have an absolute base to prepend).
  if (apiBase && req.url.startsWith('/api')) {
    const absolute = apiBase + req.url;
    return next(req.clone({ url: absolute }));
  }

  return next(req);
};