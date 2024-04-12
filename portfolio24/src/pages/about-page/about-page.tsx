import { Clock } from './clock'
import './about-page.css'

export function AboutPage() {
  return (
    <div id='about'>
      <div className='about-col'>
        <p>Currently based in the Los Angeles area (<Clock/>), I'm a hobbyist camera dude with a <a target='_blank' href='https://www.linkedin.com/in/maxwellyeo'>day job</a>.  If I'm not click clacking at my desk, I'm probably wiping out on the mountains snowboarding or in the ocean surfing. </p>
        <p>Always looking to do more creative projects, send me a message at <a href='mailto:hello@maxwellyeo.com'>hello@maxwellyeo.com</a></p>
      </div>
      <img src='/archive/2024/max.webp' />
    </div>
  )
}