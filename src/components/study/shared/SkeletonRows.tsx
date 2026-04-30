const SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

export function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {SKELETON_KEYS.slice(0, count).map(k => (
        <div key={k} className="skeleton h-16 w-full" />
      ))}
    </div>
  )
}
