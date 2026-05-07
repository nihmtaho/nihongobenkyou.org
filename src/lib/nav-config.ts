// src/lib/nav-config.ts

export interface RouteNavConfig {
  title?: string
  showBack?: boolean
  backTo?: string
  hideBottomBar?: boolean
  hideNav?: boolean
  showInfoIcon?: boolean
}

export const ROUTE_NAV_CONFIG: Record<string, RouteNavConfig> = {
  '/': { title: 'HOME' },
  '/books': { title: 'BOOKS' },
  '/books/$book': { title: 'BÀI HỌC', showBack: true, showInfoIcon: true },
  '/books/$book/$lesson': { title: 'BÀI HỌC', showBack: true },
  '/kanji': { title: 'KANJI' },
  '/kanji/graph': { title: 'KANJI GRAPH', showBack: true },
  '/kanji/$char': { title: 'KANJI', showBack: true },
  '/kanji/$char/stroke': { title: 'STROKE ORDER', showBack: true },
  '/study': { title: 'STUDY' },
  '/study/review': { hideNav: true },
  '/custom': { title: 'MY DECKS' },
  '/profile': { title: 'PROFILE', showBack: true, backTo: '/' },
  '/settings': { title: 'SETTINGS', showBack: true, backTo: '/', hideBottomBar: true },
  '/auth/login': { hideNav: true },
  '/auth/register': { hideNav: true },
  '/auth/forgot-password': { hideNav: true },
  '/auth/reset-password': { hideNav: true },
  '/auth/callback': { hideNav: true },
}

const SORTED_PATTERNS = Object.keys(ROUTE_NAV_CONFIG).sort((a, b) => {
  const paramCount = (p: string) => p.split('/').filter(s => s.startsWith('$')).length
  return (b.length - a.length) || (paramCount(a) - paramCount(b))
})

function matchPattern(pattern: string, pathname: string): boolean {
  const regexStr = pattern
    .split('/')
    .map(seg => seg.startsWith('$') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('/')
  return new RegExp(`^${regexStr}$`).test(pathname)
}

export function getNavConfig(pathname: string): RouteNavConfig | undefined {
  for (const pattern of SORTED_PATTERNS) {
    if (matchPattern(pattern, pathname)) {
      return ROUTE_NAV_CONFIG[pattern]
    }
  }
}

export function getBackLabel(pathname: string): string | undefined {
  const config = getNavConfig(pathname)
  if (!config?.showBack)
    return undefined
  const targetPath = config.backTo ?? (pathname.slice(0, pathname.lastIndexOf('/')) || '/')
  return getNavConfig(targetPath)?.title
}
