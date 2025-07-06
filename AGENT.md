# Agent Configuration for Fiber Singles Health App

## Build & Development Commands
- **Dev server**: `npm run dev` (Vite dev server on port 8080)
- **Build**: `npm run build` (TypeScript check + Vite build)
- **Lint**: `npm run lint` (ESLint for TypeScript/React)
- **Type check**: `npm run type-check` (TypeScript compiler check)
- **Format**: `npm run format` (Prettier for TS/TSX/CSS/MD files)

## Architecture & Database
- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS + Shadcn/UI components
- **Backend**: Supabase (PostgreSQL with RLS, Auth, Storage, Edge Functions)
- **State**: React Query for data fetching, React Context for auth
- **Key folders**: `src/components/` (UI), `src/hooks/` (business logic), `src/pages/` (routes), `src/integrations/supabase/` (DB)
- **Tables**: profiles, user_tiers, points_transactions, daily_activities, community_actions, photo_challenges

## Code Style & Conventions
- **Imports**: Use `@/` alias for src imports (e.g., `@/components/ui/button`)
- **Components**: React functional components with TypeScript, use Shadcn/UI patterns
- **Styling**: Tailwind classes with design tokens, use `cn()` utility for conditional classes
- **Forms**: React Hook Form + Zod validation
- **Data**: Custom hooks for business logic, React Query for server state
- **TypeScript**: Relaxed config (noImplicitAny: false, strictNullChecks: false)
- **Naming**: camelCase for variables/functions, PascalCase for components, kebab-case for files
