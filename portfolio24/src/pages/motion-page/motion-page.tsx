import { Video } from './video'
import { motion, Motion } from '../../data/motion'
import './motion-page.css'

export function MotionPage() {
  const videos: Motion[] = motion;

  return (
    <div id='motion'>
      {/* <p>I love dancing, it became my path into videography.  The human form and its movement is still one of my favorite things to shoot.</p> */}
      <div id='motion-list'>
        {videos.map((video) => (
          <Video key={video.youtube} youtube={video.youtube}></Video>
        ))}
      </div>
    </div>
  )
}
