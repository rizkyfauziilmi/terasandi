# Terasandi

**Your Data, Your Cloud, Your Control.**

Terasandi is a self-hosted alternative to Google Drive and similar services, built around privacy and ownership of your files.

## Overview

This repository currently contains the application foundation: authentication, first-run administrator setup, and the shared UI and database configuration. File management features are not implemented yet.

## Tech Stack

- Next.js 16 (App Router) and React 19
- TypeScript and Tailwind CSS v4
- shadcn/ui with Base UI primitives
- Better Auth with the username and admin plugins
- Drizzle ORM with PostgreSQL
- pnpm

## Prerequisites

- Node.js 20.9.0 or newer
- pnpm 12.21.0 (enable with `corepack enable`)
- Docker with Docker Compose, or an existing PostgreSQL database
- OpenSSL, to generate the auth secret

## Quick Start

```bash
cp .env.example .env
# Generate a secret and set BETTER_AUTH_SECRET in .env:
openssl rand -base64 32

corepack enable
pnpm install
pnpm db:setup
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). On a fresh database you will be redirected to `/onboarding` to create the first administrator account. After that, sign in at `/sign-in`.

## Environment Variables

| Variable | Example | Description |
| --- | --- | --- |
| `POSTGRES_USER` | `postgres` | PostgreSQL user used by the local Docker container. |
| `POSTGRES_PASSWORD` | `postgres` | Password for that user. Change it outside local development. |
| `POSTGRES_DB` | `terasandi` | Database name created by the local container. |
| `POSTGRES_PORT` | `5433` | Host port mapped to the container's port 5432. |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5433/terasandi` | Connection string used by Drizzle and Better Auth. |
| `BETTER_AUTH_SECRET` | output of `openssl rand -base64 32` | Secret used to sign and encrypt auth tokens. |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Base URL of the application. |

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the development server. |
| `pnpm build` | Create a production build. |
| `pnpm start` | Serve the production build. |
| `pnpm lint` | Run ESLint. |
| `pnpm db:up` | Start the PostgreSQL container and wait for it to be healthy. |
| `pnpm db:down` | Stop the PostgreSQL container. |
| `pnpm db:generate` | Generate a migration from `db/schema.ts`. |
| `pnpm db:migrate` | Apply pending migrations. |
| `pnpm db:push` | Push the schema directly to the database. |
| `pnpm db:studio` | Open Drizzle Studio. |
| `pnpm db:seed` | Run the seed script (currently a no-op). |
| `pnpm db:setup` | Start the database, migrate it, and run the seed script. |
| `pnpm db:reset` | **Destructive:** delete the Docker volume, then run `db:setup`. |
| `pnpm auth:generate` | Generate a Better Auth schema. |
| `pnpm auth:migrate` | Apply Better Auth migrations. |

## Database and Migrations

The schema lives in `db/schema.ts` and generated migrations live in `drizzle/`. After changing the schema, run `pnpm db:generate` and review the generated SQL before applying it with `pnpm db:migrate`. Use `pnpm db:studio` to inspect the database.

The Docker Compose setup stores data in the `postgres_data` volume. `pnpm db:reset` deletes that volume, so do not use it against data you want to keep.

## Project Structure

```text
app/(auth)/      Sign-in and first-run onboarding pages and forms
app/             Routes and root layout
components/ui/   shadcn/ui components
components/      Shared components such as the sign-out button
db/              Drizzle schema and client
drizzle/         Generated SQL migrations and snapshots
lib/             Better Auth server and client configuration
proxy.ts         Route gating for authentication and setup
scripts/         Seed script
```

## Verification

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

## License

Released under the [MIT License](LICENSE).
