import type { StrokeData } from '../../types/kanji'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'

const SPEED_KEY = 'kanji-stroke-speed'
const BASE_DURATION_MS = 800
const SPEEDS = [0.5, 1, 2] as const
type Speed = (typeof SPEEDS)[number]

interface StrokeOrderAnimationProps {
  strokes: StrokeData[]
  viewBox?: string
  className?: string
}

function loadSpeed(): Speed {
  const stored = localStorage.getItem(SPEED_KEY)
  const n = Number(stored)
  return (SPEEDS as readonly number[]).includes(n) ? (n as Speed) : 1
}

function IconSkipBack() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  )
}

function IconSkipForward() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function IconRotateCcw() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

export function StrokeOrderAnimation({ strokes, viewBox = '0 0 109 109', className }: StrokeOrderAnimationProps) {
  const pathsRef = useRef<(SVGPathElement | null)[]>([])
  const strokeLengthsRef = useRef<number[]>([])
  const animationRef = useRef<Animation | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Start in "done" state — all strokes visible
  const [currentStroke, setCurrentStroke] = useState(strokes.length)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(loadSpeed)

  // Measure path lengths and show all strokes completed on mount
  useLayoutEffect(() => {
    strokeLengthsRef.current = pathsRef.current.map(p => p?.getTotalLength?.() ?? 0)
    pathsRef.current.forEach((p, i) => {
      if (!p)
        return
      p.style.strokeDasharray = String(strokeLengthsRef.current[i])
      p.style.strokeDashoffset = '0'
    })
    // eslint-disable-next-line react/set-state-in-effect
    setCurrentStroke(strokes.length)
  }, [strokes])

  function completeStroke(index: number) {
    const p = pathsRef.current[index]
    if (p)
      p.style.strokeDashoffset = '0'
  }

  function resetStroke(index: number) {
    const p = pathsRef.current[index]
    if (!p)
      return
    p.style.strokeDashoffset = String(strokeLengthsRef.current[index])
    animationRef.current?.cancel()
    animationRef.current = null
  }

  function resetAll() {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    animationRef.current?.cancel()
    animationRef.current = null
    pathsRef.current.forEach((p, i) => {
      if (p)
        p.style.strokeDashoffset = String(strokeLengthsRef.current[i])
    })
    setCurrentStroke(-1)
    setIsPlaying(false)
  }

  async function playFrom(startIndex: number, signal: AbortSignal) {
    for (let i = startIndex; i < strokes.length; i++) {
      if (signal.aborted)
        return
      const p = pathsRef.current[i]
      if (!p)
        continue
      setCurrentStroke(i)
      const len = strokeLengthsRef.current[i]
      const duration = BASE_DURATION_MS / speed

      const anim = p.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration, fill: 'forwards', easing: 'ease-in-out' },
      )
      animationRef.current = anim
      try {
        await anim.finished
      }
      catch {
        return
      }
      if (signal.aborted)
        return
      p.style.strokeDashoffset = '0'
    }
    setIsPlaying(false)
    setCurrentStroke(strokes.length)
  }

  function handlePlay() {
    if (isPlaying) {
      animationRef.current?.pause()
      setIsPlaying(false)
      return
    }
    // If all done, hide all strokes first then replay from start
    if (currentStroke >= strokes.length) {
      pathsRef.current.forEach((p, i) => {
        if (p)
          p.style.strokeDashoffset = String(strokeLengthsRef.current[i])
      })
    }
    abortRef.current = new AbortController()
    setIsPlaying(true)
    const start = currentStroke >= strokes.length ? 0 : Math.max(0, currentStroke)
    playFrom(start, abortRef.current.signal).catch(() => {})
  }

  function handleNext() {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    animationRef.current?.cancel()
    const next = currentStroke + 1
    if (next > strokes.length)
      return
    completeStroke(Math.max(0, currentStroke))
    setCurrentStroke(next)
    setIsPlaying(false)
  }

  function handlePrev() {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    animationRef.current?.cancel()
    animationRef.current = null
    // When done, the last stroke to un-draw is at strokes.length - 1
    const activeIndex = Math.min(currentStroke, strokes.length - 1)
    const prev = activeIndex - 1
    if (prev < 0) {
      resetAll()
      return
    }
    resetStroke(activeIndex)
    setCurrentStroke(prev)
    setIsPlaying(false)
  }

  function handleSpeedChange(s: Speed) {
    setSpeed(s)
    localStorage.setItem(SPEED_KEY, String(s))
  }

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  if (strokes.length === 0)
    return null

  const isDone = currentStroke >= strokes.length
  const isReset = currentStroke < 0
  const displayCount = isDone ? strokes.length : Math.max(0, currentStroke + (isReset ? 0 : 1))

  return (
    <div className={`flex flex-col gap-4 ${className ?? ''}`}>
      {/* SVG canvas */}
      <div className="bg-card border border-border/10 p-2 flex justify-center">
        <svg
          viewBox={viewBox}
          width="200"
          height="200"
          style={{ fontFamily: 'var(--br-jp-font)' }}
        >
          {strokes.map((stroke, i) => (
            <path
              key={stroke.stroke_index}
              ref={(el) => { pathsRef.current[i] = el }}
              d={stroke.path}
              fill="none"
              stroke={
                i < currentStroke
                  ? 'oklch(43% 0.010 75)'
                  : i === currentStroke
                    ? 'oklch(71% 0.12 200)'
                    : 'transparent'
              }
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>

      {/* Stroke counter */}
      <p className="font-[var(--br-mono-font)] text-[11px] uppercase text-muted-foreground text-center">
        {`${displayCount} / ${strokes.length} strokes`}
      </p>

      {/* Controls */}
      <ButtonGroup className="w-full">
        <Button
          variant="outline"
          aria-label="Previous stroke"
          className="flex-1"
          onClick={handlePrev}
          disabled={isReset}
        >
          <IconSkipBack />
        </Button>
        <Button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex-1"
          onClick={handlePlay}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </Button>
        <Button
          variant="outline"
          aria-label="Next stroke"
          className="flex-1"
          onClick={handleNext}
          disabled={isDone}
        >
          <IconSkipForward />
        </Button>
        <Button
          variant="outline"
          aria-label="Reset"
          onClick={resetAll}
        >
          <IconRotateCcw />
        </Button>
      </ButtonGroup>

      {/* Speed selector */}
      <div className="flex items-center gap-2">
        <span className="font-[var(--br-mono-font)] text-[10px] uppercase text-muted-foreground">Speed</span>
        <ButtonGroup>
          {SPEEDS.map(s => (
            <Button
              key={s}
              variant={speed === s ? 'default' : 'outline'}
              size="xs"
              className="text-[10px] font-[var(--br-mono-font)]"
              onClick={() => handleSpeedChange(s)}
            >
              {s}
              ×
            </Button>
          ))}
        </ButtonGroup>
      </div>
    </div>
  )
}
