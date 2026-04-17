import { describe, expect, it } from 'vitest'
import {
  createWhiteScreenSamplePoints,
  isContainerElement,
} from './reliability'

function createElementStub(
  input: {
    tagName: string
    id?: string
    className?: string
    matchResult?: boolean
  },
) {
  return {
    tagName: input.tagName,
    id: input.id ?? '',
    className: input.className ?? '',
    matches: () => input.matchResult ?? false,
  } as unknown as Element
}

describe('reliability helpers', () => {
  it('creates 18 sample points for white-screen detection', () => {
    const points = createWhiteScreenSamplePoints(1200, 900)
    expect(points).toHaveLength(18)
    expect(points[0]).toEqual({ x: 120, y: 90 })
    expect(points.at(-1)).toEqual({ x: 1080, y: 810 })
  })

  it('treats html/body/root as container elements', () => {
    const roots = ['#root', '.portal-shell']
    const skeletons = ['.skeleton']

    expect(isContainerElement(createElementStub({ tagName: 'HTML' }), roots, skeletons)).toBe(true)
    expect(isContainerElement(createElementStub({ tagName: 'BODY' }), roots, skeletons)).toBe(true)
    expect(isContainerElement(createElementStub({ tagName: 'DIV', id: 'root' }), roots, skeletons)).toBe(true)
    expect(isContainerElement(createElementStub({ tagName: 'DIV', className: 'portal-shell' }), roots, skeletons)).toBe(true)
  })

  it('treats non-container element as content', () => {
    const roots = ['#root', '.portal-shell']
    const skeletons = ['.skeleton']
    const content = createElementStub({ tagName: 'SECTION', className: 'content-area' })
    expect(isContainerElement(content, roots, skeletons)).toBe(false)
  })
})
