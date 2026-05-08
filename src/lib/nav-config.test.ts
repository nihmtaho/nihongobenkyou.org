import { describe, expect, it } from 'vitest'
import { getBackLabel, getNavConfig } from './nav-config'

describe('getNavConfig', () => {
  it('matches exact route', () => {
    expect(getNavConfig('/')).toMatchObject({ title: 'HOME' })
    expect(getNavConfig('/books')).toMatchObject({ title: 'BOOKS' })
  })

  it('matches dynamic segment', () => {
    const config = getNavConfig('/books/minna_shokyuu_1')
    expect(config).toMatchObject({ title: 'BÀI HỌC', showBack: true, showInfoIcon: true, hasExpandedHeader: true })
  })

  it('matches nested dynamic segment', () => {
    expect(getNavConfig('/books/minna_shokyuu_1/3')).toMatchObject({ title: 'BÀI HỌC', showBack: true })
  })

  it('literal route wins over param route at same depth', () => {
    expect(getNavConfig('/kanji/graph')).toMatchObject({ title: 'KANJI GRAPH' })
  })

  it('returns hideNav for auth routes', () => {
    expect(getNavConfig('/auth/login')).toMatchObject({ hideNav: true })
    expect(getNavConfig('/auth/callback')).toMatchObject({ hideNav: true })
  })

  it('returns undefined for unknown routes', () => {
    expect(getNavConfig('/unknown')).toBeUndefined()
  })
})

describe('getBackLabel', () => {
  it('returns parent title for routes without backTo', () => {
    expect(getBackLabel('/books/minna_shokyuu_1')).toBe('BOOKS')
    expect(getBackLabel('/books/minna_shokyuu_1/3')).toBe('BÀI HỌC')
  })

  it('returns target route title when backTo is set', () => {
    expect(getBackLabel('/settings')).toBe('HOME')
  })

  it('returns undefined for routes with no showBack', () => {
    expect(getBackLabel('/')).toBeUndefined()
    expect(getBackLabel('/books')).toBeUndefined()
  })
})
