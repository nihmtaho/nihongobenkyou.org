import { useEffect, useRef, useState } from 'react'

export interface KanjiGraphNode {
  char: string
  han_viet: string | null
  meaning_en: string[]
}

interface KanjiGraphProps {
  focusChar: string
  nodes: KanjiGraphNode[]
  onNodeClick: (char: string) => void
}

// Physics constants
const K_SPRING = 0.05
const REST_LEN = 120
const K_REP = 4000
const DAMPING = 0.88
const TIMESTEP = 0.016

interface PhysicsNode {
  char: string
  han_viet: string | null
  meaning_en: string[]
  x: number
  y: number
  vx: number
  vy: number
  isFocus: boolean
}

function isLowPowered(): boolean {
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return dm !== undefined && dm <= 2
}

// SVG radial fallback for low-powered devices
function RadialFallback({ focusChar, nodes, onNodeClick }: KanjiGraphProps) {
  const cx = 160
  const cy = 160
  const radius = 110
  const neighbors = nodes.filter(n => n.char !== focusChar)

  return (
    <svg width="320" height="320" viewBox="0 0 320 320" aria-label="Kanji relationship graph">
      {/* Edges */}
      {neighbors.map((n, i) => {
        const angle = (2 * Math.PI * i) / Math.max(neighbors.length, 1)
        const nx = cx + radius * Math.cos(angle)
        const ny = cy + radius * Math.sin(angle)
        return (
          <line key={n.char} x1={cx} y1={cy} x2={nx} y2={ny} stroke="oklch(43% 0.010 75)" strokeWidth="1" opacity="0.4" />
        )
      })}

      {/* Neighbor nodes */}
      {neighbors.map((n, i) => {
        const angle = (2 * Math.PI * i) / Math.max(neighbors.length, 1)
        const nx = cx + radius * Math.cos(angle)
        const ny = cy + radius * Math.sin(angle)
        return (
          <g key={n.char} style={{ cursor: 'pointer' }} onClick={() => onNodeClick(n.char)}>
            <circle cx={nx} cy={ny} r={24} fill="oklch(93% 0.010 80)" stroke="oklch(43% 0.010 75)" strokeWidth="1" />
            <text x={nx} y={ny + 6} textAnchor="middle" fontSize="18" fontFamily="var(--br-jp-font)" fill="oklch(13% 0.001 0)">
              {n.char}
            </text>
          </g>
        )
      })}

      {/* Focus node */}
      <circle cx={cx} cy={cy} r={34} fill="oklch(71% 0.12 200)" />
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="24" fontFamily="var(--br-jp-font)" fill="oklch(13% 0.001 0)" fontWeight="bold">
        {focusChar}
      </text>
    </svg>
  )
}

interface Popup {
  char: string
  han_viet: string | null
  meaning_en: string[]
  x: number
  y: number
}

export function KanjiGraph(props: KanjiGraphProps) {
  if (isLowPowered()) {
    return (
      <div className="flex flex-col gap-3 items-center">
        <RadialFallback {...props} />
        <p className="font-[var(--br-mono-font)] text-[10px] uppercase text-neutral">
          Static layout (low-power mode)
        </p>
      </div>
    )
  }
  return <CanvasGraph {...props} />
}

function CanvasGraph({ focusChar, nodes, onNodeClick }: KanjiGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const physicsRef = useRef<PhysicsNode[]>([])
  const rafRef = useRef<number | null>(null)
  const [popup, setPopup] = useState<Popup | null>(null)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const touchStartRef = useRef<{ dist: number, midX: number, midY: number } | null>(null)

  useEffect(() => {
    const W = 320
    const H = 320

    // Initialize physics nodes
    physicsRef.current = nodes.map((n, i) => {
      const isFocus = n.char === focusChar
      const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1)
      return {
        ...n,
        x: isFocus ? W / 2 : W / 2 + REST_LEN * Math.cos(angle),
        y: isFocus ? H / 2 : H / 2 + REST_LEN * Math.sin(angle),
        vx: 0,
        vy: 0,
        isFocus,
      }
    })

    const canvas = canvasRef.current
    if (!canvas)
      return
    const ctx = canvas.getContext('2d')
    if (!ctx)
      return

    function step() {
      const pnodes = physicsRef.current
      const focus = pnodes.find(n => n.isFocus)

      // Spring forces toward focus
      for (const node of pnodes) {
        if (node.isFocus || !focus)
          continue
        const dx = node.x - focus.x
        const dy = node.y - focus.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = K_SPRING * (dist - REST_LEN)
        node.vx -= (dx / dist) * force
        node.vy -= (dy / dist) * force
      }

      // Repulsion between all pairs
      for (let i = 0; i < pnodes.length; i++) {
        for (let j = i + 1; j < pnodes.length; j++) {
          const a = pnodes[i]
          const b = pnodes[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist2 = dx * dx + dy * dy || 1
          const force = K_REP / dist2
          const fx = (dx / Math.sqrt(dist2)) * force
          const fy = (dy / Math.sqrt(dist2)) * force
          a.vx -= fx * TIMESTEP
          a.vy -= fy * TIMESTEP
          b.vx += fx * TIMESTEP
          b.vy += fy * TIMESTEP
        }
      }

      // Update positions
      for (const node of pnodes) {
        if (node.isFocus)
          continue
        node.vx *= DAMPING
        node.vy *= DAMPING
        node.x += node.vx * TIMESTEP
        node.y += node.vy * TIMESTEP
      }

      // Draw
      if (!canvas || !ctx)
        return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(panRef.current.x, panRef.current.y)
      ctx.scale(zoomRef.current, zoomRef.current)

      // Edges
      if (focus) {
        for (const node of pnodes) {
          if (node.isFocus)
            continue
          ctx.beginPath()
          ctx.moveTo(focus.x, focus.y)
          ctx.lineTo(node.x, node.y)
          ctx.strokeStyle = 'oklch(43% 0.010 75)'
          ctx.globalAlpha = 0.3
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      // Nodes
      for (const node of pnodes) {
        const r = node.isFocus ? 32 : 22
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.fillStyle = node.isFocus ? 'oklch(71% 0.12 200)' : 'oklch(93% 0.010 80)'
        ctx.fill()
        ctx.strokeStyle = 'oklch(43% 0.010 75)'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = 'oklch(13% 0.001 0)'
        ctx.font = `${node.isFocus ? 'bold 20px' : '16px'} var(--br-jp-font, sans-serif)`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.char, node.x, node.y)
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current !== null)
        cancelAnimationFrame(rafRef.current)
    }
  }, [focusChar, nodes])

  function getClickedNode(clientX: number, clientY: number): PhysicsNode | null {
    const canvas = canvasRef.current
    if (!canvas)
      return null
    const rect = canvas.getBoundingClientRect()
    const cx = (clientX - rect.left - panRef.current.x) / zoomRef.current
    const cy = (clientY - rect.top - panRef.current.y) / zoomRef.current

    for (const node of physicsRef.current) {
      const r = node.isFocus ? 32 : 22
      const dx = cx - node.x
      const dy = cy - node.y
      if (dx * dx + dy * dy < r * r)
        return node
    }
    return null
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const node = getClickedNode(e.clientX, e.clientY)
    if (!node)
      return setPopup(null)
    if (node.isFocus)
      return

    setPopup({
      char: node.char,
      han_viet: node.han_viet,
      meaning_en: node.meaning_en,
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    })
  }

  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    if (e.touches.length === 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      touchStartRef.current = {
        dist,
        midX: (t1.clientX + t2.clientX) / 2,
        midY: (t1.clientY + t2.clientY) / 2,
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    if (e.touches.length === 2 && touchStartRef.current) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const scale = dist / touchStartRef.current.dist
      zoomRef.current = Math.max(0.3, Math.min(3, zoomRef.current * scale))
      touchStartRef.current.dist = dist
    }
  }

  return (
    <div className="relative flex flex-col gap-3 items-center">
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        className="border border-base-content/10 bg-base-200 cursor-pointer"
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        aria-label="Kanji relationship graph"
      />

      {/* Node popup */}
      {popup && (
        <div
          className="absolute bg-base-100 border border-base-content/20 p-3 flex flex-col gap-2 shadow-xl z-10"
          style={{ left: popup.x, top: popup.y, transform: 'translate(8px, -50%)' }}
        >
          <p className="text-3xl font-bold" style={{ fontFamily: 'var(--br-jp-font)' }}>{popup.char}</p>
          <p className="font-[var(--br-heading-font)] font-bold uppercase">{popup.han_viet ?? '—'}</p>
          <p className="text-xs text-neutral">{popup.meaning_en.slice(0, 2).join(', ')}</p>
          <button
            type="button"
            className="btn btn-xs btn-primary font-[var(--br-mono-font)] uppercase"
            onClick={() => {
              setPopup(null)
              onNodeClick(popup.char)
            }}
          >
            View Details →
          </button>
        </div>
      )}
    </div>
  )
}
