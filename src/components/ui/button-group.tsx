import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ButtonGroup({ className, children, ...props }: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'flex [&>*]:rounded-none [&>*:not(:first-child)]:border-l-0',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
