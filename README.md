# District Roleplay Forum

Community forum for District Roleplay — categories, threads, posts, direct messages, polls, application forms, search, and admin tooling. Built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default seeded admin: `admin` / `changeme123` (change in production).

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:generate` | Regenerate Prisma client |

## Features (V1+)

- Username/password authentication with bcrypt and HTTP-only session cookies
- Role-based access: USER, MODERATOR, ADMIN + granular AppRole permissions
- Forum hierarchy: Category → Forum → Thread → Post
- Direct messages, polls, forms, global search, Minecraft account linking
- Admin panel for forums, users, roles, bans, and site settings

## Project Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # UI by feature area
└── lib/           # Server logic, queries, actions, auth
prisma/
├── schema.prisma
└── migrations/
```

## Design

- Orange accent (`#E29027`) with cream/white cards
- Classic municipal forum layout
