import { Howl } from 'howler'
import { useEffect, useRef, useState } from 'react'

interface AudioButtonProps {
  audioFilename: string | null
  vocabId: string
}

export function AudioButton({ audioFilename, vocabId }: AudioButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const soundRef = useRef<Howl | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (!audioFilename || !buttonRef.current)
      return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !soundRef.current) {
          soundRef.current = new Howl({
            src: [`/audio/${audioFilename}`],
            preload: true,
            html5: true,
            onend: () => setIsPlaying(false),
            onstop: () => setIsPlaying(false),
          })
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(buttonRef.current)
    return () => observer.disconnect()
  }, [audioFilename, vocabId])

  if (!audioFilename)
    return null

  function handlePlay() {
    if (!soundRef.current || isPlaying)
      return
    setIsPlaying(true)
    soundRef.current.play()
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="btn btn-outline btn-sm font-[var(--br-mono-font)] self-start"
      onClick={handlePlay}
      disabled={isPlaying}
      aria-label={`Play pronunciation for ${vocabId}`}
    >
      {isPlaying ? '▶ PLAYING' : '▶ PLAY'}
    </button>
  )
}
