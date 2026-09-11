import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migrationPath =
  'supabase/migrations/20260911120000_harden_request_project_selection_sync.sql'
const servicePath = 'src/services/request-projects.service.ts'

const migrationSql = readFileSync(migrationPath, 'utf8')
const serviceSource = readFileSync(servicePath, 'utf8')

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, ' ').toLowerCase()
}

const normalizedMigration = normalizeSql(migrationSql)

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
  assert.match(
    normalizedMigration,
    /if jsonb_array_length\(p_selection\) = 0 and not p_allow_empty_selection then return query/,
  )
  assert.match(serviceSource, /if \(groupedLocations\.length === 0 && !allowEmptySelection\) \{\s*return\s*\}/)
})

test('normal drawer flow still calls the same frontend contract via RPC', () => {
  const syncFunctionSource = getSyncRequestProjectSelectionSource()

  assert.doesNotMatch(syncFunctionSource, /\.from\('request_project_locations'\)/)
  assert.doesNotMatch(syncFunctionSource, /\.from\('request_project_location_images'\)/)
  assert.match(syncFunctionSource, /p_allow_empty_selection: allowEmptySelection/)
  assert.match(syncFunctionSource, /throw new Error\(error\.message\)/)
})
