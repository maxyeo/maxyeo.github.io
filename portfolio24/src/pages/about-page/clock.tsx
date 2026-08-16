import { useEffect, useState } from 'react';
import './clock.css'

export function Clock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  function getLosAngelesParts() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(time)

    const hour = parts.find(part => part.type === 'hour')?.value ?? ''
    const minute = parts.find(part => part.type === 'minute')?.value ?? ''
    const dayPeriod = (parts.find(part => part.type === 'dayPeriod')?.value ?? '').replace(/\./g, '').toUpperCase()

    return { hour, minute, dayPeriod }
  }

  const { hour, minute, dayPeriod } = getLosAngelesParts()

  return <>
    { hour }
    <span className='blink'>:</span>
    { minute }
    <span> </span>
    { dayPeriod }
  </>
}