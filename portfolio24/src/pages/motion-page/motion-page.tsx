import { Video } from './video'
import { motion, Motion } from '../../data/motion'
import './motion-page.css'

export function MotionPage() {
  const videos: Motion[] = motion;
  const odd: Motion[] = [];
  const even: Motion[] = [];
  for (let i = 0; i < videos.length; i++) {
    if (i % 2 === 0) {
      odd.push(videos[i]);
    } else {
      even.push(videos[i]);
    }
  }

  const mobileLayout = <div id='motion-list' className='mobile-layout'>
    <div className='motion-col'>
      {videos.map((video) => (
        <Video key={video.youtube} youtube={video.youtube}></Video>
        ))}
    </div>
  </div>

  const desktopLayout = <div id='motion-list' className='desktop-layout'>
    <div className='motion-col'>
      {odd.map((video) => (
        <Video key={video.youtube} youtube={video.youtube}></Video>
      ))}
    </div>
    <div className='motion-col'>
      {even.map((video) => (
        <Video key={video.youtube} youtube={video.youtube}></Video>
      ))}
    </div>
  </div>

  return (
    <div id='motion'>
      {/* <p>I love dancing, it became my path into videography.  The human form and its movement is still one of my favorite things to shoot.</p> */}
      { mobileLayout }
      { desktopLayout }
    </div>
  )
}