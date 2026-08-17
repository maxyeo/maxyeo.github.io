import { stills, Still } from '../../data/stills'
import { getImageDimensions } from '../../data/image-dimensions'
import './stills-page.css'

// Below the 960px breakpoint the grid is a single column, so the first 3
// images are reliably above the fold; render those eagerly and defer the
// rest. (Above 960px the grid becomes 3 columns and fills column 1 first, so
// this is exact for the single-column layout and a reasonable approximation
// for the multi-column one.)
const EAGER_COUNT = 3;

export function StillsPage() {
  const images: Still[] = stills;

  return (
    <div id='stills'>
      <h1 className='visually-hidden'>Stills — portrait photography by Maxwell Yeo</h1>
      <div id='stills-list'>
        {images.map((image, index) => {
          const dimensions = getImageDimensions(image.path);
          const eager = index < EAGER_COUNT;
          return (
            <img
              key={image.path}
              src={image.path}
              alt={image.alt}
              width={dimensions?.width}
              height={dimensions?.height}
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : undefined}
              decoding='async'
            />
          )
        })}
      </div>
    </div>
  )
}
