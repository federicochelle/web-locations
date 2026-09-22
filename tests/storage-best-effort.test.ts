import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearImageSelectionStorage,
  persistImageSelectionCache,
} from '../src/utils/image-selection-storage.ts'
import {
  clearSelectionActiveContext,
  persistSelectionActiveContext,
  SELECTION_ACTIVE_CONTEXT_CHANGE_EVENT,
} from '../src/utils/selection-active-context-storage.ts'

type TestWindow = {
  localStorage: {
    getItem?: (key: string) => string | null
    setItem?: (key: string, value: string) => void
    removeItem?: (key: string) => void
  }
  dispatchEvent: (event: Event) => boolean
}

const emptySelectionCache = {
  globalImages: [],
  projectSelections: {},
  projectSelectionState: {},
}

function withWindow(
  windowValue: TestWindow,
  callback: () => void,
) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: windowValue,
  })

  try {
    callback()
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow)
    } else {
      delete (globalThis as { window?: unknown }).window
    }
  }
}

function withUnavailableLocalStorage(callback: () => void) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    get() {
      return {
        get localStorage() {
          throw new Error('localStorage unavailable')
        },
        dispatchEvent() {
          return true
        },
      }
    },
  })

  try {
    callback()
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow)
    } else {
      delete (globalThis as { window?: unknown }).window
    }
  }
}

test('image selection persist is best-effort when localStorage.setItem throws', () => {
  withWindow({
    localStorage: {
      setItem() {
        throw new Error('setItem failed')
      },
    },
    dispatchEvent() {
      return true
    },
  }, () => {
    assert.doesNotThrow(() => {
      persistImageSelectionCache(emptySelectionCache)
    })
  })
})

test('image selection clear is best-effort when localStorage.removeItem throws', () => {
  withWindow({
    localStorage: {
      removeItem() {
        throw new Error('removeItem failed')
      },
    },
    dispatchEvent() {
      return true
    },
  }, () => {
    assert.doesNotThrow(() => {
      clearImageSelectionStorage()
    })
  })
})

test('active context persist does not depend on localStorage.setItem succeeding', () => {
  const dispatchedEvents: string[] = []

  withWindow({
    localStorage: {
      setItem() {
        throw new Error('active context setItem failed')
      },
    },
    dispatchEvent(event) {
      dispatchedEvents.push(event.type)
      return true
    },
  }, () => {
    assert.doesNotThrow(() => {
      persistSelectionActiveContext({ mode: 'project', projectId: 'project-a' })
    })
  })

  assert.deepEqual(dispatchedEvents, [SELECTION_ACTIVE_CONTEXT_CHANGE_EVENT])
})

test('active context clear is best-effort when localStorage.removeItem throws', () => {
  withWindow({
    localStorage: {
      removeItem() {
        throw new Error('active context removeItem failed')
      },
    },
    dispatchEvent() {
      return true
    },
  }, () => {
    assert.doesNotThrow(() => {
      clearSelectionActiveContext()
    })
  })
})

test('storage helpers do not crash when localStorage is unavailable', () => {
  withUnavailableLocalStorage(() => {
    assert.doesNotThrow(() => {
      persistImageSelectionCache(emptySelectionCache)
    })
    assert.doesNotThrow(() => {
      clearImageSelectionStorage()
    })
    assert.doesNotThrow(() => {
      persistSelectionActiveContext({ mode: 'new' })
    })
    assert.doesNotThrow(() => {
      clearSelectionActiveContext()
    })
  })
})
