import { useEffect } from 'react'
import { Link } from 'react-router-dom'

// static/404.html bounces *every* unmatched path into the app, so this route is
// what a visitor actually lands on for a bad URL. GitHub Pages served that
// original request as a real 404, but the bounced-to page is a 200 — a soft
// 404. Tag it noindex so crawlers don't accumulate junk URLs as valid pages.
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

export function NotFoundPage() {
  useNoIndex();

  return (
    <div id='not-found'>
      <h1>404</h1>
      <p>I can't find what you're looking for</p>
      <p><Link to='/'>Go Home</Link></p>
    </div>
  )
}
