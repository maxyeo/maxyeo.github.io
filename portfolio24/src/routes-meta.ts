// Single source of truth for "which paths are real, and what meta each
// carries". Plain data — no React, no Node APIs — so it can be imported by
// both the browser bundle (App.tsx) and the pre-render script's SSR entry
// (entry-server.tsx) without dragging react-dom/server into client code.
//
// All canonicalPath values are trailing-slash form, matching
// static/sitemap.xml character-for-character (see README.md "Deployment").
// Adding a route means adding it here *and* to static/sitemap.xml —
// scripts/prerender.mjs asserts the two agree and fails the build if not.

export const CANONICAL_ORIGIN = 'https://maxwellyeo.com';

export interface RouteMeta {
  canonicalPath: string;
  title: string;
  description: string;
}

export const ROUTES: RouteMeta[] = [
  {
    canonicalPath: '/',
    title: 'Maxwell Yeo | Creative Portfolio',
    description: 'Portfolio for my camera hobby — dance films and portrait photography',
  },
  {
    canonicalPath: '/stills/',
    title: 'Stills — Maxwell Yeo | Portrait Photography',
    description: 'Portrait, graduation and street photography by Maxwell Yeo — studio and natural-light portraits, couples and graduation sessions, and frames from the road.',
  },
  {
    canonicalPath: '/about/',
    title: 'About — Maxwell Yeo | Creative Portfolio',
    description: 'Maxwell Yeo shoots dance films and portraits in Los Angeles as a hobby, around a day job. Always up for creative projects — hello@maxwellyeo.com',
  },
];

// Derived, not hand-listed, so it can never drift from ROUTES.
// scripts/prerender.mjs bakes each route's title/description/canonical/OG/
// Twitter tags into its initial HTML, but that only covers a page's first
// paint — a visitor who then navigates client-side via React Router (no
// reload) would keep whichever route's tags were rendered first unless
// something rewrites them on every navigation too. App.tsx's effect is that
// something; this map is how it looks a path up to both confirm it's real
// and fetch its copy in one step.
export const ROUTES_BY_PATH = new Map(ROUTES.map((route) => [route.canonicalPath, route]));

// Every real route except the homepage. "/" is deliberately never
// pre-rendered — see scripts/prerender.mjs and the PR description for why.
export const PRERENDER_ROUTES = ROUTES.filter((route) => route.canonicalPath !== '/');

// Normalises a router pathname into the trailing-slash canonical form: strip
// every trailing slash, then add exactly one back. '/stills' -> '/stills/',
// '/stills/' -> '/stills/', '/stills//' -> '/stills/', '/' -> '/'.
export function toCanonicalPath(pathname: string): string {
  return pathname.replace(/\/+$/, '') + '/';
}
