interface VideoProps {
  /** The youtube unique identifier token */
  youtube: string;
}

export function Video({ youtube }: VideoProps) {
  return (
    <div className="video">
      <object data={"https://www.youtube.com/embed/" + youtube}></object>
    </div>
  )
}