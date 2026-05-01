import * as React from 'react'

const RT_STYLE: React.CSSProperties = {
  fontFamily: 'var(--br-mono-font)',
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontStyle: 'normal',
  fontWeight: 700,
  color: 'var(--color-primary)',
}

interface AnnotatedWordProps {
  word: string
  hanVietMap: Map<string, string>
  className?: string
}

export function AnnotatedWord({ word, hanVietMap, className = '' }: AnnotatedWordProps) {
  return (
    <span className={className} style={{ fontFamily: 'var(--br-jp-font)' }}>
      {[...word].map((char, i) => {
        const hv = hanVietMap.get(char)
        const charKey = `${i}-${char}`
        if (!hv)
          return <span key={charKey}>{char}</span>
        return (
          <ruby key={charKey}>
            {char}
            <rt style={RT_STYLE}>{hv}</rt>
          </ruby>
        )
      })}
    </span>
  )
}
