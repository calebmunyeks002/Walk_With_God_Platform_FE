import {
  ApplicationConfig,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { apiBaseInterceptor } from './core/interceptors/api-base.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // --- Change detection ---
    provideZoneChangeDetection({ eventCoalescing: true }),

    // --- Router ---
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      withRouterConfig({ onSameUrlNavigation: 'reload' })
    ),

    // --- HTTP client + interceptors ---
    // ORDER MATTERS: apiBaseInterceptor MUST run first to rewrite
    // relative /api URLs to the absolute backend URL. Then authInterceptor
    // sees the absolute URL and can properly attach the JWT.
    provideHttpClient(
      withInterceptors([
        apiBaseInterceptor,
        authInterceptor,
      ])
    ),
  ],
};