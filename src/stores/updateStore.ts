import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

export type StepId = 'check' | 'sw' | 'dataset' | 'kanji' | 'done'
export type StepStatus = 'pending' | 'active' | 'done' | 'skipped'

export interface UpdateStep {
  id: StepId
  label: string
  status: StepStatus
}

export interface UpdateState {
  phase: 'idle' | 'updating' | 'done'
  steps: UpdateStep[]
  currentFile: string | null
  progress: number
  needsReload: boolean
  error: string | null

  startUpdate: (swWaiting: boolean, datasetOutdated: boolean, kanjiOutdated: boolean) => void
  setStepActive: (id: StepId) => void
  setStepDone: (id: StepId) => void
  setProgress: (file: string, percent: number) => void
  setError: (msg: string) => void
  setNeedsReload: (v: boolean) => void
  finish: () => void
  reset: () => void
}

const STEP_DEFINITIONS: Array<{ id: StepId, label: string }> = [
  { id: 'check', label: 'Kiểm tra phiên bản' },
  { id: 'sw', label: 'Cập nhật ứng dụng' },
  { id: 'dataset', label: 'Tải dữ liệu từ vựng' },
  { id: 'kanji', label: 'Tải dữ liệu Kanji' },
  { id: 'done', label: 'Hoàn tất' },
]

export const updateStore = createStore<UpdateState>(set => ({
  phase: 'idle',
  steps: [],
  currentFile: null,
  progress: 0,
  needsReload: false,
  error: null,

  startUpdate: (swWaiting, datasetOutdated, kanjiOutdated) => {
    const steps: UpdateStep[] = STEP_DEFINITIONS.map((s) => {
      let status: StepStatus = 'pending'
      if (s.id === 'sw' && !swWaiting) {
        status = 'skipped'
      }

      if (s.id === 'dataset' && !datasetOutdated) {
        status = 'skipped'
      }

      if (s.id === 'kanji' && !kanjiOutdated) {
        status = 'skipped'
      }

      return { ...s, status }
    })
    set({ phase: 'updating', steps, progress: 0, currentFile: null, needsReload: false, error: null })
  },

  setStepActive: id =>
    set(state => ({ steps: state.steps.map(s => (s.id === id ? { ...s, status: 'active' } : s)) })),

  setStepDone: id =>
    set(state => ({ steps: state.steps.map(s => (s.id === id ? { ...s, status: 'done' } : s)) })),

  setProgress: (file, percent) => set({ currentFile: file, progress: percent }),

  setError: msg => set({ error: msg }),

  setNeedsReload: v => set({ needsReload: v }),

  finish: () =>
    set(state => ({
      phase: 'done',
      steps: state.steps.map(s => (s.id === 'done' ? { ...s, status: 'done' } : s)),
      progress: 100,
      currentFile: null,
    })),

  reset: () =>
    set({ phase: 'idle', steps: [], currentFile: null, progress: 0, needsReload: false, error: null }),
}))

export function useUpdateStore<T>(selector: (state: UpdateState) => T): T {
  return useStore(updateStore, selector)
}
