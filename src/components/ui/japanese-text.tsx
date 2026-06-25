import * as React from 'react'

export function JapaneseText({ children, className }: { children: React.ReactNode, className?: string }) {
  return <span lang="ja" style={{ fontFamily: 'var(--br-jp-font)' }} className={className}>{children}</span>
}
