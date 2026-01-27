# XiDach

This is a modern web application built with **Next.js 16.1.3** and **Tailwind CSS 4.0**.

## Tech Stack

- **Framework:** [Next.js 16.1.3](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS 4.0](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching:** [TanStack Query v5](https://tanstack.com/query/latest)
- **Database:** [Prisma](https://www.prisma.io/) (PostgreSQL)
- **Validation:** Zod
- **Icons:** Lucide React

## Project Structure

```
src/
├── app/                 # Next.js App Router pages & layouts
├── components/          
│   ├── ui/             # shadcn/ui primitives
│   ├── shared/         # Shared app-wide components
│   └── providers.tsx   # Global providers wrapper
├── features/            # Feature-based modules
│   └── [feature]/      # e.g., auth, dashboard
│       ├── components/
│       ├── hooks/
│       └── services/
├── lib/                 # Utilities & Singletons
│   ├── prisma.ts       # Global Prisma client
│   └── utils.ts        # CN helper
└── store/               # Global Zustand stores
```

## Getting Started

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Setup Environment:**
   Copy `.env` example and configure your database URL.
   ```bash
   cp .env.example .env
   ```

3. **Database Migration:**
   ```bash
   bunx prisma migrate dev
   ```

4. **Run Development Server:**
   ```bash
   bun dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Adding Components

This project uses `shadcn/ui`. To add a new component:

```bash
bunx shadcn@latest add [component-name]
```
