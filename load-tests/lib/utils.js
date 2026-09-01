export function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)]
}

export function randomBetween(min, max) {
  if (max <= min) {
    return min
  }

  return min + Math.random() * (max - min)
}

export function clampArray(items, limit) {
  if (!Array.isArray(items) || items.length === 0) {
    return []
  }

  return items.slice(0, Math.max(1, limit))
}

export function uniqBy(items, keySelector) {
  const seen = new Set()
  const result = []

  for (const item of items) {
    const key = keySelector(item)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    result.push(item)
  }

  return result
}
