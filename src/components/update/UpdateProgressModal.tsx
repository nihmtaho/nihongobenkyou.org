import { useEffect, useRef } from 'react'
import { seedDatabase, seedKanji } from '../../db/seed'
import { updateStore, useUpdateStore } from '../../stores/updateStore'

function StepIcon({ status }: { status: 'pending' | 'active' | 'done' | 'skipped' }) {
  if (status === 'done') {
    return (
      <span className="w-[18px] h-[18px] flex-shrink-0 bg-foreground text-background flex items-center justify-center text-[9px] font-bold">
        ✓
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="w-[18px] h-[18px] flex-shrink-0 border-2 border-foreground flex items-center justify-center text-[10px] animate-pulse">
        ●
      </span>
    )
  }
  return (
    <span className="w-[18px] h-[18px] flex-shrink-0 border border-dashed border-muted-foreground/40" />
  )
}

export function UpdateProgressModal() {
  const phase = useUpdateStore(s => s.phase)
  const steps = useUpdateStore(s => s.steps)
  const currentFile = useUpdateStore(s => s.currentFile)
  const progress = useUpdateStore(s => s.progress)
  const error = useUpdateStore(s => s.error)
  const isRunningRef = useRef(false)

  useEffect(() => {
    if (phase !== 'updating' || isRunningRef.current)
      return
    isRunningRef.current = true
    runUpdate()
  }, [phase])

  async function runUpdate() {
    const store = updateStore.getState()
    try {
      store.setStepActive('check')
      store.setStepDone('check')

      const swStep = store.steps.find(s => s.id === 'sw')
      if (swStep && swStep.status !== 'skipped') {
        store.setStepActive('sw')
        try {
          const reg = await navigator.serviceWorker?.getRegistration()
          if (reg?.waiting) {
            await new Promise<void>((resolve) => {
              reg.waiting!.postMessage({ type: 'SKIP_WAITING' })
              setTimeout(resolve, 500)
            })
            store.setNeedsReload(true)
          }
        }
        catch {
          // SW activation failed — continue without reload
        }
        store.setStepDone('sw')
      }

      const datasetStep = store.steps.find(s => s.id === 'dataset')
      if (datasetStep && datasetStep.status !== 'skipped') {
        store.setStepActive('dataset')
        await seedDatabase((file, index, total) => {
          store.setProgress(file, Math.round((index / total) * 100))
        })
        store.setStepDone('dataset')
      }

      const kanjiStep = store.steps.find(s => s.id === 'kanji')
      if (kanjiStep && kanjiStep.status !== 'skipped') {
        store.setStepActive('kanji')
        await seedKanji()
        store.setStepDone('kanji')
      }

      store.finish()

      setTimeout(() => {
        if (updateStore.getState().needsReload) {
          window.location.reload()
        }
        else {
          updateStore.getState().reset()
        }
      }, 1500)
    }
    catch (err) {
      store.setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định')
    }
  }

  function handleRetry() {
    isRunningRef.current = false
    updateStore.setState({ error: null })
    runUpdate()
  }

  function handleSkip() {
    updateStore.getState().reset()
  }

  if (phase === 'idle')
    return null

  const visibleSteps = steps.filter(s => s.status !== 'skipped')
  const isDatasetActive = steps.find(s => s.id === 'dataset')?.status === 'active'

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-8">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-[3px] text-muted-foreground mb-1">
          CẬP NHẬT HỆ THỐNG
        </p>
        <h2 className="text-xl font-black tracking-tight mb-6">
          {phase === 'done' ? 'Hoàn tất ✓' : 'Đang tải phiên bản mới...'}
        </h2>

        <div className="flex flex-col gap-2.5 mb-6">
          {visibleSteps.map(step => (
            <div key={step.id} className="flex items-center gap-2.5 text-sm">
              <StepIcon status={step.status} />
              <span
                className={
                  step.status === 'active'
                    ? 'font-bold'
                    : step.status === 'pending'
                      ? 'text-muted-foreground'
                      : ''
                }
              >
                {step.label}
                {step.id === 'dataset' && step.status === 'active' && currentFile && (
                  <span className="text-muted-foreground font-normal ml-1">
                    (
                    {currentFile}
                    )
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {isDatasetActive && (
          <div className="mb-4">
            <div className="h-[5px] bg-border mb-1.5">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-[var(--br-mono-font)]">
              <span>
                {progress}
                %
              </span>
              <span>{currentFile}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                className="text-xs uppercase tracking-widest font-[var(--br-mono-font)] border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={handleSkip}
                className="text-xs uppercase tracking-widest font-[var(--br-mono-font)] text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors"
              >
                Bỏ qua lần này
              </button>
            </div>
          </div>
        )}

        {phase !== 'done' && !error && (
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-[2px] text-muted-foreground mt-6 text-center">
            Vui lòng không tắt trang
          </p>
        )}
      </div>
    </div>
  )
}
