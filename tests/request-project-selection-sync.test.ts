import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migrationPath =
  'supabase/migrations/20260911120000_harden_request_project_selection_sync.sql'
const correctiveMigrationPath =
  'supabase/migrations/20260911133000_fix_request_project_location_image_cascade_guard.sql'
const locationCascadeCorrectiveMigrationPath =
  'supabase/migrations/20260911173000_fix_request_project_location_cascade_guard.sql'
const servicePath = 'src/services/request-projects.service.ts'
const detailHookPath = 'src/hooks/useRequestProjectDetail.ts'
const imageSelectionProviderPath = 'src/providers/ImageSelectionProvider.tsx'
const selectionDrawerPath = 'src/components/selection/SelectionDrawer.tsx'
const selectionPdfFlowPath = 'src/components/selection/SelectionPdfFlow.tsx'
const imageSelectionStoragePath = 'src/utils/image-selection-storage.ts'
const selectionSyncQueuePath = 'src/utils/selection-sync-queue.ts'
const selectionDebugLogPath = 'src/utils/selection-debug-log.ts'
const selectionDebugPanelPath = 'src/components/selection/SelectionDebugPanel.tsx'
const privateFeatureProvidersPath = 'src/providers/PrivateFeatureProviders.tsx'
const selectionDrawerTriggerPath = 'src/components/selection/SelectionDrawerTrigger.tsx'
const locationDetailPagePath = 'src/pages/LocationDetailPage.tsx'

const migrationSql = readFileSync(migrationPath, 'utf8')
const correctiveMigrationSql = readFileSync(correctiveMigrationPath, 'utf8')
const locationCascadeCorrectiveMigrationSql = readFileSync(
  locationCascadeCorrectiveMigrationPath,
  'utf8',
)
const serviceSource = readFileSync(servicePath, 'utf8')
const detailHookSource = readFileSync(detailHookPath, 'utf8')
const imageSelectionProviderSource = readFileSync(imageSelectionProviderPath, 'utf8')
const selectionDrawerSource = readFileSync(selectionDrawerPath, 'utf8')
const selectionPdfFlowSource = readFileSync(selectionPdfFlowPath, 'utf8')
const imageSelectionStorageSource = readFileSync(imageSelectionStoragePath, 'utf8')
const selectionSyncQueueSource = readFileSync(selectionSyncQueuePath, 'utf8')
const selectionDebugLogSource = readFileSync(selectionDebugLogPath, 'utf8')
const selectionDebugPanelSource = readFileSync(selectionDebugPanelPath, 'utf8')
const privateFeatureProvidersSource = readFileSync(privateFeatureProvidersPath, 'utf8')
const selectionDrawerTriggerSource = readFileSync(selectionDrawerTriggerPath, 'utf8')
const locationDetailPageSource = readFileSync(locationDetailPagePath, 'utf8')

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, ' ').toLowerCase()
}

const normalizedMigration = normalizeSql(migrationSql)
const normalizedCorrectiveMigration = normalizeSql(correctiveMigrationSql)
const normalizedLocationCascadeCorrectiveMigration = normalizeSql(
  locationCascadeCorrectiveMigrationSql,
)

function getSyncRequestProjectSelectionSource() {
  const syncFunctionStart = serviceSource.indexOf('export async function syncRequestProjectSelection')
  assert.notEqual(syncFunctionStart, -1)
  const nextFunctionStart = serviceSource.indexOf(
    'export async function syncRequestProjectPdfPayloadSnapshot',
    syncFunctionStart,
  )
  assert.notEqual(nextFunctionStart, -1)
  return serviceSource.slice(syncFunctionStart, nextFunctionStart)
}

function getSyncRequestProjectSelectionPayloadSource() {
  const syncPayloadFunctionStart = serviceSource.indexOf(
    'async function syncRequestProjectSelectionPayload',
  )
  assert.notEqual(syncPayloadFunctionStart, -1)
  const syncFunctionStart = serviceSource.indexOf(
    'export async function syncRequestProjectSelection',
    syncPayloadFunctionStart,
  )
  assert.notEqual(syncFunctionStart, -1)
  return serviceSource.slice(syncPayloadFunctionStart, syncFunctionStart)
}

function getDetailHookSlice(startPattern: string, endPattern: string) {
  const start = detailHookSource.indexOf(startPattern)
  assert.notEqual(start, -1)
  const end = detailHookSource.indexOf(endPattern, start)
  assert.notEqual(end, -1)
  return detailHookSource.slice(start, end)
}

function getSourceSlice(source: string, startPattern: string, endPattern: string) {
  const start = source.indexOf(startPattern)
  assert.notEqual(start, -1)
  const end = source.indexOf(endPattern, start)
  assert.notEqual(end, -1)
  return source.slice(start, end)
}

test('draft can synchronize selection through the transactional RPC', () => {
  assert.match(
    normalizedMigration,
    /create or replace function public\.sync_request_project_selection/,
  )
  assert.match(normalizedMigration, /delete from public\.request_project_locations/)
  assert.match(normalizedMigration, /insert into public\.request_project_locations/)
  assert.match(normalizedMigration, /insert into public\.request_project_location_images/)
  assert.match(serviceSource, /supabase\.rpc\('sync_request_project_selection'/)
})

test('confirmed rejects project updates', () => {
  assert.match(
    normalizedMigration,
    /if old\.status in \('confirmed', 'closed'\) then raise exception/,
  )
  assert.match(
    normalizedMigration,
    /create trigger guard_request_project_immutable_update before update on public\.request_projects/,
  )
})

test('confirmed rejects selection synchronization', () => {
  assert.match(
    normalizedMigration,
    /if v_project\.status in \('confirmed', 'closed'\) then raise exception/,
  )
  assert.match(
    serviceSource,
    /supabase\.rpc\('sync_request_project_selection'/,
  )
})

test('closed rejects project updates', () => {
  assert.match(
    normalizedMigration,
    /if old\.status in \('confirmed', 'closed'\) then raise exception/,
  )
})

test('closed rejects selection synchronization', () => {
  assert.match(
    normalizedMigration,
    /if v_project\.status in \('confirmed', 'closed'\) then raise exception/,
  )
})

test('confirmed and closed reject direct location and image mutations', () => {
  assert.match(
    normalizedMigration,
    /create trigger guard_request_project_location_mutation before insert or update or delete on public\.request_project_locations/,
  )
  assert.match(
    normalizedMigration,
    /create trigger guard_request_project_location_image_mutation before insert or update or delete on public\.request_project_location_images/,
  )
  assert.match(
    normalizedMigration,
    /perform public\.assert_request_project_mutable\(v_request_project_id\)/,
  )
  assert.match(
    normalizedCorrectiveMigration,
    /perform public\.assert_request_project_mutable\(v_request_project_id\)/,
  )
  assert.match(
    normalizedLocationCascadeCorrectiveMigration,
    /if v_request_project\.status in \('confirmed', 'closed'\) then raise exception 'request project is immutable in status %'/,
  )
})

test('draft project deletes can cascade through locations and images', () => {
  assert.match(
    normalizedLocationCascadeCorrectiveMigration,
    /create or replace function public\.guard_request_project_location_mutation\(\)/,
  )
  assert.match(
    normalizedMigration,
    /create trigger guard_request_project_location_mutation before insert or update or delete on public\.request_project_locations/,
  )
  assert.match(
    normalizedLocationCascadeCorrectiveMigration,
    /if not found then if tg_op = 'delete' then return old; end if; raise exception 'request project not found'/,
  )
  assert.match(
    normalizedCorrectiveMigration,
    /if v_request_project_id is null then if tg_op = 'delete' then return old; end if; raise exception 'request project location not found'/,
  )
})

test('direct draft location deletes still validate the parent request project', () => {
  assert.match(
    normalizedLocationCascadeCorrectiveMigration,
    /select \* into v_request_project from public\.request_projects where id = v_request_project_id for update;/,
  )
  assert.match(
    normalizedLocationCascadeCorrectiveMigration,
    /if v_request_project\.status in \('confirmed', 'closed'\) then raise exception/,
  )
  assert.match(
    normalizedLocationCascadeCorrectiveMigration,
    /if tg_op = 'delete' then return old; end if; return new;/,
  )
})

test('confirmed and closed still block direct location deletes', () => {
  assert.match(
    normalizedLocationCascadeCorrectiveMigration,
    /if v_request_project\.status in \('confirmed', 'closed'\) then raise exception 'request project is immutable in status %', v_request_project\.status using errcode = 'p0001'; end if;/,
  )
  assert.doesNotMatch(
    normalizedLocationCascadeCorrectiveMigration,
    /if tg_op = 'delete' then return old; end if; if v_request_project\.status/,
  )
})

test('location inserts and updates without a parent request project still fail', () => {
  assert.match(
    normalizedLocationCascadeCorrectiveMigration,
    /if not found then if tg_op = 'delete' then return old; end if; raise exception 'request project not found' using errcode = 'p0002'; end if;/,
  )
  assert.doesNotMatch(
    normalizedLocationCascadeCorrectiveMigration,
    /if not found then return (old|new)/,
  )
})

test('image mutation guard permits request location cascade deletes only when the parent is already absent', () => {
  assert.match(
    normalizedCorrectiveMigration,
    /create or replace function public\.guard_request_project_location_image_mutation\(\)/,
  )
  assert.match(
    normalizedCorrectiveMigration,
    /if v_request_project_id is null then if tg_op = 'delete' then return old; end if; raise exception 'request project location not found'/,
  )
  assert.match(
    normalizedCorrectiveMigration,
    /perform public\.assert_request_project_mutable\(v_request_project_id\); if tg_op = 'delete' then return old; end if; return new;/,
  )
})

test('image mutation guard still rejects inserts and updates without a parent request location', () => {
  assert.match(
    normalizedCorrectiveMigration,
    /if v_request_project_id is null then if tg_op = 'delete' then return old; end if; raise exception 'request project location not found'/,
  )
  assert.doesNotMatch(
    normalizedCorrectiveMigration,
    /if tg_op in \('insert', 'update'\).*return new/,
  )
})

test('user who is not owner cannot modify through the sync RPC', () => {
  assert.match(normalizedMigration, /where id = p_request_project_id and user_id = auth\.uid\(\) for update/)
  assert.match(normalizedMigration, /if not found then raise exception 'request project not found'/)
})

test('failure during replacement cannot persistently delete the previous selection', () => {
  const syncFunctionSource = getSyncRequestProjectSelectionSource()

  assert.match(normalizedMigration, /language plpgsql security definer/)
  assert.match(normalizedMigration, /delete from public\.request_project_locations/)
  assert.match(normalizedMigration, /insert into public\.request_project_location_images/)
  assert.doesNotMatch(syncFunctionSource, /\.from\('request_project_locations'\)/)
  assert.doesNotMatch(syncFunctionSource, /\.from\('request_project_location_images'\)/)
})

test('normal existing empty-selection behavior remains a no-op unless clearing is explicit', () => {
  const syncFunctionSource = getSyncRequestProjectSelectionSource()
  const syncPayloadFunctionSource = getSyncRequestProjectSelectionPayloadSource()

  assert.match(
    normalizedMigration,
    /if jsonb_array_length\(p_selection\) = 0 and not p_allow_empty_selection then return query/,
  )
  assert.match(syncFunctionSource, /if \(groupedLocations\.length === 0 && !allowEmptySelection\) \{\s*return\s*\}/)
  assert.match(syncPayloadFunctionSource, /if \(selectionPayload\.length === 0 && !allowEmptySelection\) \{\s*return\s*\}/)
})

test('normal drawer flow still calls the same frontend contract via RPC', () => {
  const syncFunctionSource = getSyncRequestProjectSelectionSource()
  const syncPayloadFunctionSource = getSyncRequestProjectSelectionPayloadSource()

  assert.doesNotMatch(syncFunctionSource, /\.from\('request_project_locations'\)/)
  assert.doesNotMatch(syncFunctionSource, /\.from\('request_project_location_images'\)/)
  assert.match(syncPayloadFunctionSource, /p_allow_empty_selection: allowEmptySelection/)
  assert.match(syncPayloadFunctionSource, /throw new Error\(error\.message\)/)
})

test('adding a sent-project location persists via RPC before the UI reports success', () => {
  const addLocationsSource = getDetailHookSlice(
    'const addLocations = useCallback',
    'const removeLocation = useCallback',
  )
  const syncIndex = addLocationsSource.indexOf('await syncRequestProjectLocations')
  const setLocationsIndex = addLocationsSource.indexOf('setLocations(nextLocations)')
  const returnAddedCountIndex = addLocationsSource.indexOf('return addedCount')

  assert.match(addLocationsSource, /project\?\.status !== 'draft'/)
  assert.match(addLocationsSource, /selectedImages: \[\]/)
  assert.notEqual(syncIndex, -1)
  assert.notEqual(setLocationsIndex, -1)
  assert.ok(syncIndex < setLocationsIndex)
  assert.ok(setLocationsIndex < returnAddedCountIndex)
  assert.match(addLocationsSource, /catch \(addError\)[\s\S]*return 0/)
})

test('removing a sent-project location persists empty selections through the RPC', () => {
  const removeLocationSource = getDetailHookSlice(
    'const removeLocation = useCallback',
    'const removeSelectedImage = useCallback',
  )
  const syncIndex = removeLocationSource.indexOf('await syncRequestProjectLocations')
  const setLocationsIndex = removeLocationSource.indexOf('setLocations(nextLocations)')

  assert.match(removeLocationSource, /project\?\.status !== 'draft'/)
  assert.match(removeLocationSource, /allowEmptySelection: true/)
  assert.notEqual(syncIndex, -1)
  assert.notEqual(setLocationsIndex, -1)
  assert.ok(syncIndex < setLocationsIndex)
})

test('removing the last sent-project location is an explicit persisted clear', () => {
  const syncPayloadFunctionSource = getSyncRequestProjectSelectionPayloadSource()
  const removeLocationSource = getDetailHookSlice(
    'const removeLocation = useCallback',
    'const removeSelectedImage = useCallback',
  )

  assert.match(syncPayloadFunctionSource, /selectionPayload\.length === 0 && !allowEmptySelection/)
  assert.match(removeLocationSource, /syncRequestProjectLocations\(projectId, nextLocations, \{\s*allowEmptySelection: true/)
})

test('pending, in_review, and contacted use the sent-project persistence path', () => {
  const addLocationsSource = getDetailHookSlice(
    'const addLocations = useCallback',
    'const removeLocation = useCallback',
  )

  assert.match(detailHookSource, /syncRequestProjectLocations/)
  assert.match(addLocationsSource, /if \(project\?\.status !== 'draft'\)/)
  assert.doesNotMatch(addLocationsSource, /status === 'pending'/)
  assert.doesNotMatch(addLocationsSource, /status === 'in_review'/)
  assert.doesNotMatch(addLocationsSource, /status === 'contacted'/)
})

test('confirmed projects still do not enter selection persistence', () => {
  const addLocationsSource = getDetailHookSlice(
    'const addLocations = useCallback',
    'const removeLocation = useCallback',
  )
  const guardIndex = addLocationsSource.indexOf(
    "project?.status === 'confirmed' || project?.status === 'closed'",
  )
  const syncIndex = addLocationsSource.indexOf('await syncRequestProjectLocations')

  assert.notEqual(guardIndex, -1)
  assert.notEqual(syncIndex, -1)
  assert.ok(guardIndex < syncIndex)
})

test('rapid sent-project mutations cannot start concurrent selection syncs', () => {
  assert.match(detailHookSource, /const isMutatingLocationsRef = useRef\(false\)/)
  assert.match(detailHookSource, /if \(isMutatingLocationsRef\.current\) \{\s*return 0\s*\}/)
  assert.match(detailHookSource, /if \(isMutatingLocationsRef\.current\) \{\s*return false\s*\}/)
  assert.match(detailHookSource, /isMutatingLocationsRef\.current = true/)
  assert.match(detailHookSource, /isMutatingLocationsRef\.current = false/)
})

test('RPC failure does not mark sent-project selection as saved', () => {
  const addLocationsSource = getDetailHookSlice(
    'const addLocations = useCallback',
    'const removeLocation = useCallback',
  )
  const removeLocationSource = getDetailHookSlice(
    'const removeLocation = useCallback',
    'const removeSelectedImage = useCallback',
  )

  assert.match(addLocationsSource, /catch \(addError\)[\s\S]*return 0/)
  assert.match(removeLocationSource, /catch \(removeError\)[\s\S]*return false/)
})

test('dirty local project selection blocks older remote hydration', () => {
  const canApplyRemoteSource = getSourceSlice(
    imageSelectionProviderSource,
    'const canApplyRemoteProjectSelection = useCallback',
    'const markProjectSelectionSynced = useCallback',
  )
  const hydrateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const hydrateProjectSelection = useCallback',
    'const hasProjectSelection = useCallback',
  )

  assert.match(canApplyRemoteSource, /!projectSelectionDirtyRef\.current\[projectId\]/)
  assert.match(
    canApplyRemoteSource,
    /\(projectSelectionVersionsRef\.current\[projectId\] \?\? 0\) === expectedVersion/,
  )
  assert.match(canApplyRemoteSource, /remoteCount = 0/)
  assert.match(canApplyRemoteSource, /isUnknownEmptyLocalState && remoteCount > 0/)
  assert.match(hydrateSource, /const selectionVersionAtRequestStart = getProjectSelectionVersion\(projectId\)/)
  assert.match(
    hydrateSource,
    /!canApplyRemoteProjectSelection\(\s*projectId,\s*selectionVersionAtRequestStart,\s*nextSelection\.length,\s*\)/,
  )
})

test('clean local project selection can be hydrated from remote without becoming dirty', () => {
  const replaceSelectionSource = getSourceSlice(
    imageSelectionProviderSource,
    'const replaceSelection = useCallback',
    'const removeImage = useCallback',
  )

  assert.match(replaceSelectionSource, /options\.source === 'remote'/)
  assert.match(replaceSelectionSource, /markProjectSelectionRemoteHydrated\(projectId\)/)
  assert.doesNotMatch(
    replaceSelectionSource,
    /markProjectSelectionUpdated\(projectId, options\.source !== 'remote'\)/,
  )
})

test('remote hydration that resolves after a local mutation cannot replace selection', () => {
  const hydrateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const hydrateProjectSelection = useCallback',
    'const setActiveProjectContext = useCallback',
  )

  assert.match(hydrateSource, /const selectionVersionAtRequestStart = getProjectSelectionVersion\(projectId\)/)
  assert.match(
    hydrateSource,
    /!canApplyRemoteProjectSelection\(\s*projectId,\s*selectionVersionAtRequestStart,\s*nextSelection\.length,\s*\)/,
  )
  assert.match(hydrateSource, /requestStale/)
  assert.match(hydrateSource, /setSelectionStatus\('ready'\)[\s\S]*return null/)
})

test('provider sync queue only confirms the snapshot version accepted by Supabase', () => {
  const markConfirmedSource = getSourceSlice(
    imageSelectionProviderSource,
    'const markProjectSelectionConfirmed = useCallback',
    'const getProjectSelectionSyncSnapshot = useCallback',
  )
  const queueOptionsSource = getSourceSlice(
    imageSelectionProviderSource,
    'projectSelectionSyncQueueRef.current = new SelectionSyncQueue',
    '  const enqueueProjectSelectionSync = useCallback',
  )

  assert.match(queueOptionsSource, /await syncRequestProjectSelection\(snapshot\.projectId, snapshot\.images/)
  assert.match(queueOptionsSource, /markProjectSelectionConfirmed\(snapshot\.projectId, snapshot\.version\)/)
  assert.match(selectionSyncQueueSource, /this\.options\.onConfirmed\(snapshot\)/)
  assert.match(selectionSyncQueueSource, /const nextSnapshot = this\.pendingSnapshot\[snapshot\.projectId\]/)
  assert.match(selectionSyncQueueSource, /void this\.startWrite\(nextSnapshot\)/)
  assert.match(
    markConfirmedSource,
    /\[projectId\]: currentVersion > version/,
  )
})

test('submit flushes provider selection before building the final PDF payload', () => {
  const submitSource = getSourceSlice(
    selectionPdfFlowSource,
    'async function handleSubmitProposal()',
    'submitProposalRef.current = handleSubmitProposal',
  )
  const flushIndex = submitSource.indexOf('await flushSelection(activeProjectId)')
  const buildPayloadIndex = submitSource.indexOf(
    'buildSelectionPdfPayloadFromImages',
    flushIndex,
  )
  const confirmedImagesIndex = submitSource.indexOf('confirmedSelection.images')
  const persistDraftIndex = submitSource.indexOf('persistProposalDraft()')
  const submitIndex = submitSource.indexOf('submitRequestProjectWithOfficialPdf')

  assert.doesNotMatch(submitSource, /let finalPayload = livePreviewPayload/)
  assert.doesNotMatch(selectionPdfFlowSource, /syncRequestProjectSelection/)
  assert.notEqual(flushIndex, -1)
  assert.notEqual(confirmedImagesIndex, -1)
  assert.notEqual(buildPayloadIndex, -1)
  assert.notEqual(persistDraftIndex, -1)
  assert.notEqual(submitIndex, -1)
  assert.ok(flushIndex < buildPayloadIndex)
  assert.ok(buildPayloadIndex < persistDraftIndex)
  assert.ok(persistDraftIndex < submitIndex)
  assert.match(submitSource, /payload: finalPayload/)
})

test('PDF submit locks selection mutations while it flushes and generates confirmed payload', () => {
  const submitSource = getSourceSlice(
    selectionPdfFlowSource,
    'async function handleSubmitProposal()',
    'submitProposalRef.current = handleSubmitProposal',
  )
  const providerMutationsSource = getSourceSlice(
    imageSelectionProviderSource,
    'const addImage = useCallback',
    'const isSelected = useCallback',
  )

  assert.match(selectionPdfFlowSource, /lockSelectionMutations/)
  assert.match(selectionPdfFlowSource, /unlockSelectionMutations/)
  assert.match(submitSource, /lockSelectionMutations\(\)/)
  assert.match(submitSource, /finally \{[\s\S]*unlockSelectionMutations\(\)/)
  assert.match(providerMutationsSource, /if \(isMutationLocked\) \{[\s\S]*return/)
  assert.match(providerMutationsSource, /if \(isMutationLocked && options\.source !== 'remote'\) \{/)
})

test('local selection mutations persist the computed project state immediately', () => {
  const immediatePersistSource = getSourceSlice(
    imageSelectionProviderSource,
    'const persistSelectionStateImmediately = useCallback',
    'const applyLocalProjectSelectionUpdate = useCallback',
  )
  const localUpdateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const applyLocalProjectSelectionUpdate = useCallback',
    'const markProjectSelectionRemoteHydrated = useCallback',
  )

  assert.match(immediatePersistSource, /persistImageSelectionCache\(/)
  assert.match(immediatePersistSource, /projectSelections: nextProjectSelections/)
  assert.match(
    immediatePersistSource,
    /projectSelectionState: getProjectSelectionState\(nextProjectSelections\)/,
  )
  assert.match(localUpdateSource, /const nextProjectSelections = \{/)
  assert.match(localUpdateSource, /\[projectId\]: nextImages/)
  assert.match(localUpdateSource, /\[projectId\]: nextVersion/)
  assert.match(localUpdateSource, /\[projectId\]: true/)
  assert.match(localUpdateSource, /\[projectId\]: nextImages\.length > 0\s*\? null\s*: options\.emptyIntent \?\? 'unknown-empty'/)
  assert.match(localUpdateSource, /projectSelectionsRef\.current = nextProjectSelections/)
  assert.match(localUpdateSource, /setProjectSelections\(nextProjectSelections\)/)
  assert.match(localUpdateSource, /persistSelectionStateImmediately\(nextProjectSelections\)/)
})

test('add remove clear and local replace do not rely exclusively on the persistence effect', () => {
  const addImageSource = getSourceSlice(
    imageSelectionProviderSource,
    'const addImage = useCallback',
    'const replaceSelection = useCallback',
  )
  const replaceSelectionSource = getSourceSlice(
    imageSelectionProviderSource,
    'const replaceSelection = useCallback',
    'const removeImage = useCallback',
  )
  const removeImageSource = getSourceSlice(
    imageSelectionProviderSource,
    'const removeImage = useCallback',
    'const clearSelection = useCallback',
  )
  const clearSelectionSource = getSourceSlice(
    imageSelectionProviderSource,
    'const clearSelection = useCallback',
    'const isSelected = useCallback',
  )

  assert.match(addImageSource, /applyLocalProjectSelectionUpdate\(projectId/)
  assert.match(
    replaceSelectionSource,
    /applyLocalProjectSelectionUpdate\(\s*projectId,\s*\(\) => normalizedImages,\s*'replace_selection_local',[\s\S]*emptyIntent: normalizedImages\.length === 0 \? 'unknown-empty' : null,/,
  )
  assert.match(removeImageSource, /applyLocalProjectSelectionUpdate\(\s*projectId/)
  assert.match(removeImageSource, /emptyIntent: 'explicit-clear'/)
  assert.match(
    clearSelectionSource,
    /applyLocalProjectSelectionUpdate\(projectId, \(\) => \[\], 'clear_selection', \{/,
  )
  assert.match(clearSelectionSource, /emptyIntent: 'explicit-clear'/)
})

test('explicit empty project selections survive storage sanitization', () => {
  const sanitizeSelectionsSource = getSourceSlice(
    imageSelectionStorageSource,
    'function sanitizeProjectSelections',
    'function isProjectSelectionState',
  )

  assert.match(
    sanitizeSelectionsSource,
    /nextSelections\[projectId\] = dedupeImages\(images\.filter\(isSelectedLocationImage\)\)/,
  )
  assert.doesNotMatch(sanitizeSelectionsSource, /validImages\.length === 0/)
})

test('empty project selection intent distinguishes explicit clear from unknown empty', () => {
  assert.match(imageSelectionStorageSource, /ProjectSelectionEmptyIntent = 'explicit-clear' \| 'unknown-empty' \| null/)
  assert.match(imageSelectionStorageSource, /sanitizeProjectSelectionEmptyIntent/)
  assert.match(imageSelectionStorageSource, /return value === 'explicit-clear' \? 'explicit-clear' : 'unknown-empty'/)
  assert.match(imageSelectionProviderSource, /projectSelectionEmptyIntentRef/)
  assert.match(imageSelectionProviderSource, /getProjectSelectionEmptyIntent/)
})

test('valid selected images with empty category slug are not silently dropped', () => {
  const selectedImageGuardSource = getSourceSlice(
    imageSelectionStorageSource,
    'function isSelectedLocationImage',
    'function dedupeImages',
  )

  assert.match(selectedImageGuardSource, /typeof candidate\.categorySlug === 'string'/)
  assert.doesNotMatch(selectedImageGuardSource, /isNonEmptyString\(candidate\.categorySlug\)/)
})

test('unknown empty local state does not block non-empty remote hydration', () => {
  const canApplyRemoteSource = getSourceSlice(
    imageSelectionProviderSource,
    'const canApplyRemoteProjectSelection = useCallback',
    'const markProjectSelectionSynced = useCallback',
  )
  const replaceSelectionSource = getSourceSlice(
    imageSelectionProviderSource,
    'const replaceSelection = useCallback',
    'const removeImage = useCallback',
  )

  assert.match(canApplyRemoteSource, /localImages\.length === 0/)
  assert.match(canApplyRemoteSource, /localEmptyIntent !== 'explicit-clear'/)
  assert.match(canApplyRemoteSource, /isUnknownEmptyLocalState && remoteCount > 0/)
  assert.match(replaceSelectionSource, /normalizedImages\.length/)
  assert.match(replaceSelectionSource, /markProjectSelectionRemoteHydrated\(projectId\)/)
})

test('explicit clear remains authoritative against non-empty remote hydration', () => {
  const canApplyRemoteSource = getSourceSlice(
    imageSelectionProviderSource,
    'const canApplyRemoteProjectSelection = useCallback',
    'const markProjectSelectionSynced = useCallback',
  )

  assert.match(canApplyRemoteSource, /localEmptyIntent !== 'explicit-clear'/)
  assert.doesNotMatch(canApplyRemoteSource, /localEmptyIntent === 'explicit-clear' && remoteCount > 0[\s\S]*return true/)
})

test('provider sync queue blocks unknown-empty destructive writes unless empty intent is explicit clear', () => {
  const queueOptionsSource = getSourceSlice(
    imageSelectionProviderSource,
    'projectSelectionSyncQueueRef.current = new SelectionSyncQueue',
    '  const enqueueProjectSelectionSync = useCallback',
  )
  const canSyncSource = getSourceSlice(
    imageSelectionProviderSource,
    'const canSyncProjectSelectionSnapshot = useCallback',
    'if (!projectSelectionSyncQueueRef.current)',
  )

  assert.match(canSyncSource, /snapshot\.images\.length > 0 \|\| snapshot\.emptyIntent === 'explicit-clear'/)
  assert.match(queueOptionsSource, /provider_sync_skip/)
  assert.match(queueOptionsSource, /allowEmptySelection:[\s\S]*snapshot\.emptyIntent === 'explicit-clear'/)
  assert.doesNotMatch(selectionDrawerSource, /syncRequestProjectSelection/)
})

test('provider sync queue coalesces rapid mutations without concurrent writes', () => {
  const enqueueSource = getSourceSlice(
    selectionSyncQueueSource,
    '  enqueue(projectId: string) {',
    '  async flush(',
  )

  assert.match(enqueueSource, /if \(this\.writeInFlight\[projectId\]\) \{/)
  assert.match(enqueueSource, /this\.pendingSnapshot = \{/)
  assert.match(enqueueSource, /\[projectId\]: snapshot/)
  assert.match(enqueueSource, /return/)
  assert.match(enqueueSource, /void this\.startWrite\(snapshot\)/)
})

test('provider keeps failed writes dirty and retryable through pending snapshot', () => {
  const queueStartWriteSource = getSourceSlice(
    selectionSyncQueueSource,
    '  private startWrite(snapshot: SelectionSyncSnapshot<TImage>)',
    '    this.writePromise = {',
  )
  const queueOptionsSource = getSourceSlice(
    imageSelectionProviderSource,
    'projectSelectionSyncQueueRef.current = new SelectionSyncQueue',
    '  const enqueueProjectSelectionSync = useCallback',
  )
  const flushSource = getSourceSlice(
    imageSelectionProviderSource,
    'const flushSelection = useCallback',
    'useEffect(() => {\n    function handleSelectionActiveContextChange',
  )

  assert.match(queueStartWriteSource, /this\.pendingSnapshot\[snapshot\.projectId\] \?\? snapshot/)
  assert.match(queueOptionsSource, /setSelectionStatus\('error'\)/)
  assert.match(queueStartWriteSource, /throw error/)
  assert.match(flushSource, /if \(!projectSelectionSyncQueueRef\.current\?\.getInFlight\(normalizedProjectId\)\) \{/)
  assert.match(flushSource, /enqueueProjectSelectionSync\(normalizedProjectId\)/)
})

test('provider write queue is partitioned by project id', () => {
  assert.match(
    imageSelectionProviderSource,
    /projectSelectionSyncQueueRef =[\s\S]*useRef<SelectionSyncQueue<SelectedLocationImage> \| null>/,
  )
  assert.match(
    selectionSyncQueueSource,
    /private writeInFlight: Record<string, SelectionSyncSnapshot<TImage> \| undefined>/,
  )
  assert.match(
    selectionSyncQueueSource,
    /private pendingSnapshot: Record<string, SelectionSyncSnapshot<TImage> \| undefined>/,
  )
  assert.match(
    selectionSyncQueueSource,
    /private writePromise: Record<string, Promise<void> \| undefined>/,
  )
})

test('remote selection rejection does not mark unknown empty state hydrated and stable', () => {
  const hydrateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const hydrateProjectSelection = useCallback',
    'const setActiveProjectContext = useCallback',
  )
  const providerGuardSource = getSourceSlice(
    imageSelectionProviderSource,
    'const canApplyRemoteProjectSelection = useCallback',
    'const markProjectSelectionSynced = useCallback',
  )

  assert.match(providerGuardSource, /isUnknownEmptyLocalState && remoteCount > 0/)
  assert.match(providerGuardSource, /localEmptyIntent !== 'explicit-clear'/)
  assert.match(
    hydrateSource,
    /!canApplyRemoteProjectSelection\(\s*projectId,\s*selectionVersionAtRequestStart,\s*nextSelection\.length,\s*\)/,
  )
  assert.match(hydrateSource, /provider_hydration_skip/)
  assert.match(hydrateSource, /setSelectionStatus\('ready'\)[\s\S]*return null/)
})

test('active project without a resolved selection is treated as pending resolution', () => {
  const providerStateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const images = activeProjectId',
    'useEffect(() => {',
  )

  assert.match(
    providerStateSource,
    /const hasResolvedActiveProjectSelection =\s*!activeProjectId \|\|/,
  )
  assert.match(
    providerStateSource,
    /Object\.prototype\.hasOwnProperty\.call\(projectSelections, activeProjectId\)/,
  )
  assert.match(
    providerStateSource,
    /const isProjectSelectionPendingResolution = Boolean\(/,
  )
  assert.match(providerStateSource, /isHydratingActiveProjectSelection/)
  assert.match(providerStateSource, /!hasResolvedActiveProjectSelection/)
})

test('selection trigger does not show zero as final while project selection is pending', () => {
  assert.match(selectionDrawerTriggerSource, /isProjectSelectionPendingResolution/)
  assert.match(selectionDrawerTriggerSource, /Recuperando\.\.\./)
  assert.match(
    selectionDrawerTriggerSource,
    /isProjectSelectionPendingResolution \? '\.\.\.' : images\.length/,
  )
  assert.doesNotMatch(
    selectionDrawerTriggerSource,
    /<span[^>]*>\s*\{images\.length\}\s*<\/span>/,
  )
})

test('drawer renders recovery loading and has no selection autosave of its own', () => {
  const contentStateSource = getSourceSlice(
    selectionDrawerSource,
    'const currentSelectionContentState = useMemo',
    'const currentSelectionContentStateRef',
  )

  assert.match(contentStateSource, /isProjectSelectionPendingResolution/)
  assert.match(contentStateSource, /kind: 'loading'/)
  assert.doesNotMatch(selectionDrawerSource, /const runSelectionAutosave = useCallback/)
  assert.doesNotMatch(selectionDrawerSource, /flushSelectionAutosaveBeforeProjectChange/)
  assert.doesNotMatch(selectionDrawerSource, /lastQueuedSnapshotRef/)
  assert.doesNotMatch(selectionDrawerSource, /lastPersistedSnapshotRef/)
  assert.doesNotMatch(selectionDrawerSource, /syncRequestProjectSelection/)
})

test('provider exposes additive stage 1 selection authority API', () => {
  assert.match(imageSelectionProviderSource, /SelectionStatus = 'idle' \| 'loading' \| 'ready' \| 'syncing' \| 'error'/)
  assert.match(imageSelectionProviderSource, /type ConfirmedSelection = \{/)
  assert.match(imageSelectionProviderSource, /status: SelectionStatus/)
  assert.match(imageSelectionProviderSource, /error: string \| null/)
  assert.match(imageSelectionProviderSource, /dirty: boolean/)
  assert.match(imageSelectionProviderSource, /version: number/)
  assert.match(imageSelectionProviderSource, /confirmedVersion: number/)
  assert.match(imageSelectionProviderSource, /confirmedSelection: ConfirmedSelection \| null/)
  assert.match(imageSelectionProviderSource, /selectProject:/)
  assert.match(imageSelectionProviderSource, /loadProjectSelection:/)
  assert.match(imageSelectionProviderSource, /flushSelection:/)
})

test('provider selection authority starts in idle status', () => {
  assert.match(
    imageSelectionProviderSource,
    /const \[selectionStatus, setSelectionStatus\] = useState<SelectionStatus>\('idle'\)/,
  )
})

test('selectProject delegates to the existing active context path', () => {
  const selectProjectSource = getSourceSlice(
    imageSelectionProviderSource,
    'const selectProject = useCallback',
    'const loadProjectSelection = useCallback',
  )

  assert.match(selectProjectSource, /setActiveProjectContext\(projectId, options\)/)
})

test('loadProjectSelection records loading ready and error states', () => {
  const loadSource = getSourceSlice(
    imageSelectionProviderSource,
    'const loadProjectSelection = useCallback',
    'const flushSelection = useCallback',
  )
  const hydrateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const hydrateProjectSelection = useCallback',
    'const hasProjectSelection = useCallback',
  )

  assert.match(loadSource, /hydrateProjectSelection\(normalizedProjectId\)/)
  assert.match(hydrateSource, /setSelectionStatus\('loading'\)/)
  assert.match(hydrateSource, /setSelectionStatus\('ready'\)/)
  assert.match(hydrateSource, /setSelectionStatus\('error'\)/)
  assert.match(hydrateSource, /setSelectionError\(message\)/)
})

test('provider skips redundant same-project hydration while one request is in flight', () => {
  const hydrateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const hydrateProjectSelection = useCallback',
    'const hasProjectSelection = useCallback',
  )
  const guardIndex = hydrateSource.indexOf('activeHydrationProjectIdRef.current === projectId')
  const fetchIndex = hydrateSource.indexOf('await fetchProjectSelectionImages(projectId)')

  assert.notEqual(guardIndex, -1)
  assert.notEqual(fetchIndex, -1)
  assert.ok(guardIndex < fetchIndex)
  assert.match(hydrateSource, /reason: 'same_project_in_flight'/)
  assert.match(hydrateSource, /activeHydrationPromiseRef\.current\.promise/)
})

test('provider hydration clears its in-flight project so a future trigger can hydrate again', () => {
  const hydrateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const hydrateProjectSelection = useCallback',
    'const hasProjectSelection = useCallback',
  )

  assert.match(hydrateSource, /activeHydrationProjectIdRef\.current = projectId/)
  assert.match(
    hydrateSource,
    /activeHydrationProjectIdRef\.current === projectId[\s\S]*activeHydrationProjectIdRef\.current = null/,
  )
  assert.match(hydrateSource, /activeHydrationPromiseRef\.current = null/)
})

test('provider allows a new project id to begin a distinct hydration', () => {
  const hydrateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const hydrateProjectSelection = useCallback',
    'const hasProjectSelection = useCallback',
  )

  assert.match(hydrateSource, /activeHydrationProjectIdRef\.current === projectId/)
  assert.match(hydrateSource, /const requestId = hydrationRequestIdRef\.current \+ 1/)
  assert.match(hydrateSource, /activeHydrationProjectIdRef\.current = projectId/)
})

test('flushSelection returns confirmed selection when there is no dirty state', () => {
  const flushSource = getSourceSlice(
    imageSelectionProviderSource,
    'const flushSelection = useCallback',
    'useEffect(() => {\n    function handleSelectionActiveContextChange',
  )

  assert.match(flushSource, /!isDirtySelection && currentConfirmedVersion === currentVersion/)
  assert.match(flushSource, /projectId: normalizedProjectId/)
  assert.match(flushSource, /images: currentImages/)
  assert.match(flushSource, /version: currentVersion/)
  assert.match(flushSource, /confirmedAt:/)
})

test('flushSelection dirty path waits for Supabase persistence before confirming', () => {
  const flushSource = getSourceSlice(
    imageSelectionProviderSource,
    'const flushSelection = useCallback',
    'useEffect(() => {\n    function handleSelectionActiveContextChange',
  )
  const enqueueIndex = flushSource.indexOf('enqueueProjectSelectionSync(normalizedProjectId)')
  const awaitIndex = flushSource.indexOf('await writePromise', enqueueIndex)

  assert.match(flushSource, /for \(let attempt = 0; attempt < 25; attempt \+= 1\)/)
  assert.match(flushSource, /!isDirtySelection && currentConfirmedVersion === currentVersion/)
  assert.notEqual(enqueueIndex, -1)
  assert.notEqual(awaitIndex, -1)
  assert.ok(enqueueIndex < awaitIndex)
})

test('flushSelection sync errors fail without advancing confirmation', () => {
  const queueStartWriteSource = getSourceSlice(
    selectionSyncQueueSource,
    '  private startWrite(snapshot: SelectionSyncSnapshot<TImage>)',
    '    this.writePromise = {',
  )
  const queueOptionsSource = getSourceSlice(
    imageSelectionProviderSource,
    'projectSelectionSyncQueueRef.current = new SelectionSyncQueue',
    '  const enqueueProjectSelectionSync = useCallback',
  )
  const catchIndex = queueStartWriteSource.indexOf('catch (error)')
  const finallyIndex = queueStartWriteSource.indexOf('finally', catchIndex)
  const catchSource = queueStartWriteSource.slice(catchIndex, finallyIndex)

  assert.notEqual(catchIndex, -1)
  assert.notEqual(finallyIndex, -1)
  assert.doesNotMatch(catchSource, /onConfirmed/)
  assert.match(queueOptionsSource, /setSelectionStatus\('error'\)/)
  assert.match(catchSource, /throw error/)
})

test('confirmedVersion only advances through explicit confirmation helpers', () => {
  const confirmedSource = getSourceSlice(
    imageSelectionProviderSource,
    'const markProjectSelectionConfirmed = useCallback',
    'const getProjectSelectionSyncSnapshot = useCallback',
  )
  const localUpdateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const applyLocalProjectSelectionUpdate = useCallback',
    'const markProjectSelectionRemoteHydrated = useCallback',
  )

  assert.match(confirmedSource, /projectSelectionConfirmedVersionsRef\.current = \{/)
  assert.match(confirmedSource, /\[projectId\]: version/)
  assert.doesNotMatch(localUpdateSource, /projectSelectionConfirmedVersionsRef\.current = \{/)
})

test('legacy drawer-facing provider APIs remain exposed during stage 1', () => {
  assert.match(imageSelectionProviderSource, /replaceSelection:/)
  assert.match(imageSelectionProviderSource, /markProjectSelectionSynced:/)
  assert.match(imageSelectionProviderSource, /setActiveProjectContext:/)
  assert.match(imageSelectionProviderSource, /isHydratingActiveProjectSelection:/)
  assert.match(imageSelectionProviderSource, /isProjectSelectionPendingResolution:/)
})

test('provider hydration identity is not tied to visual hydration flags', () => {
  const loggerSource = getSourceSlice(
    imageSelectionProviderSource,
    'const logSelectionDebugEvent = useCallback',
    'const logSelectionCountTransition = useCallback',
  )
  const hydrateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const hydrateProjectSelection = useCallback',
    'const hasProjectSelection = useCallback',
  )

  assert.match(loggerSource, /isHydratingActiveProjectSelectionRef\.current/)
  assert.match(loggerSource, /isProjectSelectionPendingResolutionRef\.current/)
  assert.match(loggerSource, /\}, \[\]\)/)
  assert.doesNotMatch(
    hydrateSource,
    /\[\s*[\s\S]*(isHydratingActiveProjectSelection|isProjectSelectionPendingResolution)[\s\S]*\s*\]\)/,
  )
})

test('persisted active-context self event does not re-enter project hydration', () => {
  const activeContextEventSource = getSourceSlice(
    imageSelectionProviderSource,
    'function handleSelectionActiveContextChange',
    'window.addEventListener',
  )

  assert.match(activeContextEventSource, /pendingPersistedContextEventRef\.current = null/)
  assert.match(
    activeContextEventSource,
    /pendingPersistedContextEvent\.projectId === nextContext\.projectId[\s\S]*return/,
  )
  assert.doesNotMatch(activeContextEventSource, /if \(!pendingPersistedContextEvent\.hydrate\)/)
})

test('provider still starts hydration when the active project really changes', () => {
  const setActiveProjectContextSource = getSourceSlice(
    imageSelectionProviderSource,
    'const setActiveProjectContext = useCallback',
    'useEffect(() => {\n    function handleSelectionActiveContextChange',
  )

  assert.match(
    setActiveProjectContextSource,
    /activeProjectIdRef\.current !== normalizedProjectId/,
  )
  assert.match(setActiveProjectContextSource, /void hydrateProjectSelection\(normalizedProjectId\)/)
})

test('drawer stage 2 delegates project hydration to the provider', () => {
  const openProjectSource = getSourceSlice(
    selectionDrawerSource,
    'function handleOpenSelectionProject',
    'window.addEventListener',
  )
  const activeProjectHydrationSource = getSourceSlice(
    selectionDrawerSource,
    'async function performActiveProjectChange',
    'async function handleActiveProjectChange',
  )

  assert.doesNotMatch(selectionDrawerSource, /fetchProjectSelectionImages/)
  assert.doesNotMatch(selectionDrawerSource, /fetchProjectSelection\(/)
  assert.doesNotMatch(selectionDrawerSource, /source:\s*['"]remote['"]/)
  assert.doesNotMatch(selectionDrawerSource, /const applyProjectSelection = useCallback/)
  assert.doesNotMatch(selectionDrawerSource, /const beginDrawerHydration = useCallback/)
  assert.match(openProjectSource, /openDrawer\(\)/)
  assert.match(openProjectSource, /selectProject\(projectId/)
  assert.match(openProjectSource, /await loadProjectSelection\(projectId\)/)
  assert.match(activeProjectHydrationSource, /selectProject\(projectId/)
  assert.match(activeProjectHydrationSource, /await loadProjectSelection\(projectId\)/)
})

test('one remote hydration source remains and same-project in-flight loads are guarded by provider', () => {
  const hydrateSource = getSourceSlice(
    imageSelectionProviderSource,
    'const hydrateProjectSelection = useCallback',
    'const setActiveProjectContext = useCallback',
  )

  assert.match(imageSelectionProviderSource, /import \{ fetchProjectSelectionImages \}/)
  assert.match(hydrateSource, /activeHydrationProjectIdRef\.current === projectId/)
  assert.match(hydrateSource, /reason: 'same_project_in_flight'/)
  assert.match(hydrateSource, /await fetchProjectSelectionImages\(projectId\)/)
  assert.match(hydrateSource, /hydrationRequestIdRef\.current !== requestId/)
  assert.match(hydrateSource, /activeProjectIdRef\.current !== projectId/)
})

test('drawer derives hydration loading and error state from provider', () => {
  assert.match(selectionDrawerSource, /status: selectionStatus/)
  assert.match(selectionDrawerSource, /error: selectionError/)
  assert.match(selectionDrawerSource, /const isLoadingProjectContent = selectionStatus === 'loading'/)
  assert.match(selectionDrawerSource, /selectionStatus === 'error' \? selectionError : null/)
  assert.doesNotMatch(selectionDrawerSource, /const \[isLoadingProjectContent/)
  assert.doesNotMatch(selectionDrawerSource, /const \[isHydratingPersistedContext/)
  assert.doesNotMatch(selectionDrawerSource, /const \[projectLoadError/)
})

test('location selection and PDF submit stay blocked while selection is pending', () => {
  const locationToggleSource = getSourceSlice(
    locationDetailPageSource,
    'function toggleImageSelection',
    'function handleImageSelection',
  )
  const pdfSubmitSource = getSourceSlice(
    selectionPdfFlowSource,
    'async function handleSubmitProposal()',
    'submitProposalRef.current = handleSubmitProposal',
  )
  const pdfFooterSource = getSourceSlice(
    selectionPdfFlowSource,
    'const formSidebarFooter = useMemo',
    'useEffect(() => {\n    if (!onEmbeddedPreviewChange)',
  )

  assert.match(locationToggleSource, /isProjectSelectionPendingResolution/)
  assert.match(locationDetailPageSource, /disabled=\{isProjectSelectionPendingResolution\}/)
  assert.match(pdfSubmitSource, /if \(isProjectSelectionPendingResolution\)/)
  assert.match(
    pdfFooterSource,
    /disabled=\{\s*isProjectSelectionPendingResolution \|\|/,
  )
})

test('selection debug log is gated by query string and persists a capped local log', () => {
  assert.match(
    selectionDebugLogSource,
    /SELECTION_DEBUG_LOG_STORAGE_KEY = 'selection-debug-log:v1'/,
  )
  assert.match(selectionDebugLogSource, /MAX_SELECTION_DEBUG_EVENTS = 150/)
  assert.match(
    selectionDebugLogSource,
    /new URLSearchParams\(window\.location\.search\)\.get\('selectionDebug'\) === '1'/,
  )
  assert.match(selectionDebugLogSource, /window\.localStorage\.setItem\(/)
  assert.match(selectionDebugLogSource, /\.slice\(\s*-MAX_SELECTION_DEBUG_EVENTS,\s*\)/)
})

test('provider debug instrumentation records restore hydration mutation and empty transitions', () => {
  assert.match(imageSelectionProviderSource, /provider_mount/)
  assert.match(imageSelectionProviderSource, /provider_restore_cache/)
  assert.match(imageSelectionProviderSource, /provider_restore_active_context/)
  assert.match(imageSelectionProviderSource, /provider_hydration_start/)
  assert.match(imageSelectionProviderSource, /provider_hydration_result/)
  assert.match(imageSelectionProviderSource, /provider_hydration_apply/)
  assert.match(imageSelectionProviderSource, /provider_hydration_skip/)
  assert.match(imageSelectionProviderSource, /add_image/)
  assert.match(imageSelectionProviderSource, /remove_image/)
  assert.match(imageSelectionProviderSource, /clear_selection/)
  assert.match(imageSelectionProviderSource, /replace_selection_local/)
  assert.match(imageSelectionProviderSource, /replace_selection_remote/)
  assert.match(imageSelectionProviderSource, /persist_immediate/)
  assert.match(imageSelectionProviderSource, /persist_effect/)
  assert.match(imageSelectionProviderSource, /SELECTION_BECOMING_EMPTY/)
})

test('drawer debug instrumentation records lifecycle and provider records sync queue events', () => {
  assert.match(selectionDrawerSource, /drawer_mount/)
  assert.doesNotMatch(selectionDrawerSource, /drawer_hydration_start/)
  assert.doesNotMatch(selectionDrawerSource, /drawer_hydration_result/)
  assert.doesNotMatch(selectionDrawerSource, /drawer_hydration_apply/)
  assert.doesNotMatch(selectionDrawerSource, /drawer_hydration_skip/)
  assert.doesNotMatch(selectionDrawerSource, /drawer_replace_selection/)
  assert.doesNotMatch(selectionDrawerSource, /autosave_start/)
  assert.doesNotMatch(selectionDrawerSource, /autosave_success/)
  assert.doesNotMatch(selectionDrawerSource, /autosave_error/)
  assert.match(imageSelectionProviderSource, /provider_sync_start/)
  assert.match(imageSelectionProviderSource, /provider_sync_pending/)
  assert.match(imageSelectionProviderSource, /provider_sync_success/)
  assert.match(imageSelectionProviderSource, /provider_sync_error/)
})

test('selection debug panel exposes lifecycle logging and copy clear controls only in app debug mode', () => {
  assert.match(privateFeatureProvidersSource, /<SelectionDebugPanel \/>/)
  assert.match(selectionDebugPanelSource, /isSelectionDebugEnabled\(\)/)
  assert.match(selectionDebugPanelSource, /visibilitychange/)
  assert.match(selectionDebugPanelSource, /pagehide/)
  assert.match(selectionDebugPanelSource, /pageshow/)
  assert.match(selectionDebugPanelSource, /focus/)
  assert.match(selectionDebugPanelSource, /blur/)
  assert.match(selectionDebugPanelSource, /Copiar log/)
  assert.match(selectionDebugPanelSource, /Limpiar log/)
})
