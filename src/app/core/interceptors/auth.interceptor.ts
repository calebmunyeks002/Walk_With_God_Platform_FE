import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('wwg_token');

  // Determine if this request is headed to our backend.
  // In dev, api.service builds URLs like "/api/posts" (relative).
  // In prod, apiBaseInterceptor has already prepended the backend host,
  // so req.url looks like "https://walk-with-god-platform-api.onrender.com/api/posts".
  const apiHost = environment.apiUrl;   // '' in dev, absolute in prod
  const isApiRequest = apiHost
    ? req.url.startsWith(apiHost + '/api')
    : req.url.startsWith('/api');

  if (token && isApiRequest) {
    return next(req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }));
  }

  return next(req);
};