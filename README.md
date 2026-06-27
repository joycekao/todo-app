# Todo App

A full-stack todo list application with per-user authentication.

## Overview

Users can register, log in, and manage their own private todo lists. Each user's todos are isolated — no one else can see or modify them.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)

## Running the Backend

```bash
cd TodoApi
dotnet run
```

The API will be available at `http://localhost:5000`. The SQLite database is created automatically on first run at `TodoApi/todo.db`.

To inspect the database directly, you can use the [SQLite command-line tool](https://www.sqlite.org/download.html):

```bash
sqlite3 TodoApi/todo.db
```

Or use a GUI tool such as [DB Browser for SQLite](https://sqlitebrowser.org/) and open the `todo.db` file directly.

## Running the Frontend

```bash
cd TodoClient
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## Running the Tests

### Backend

```bash
dotnet test TodoApi/Tests
```

### Frontend

```bash
cd TodoClient
npm test
```

## Assumptions

- The application is intended to be production-ready with features kept as minimal as possible. Architectural decisions prioritise security, future scalability, and operability — the codebase is deliberately structured to make these concerns easy to extend rather than bolt on later. See the [Scalability](#scalability) section for what would change as usage grows.
- Users self-register — there is no admin role, invitation system, or approval flow
- Usernames are unique and case-sensitive
- Each user manages only their own todos — there is no sharing or collaboration between users
- A single active session per user is assumed — no handling of the same account being logged in across multiple browser tabs or devices simultaneously
- The JWT secret must be provided via the `Jwt__Key` environment variable in production; the application will refuse to start if the default development secret is detected

## MVP Features

### Included

- User registration and login
- JWT-based authentication
- Per-user todo isolation
  - Users only see their own todos
- Create a todo (title only)
- Toggle a todo complete/incomplete
- Delete a todo
- Error banners on all user-facing actions
  - Users receive clear feedback whenever something unexpected occurs or an action fails, rather than experiencing a silent failure
- Inactivity-based session expiration after 30 minutes
  - Not strictly part of the MVP, but included due to its significant contribution to UX (users get clear feedback rather than silent failures) and security (reducing the window of exposure for unattended sessions)
- Rate limiting, JWT secret validation, environment-aware cookie flag, structured logging, refresh token cleanup, BCrypt work factor, and environment-based configuration — see inline comments in `Program.cs`, `AuthController.cs`, `RefreshTokenCleanupService.cs`, and `api/todos.ts`
- Frontend error boundary — unhandled React errors are caught by a top-level error boundary, preventing a blank screen; see `ErrorBoundary.tsx`
- Health check endpoint (`GET /health`) — returns the status of the application and its database connection, suitable for use by load balancers and uptime monitors
- Security headers on all API responses — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`, `Permissions-Policy`; see `Program.cs`
- Input validation on both frontend and backend
  - Usernames: 1–50 characters; passwords: 8–100 characters; todo titles: 1–200 characters. Enforced on the frontend before submission for immediate feedback, and on the backend as the authoritative check

### Out of Scope

The following features were considered but explicitly excluded from the MVP:

- Edit todo title
- Due dates, with visual indicators for overdue items
- Sorting by due date, creation date, or completion status
- Filtering by completion status
- Password management — update password while logged in, and account recovery via email
- Deployment configuration
  - No production hosting setup is included. This covers containerisation (e.g. Docker), reverse proxy setup, CI/CD pipelines, and HTTPS configuration.
  - HTTPS is a deployment-level concern — configured at the infrastructure level via a reverse proxy (e.g. Nginx, Caddy) or a cloud provider's TLS termination, not in application code. The application is HTTPS-ready: the refresh token cookie's `Secure` flag is automatically set to `true` in the production environment.

## Architecture Decisions

- **Controller-based API** over Minimal API: groups related endpoints into resource-scoped classes, keeps dependencies injected per-controller, and allows different developers or teams to own different controllers without conflict. It is also the established ASP.NET Core pattern with broader documentation and tooling support — Minimal API is better suited to small microservices where brevity is the priority. The tradeoff is more boilerplate upfront, but given the assumption that this application will grow in complexity, we are prioritising structure over brevity.
- **SQLite** (`todo.db`): file-based, zero setup, persists across restarts.
- **JWT (stateless auth)**: works cleanly with a React SPA — no server-side session storage needed. Refresh tokens were implemented as a security measure, allowing sessions to be revoked server-side on logout or expiry while keeping access tokens short-lived.
- **Structured error responses** (`{ "message": "..." }` from backend, shared `ErrorBanner` on TodoClient): consistent error surface across all endpoints and components.
- **MUI (Material UI)** for the component library: provides a polished, accessible UI out of the box without building from scratch. MUI was chosen as it is a widely adopted, well-documented general-purpose library. In a real company context, a company-specific or internally maintained component library would be used instead to ensure brand consistency. While MUI is slightly overpowered for an app of this size, it will make scaling and maintaining a consistent UI and branding much easier in the future. MUI components also handle ARIA attributes, keyboard navigation, and focus management out of the box, which would otherwise need to be implemented manually.

## Scalability

The following would need to be addressed if the application were expected to scale:

- **Database**: SQLite is unsuitable for concurrent users at scale
  - It would be replaced with SQL Server or PostgreSQL, which support connection pooling, concurrent writes, and production-grade reliability
- **Authentication secrets**: the JWT key is managed via environment variables and validated at startup
  - At scale, a dedicated secrets manager (e.g. Azure Key Vault, AWS Secrets Manager) would be more appropriate than environment variables alone
- **Frontend serving**: the Vite dev server is not suitable for production
  - The TodoClient would be built into static assets and served via a CDN or web server such as Nginx
- **UI text**: strings are centralised in `constants/strings.ts` and can be extended to an i18n file to support multiple languages and teams managing copy independently
- **API**: additional controllers and endpoints can be added cleanly given the controller-based architecture
- **Session management**: refresh tokens are currently stored in SQLite alongside user data
  - At scale, a dedicated fast store (e.g. Redis) would be more appropriate for token lookups on every refresh

## API Reference

### Health

**GET /health** — no auth required
```
Response: 200 Healthy / 503 Unhealthy
```

### Auth

**POST /api/auth/register**
```json
Request:  { "username": "alice", "password": "secret" }
Response: { "message": "User registered successfully." }
```
Validation: username 1–50 characters; password 8–100 characters.

**POST /api/auth/login**
```json
Request:  { "username": "alice", "password": "secret" }
Response: { "token": "<access-jwt>" }
```
Also sets an `HttpOnly` cookie (`refreshToken`) valid for 7 days.

**POST /api/auth/refresh** — exchanges the `refreshToken` cookie for a new access token; rotates the refresh token
```json
Response: { "token": "<access-jwt>" }
```

**POST /api/auth/logout** — revokes the refresh token server-side and clears the cookie
```json
Response: { "message": "Logged out." }
```

### Todos (all require `Authorization: Bearer <token>`)

**GET /api/todos**
```json
Response: [{ "id": 1, "title": "Buy milk", "isCompleted": false, "createdAt": "..." }]
```

**POST /api/todos**
```json
Request:  { "title": "Buy milk" }
Response: { "id": 1, "title": "Buy milk", "isCompleted": false, "createdAt": "..." }
```
Validation: title 1–200 characters.

**PUT /api/todos/{id}** — toggles `isCompleted`
```json
Response: { "id": 1, "title": "Buy milk", "isCompleted": true, "createdAt": "..." }
```

**DELETE /api/todos/{id}**
```json
Response: { "message": "Todo deleted." }
```

All error responses: `{ "message": "Human-readable error string" }`

## Auth Flow

1. User registers → password hashed with BCrypt, stored in SQLite
2. User logs in → BCrypt verifies, server returns a short-lived access token (15 min) in the response body and sets a long-lived refresh token (7 days) as an `HttpOnly` cookie
3. Frontend stores the access token in `localStorage`
4. Every API request sends `Authorization: Bearer <token>`
5. `[Authorize]` on `TodosController` rejects requests without a valid token
6. User ID is extracted from JWT claims to scope all queries — users only see their own todos
7. When the access token expires, the frontend automatically calls `POST /api/auth/refresh` with the cookie, receives a new access token, and retries the original request — transparently to the user
8. On logout or session expiry, `POST /api/auth/logout` revokes the refresh token server-side and clears the cookie
