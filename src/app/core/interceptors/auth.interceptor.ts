import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('wwg_token');

  // Only attach the JWT to requests going to our own backend.
  // External URLs (e.g. https://cdn.jsdelivr.net/...) must go through
  // untouched — otherwise CORS preflight rejects the Authorization header.
  const isApiRequest = req.url.startsWith('/api');

  if (token && isApiRequest) {
    return next(req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }));
  }

  return next(req);
};