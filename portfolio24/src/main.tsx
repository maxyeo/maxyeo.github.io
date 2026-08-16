import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { BrowserRouter } from "react-router-dom"

const container = document.getElementById('root')!
const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

// / ships an empty #root (see index.html) — nothing to hydrate, so it always
// takes the createRoot path, same as npm run dev. /stills/ and /about/ ship
// pre-rendered markup (scripts/prerender.mjs), so they hydrate instead:
// createRoot over existing markup calls clearContainer and rebuilds from
// scratch, which for /stills/ would detach and recreate all 39 <img> nodes,
// risking a flash and throwing away the pre-render's LCP win. If hydration
// does fail, React 19 treats it as recoverable and falls back to a full
// client render, so the downside of trying is bounded.
//
// firstElementChild, not hasChildNodes(): if index.html's #root div is ever
// reformatted with a newline inside it, hasChildNodes() would be true on /
// too and we'd try to hydrate a lone text node.
if (container.firstElementChild) {
  ReactDOM.hydrateRoot(container, app)
} else {
  ReactDOM.createRoot(container).render(app)
}
