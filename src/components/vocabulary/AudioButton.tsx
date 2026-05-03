import { Howl } from 'howler'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

interface AudioButtonProps {
  audioFilename: string | null
  vocabId: string
  rate?: number
}

export function AudioButton({ audioFilename, vocabId, rate = 1.0 }: AudioButtonProps) {
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
    soundRef.current.rate(rate)
    soundRef.current.play()
  }

  return (
    <Button
      ref={buttonRef}
      variant="outline"
      size="sm"
      className="font-[var(--br-mono-font)] self-start"
      onClick={handlePlay}
      disabled={isPlaying}
      aria-label={`Play pronunciation for ${vocabId}`}
    >
      {isPlaying ? '▶ PLAYING' : '▶ PLAY'}
    </Button>
  )
}
