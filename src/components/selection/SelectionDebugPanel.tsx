import { useEffect, useMemo, useRef, useState } from 'react'

import { useImageSelection } from '@/hooks/useImageSelection.ts'
import {
  appendSelectionDebugEvent,
  clearSelectionDebugLog,
  isSelectionDebugEnabled,
  readSelectionDebugLog,
  subscribeSelectionDebugLogChange,
  type SelectionDebugEvent,
} from '@/utils/selection-debug-log.ts'

function formatDebugValue(value: unknown) {
  if (value === undefined) {
    return 'undefined'
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return value
  }

  return JSON.stringify(value)
}

function formatDebugDetails(event: SelectionDebugEvent) {
  if (!event.details) {
    return '{}'
  }

  return JSON.stringify(event.details, null, 2)
}

export function SelectionDebugPanel() {
  const {
    activeProjectId,
    images,
    isHydratingActiveProjectSelection,
    isProjectSelectionPendingResolution,
    getProjectSelectionDebugState,
  } = useImageSelection()
  const [isEnabled] = useState(() => isSelectionDebugEnabled())
  const [logEvents, setLogEvents] = useState(() => readSelectionDebugLog())
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'selected'>('idle')
  const [isLogExpanded, setIsLogExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const projectDebugState = useMemo(
    () => getProjectSelectionDebugState(activeProjectId),
    [activeProjectId, getProjectSelectionDebugState],
  )
  const newestLogEvents = useMemo(
    () => [...logEvents].reverse(),
    [logEvents],
  )
  const logJson = useMemo(
    () => JSON.stringify(logEvents, null, 2),
    [logEvents],
  )

  useEffect(() => {
    if (!isEnabled) {
      return
    }

    return subscribeSelectionDebugLogChange(() => {
      setLogEvents(readSelectionDebugLog())
    })
  }, [isEnabled])

  useEffect(() => {
    if (!isEnabled) {
      return
    }

    function logLifecycleEvent(event: Event) {
      appendSelectionDebugEvent({
        event: event.type,
        activeProjectId,
        imagesCount: images.length,
        projectSelectionCount: activeProjectId ? images.length : null,
        dirty: projectDebugState?.dirty ?? null,
        version: projectDebugState?.version ?? null,
        isHydratingActiveProjectSelection,
        isProjectSelectionPendingResolution,
        source: 'lifecycle',
        details: {
          visibilityState:
            typeof document !== 'undefined' ? document.visibilityState : null,
          persisted:
            'persisted' in event && typeof event.persisted === 'boolean'
              ? event.persisted
              : null,
        },
      })
    }

    document.addEventListener('visibilitychange', logLifecycleEvent)
    window.addEventListener('pagehide', logLifecycleEvent)
    window.addEventListener('pageshow', logLifecycleEvent)
    window.addEventListener('focus', logLifecycleEvent)
    window.addEventListener('blur', logLifecycleEvent)

    return () => {
      document.removeEventListener('visibilitychange', logLifecycleEvent)
      window.removeEventListener('pagehide', logLifecycleEvent)
      window.removeEventListener('pageshow', logLifecycleEvent)
      window.removeEventListener('focus', logLifecycleEvent)
      window.removeEventListener('blur', logLifecycleEvent)
    }
  }, [
    activeProjectId,
    images.length,
    isEnabled,
    isHydratingActiveProjectSelection,
    isProjectSelectionPendingResolution,
    projectDebugState?.dirty,
    projectDebugState?.version,
  ])

  if (!isEnabled) {
    return null
  }

  async function handleCopyLog() {
    const nextLog = readSelectionDebugLog()
    const nextLogJson = JSON.stringify(nextLog, null, 2)

    setLogEvents(nextLog)

    try {
      await navigator.clipboard.writeText(nextLogJson)
      setCopyStatus('copied')
    } catch {
      setIsLogExpanded(true)
      window.setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      }, 0)
      setCopyStatus('selected')
    }
  }

  function handleClearLog() {
    clearSelectionDebugLog()
    setLogEvents([])
    setCopyStatus('idle')
  }

  return (
    <div className="fixed bottom-3 left-3 z-[120] w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border border-white/15 bg-black/82 p-3 text-xs text-white shadow-2xl backdrop-blur-md">
      <div className="font-semibold">Selection debug</div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
        <dt className="text-white/58">project</dt>
        <dd className="truncate">{activeProjectId ?? 'null'}</dd>
        <dt className="text-white/58">count</dt>
        <dd>{images.length}</dd>
        <dt className="text-white/58">dirty</dt>
        <dd>{projectDebugState?.dirty === undefined ? 'null' : String(projectDebugState.dirty)}</dd>
        <dt className="text-white/58">version</dt>
        <dd>{projectDebugState?.version ?? 'null'}</dd>
        <dt className="text-white/58">hydrating</dt>
        <dd>{String(isHydratingActiveProjectSelection)}</dd>
        <dt className="text-white/58">pending</dt>
        <dd>{String(isProjectSelectionPendingResolution)}</dd>
        <dt className="text-white/58">events</dt>
        <dd>{logEvents.length}/150</dd>
      </dl>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            void handleCopyLog()
          }}
          className="rounded-md border border-white/20 px-2 py-1 text-white transition hover:bg-white/12"
        >
          Copiar log
        </button>
        <button
          type="button"
          onClick={handleClearLog}
          className="rounded-md border border-white/20 px-2 py-1 text-white transition hover:bg-white/12"
        >
          Limpiar log
        </button>
        {copyStatus === 'copied' ? <span className="self-center text-emerald-200">Copiado</span> : null}
        {copyStatus === 'selected' ? <span className="self-center text-amber-100">Seleccionado</span> : null}
      </div>
      <div className="mt-3 border-t border-white/12 pt-3">
        <button
          type="button"
          onClick={() => {
            setLogEvents(readSelectionDebugLog())
            setIsLogExpanded((currentValue) => !currentValue)
          }}
          className="rounded-md border border-white/20 px-2 py-1 text-white transition hover:bg-white/12"
        >
          Ver log
        </button>
        {isLogExpanded ? (
          <div className="mt-3 max-h-[52vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              {newestLogEvents.length === 0 ? (
                <div className="rounded-md border border-white/12 bg-white/6 p-2 text-white/70">
                  Sin eventos registrados.
                </div>
              ) : (
                newestLogEvents.map((event, index) => (
                  <div
                    key={`${event.timestamp}-${event.event}-${index}`}
                    className="rounded-md border border-white/12 bg-white/6 p-2"
                  >
                    <div className="font-semibold text-white">{event.event}</div>
                    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                      <dt className="text-white/50">timestamp</dt>
                      <dd className="break-all">{formatDebugValue(event.timestamp)}</dd>
                      <dt className="text-white/50">source</dt>
                      <dd>{formatDebugValue(event.source)}</dd>
                      <dt className="text-white/50">activeProjectId</dt>
                      <dd className="break-all">{formatDebugValue(event.activeProjectId)}</dd>
                      <dt className="text-white/50">imagesCount</dt>
                      <dd>{formatDebugValue(event.imagesCount)}</dd>
                      <dt className="text-white/50">projectSelectionCount</dt>
                      <dd>{formatDebugValue(event.projectSelectionCount)}</dd>
                      <dt className="text-white/50">dirty</dt>
                      <dd>{formatDebugValue(event.dirty)}</dd>
                      <dt className="text-white/50">version</dt>
                      <dd>{formatDebugValue(event.version)}</dd>
                      <dt className="text-white/50">hydrating</dt>
                      <dd>{formatDebugValue(event.isHydratingActiveProjectSelection)}</dd>
                      <dt className="text-white/50">pending</dt>
                      <dd>{formatDebugValue(event.isProjectSelectionPendingResolution)}</dd>
                    </dl>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-black/35 p-2 text-[0.68rem] leading-snug text-white/76">
                      {formatDebugDetails(event)}
                    </pre>
                  </div>
                ))
              )}
            </div>
            <label className="mt-3 block text-white/70" htmlFor="selection-debug-log-json">
              JSON completo
            </label>
            <textarea
              id="selection-debug-log-json"
              ref={textareaRef}
              readOnly
              value={logJson}
              className="mt-1 h-36 w-full resize-y rounded-md border border-white/15 bg-black/45 p-2 font-mono text-[0.68rem] leading-snug text-white outline-none focus:border-white/35"
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
