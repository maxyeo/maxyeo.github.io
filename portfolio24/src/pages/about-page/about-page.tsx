import { Clock } from './clock'
import { getImageDimensions } from '../../data/image-dimensions'
import './about-page.css'

export function AboutPage() {
  const portrait = getImageDimensions('/archive/2024/max.webp');

  return (
    <div id='about'>
      <div className='about-col'>
        <p>Currently based in Los Angeles (<Clock/>), I'm a hobbyist camera dude with a <a target='_blank' href='https://www.linkedin.com/in/maxwellyeo'>day job</a>.  If I'm not click clacking at my desk, I'm probably wiping out on the mountains snowboarding or in the ocean surfing. </p>
        <p>Always looking to do more creative projects, send me a message at <a href='mailto:hello@maxwellyeo.com'>hello@maxwellyeo.com</a></p>
      </div>
      {/* Sole image on this route and the LCP element, so it's loaded eagerly rather than lazily. */}
      <img
        src='/archive/2024/max.webp'
        width={portrait?.width}
        height={portrait?.height}
        loading='eager'
        fetchPriority='high'
        decoding='async'
      />
    </div>
  )
}