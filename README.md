# WalkWithGod — Angular Web Platform

A purple-and-white Christian community frontend inspired by the supplied login reference. The application is organized as a scalable Angular 22 standalone application with lazy-loaded feature routes and a REST/WebSocket-ready API layer.

## Run

```bash
npm install
npm start
```

The frontend expects the Spring Boot API under `/api`. During local development the included proxy forwards `/api` to `http://localhost:8080`.

## Main screens

- Welcome/login/signup/forgot password
- Member dashboard
- Community feed, scripture posts, reactions and sharing
- Mentor discovery and mentor requests
- Bible reader/bookmarks/notes integration point
- Bible trivia
- Daily devotions
- Private inbox
- Profile and journey metrics
- Admin mentor verification

## Production notes

Use an edge/CDN for static assets, HTTPS, a WAF/rate limiter, short-lived access tokens, secure refresh-token rotation, object storage for media, Redis for caching and fan-out, PostgreSQL for durable data, and an external WebSocket broker for multi-instance messaging.
