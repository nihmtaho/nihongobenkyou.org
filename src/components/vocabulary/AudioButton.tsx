import { Howl } from 'howler'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

interface AudioButtonProps {
  audioFilename: string | null
  vocabId: string
  rate?: number
}

export function AudioButton({ audioFilename, vocabId, rate = 1.0 }: AudioButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const soundRef = useRef<Howl | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [speed, setSpeed] = useState<0.5 | 1.0>(rate <= 0.5 ? 0.5 : 1.0)

  useEffect(() => {
    if (!audioFilename || !containerRef.current)
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
            onloaderror: () => {
              setIsPlaying(false)
              setHasError(true)
            },
            onplayerror: () => {
              setIsPlaying(false)
              setHasError(true)
            },
          })
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [audioFilename, vocabId])

  if (!audioFilename)
    return null

  function handlePlay() {
    if (!soundRef.current || isPlaying || hasError)
      return
    setIsPlaying(true)
    soundRef.current.rate(speed)
    soundRef.current.play()
  }

  function toggleSpeed() {
    setSpeed(s => s === 1.0 ? 0.5 : 1.0)
  }

  if (hasError) {
    return (
      <span className="font-[var(--br-mono-font)] text-[11px] text-muted-foreground self-start" aria-label="Audio unavailable">
        ✕ AUDIO
      </span>
    )
  }

  return (
    <div ref={containerRef} className="flex items-center gap-1 self-start">
      <Button
        variant="outline"
        size="sm"
        className="font-[var(--br-mono-font)]"
        onClick={handlePlay}
        disabled={isPlaying}
        aria-label={`Play pronunciation for ${vocabId}${speed === 0.5 ? ' at 0.5x speed' : ''}`}
      >
        {isPlaying ? '▶ PLAYING' : '▶ PLAY'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="font-[var(--br-mono-font)] text-[11px] px-2 text-muted-foreground"
        onClick={toggleSpeed}
        aria-label={`Playback speed: ${speed}x — click to toggle`}
      >
        {speed === 1.0 ? '1x' : '½x'}
      </Button>
    </div>
  )
}
