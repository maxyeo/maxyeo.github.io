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

  function padZero(number: number): string {
    return (number < 10 ? '0' : '') + number
  }

  function getHours() {
    return Number(time.toLocaleTimeString('en-US', {timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit'}))
  }

  return <>
    { getHours() % 12 || 12 }
    <span className='blink'>:</span>
    { padZero(time.getMinutes()) }
    <span> </span>
    { getHours() >= 12 ? 'PM' : 'AM' }
  </>
}