import type { ProjectSelectionEmptyIntent } from './image-selection-storage.ts'

export type SelectionSyncSnapshot<TImage> = {
  projectId: string
  images: TImage[]
  version: number
  emptyIntent: ProjectSelectionEmptyIntent
  snapshotKey: string
}

export type SelectionSyncQueueOptions<TImage> = {
  getSnapshot: (projectId: string) => SelectionSyncSnapshot<TImage> | null
  canSyncSnapshot: (snapshot: SelectionSyncSnapshot<TImage>) => boolean
  syncSnapshot: (snapshot: SelectionSyncSnapshot<TImage>) => Promise<void>
  onStart?: (snapshot: SelectionSyncSnapshot<TImage>) => void
  onPending?: (snapshot: SelectionSyncSnapshot<TImage>) => void
  onSkip?: (snapshot: SelectionSyncSnapshot<TImage>) => void
  onConfirmed: (snapshot: SelectionSyncSnapshot<TImage>) => void
  onError?: (snapshot: SelectionSyncSnapshot<TImage>, error: unknown) => void
  onIdle?: (projectId: string) => void
}

export class SelectionSyncQueue<TImage> {
  private options: SelectionSyncQueueOptions<TImage>
  private writeInFlight: Record<string, SelectionSyncSnapshot<TImage> | undefined> = {}
  private pendingSnapshot: Record<string, SelectionSyncSnapshot<TImage> | undefined> = {}
  private writePromise: Record<string, Promise<void> | undefined> = {}

  constructor(options: SelectionSyncQueueOptions<TImage>) {
    this.options = options
  }

  updateOptions(options: SelectionSyncQueueOptions<TImage>) {
    this.options = options
  }

  getInFlight(projectId: string) {
    return this.writeInFlight[projectId] ?? null
  }

  getPending(projectId: string) {
    return this.pendingSnapshot[projectId] ?? null
  }

  getWritePromise(projectId: string) {
    return this.writePromise[projectId] ?? null
  }

  clear() {
    this.writeInFlight = {}
    this.pendingSnapshot = {}
    this.writePromise = {}
  }

  enqueue(projectId: string) {
    const snapshot = this.options.getSnapshot(projectId)

    if (!snapshot) {
      return
    }

    if (!this.options.canSyncSnapshot(snapshot)) {
      this.options.onSkip?.(snapshot)
      return
    }

    if (this.writeInFlight[projectId]) {
      this.pendingSnapshot = {
        ...this.pendingSnapshot,
        [projectId]: snapshot,
      }
      this.options.onPending?.(snapshot)
      return
    }

    void this.startWrite(snapshot).catch(() => undefined)
  }

  async flush(
    projectId: string,
    isConfirmed: () => boolean,
    maxAttempts = 25,
  ) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (isConfirmed()) {
        return
      }

      if (!this.writeInFlight[projectId]) {
        this.enqueue(projectId)
      }

      const currentWritePromise = this.writePromise[projectId]

      if (!currentWritePromise) {
        continue
      }

      await currentWritePromise
    }

    throw new Error('No pudimos confirmar la seleccion del proyecto.')
  }

  private startWrite(snapshot: SelectionSyncSnapshot<TImage>) {
    this.writeInFlight = {
      ...this.writeInFlight,
      [snapshot.projectId]: snapshot,
    }
    this.pendingSnapshot = {
      ...this.pendingSnapshot,
      [snapshot.projectId]: undefined,
    }
    this.options.onStart?.(snapshot)

    const writePromise = (async () => {
      let didWriteSnapshot = false

      try {
        await this.options.syncSnapshot(snapshot)
        didWriteSnapshot = true
        this.options.onConfirmed(snapshot)
      } catch (error) {
        this.pendingSnapshot = {
          ...this.pendingSnapshot,
          [snapshot.projectId]: this.pendingSnapshot[snapshot.projectId] ?? snapshot,
        }
        this.options.onError?.(snapshot, error)
        throw error
      } finally {
        this.writeInFlight = {
          ...this.writeInFlight,
          [snapshot.projectId]: undefined,
        }
        this.writePromise = {
          ...this.writePromise,
          [snapshot.projectId]: undefined,
        }
      }

      if (didWriteSnapshot) {
        const nextSnapshot = this.pendingSnapshot[snapshot.projectId]
        const shouldWritePending =
          nextSnapshot &&
          (nextSnapshot.version !== snapshot.version ||
            nextSnapshot.snapshotKey !== snapshot.snapshotKey)

        if (shouldWritePending) {
          void this.startWrite(nextSnapshot).catch(() => undefined)
          return
        }
      }

      this.options.onIdle?.(snapshot.projectId)
    })()

    this.writePromise = {
      ...this.writePromise,
      [snapshot.projectId]: writePromise,
    }

    return writePromise
  }
}
