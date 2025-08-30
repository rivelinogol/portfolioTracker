# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production app with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

This is a Next.js 15 portfolio tracker application using the App Router with Tailwind v4 for styling.

**Project Structure:**
- `/src/app/` - Next.js App Router pages and layouts
- `/src/app/cartera/` - Portfolio page displaying investment holdings
- `/public/data/portfolio.json` - Mock portfolio data
- Uses TypeScript with strict mode enabled
- Path aliases: `@/*` maps to `./src/*`

**Key Features:**
- Dark mode by default (configured in root layout)
- Dense table layout for portfolio display
- Spanish locale formatting for numbers
- Server-side data fetching from JSON file
- Responsive design with sticky table headers

**Data Model:**
Portfolio holdings include: ticker, name, quantity, avgCost, currency

**Styling:**
- Tailwind v4 with PostCSS
- Dark theme using gray-950/900/800 color palette
- Custom table-dense utility class
- Tabular numbers for numerical data alignment