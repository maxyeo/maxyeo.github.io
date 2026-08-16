import { useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, useLocation } from 'react-router-dom'
import { MotionPage } from './pages/motion-page/motion-page'
import { StillsPage } from './pages/stills-page/stills-page'
import { AboutPage } from './pages/about-page/about-page'
import { NotFoundPage } from './pages/not-found-page/not-found-page'
import './App.css'

// The routes that actually exist, written the way sitemap.xml writes them —
// root keeps its trailing slash, the others don't — so the canonical tag and
// the sitemap always agree character-for-character.
const CANONICAL_PATHS = new Set(['/', '/stills', '/about']);

function App() {
  const [menuActive, setMenuActive] = useState(false);
  const location = useLocation();

  // index.html ships a canonical pointing at /, which is the right guess for
  // a crawler that never runs this script. But this is a router: without
  // this effect every route would keep claiming / as canonical, which risks
  // a search engine folding /stills and /about (both listed in
  // sitemap.xml) into the homepage instead of indexing them. The not-found
  // route is deliberately left out of CANONICAL_PATHS — it isn't a page
  // worth indexing, so it just keeps pointing at the default root rather
  // than asserting a bad URL is canonical of itself.
  useEffect(() => {
    if (!CANONICAL_PATHS.has(location.pathname)) return;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = `https://maxwellyeo.com${location.pathname}`;
  }, [location.pathname]);

  return (
    <>
      <header className={ menuActive ? 'active' : '' }>
        <div id='header-wrapper'>
          <Link to='/'><h1 onClick={() => setMenuActive(false)}>Maxwell Yeo</h1></Link>
          <nav>
            <NavLink to="/" onClick={() => setMenuActive(false)}>Motion<span>,</span></NavLink>
            <NavLink to="/stills" onClick={() => setMenuActive(false)}>Stills<span>,</span></NavLink>
            <NavLink to="/about" onClick={() => setMenuActive(false)}>About</NavLink>
          </nav>
          <button id='menu-button' onClick={() => setMenuActive(!menuActive)}>
            <div id='close-menu-button'>Close</div>
            <div id='open-menu-button'>Menu</div>
          </button>
        </div>
      </header>
      <main>
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
