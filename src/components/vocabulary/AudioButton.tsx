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
  const [isHalf, setIsHalf] = useState(false)

  // Actual playback rate: half-speed toggle applies on top of external rate prop
  const actualRate = (isHalf ? 0.5 : 1.0) * rate

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
    soundRef.current.rate(actualRate)
    soundRef.current.play()
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
        aria-label={`Play pronunciation for ${vocabId}${isHalf ? ` at ${actualRate}x speed` : ''}`}
      >
        {isPlaying ? '▶ PLAYING' : '▶ PLAY'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="font-[var(--br-mono-font)] text-[11px] px-2 text-muted-foreground"
        onClick={() => setIsHalf(h => !h)}
        aria-label={`Playback speed: ${isHalf ? '½x' : '1x'} — click to toggle`}
      >
        {isHalf ? '½x' : '1x'}
      </Button>
    </div>
  )
}
