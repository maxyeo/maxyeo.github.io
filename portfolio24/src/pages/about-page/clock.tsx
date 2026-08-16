import { useEffect, useState } from 'react';
import './clock.css'

export function Clock() {
  // Starts null rather than `new Date()`: this component is now also
  // rendered server-side (scripts/prerender.mjs, /about/), and a build-time
  // clock can never equal a page-load clock — that's a guaranteed hydration
  // mismatch. Server output and the first client render both take the null
  // branch below, so they're byte-identical and there's nothing to
  // reconcile. The effect fills in the real time immediately (not a second
  // later), so the placeholder is on screen for at most a single frame.
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    // Named so the immediate call below and the recurring one are visibly
    // the same subscription tick, not a bare synchronous setState in the
    // effect body (which react-hooks/set-state-in-effect flags as a
    // cascading-render risk) — this one is deliberate: it's what shrinks the
    // placeholder window from a full second down to a single frame.
    const tick = () => setTime(new Date())
    tick()
    const intervalId = setInterval(tick, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  function getLosAngelesParts(at: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(at)

    const hour = parts.find(part => part.type === 'hour')?.value ?? ''
    const minute = parts.find(part => part.type === 'minute')?.value ?? ''
    const dayPeriod = (parts.find(part => part.type === 'dayPeriod')?.value ?? '').replace(/\./g, '').toUpperCase()

    return { hour, minute, dayPeriod }
  }

  // Server + first client render agree exactly (both take this branch), so
  // there's no hydration mismatch to suppress.
  if (!time) return <span aria-hidden="true">—</span>

  const { hour, minute, dayPeriod } = getLosAngelesParts(time)

  return <>
    { hour }
    <span className='blink'>:</span>
    { minute }
    <span> </span>
    { dayPeriod }
  </>
}