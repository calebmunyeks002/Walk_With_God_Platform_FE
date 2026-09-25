import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
bootstrapApplication(AppComponent, { providers: [provideRouter(routes, withInMemoryScrolling({scrollPositionRestoration:'top'})), provideHttpClient(withInterceptors([authInterceptor]))] }).catch(console.error);
