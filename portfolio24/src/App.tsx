import { useState } from 'react';
import { Routes, Route, Link, NavLink } from 'react-router-dom'
import { MotionPage } from './pages/motion-page/motion-page'
import { StillsPage } from './pages/stills-page/stills-page'
import { AboutPage } from './pages/about-page/about-page'
import { NotFoundPage } from './pages/not-found-page/not-found-page'
import './App.css'

function App() {
  const [menuActive, setMenuActive] = useState(false);

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
