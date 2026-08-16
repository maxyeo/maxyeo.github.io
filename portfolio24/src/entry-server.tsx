// Server-side render entry, loaded by scripts/prerender.mjs via Vite's
// ssrLoadModule (a real dev-server module graph, so .tsx, CSS side-effect
// imports, resolveJsonModule and import.meta.env all work exactly as they
// do for the client build). Not part of the client bundle — nothing here is
// imported from main.tsx.
//
// A future simplification: Vite 8.2's `runnerImport()` can replace the
// ssrLoadModule + createServer(middlewareMode) dance in prerender.mjs with a
// single call, but it's typed @experimental in the installed version, so
// this stays on the stable API for now.
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './App'
import { PRERENDER_ROUTES } from './routes-meta'

// A wrapping function rather than `export { PRERENDER_ROUTES } from
// './routes-meta'`: eslint-plugin-react-refresh's only-export-components
// rule (react-refresh/only-export-components, required by lint's
// --max-warnings 0) can't see through a re-export to know it isn't a
// component, and flags it; a local function it can see into is fine.
export function getPrerenderRoutes() {
  return PRERENDER_ROUTES
}

// renderToString, not renderToStaticMarkup: the latter drops the <!-- -->
// text-node separators hydrateRoot relies on to match up adjacent text
// children, and the About page has exactly that shape ("Currently based in
// Los Angeles (<Clock/>), I'm a hobbyist..."). Losing those separators would
// make client hydration reconcile the wrong text nodes.
export function render(url: string): string {
  return renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </React.StrictMode>,
  )
}
