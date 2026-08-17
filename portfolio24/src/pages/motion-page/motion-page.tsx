import { Video } from './video'
import { motion, Motion } from '../../data/motion'
import './motion-page.css'

// The grid is one column below 960px and two above, with `main` padded 8rem
// from the top; the first two entries are the ones plausibly above the fold.
const EAGER_COUNT = 2;

export function MotionPage() {
  const videos: Motion[] = motion;

  return (
    <div id='motion'>
      <h1 className='visually-hidden'>Motion — dance films by Maxwell Yeo</h1>
      {/* <p>I love dancing, it became my path into videography.  The human form and its movement is still one of my favorite things to shoot.</p> */}
      <div id='motion-list'>
        {videos.map((video, index) => (
          <Video
            key={video.youtube}
            youtube={video.youtube}
            name={video.name}
            eager={index < EAGER_COUNT}
          />
        ))}
      </div>
    </div>
  )
}
