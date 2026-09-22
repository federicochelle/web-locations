import assert from 'node:assert/strict'
import test from 'node:test'

import {
  SelectionSyncQueue,
  type SelectionSyncSnapshot,
} from '../src/utils/selection-sync-queue.ts'

type TestImage = {
  key: string
}

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

function deferred<T = void>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve']
  let reject!: Deferred<T>['reject']
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return {
    promise,
    resolve,
    reject,
  }
}

function waitForMicrotasks() {
  return new Promise<void>((resolve) => {
    queueMicrotask(resolve)
  })
}

function snapshotKey(images: TestImage[]) {
  return images.map((image) => image.key).join('|')
}

function createQueueHarness() {
  const selections: Record<string, TestImage[]> = {}
  const versions: Record<string, number> = {}
  const confirmedVersions: Record<string, number> = {}
  const dirty: Record<string, boolean> = {}
  const emptyIntents: Record<string, SelectionSyncSnapshot<TestImage>['emptyIntent']> = {}
  const writes: Array<{
    snapshot: SelectionSyncSnapshot<TestImage>
    deferred: Deferred<void>
  }> = []
  const starts: SelectionSyncSnapshot<TestImage>[] = []
  const confirmed: SelectionSyncSnapshot<TestImage>[] = []
  const errors: Array<{ snapshot: SelectionSyncSnapshot<TestImage>; error: unknown }> = []

  const queue = new SelectionSyncQueue<TestImage>({
    getSnapshot(projectId) {
      const images = selections[projectId] ?? []

      return {
        projectId,
        images,
        version: versions[projectId] ?? 0,
        emptyIntent: images.length > 0 ? null : emptyIntents[projectId] ?? 'unknown-empty',
        snapshotKey: snapshotKey(images),
      }
    },
    canSyncSnapshot(snapshot) {
      return snapshot.images.length > 0 || snapshot.emptyIntent === 'explicit-clear'
    },
    syncSnapshot(snapshot) {
      const nextWrite = {
        snapshot,
        deferred: deferred<void>(),
      }

      writes.push(nextWrite)
      return nextWrite.deferred.promise
    },
    onStart(snapshot) {
      starts.push(snapshot)
    },
    onConfirmed(snapshot) {
      confirmed.push(snapshot)
      confirmedVersions[snapshot.projectId] = snapshot.version
      dirty[snapshot.projectId] = (versions[snapshot.projectId] ?? 0) > snapshot.version
    },
    onError(snapshot, error) {
      errors.push({
        snapshot,
        error,
      })
    },
  })

  function mutate(projectId: string, keys: string[]) {
    selections[projectId] = keys.map((key) => ({ key }))
    versions[projectId] = (versions[projectId] ?? 0) + 1
    dirty[projectId] = true
    emptyIntents[projectId] = keys.length > 0 ? null : 'explicit-clear'
    queue.enqueue(projectId)
  }

  function isConfirmed(projectId: string) {
    return !dirty[projectId] && confirmedVersions[projectId] === versions[projectId]
  }

  async function flush(projectId: string) {
    await queue.flush(projectId, () => isConfirmed(projectId))
    return {
      projectId,
      images: selections[projectId] ?? [],
      version: versions[projectId] ?? 0,
    }
  }

  return {
    queue,
    selections,
    versions,
    confirmedVersions,
    dirty,
    emptyIntents,
    writes,
    starts,
    confirmed,
    errors,
    mutate,
    flush,
    isConfirmed,
  }
}

test('write in flight followed by a new mutation persists the newer snapshot next', async () => {
  const harness = createQueueHarness()

  harness.mutate('project-a', ['a1'])
  assert.equal(harness.writes.length, 1)
  assert.equal(harness.writes[0]?.snapshot.version, 1)

  harness.mutate('project-a', ['a1', 'a2'])
  assert.equal(harness.writes.length, 1)
  assert.equal(harness.queue.getPending('project-a')?.version, 2)

  harness.writes[0]?.deferred.resolve()
  await waitForMicrotasks()
  assert.equal(harness.writes.length, 2)
  assert.equal(harness.writes[1]?.snapshot.version, 2)

  harness.writes[1]?.deferred.resolve()
  await harness.flush('project-a')

  assert.equal(harness.confirmedVersions['project-a'], 2)
  assert.equal(harness.dirty['project-a'], false)
  assert.deepEqual(harness.selections['project-a']?.map((image) => image.key), ['a1', 'a2'])
})

test('pending snapshots coalesce to the newest mutation while a write is in flight', async () => {
  const harness = createQueueHarness()

  harness.mutate('project-a', ['v1'])
  harness.mutate('project-a', ['v2'])
  harness.mutate('project-a', ['v3'])
  harness.mutate('project-a', ['v4'])

  assert.equal(harness.writes.length, 1)
  assert.equal(harness.queue.getPending('project-a')?.version, 4)

  harness.writes[0]?.deferred.resolve()
  await waitForMicrotasks()

  assert.equal(harness.writes.length, 2)
  assert.equal(harness.writes[1]?.snapshot.version, 4)
  assert.deepEqual(harness.writes[1]?.snapshot.images.map((image) => image.key), ['v4'])

  harness.writes[1]?.deferred.resolve()
  await harness.flush('project-a')
  assert.equal(harness.confirmedVersions['project-a'], 4)
  assert.equal(harness.dirty['project-a'], false)
})

test('queues are isolated by project id', async () => {
  const harness = createQueueHarness()

  harness.mutate('project-a', ['a1'])
  harness.mutate('project-b', ['b1'])

  assert.equal(harness.writes.length, 2)
  assert.equal(harness.writes[0]?.snapshot.projectId, 'project-a')
  assert.equal(harness.writes[1]?.snapshot.projectId, 'project-b')
  assert.equal(harness.queue.getInFlight('project-a')?.version, 1)
  assert.equal(harness.queue.getInFlight('project-b')?.version, 1)

  harness.mutate('project-a', ['a2'])
  harness.mutate('project-b', ['b2'])
  assert.equal(harness.queue.getPending('project-a')?.version, 2)
  assert.equal(harness.queue.getPending('project-b')?.version, 2)

  harness.writes[1]?.deferred.resolve()
  await waitForMicrotasks()
  assert.equal(harness.writes[2]?.snapshot.projectId, 'project-b')

  harness.writes[0]?.deferred.resolve()
  await waitForMicrotasks()
  assert.equal(harness.writes[3]?.snapshot.projectId, 'project-a')

  harness.writes[2]?.deferred.resolve()
  harness.writes[3]?.deferred.resolve()
  await harness.flush('project-a')
  await harness.flush('project-b')

  assert.equal(harness.confirmedVersions['project-a'], 2)
  assert.equal(harness.confirmedVersions['project-b'], 2)
  assert.equal(harness.dirty['project-a'], false)
  assert.equal(harness.dirty['project-b'], false)
})

test('failed write remains dirty, does not advance confirmedVersion, and makes flush fail', async () => {
  const harness = createQueueHarness()
  const failure = new Error('supabase down')

  harness.mutate('project-a', ['a1'])
  const flushPromise = harness.flush('project-a')
  harness.writes[0]?.deferred.reject(failure)
  await assert.rejects(flushPromise, /supabase down/)

  assert.equal(harness.confirmedVersions['project-a'] ?? 0, 0)
  assert.equal(harness.dirty['project-a'], true)
  assert.equal(harness.queue.getPending('project-a')?.version, 1)
  assert.equal(harness.errors[0]?.error, failure)
})

test('retry after failure persists the newest snapshot and clears dirty', async () => {
  const harness = createQueueHarness()

  harness.mutate('project-a', ['a1'])
  const failedFlush = harness.flush('project-a')
  harness.writes[0]?.deferred.reject(new Error('first write failed'))
  await assert.rejects(failedFlush, /first write failed/)

  harness.mutate('project-a', ['a1', 'a2'])
  assert.equal(harness.writes.length, 2)
  assert.equal(harness.writes[1]?.snapshot.version, 2)

  harness.writes[1]?.deferred.resolve()
  await harness.flush('project-a')

  assert.equal(harness.confirmedVersions['project-a'], 2)
  assert.equal(harness.dirty['project-a'], false)
  assert.deepEqual(harness.confirmed.at(-1)?.images.map((image) => image.key), ['a1', 'a2'])
})

test('flush waits for in-flight and pending snapshots before returning confirmed selection', async () => {
  const harness = createQueueHarness()

  harness.mutate('project-a', ['a1'])
  harness.mutate('project-a', ['a1', 'a2'])

  const flushPromise = harness.flush('project-a')
  let didFlush = false
  flushPromise.then(() => {
    didFlush = true
  })

  harness.writes[0]?.deferred.resolve()
  await waitForMicrotasks()
  assert.equal(didFlush, false)
  assert.equal(harness.writes[1]?.snapshot.version, 2)

  harness.writes[1]?.deferred.resolve()
  const confirmedSelection = await flushPromise

  assert.equal(didFlush, true)
  assert.equal(confirmedSelection.version, 2)
  assert.deepEqual(confirmedSelection.images.map((image) => image.key), ['a1', 'a2'])
})

test('changing project does not contaminate pending queues between projects', async () => {
  const harness = createQueueHarness()

  harness.mutate('project-a', ['a1'])
  harness.mutate('project-a', ['a2'])
  harness.mutate('project-b', ['b1'])

  assert.equal(harness.queue.getPending('project-a')?.version, 2)
  assert.equal(harness.queue.getPending('project-b'), null)
  assert.deepEqual(harness.selections['project-b']?.map((image) => image.key), ['b1'])

  harness.writes[1]?.deferred.resolve()
  harness.writes[0]?.deferred.resolve()
  await waitForMicrotasks()
  harness.writes[2]?.deferred.resolve()

  await harness.flush('project-a')
  await harness.flush('project-b')

  assert.equal(harness.confirmedVersions['project-a'], 2)
  assert.equal(harness.confirmedVersions['project-b'], 1)
  assert.deepEqual(harness.selections['project-a']?.map((image) => image.key), ['a2'])
  assert.deepEqual(harness.selections['project-b']?.map((image) => image.key), ['b1'])
})

test('immediate PDF submit flush receives exactly the final confirmed images', async () => {
  const harness = createQueueHarness()

  harness.mutate('project-a', ['cover'])
  harness.mutate('project-a', ['cover', 'detail'])

  const pdfSelectionPromise = harness.flush('project-a')
  harness.writes[0]?.deferred.resolve()
  await waitForMicrotasks()
  harness.writes[1]?.deferred.resolve()
  const pdfSelection = await pdfSelectionPromise

  assert.equal(pdfSelection.version, 2)
  assert.deepEqual(pdfSelection.images.map((image) => image.key), ['cover', 'detail'])
  assert.equal(harness.confirmedVersions['project-a'], 2)
})
