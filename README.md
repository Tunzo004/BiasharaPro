# BiasharaPro

BiasharaPro is a multi-tenant business management platform for retail shops, supermarkets, hardware stores, boutiques, pharmacies, wholesale businesses, restaurants, and service businesses.

## Features
- Owner and seller role support
- Business onboarding and isolated tenant data model
- Sales and purchase entry with calculations
- Inventory tracking and stock movement alerts
- Dashboard analytics using real data
- Excel and PDF export support
- Responsive dashboard and mobile-friendly layout
- PWA-ready support
- Supabase-ready schema and Row Level Security design

## Prerequisites
- Node.js 18+
- npm 9+
- Supabase project with PostgreSQL enabled

## Local setup
1. Install dependencies:
   npm install
2. Create your environment file:
   cp .env.example .env.local
3. Update your Supabase values in `.env.local`.
4. Start the dev server:
   npm run dev

## Supabase database setup
Run the migration in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor.

## Netlify deployment
1. Push the repository to GitHub.
2. In Netlify, select "Add new site" -> "Import an existing project".
3. Use the build command:
   npm run build
4. Publish directory:
   dist
5. Add the same environment variables in Netlify site settings.

## Security notes
- Keep Supabase anon keys in the frontend only.
- Never expose the service role key in client-side code.
- Enforce tenant isolation using `business_id` and RLS policies.
- Sensitive mutations should be validated server-side in Supabase.

## Demo mode
If Supabase configuration is missing, the app runs in demo mode so layouts and business logic can be reviewed without a live database.
