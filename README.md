# ChaiForms

Production-style Typeform-inspired form builder SaaS built from the required Turborepo starter.

## Stack

- Turborepo monorepo with separate `apps/web` and `apps/api`
- Next.js frontend
- Express API with tRPC
- Zod shared schemas and response validation
- Drizzle ORM with Postgres persistence
- Scalar API documentation from generated OpenAPI
- Shared `@repo/forms` package for schemas, types, seed data and validation helpers

## Seeded Demo Credentials

- Email: `demo@chaiforms.dev`
- Password: `chaiforms123`

Real users can also sign up at `/auth` with their own email and password.

## Product Surface

- Landing page: `http://localhost:3000`
- Pricing page: `http://localhost:3000/pricing`
- Public explore gallery: `http://localhost:3000/explore`
- Creator dashboard: `http://localhost:3000/dashboard`
- Public form links:
  - `http://localhost:3000/forms/startup-sprint-2026`
  - `http://localhost:3000/forms/anime-night-rsvp`
  - `http://localhost:3000/forms/os-beta-feedback`
- Scalar API docs: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Features

- Creator signup and login with database-backed sessions
- Optional Google sign up/sign in through OAuth
- Email verification for email/password accounts
- First-run onboarding profile capture with name, contact, occupation, organization and locked account email
- Settings area for general profile settings, subscription details and account deletion
- Create, publish, unpublish, clone and preview forms
- Dynamic field schema with required/optional validation rules
- Field types: short text, long text, email, number, single select, multi select, checkbox, rating and date
- Public and unlisted visibility modes
- Public submissions without login
- Unpublished, expired, password-protected and invalid form handling
- Zod validation for form configuration and submitted responses
- Persistent database-backed rate limiting and honeypot support on public response submission
- Analytics cards, 7-day response trends, response table and CSV export
- Response filtering and pagination for creator response management
- Configurable dashboard builder controls for field type, labels, required rules and select options
- Email notification events queued for creator alerts and respondent thank-you emails
- Seeded forms, themes, responses and analytics for demo review
- API documentation with Scalar

## Local Setup

```bash
corepack pnpm@9.0.0 install
cp .env.example .env
corepack pnpm@9.0.0 docker:up
corepack pnpm@9.0.0 db:migrate
corepack pnpm@9.0.0 db:seed
```

Run the API and web app in two terminals:

```bash
corepack pnpm@9.0.0 dev:api
```

```bash
corepack pnpm@9.0.0 dev:web
```

The API runs on `http://localhost:8000` and the web app runs on `http://localhost:3000`.

## Database

Drizzle models live in `packages/database/models`. The schema includes:

- `users`
- `sessions`
- `forms`
- `form_responses`
- `email_events`

Generate migrations with:

```bash
corepack pnpm@9.0.0 db:generate
```

Run migrations with:

```bash
corepack pnpm@9.0.0 db:migrate
```

Seed demo data with:

```bash
corepack pnpm@9.0.0 db:seed
```

## API Notes

Protected creator routes expect:

```http
Authorization: Bearer <session-token-from-/authentication/login>
```

The dashboard calls `/authentication/demo-login` for the seeded account. Public response submission is available without authentication. Unlisted forms are not returned by the explore endpoint, but a direct slug can still be opened when the form is published.

## Deployment

Deploy `apps/web` and `apps/api` as separate services from the same repository.

Required production environment variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `BASE_URL`
- `WEB_URL`
- `NEXT_PUBLIC_API_URL`

Optional Google OAuth variables:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

Set `NEXT_PUBLIC_API_URL` in the web app to the API tRPC endpoint and `BASE_URL` in the API to its public URL so Scalar/OpenAPI links are correct. Run `db:migrate` and `db:seed` once against the production database before judging the demo.
