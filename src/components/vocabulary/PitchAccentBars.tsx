interface PitchAccentBarsProps {
  pattern: ('H' | 'L')[] | null
  kana: string
}

export function PitchAccentBars({ pattern, kana }: PitchAccentBarsProps) {
  if (pattern === null) {
    return <span className="text-[11px] font-[var(--br-mono-font)] text-muted-foreground">—</span>
  }

  const morae = splitIntoMorae(kana)

  return (
    <div className="flex items-end gap-px">
      {pattern.map((tone, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={`mora-${i}`} className="flex flex-col items-center gap-[2px]">
          {tone === 'H'
            ? (
                <div className="w-[18px] h-[11px] bg-primary border border-border/30" />
              )
            : (
                <div className="w-[18px] h-[5px] bg-secondary border border-border/15 opacity-70" />
              )}
          <span className="text-[11px] font-[var(--br-jp-font)] leading-none">
            {morae[i] ?? ''}
          </span>
        </div>
      ))}
    </div>
  )
}

const SMALL_KANA = new Set('ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ')

function splitIntoMorae(kana: string): string[] {
  const result: string[] = []
  let i = 0
  while (i < kana.length) {
    const char = kana[i]
    i++
    if (i < kana.length && SMALL_KANA.has(kana[i])) {
      result.push(char + kana[i])
      i++
    }
    else {
      result.push(char)
    }
  }
  return result
}
