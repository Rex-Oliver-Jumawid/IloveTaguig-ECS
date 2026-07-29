# ILoveTaguig ECS

ILoveTaguig ECS is a web-based Electronic Certification Service for Barangay Business Clearance applications. Business owners can apply online, upload requirements, track status updates, and download generated clearances. Barangay administrators can review submissions, manage application decisions, generate clearance PDFs, and complete release workflows.

## Tech Stack

- React 19 and Vite 6
- React Router 7
- Supabase Auth, Postgres, Storage, Row Level Security, and Edge Functions
- Tailwind CSS 4
- pdf-lib for clearance PDF generation
- Vitest for local Supabase integration tests
- ESLint for static checks

## Main Features

- Email/password authentication with confirmation and password reset flows
- Google OAuth support through Supabase Auth
- Role-based owner and admin routing
- Owner dashboard for application status, history, notifications, and settings
- Business clearance application form with document uploads
- Application review, approval, rejection, remarks, and resubmission flows
- Admin notifications for new and updated applications
- Secure document storage through Supabase Storage policies
- Clearance PDF generation through the `generate-clearance` Supabase Edge Function
- Print queue and release tracking for approved clearances

## Requirements

- Node.js
- npm
- Docker Desktop
- Supabase CLI

## Getting Started

Install dependencies:

```sh
npm install
```

Create a local environment file:

```sh
cp .env.example .env.local
```

For local Supabase development, set these values in `.env.local` from `supabase status`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon or publishable key>
```

Do not put Supabase service-role keys in frontend environment files. Service-role keys are only used by server-side scripts, tests, or Supabase Edge Functions.

Start the local Supabase stack:

```sh
supabase start
```

Apply migrations and reset the local database:

```sh
supabase db reset
```

Start the Vite development server:

```sh
npm run dev
```

Open the app at:

```text
http://localhost:5173
```

## Local Test Accounts

After Supabase is running, copy the local service-role key from `supabase status`, then seed local accounts:

```sh
SUPABASE_LOCAL_SERVICE_ROLE_KEY="<local service-role key>" npm run seed:local
```

The seeder creates these accounts with the default password `LocalDev123!`:

```text
admin@ilovetaguig.local
owner.a@ilovetaguig.local
owner.b@ilovetaguig.local
```

To use a different seed password:

```sh
SUPABASE_LOCAL_SERVICE_ROLE_KEY="<local service-role key>" \
SUPABASE_SEED_PASSWORD="<password>" \
npm run seed:local
```

## Available Scripts

```sh
npm run dev            # Start the Vite development server
npm run build          # Build production assets
npm run preview        # Preview the production build locally
npm run lint           # Run ESLint
npm run test:supabase  # Run local Supabase integration tests
npm run seed:local     # Seed local development users
```

## Testing

Run lint checks:

```sh
npm run lint
```

Run a production build:

```sh
npm run build
```

Run Supabase integration tests against the local Supabase stack:

```sh
SUPABASE_TEST_ANON_KEY="<local anon or publishable key>" \
SUPABASE_TEST_SERVICE_ROLE_KEY="<local service-role key>" \
npm run test:supabase
```

`SUPABASE_TEST_URL` defaults to `http://127.0.0.1:54321`, so it only needs to be set when testing against a different local URL.

## Routes

Owner routes:

```text
/owner
/owner/applications
/owner/applications/new
/owner/applications/:applicationId
/owner/history
/owner/notifications
/owner/settings
```

Admin routes:

```text
/admin
/admin/notifications
/admin/settings
/admin/applications/:applicationId
/admin/clearances/:applicationId
```

Auth routes:

```text
/auth
/auth/callback
/forgot-password
/reset-password
```

## Project Structure

```text
src/                         React application source
src/pages/                   Route-level page components
src/components/              Shared UI and dashboard components
src/auth/                    Auth provider, route guards, and hooks
src/lib/                     Supabase client and application data helpers
assets/images/               App image assets
assets/templates/            Barangay clearance PDF templates
supabase/migrations/         Database schema, RLS, storage, and RPC migrations
supabase/functions/          Supabase Edge Functions
scripts/                     Local seeding and PDF template helper scripts
tests/                       Supabase integration tests
docs/                        Project setup and phase documentation
context/                     Project handoff and internal context notes
public/                      Static public assets
```

## Supabase Notes

The local Supabase project is configured in `supabase/config.toml`:

```text
API:      http://127.0.0.1:54321
Database: 127.0.0.1:54322
Studio:   http://127.0.0.1:54323
Site URL: http://localhost:5173
```

The `generate-clearance` Edge Function requires a valid authenticated user JWT and uses server-side Supabase credentials from the Edge Function environment.

## Deployment

For a hosted deployment:

1. Create or select a Supabase project.
2. Apply the migrations from `supabase/migrations`.
3. Deploy `supabase/functions/generate-clearance`.
4. Configure Supabase Auth redirect URLs for the deployed frontend.
5. Configure storage buckets and policies through the included migrations.
6. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting provider.
7. Build the frontend with `npm run build`.

The repository includes `vercel.json`, so it can be deployed to Vercel after the frontend environment variables and Supabase project are configured.

## Documentation

Additional project notes are available in:

```text
docs/
context/
```
