import { stills, Still } from '../../data/stills'
import './stills-page.css'

export function StillsPage() {
  const images: Still[] = stills;

  return (
    <div id='stills'>
      <div id='stills-list'>
        {images.map((image) => (
          <img key={image.path} src={image.path} />
        ))}
      </div>
    </div>
  )
}
