# District Roleplay Forum

A classic municipal forum for the District Roleplay community. Built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Features (V1)

- Username/password authentication with bcrypt and HTTP-only session cookies
- Role-based access: USER, MODERATOR, ADMIN
- Forum hierarchy: Category → Forum → Thread → Post
- Forum index with category sections and latest activity

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file and configure your database:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection string.

3. Push the schema and seed sample data:

```bash
npm run db:push
npm run db:seed
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the forum index.

### Default Admin Account

After seeding:

- **Username:** `admin`
- **Password:** `changeme123`

Change this password immediately in production.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/auth/           # Register, login, logout, session
│   └── page.tsx            # Forum index
├── components/
│   ├── forum/              # Forum-specific UI components
│   ├── layout/             # Header, footer
│   └── ui/                 # Shared UI primitives
└── lib/
    ├── auth/               # Password hashing, sessions, validation
    ├── forum/              # Forum data queries
    └── prisma.ts           # Prisma client singleton
prisma/
├── schema.prisma           # Database schema
└── seed.ts                 # Sample categories and forums
```

## Design

- Dark charcoal background with orange accent (`#E29027`)
- Desktop-first classic forum layout
- Professional city/government aesthetic
