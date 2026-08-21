import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Link, NavLink, useLocation } from 'react-router-dom'
import { MotionPage } from './pages/motion-page/motion-page'
import { StillsPage } from './pages/stills-page/stills-page'
import { AboutPage } from './pages/about-page/about-page'
import { NotFoundPage } from './pages/not-found-page/not-found-page'
import { ROUTES_BY_PATH, CANONICAL_ORIGIN, toCanonicalPath } from './routes-meta'
import './App.css'

// static/404.html already ships this exact title for the wire-level 404
// GitHub Pages serves before any JS runs; a client-side navigation to a dead
// path (no reload, so 404.html is never involved) gets the same copy, so the
// two never disagree about what a bad URL is called. Not in routes-meta.ts's
// ROUTES: the not-found route isn't real, isn't in sitemap.xml, and must not
// be pre-rendered or declared canonical of itself — see the URL fallback
// below, which stays independent of this.
const NOT_FOUND_META = {
  title: 'Page not found | Maxwell Yeo',
  description: "That page doesn't exist. Head back to the portfolio — dance films, portrait photography and how to get in touch.",
};

function setMetaContent(selector: string, content: string) {
  const meta = document.querySelector<HTMLMetaElement>(selector);
  if (meta) meta.content = content;
}

function App() {
  const [menuActive, setMenuActive] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Which element gets focus when the menu closes depends on how it closed:
  // Escape and the toggle button itself return focus to #menu-button (the
  // control the user just used), but a nav-link (or the wordmark) closing
  // the menu is really a route change — see the cleanup in the trap effect
  // below for why that case sends focus to #main-content instead.
  const closeFocusTargetRef = useRef<'button' | 'main'>('button');
  const location = useLocation();

  // The mobile menu's only two affordances live below 650px: #menu-button
  // (display: none above the breakpoint, App.css) and the full-viewport
  // header::before panel. Nothing in CSS unsets menuActive when the viewport
  // grows past 650px, so a phone rotated into landscape crosses the
  // breakpoint still holding an open menu — the #dedede panel keeps covering
  // the viewport and swallowing clicks while the button that would close it
  // has just been display:none'd away. Clearing the state at the crossing
  // fixes that, the inverted header.active colour and the stale
  // aria-expanded="true" on a hidden button in one move; scoping the
  // ::before rules to the media query instead would only address the first
  // of the three.
  //
  // The query is App.css's `@media (width < 650px)` inverted, range syntax
  // and all, so the breakpoint can't drift between the two files. A browser
  // too old to parse range syntax drops that media block as well, never
  // shows the button, and so never has an open menu to clear.
  //
  // No initial check to match: menuActive starts false and only the button
  // can set it, so the state cannot already be true on mount. matchMedia
  // runs in an effect because this component is also rendered by
  // scripts/prerender.mjs, where there is no window.
  useEffect(() => {
    const desktop = window.matchMedia('(width >= 650px)');
    const closeMenuOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuActive(false);
    };

    desktop.addEventListener('change', closeMenuOnDesktop);
    return () => desktop.removeEventListener('change', closeMenuOnDesktop);
  }, []);

  // The panel is header::before, a full-viewport overlay (App.css), so once
  // it's open a sighted mouse user simply can't reach anything behind it —
  // but without this effect a keyboard user could still Tab straight through
  // #menu-button and #primary-navigation into main-content, or scroll the
  // hidden page underneath. It's effectively a modal, WAI-ARIA APG's dialog
  // pattern in everything but name, and Tab order alone only stops
  // *sequential* focus: a screen reader's virtual/browse cursor (VoiceOver
  // rotor and swipe navigation, JAWS virtual cursor) walks the whole DOM
  // regardless of Tab order, so the background needs to be made inert too —
  // see below. This effect only runs while menuActive is true, so it never
  // touches focus, overflow or inert on first mount (menuActive starts
  // false, see the comment above) and always leaves all three exactly as it
  // found them once the menu closes, however that happens: Escape, a nav
  // link's own onClick, or the breakpoint effect above clearing menuActive
  // out from under it.
  useEffect(() => {
    if (!menuActive) return;

    const panel = document.getElementById('primary-navigation');
    const button = menuButtonRef.current;
    if (!panel || !button) return;

    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    // The button always leads: it precedes <nav> in DOM order (see the
    // comment on #menu-button above), so this is also real Tab order, not
    // just a convenient array to loop over.
    const getFocusable = () => [
      button,
      ...Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)),
    ];

    // Land focus inside the panel, not on the button that's already focused
    // from the click/Enter that opened it — a screen reader user needs to
    // land on the first real destination, not hear their own click echoed
    // back.
    const firstLink = panel.querySelector<HTMLElement>(focusableSelector);
    (firstLink ?? button).focus();

    // <header> (the button plus this panel) is the one thing that must stay
    // reachable; everything App renders alongside it — the skip link and
    // #main-content — sits under #root as a sibling of <header>, so walking
    // #root's own children and skipping <header> reaches exactly that
    // background content without hardcoding what it is. The native `inert`
    // attribute both removes an element from the browse/virtual-cursor order
    // screen readers use and blocks pointer and keyboard interaction with
    // it, standing in for aria-hidden here without a second attribute to
    // keep in sync. Each element's own previous .inert is captured before
    // it's overwritten — same care as previousOverflow just below takes with
    // body.style.overflow — because something else may already have marked
    // it inert, and restoring a hardcoded false on close would clobber that.
    const header = panel.closest('header');
    const backgroundElements = Array.from(document.getElementById('root')?.children ?? [])
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el !== header);
    const previousInert = backgroundElements.map((el) => el.inert);
    backgroundElements.forEach((el) => { el.inert = true; });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // The close itself (and the focus/overflow/inert cleanup below)
        // happens via the state change re-running this effect, same as any
        // other way of closing the menu — Escape doesn't need its own
        // restore logic. Escape dismisses rather than activates a
        // destination, so focus belongs back on the control that opened the
        // panel, same as the toggle button's own onClick below.
        event.preventDefault();
        closeFocusTargetRef.current = 'button';
        setMenuActive(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      const lastIndex = focusable.length - 1;
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);

      if (event.shiftKey) {
        if (currentIndex <= 0) {
          event.preventDefault();
          focusable[lastIndex].focus();
        }
      } else if (currentIndex === -1 || currentIndex === lastIndex) {
        event.preventDefault();
        focusable[0].focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Never assume the previous value was '': something else (an inline
    // style, a future feature) may already have set body.style.overflow, and
    // clobbering that on close would be its own bug.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      backgroundElements.forEach((el, index) => { el.inert = previousInert[index]; });

      // Below 650px (App.css) the panel goes display:none the moment
      // menuActive flips false, so a clicked nav link has nowhere left to
      // hold focus — the <a> itself just vanished — and leaving focus where
      // it was would drop it to <body>, losing the user's place entirely.
      // Closing via a nav link (or the wordmark) is a route change, not a
      // dismissal, so per APG's "close via menu item activation" guidance
      // focus moves forward to #main-content — the same skip-link target —
      // landing the user at the top of the page they just navigated to
      // instead of back on the hamburger they never touched.
      // closeFocusTargetRef defaults to 'button' and is only ever set to
      // 'main' by those nav/wordmark onClick handlers, so Escape and the
      // toggle button (which set it to 'button' themselves, and the
      // breakpoint-crossing effect above, which never touches it) all fall
      // through to the button-focus branch below.
      if (closeFocusTargetRef.current === 'main') {
        document.getElementById('main-content')?.focus();
        return;
      }

      // The breakpoint-crossing effect above can flip menuActive to false at
      // the exact moment #menu-button goes display:none, so this cleanup can
      // run with a button that's no longer on screen. offsetParent is null
      // for display:none elements, so this guard is what stops that rotation
      // from throwing focus onto (and visually stranding it on) a button the
      // user can no longer see.
      if (button.offsetParent !== null) button.focus();
    };
  }, [menuActive]);

  // index.html ships static defaults (title, canonical, description, and the
  // OG/Twitter tags) that are the right guess for a crawler that never runs
  // this script and lands on /. scripts/prerender.mjs bakes the correct
  // per-route values into /stills/ and /about/'s own initial HTML too — but
  // both of those only cover a page's *first* paint. Once React has
  // hydrated, further navigation between routes happens entirely client-side
  // via React Router with no reload, so without this effect every route
  // would keep whichever page's tags were rendered first: /stills/ and
  // /about/ (both listed in sitemap.xml) would carry the homepage's title
  // and description in the tab and in any share sheet that reads the live
  // DOM, and a search engine could fold them into the homepage instead of
  // indexing them separately.
  //
  // location.pathname is normalised to the trailing-slash canonical form
  // before the ROUTES_BY_PATH lookup (see toCanonicalPath) so that
  // '/stills', '/stills/' and '/stills//' all resolve the same way — react
  // router treats the trailing slash as optional when matching routes, so
  // any of those forms can legitimately end up in location.pathname. This
  // also keeps the computed value identical to what scripts/prerender.mjs
  // bakes into the pre-rendered pages, so hydration never flips the tag.
  //
  // Anything outside ROUTES_BY_PATH is the not-found route, which isn't
  // worth indexing and shouldn't declare a bad URL canonical of itself, so
  // its URL falls back to root while its title/description come from
  // NOT_FOUND_META. That URL fallback is written out rather than skipped: a
  // bare early return would strand the tag on whichever real route was
  // rendered last. Today no in-app link points anywhere invalid and 404.html
  // bounces via a full page load, so a stale value can't actually surface —
  // but that's a property of another file, not of this one, and the first
  // client-side link to a dead path would quietly turn it into a bug.
  //
  // og:image, twitter:image, og:site_name, og:type and twitter:card are
  // deliberately left out of this rewrite: they're identical on every route.
  useEffect(() => {
    const normalized = toCanonicalPath(location.pathname);
    const route = ROUTES_BY_PATH.get(normalized);
    const url = route ? `${CANONICAL_ORIGIN}${normalized}` : `${CANONICAL_ORIGIN}/`;
    const { title, description } = route ?? NOT_FOUND_META;

    document.title = title;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = url;
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:url"]', url);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);
  }, [location.pathname]);

  return (
    <>
      {/* A raw <a>, not a router Link: Link would push a route for what's
          really a same-document fragment jump, and a hash navigation fires
          hashchange rather than popstate, so location.pathname would never
          change and the meta-sync effect above would never re-run. */}
      <a className='skip-link' href='#main-content'>Skip to content</a>
      <header className={ menuActive ? 'active' : '' }>
        <div id='header-wrapper'>
          <Link to='/'><div className='wordmark' onClick={() => { closeFocusTargetRef.current = 'main'; setMenuActive(false); }}>Maxwell Yeo</div></Link>
          {/* Both labels below stay permanently mounted — App.css slides them
              past each other inside an overflow:hidden box, a purely visual
              trick, so a screen reader sees both "Close" and "Menu" at once
              and reads the button's name as "Close Menu" no matter the
              state. aria-hidden pulls both out of the accessibility tree so
              the button keeps one static name ("Menu") and aria-expanded
              carries the open/closed state instead — no state-varying name,
              which would redundantly (and confusingly) announce as
              "Close, expanded". Nav is reordered after the button: when the
              menu is open, header::before covers the viewport, so a button
              that came after the nav in tab order would send a keyboard
              visitor forward into content hidden behind the panel instead of
              into the menu they just opened. This is layout-neutral — above
              650px the button is display:none so the flex children are
              [h1, nav] either way, and below 650px the nav is
              position:absolute and out of flow. */}
          <button
            ref={menuButtonRef}
            id='menu-button'
            type='button'
            aria-expanded={menuActive}
            aria-controls='primary-navigation'
            onClick={() => { closeFocusTargetRef.current = 'button'; setMenuActive((active) => !active); }}
          >
            <span className='visually-hidden'>Menu</span>
            <div id='close-menu-button' aria-hidden='true'>Close</div>
            <div id='open-menu-button' aria-hidden='true'>Menu</div>
          </button>
          <nav id='primary-navigation' aria-label='Primary'>
            <NavLink to="/" onClick={() => { closeFocusTargetRef.current = 'main'; setMenuActive(false); }}>Motion<span>,</span></NavLink>
            {/* Trailing slash: (a) pre-rendered pages now ship a real <a href>
                link graph to a no-JS crawler pointing at the 200 URL, not a
                301; (b) client-side nav leaves the address bar on /stills/,
                so a reload is a direct 200. Safe because react router treats
                the trailing slash as optional when matching <Route path>, and
                NavLink's active check compares '/stills/' to '/stills/'. */}
            <NavLink to="/stills/" onClick={() => { closeFocusTargetRef.current = 'main'; setMenuActive(false); }}>Stills<span>,</span></NavLink>
            <NavLink to="/about/" onClick={() => { closeFocusTargetRef.current = 'main'; setMenuActive(false); }}>About</NavLink>
          </nav>
        </div>
      </header>
      <main id='main-content' tabIndex={-1}>
        <Routes>
          <Route path="/" element={<MotionPage />} />
          <Route path="/stills" element={<StillsPage />} />
          <Route path="/about" element={<AboutPage />} />
          {/* Catch-all. static/404.html bounces every unmatched path here, so
              this route — not the hosting layer — decides what is a real page.
              Adding a route above needs no change anywhere else. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  )
}

export default App
