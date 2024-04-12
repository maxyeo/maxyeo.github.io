import { stills, Still } from '../../data/stills'
import './stills-page.css'

export function StillsPage() {
  const images: Still[] = stills;
  const one: Still[] = [];
  const two: Still[] = [];
  const three: Still[] = [];

  for (let i = 0; i < images.length; i++) {
    if (i % 3 === 0) {
      one.push(images[i]);
    } else if (i % 3 === 1) {
      two.push(images[i]);
    } else {
      three.push(images[i]);
    }
  }

  const mobileLayout = <div id='stills-list' className='mobile-layout'>
    <div className='stills-col'>
      {images.map((image) => (
        <img key={image.path} src={image.path} />
      ))}
    </div>
  </div>

  const desktopLayout = <div id='stills-list' className='desktop-layout'>
    <div className='stills-col'>
      {one.map((image) => (
        <img key={image.path} src={image.path} />
      ))}
    </div>
    <div className='stills-col'>
      {two.map((image) => (
        <img key={image.path} src={image.path} />
      ))}
    </div>
    <div className='stills-col'>
      {three.map((image) => (
        <img key={image.path} src={image.path} />
      ))}
    </div>
  </div>

  return (
    <div id='stills'>
      { mobileLayout }
      { desktopLayout }
    </div>
  )
}