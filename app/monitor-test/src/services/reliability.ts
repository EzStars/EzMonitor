export interface Point {
  x: number
  y: number
}

const RATIO_PRECISION_MULTIPLIER = 1000

function normalizeClassName(value: string): string[] {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function createWhiteScreenSamplePoints(width: number, height: number): Point[] {
  const xRatios = [0.1, 0.5, 0.9]
  const yRatios = [0.1, 0.2, 0.4, 0.6, 0.8, 0.9]
  const points: Point[] = []

  for (const yRatio of yRatios) {
    for (const xRatio of xRatios) {
      points.push({
        x: Math.max(0, Math.floor(width * xRatio)),
        y: Math.max(0, Math.floor(height * yRatio)),
      })
    }
  }

  return points
}

export function isContainerElement(
  element: Element,
  rootSelectors: string[],
  skeletonSelectors: string[],
): boolean {
  const tagName = element.tagName.toLowerCase()
  if (tagName === 'html' || tagName === 'body') {
    return true
  }

  const id = element.id ? `#${element.id}` : ''
  if (id && rootSelectors.includes(id)) {
    return true
  }

  const className = typeof element.className === 'string' ? normalizeClassName(element.className) : []
  for (const classToken of className) {
    if (rootSelectors.includes(`.${classToken}`)) {
      return true
    }
  }

  return skeletonSelectors.some((selector) => {
    try {
      return typeof element.matches === 'function' && element.matches(selector)
    }
    catch {
      return false
    }
  })
}

export interface WhiteScreenSnapshot {
  total: number
  containerHits: number
  ratio: number
  points: Point[]
}

export function collectWhiteScreenSnapshot(
  rootSelectors: string[],
  skeletonSelectors: string[],
): WhiteScreenSnapshot {
  const width = window.innerWidth
  const height = window.innerHeight
  const points = createWhiteScreenSamplePoints(width, height)
  let containerHits = 0

  for (const point of points) {
    const element = document.elementFromPoint(point.x, point.y)
    if (element && isContainerElement(element, rootSelectors, skeletonSelectors)) {
      containerHits++
    }
  }

  const total = points.length
  return {
    total,
    containerHits,
    ratio: total === 0 ? 0 : Math.round((containerHits * RATIO_PRECISION_MULTIPLIER) / total) / RATIO_PRECISION_MULTIPLIER,
    points,
  }
}
