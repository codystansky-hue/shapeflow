# ShapeFlow

Web-based watersports board design app using parametric NURBS geometry.

## Tech Stack

- **Monorepo**: npm workspaces (`apps/web`, `apps/api`, `packages/shared`)
- **Frontend**: React 19 + Vite 6, Three.js/React Three Fiber, Zustand, Tailwind CSS 4, verb-nurbs-web
- **Backend**: Fastify 5, PostgreSQL + Drizzle ORM, JWT auth
- **Shared**: TypeScript type definitions only (BoardDesignData, NURBSCurveData, etc.)
- **Deployment**: Railway

## Commands

```bash
npm run dev          # Run web + api in parallel
npm run dev:web      # Vite dev server on :5173 (proxies /api to :3001)
npm run dev:api      # Fastify with tsx watch on :3001
npm run build        # Build shared -> web -> api (order matters)
npm run build:shared
npm run build:web
npm run build:api
```

## Project Structure

```
apps/web/src/
  components/editors/   # NURBS curve editors (Outline, Rocker, Thickness, CrossSection)
  components/viewport/  # 3D visualization (Three.js canvas)
  components/panels/    # Measurements & Properties sidebars
  core/parametric/      # Geometry engine (Lofter, CurveUtils, BoardModel)
  stores/               # Zustand stores (boardStore, uiStore, undoStore)
  templates/            # Pre-baked board designs (shortboard, fish, longboard, SUP)

apps/api/src/
  routes/               # /api/auth, /api/boards
  db/                   # Drizzle schema (users, boards, board_versions)

packages/shared/src/
  types/board.ts        # Core type definitions
```

## Key Conventions

- Path alias `@/` maps to `apps/web/src/`
- Board geometry is fully parametric via NURBS curves (not polygonal meshes)
- Board changes auto-create `board_versions` records (built-in version control)
- Tailwind v4 with CSS variables for theming (--bg-primary, --accent, etc.)
- TypeScript strict mode, target ES2022
