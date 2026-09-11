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

const migrationSql = readFileSync(migrationPath, 'utf8')
const correctiveMigrationSql = readFileSync(correctiveMigrationPath, 'utf8')
const locationCascadeCorrectiveMigrationSql = readFileSync(
  locationCascadeCorrectiveMigrationPath,
  'utf8',
)
const serviceSource = readFileSync(servicePath, 'utf8')
const detailHookSource = readFileSync(detailHookPath, 'utf8')

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
