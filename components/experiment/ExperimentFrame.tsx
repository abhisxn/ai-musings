interface ExperimentFrameProps {
  src: string
  title: string
}

export function ExperimentFrame({ src, title }: ExperimentFrameProps) {
  return (
    <iframe
      src={src}
      title={title}
      className="w-full h-full border-0"
      allow="camera; microphone; autoplay"
      allowFullScreen
    />
  )
}
