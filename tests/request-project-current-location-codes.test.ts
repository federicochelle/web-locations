import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const serviceSource = readFileSync('src/services/request-projects.service.ts', 'utf8')
const requestDetailPageSource = readFileSync('src/pages/RequestDetailPage.tsx', 'utf8')
const selectionProjectImagesSource = readFileSync('src/utils/selection-project-images.ts', 'utf8')
const selectionDrawerSource = readFileSync('src/components/selection/SelectionDrawer.tsx', 'utf8')
const imageSelectionProviderSource = readFileSync('src/providers/ImageSelectionProvider.tsx', 'utf8')
const selectionPdfFlowSource = readFileSync('src/components/selection/SelectionPdfFlow.tsx', 'utf8')
const selectionPdfWorkspaceSource = readFileSync('src/utils/selection-pdf-workspace.ts', 'utf8')

test('request detail loads current location codes by UUID for presentation', () => {
  assert.match(serviceSource, /export async function getCurrentRequestProjectLocationPresentations/)
  assert.match(serviceSource, /\.from\('locations'\)/)
  assert.match(serviceSource, /\.select\('id, location_code, title'\)/)
  assert.match(serviceSource, /\.in\('id', normalizedLocationIds\)/)
  assert.match(requestDetailPageSource, /getCurrentRequestProjectLocationPresentations\(locationIds\)/)
  assert.match(requestDetailPageSource, /currentLocationPresentationById\[item\.location\.id\]/)
})

test('request detail builds new-version payloads from current catalog presentation data', () => {
  assert.match(
    requestDetailPageSource,
    /applyCurrentRequestProjectLocationPresentations\(\s*locations,/,
  )
  assert.match(
    requestDetailPageSource,
    /buildSelectionPdfPayloadFromProject\(\s*values,\s*currentVersionLocations,\s*new Date\(\)\.toISOString\(\),\s*\)/,
  )
  assert.match(
    requestDetailPageSource,
    /const nextVersionLocations = await getCurrentRequestProjectLocationsForVersion\(locations\)/,
  )
  assert.match(
    requestDetailPageSource,
    /payload: nextVersionPayload/,
  )
  assert.doesNotMatch(requestDetailPageSource, /payload: currentPdfPayload/)
})

test('request detail seeds drawer editing selection from current catalog locations', () => {
  assert.match(
    requestDetailPageSource,
    /async function handleOpenDraftLocation\(item: RequestProjectLocation\)/,
  )
  assert.match(
    requestDetailPageSource,
    /const currentProjectLocations = await getCurrentRequestProjectLocationsForVersion\(locations\)/,
  )
  assert.match(
    requestDetailPageSource,
    /replaceSelection\(buildProjectSelectionImages\(currentProjectLocations\),\s*\{\s*projectId: project\.id,/,
  )
  assert.doesNotMatch(
    requestDetailPageSource,
    /replaceSelection\(buildProjectSelectionImages\(locations\),\s*\{\s*projectId: project\.id,/,
  )
  assert.match(
    requestDetailPageSource,
    /hydrate: !projectSelectionExistsInMemory \|\| shouldRefreshProjectSelection/,
  )
})

test('selection drawer hydration uses current catalog presentation data by UUID', () => {
  assert.match(
    selectionProjectImagesSource,
    /import \{\s*getCurrentRequestProjectLocationsForVersion,\s*getRequestProjectLocations,\s*\} from '@\/services\/request-projects\.service\.ts'/,
  )
  assert.match(
    selectionProjectImagesSource,
    /const projectLocations = await getRequestProjectLocations\(projectId\)/,
  )
  assert.match(
    selectionProjectImagesSource,
    /const currentProjectLocations = await getCurrentRequestProjectLocationsForVersion\(\s*projectLocations,\s*\)/,
  )
  assert.match(
    selectionProjectImagesSource,
    /return currentProjectLocations\.flatMap\(\(location\) => buildProjectSelectionImages\(location\)\)/,
  )
})

test('editing an existing sent project force-refreshes non-dirty drawer cache', () => {
  assert.match(
    selectionDrawerSource,
    /loadProjectSelection\(projectId,\s*\{\s*force: projectId === activeEditingProjectId,\s*\}\)/,
  )
  assert.match(
    imageSelectionProviderSource,
    /if \(!options\.force && hasResolvedSelection && !isDirtySelection\)/,
  )
  assert.match(
    imageSelectionProviderSource,
    /return hydrateProjectSelection\(normalizedProjectId\)/,
  )
})

test('dirty local selection is still protected from remote hydration overwrite', () => {
  assert.match(
    imageSelectionProviderSource,
    /return !projectSelectionDirtyRef\.current\[projectId\] &&\s*\(projectSelectionVersionsRef\.current\[projectId\] \?\? 0\) === expectedVersion/,
  )
  assert.match(
    selectionDrawerSource,
    /force: projectId === activeEditingProjectId/,
  )
})

test('drawer preview and drawer submission consume current image selection codes', () => {
  assert.match(
    selectionPdfFlowSource,
    /buildSelectionPdfPayloadFromImages\(protectedFormValues, images\)/,
  )
  assert.match(
    selectionPdfFlowSource,
    /finalPayload = buildSelectionPdfPayloadFromImages\(\s*protectedFormValues,\s*confirmedSelection\.images,\s*\)/,
  )
  assert.match(
    selectionPdfWorkspaceSource,
    /locationCode: image\.locationCode,/,
  )
  assert.match(
    serviceSource,
    /p_snapshot_payload: payload/,
  )
})

test('historical locations are copied for new versions rather than mutated in place', () => {
  assert.match(serviceSource, /return locations\.map\(\(location\) => \{/)
  assert.match(serviceSource, /\.\.\.location,\s*location: \{\s*\.\.\.location\.location,/)
  assert.match(serviceSource, /title: currentPresentation\.locationTitle,/)
  assert.match(serviceSource, /locationCode: currentPresentation\.locationCode,/)
})

test('syncRequestProjectLocations refreshes persisted snapshots from catalog by UUID', () => {
  assert.match(
    serviceSource,
    /const currentLocations = await getCurrentRequestProjectLocationsForVersion\(locations\)/,
  )
  assert.match(serviceSource, /const selectionPayload = \[\.\.\.currentLocations\]/)
  assert.match(serviceSource, /\.in\('id', normalizedLocationIds\)/)
})

test('selection-image sync also refreshes codes and titles by UUID before persistence', () => {
  assert.match(
    serviceSource,
    /const currentPresentations = await getCurrentRequestProjectLocationPresentations\(\s*groupedLocations\.map\(\(location\) => location\.locationId\),\s*\)/,
  )
  assert.match(serviceSource, /currentPresentationById\.get\(location\.locationId\)\?\.locationCode/)
  assert.match(serviceSource, /currentPresentationById\.get\(location\.locationId\)\?\.locationTitle/)
})

test('PDF exporter remains deterministic and consumes only the provided payload', () => {
  const exporterSource = readFileSync('src/utils/selection-pdf-exporter.ts', 'utf8')

  assert.match(exporterSource, /doc\.text\(formatLocationCode\(location\.locationCode\)/)
  assert.doesNotMatch(exporterSource, /doc\.text\(location\.locationTitle/)
  assert.doesNotMatch(exporterSource, /getCurrentRequestProjectLocation/)
  assert.doesNotMatch(exporterSource, /\.from\('locations'\)/)
})
