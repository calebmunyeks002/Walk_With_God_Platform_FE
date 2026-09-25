import { Component, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { WebSocketService } from './core/services/websocket.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {
  private auth = inject(AuthService);
  private ws = inject(WebSocketService);

  constructor() {
    // Connect whenever a user is logged in; disconnect when they log out
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.ws.connect();
      } else {
        this.ws.disconnect();
      }
    });
  }
}