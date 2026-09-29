import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locationsServiceSource = readFileSync('src/services/locations.service.ts', 'utf8')
const categoryLocationsPageSource = readFileSync('src/pages/CategoryLocationsPage.tsx', 'utf8')
const searchLocationsPageSource = readFileSync('src/pages/SearchLocationsPage.tsx', 'utf8')

test('category listing explicitly opts into category ordering RPC', () => {
  assert.match(locationsServiceSource, /useCategoryOrdering\?: boolean/)
  assert.match(
    locationsServiceSource,
    /filters\.useCategoryOrdering === true/,
  )
  assert.match(
    locationsServiceSource,
    /categorySlug && shouldUseCategoryOrdering && !normalizedSearch/,
  )
  assert.match(categoryLocationsPageSource, /useCategoryOrdering: true/)
})

test('search page stays on the legacy search flow for category filters', () => {
  assert.match(searchLocationsPageSource, /const result = await getLocations\({/)
  assert.doesNotMatch(searchLocationsPageSource, /useCategoryOrdering: true/)
})
