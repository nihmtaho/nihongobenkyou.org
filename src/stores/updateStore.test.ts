import type { Manifest } from '../types/dataset'
import { beforeEach, describe, expect, it } from 'vitest'
import { updateStore } from './updateStore'

const MINIMAL_MANIFEST: Manifest = {
  schema_version: '2.0',
  app_version: '1.0.0',
  built_at: '',
  built_by: 'test',
  built_from: 'test',
  datasets: [],
}

describe('updateStore', () => {
  beforeEach(() => {
    updateStore.getState().reset()
  })

  it('starts in idle phase with empty steps', () => {
    const { phase, steps } = updateStore.getState()
    expect(phase).toBe('idle')
    expect(steps).toEqual([])
  })

  it('startUpdate sets phase to updating', () => {
    updateStore.getState().startUpdate(false, true, false, MINIMAL_MANIFEST)
    expect(updateStore.getState().phase).toBe('updating')
  })

  it('startUpdate skips sw step when swWaiting is false', () => {
    updateStore.getState().startUpdate(false, true, false, MINIMAL_MANIFEST)
    const sw = updateStore.getState().steps.find(s => s.id === 'sw')
    expect(sw?.status).toBe('skipped')
  })

  it('startUpdate includes sw step when swWaiting is true', () => {
    updateStore.getState().startUpdate(true, false, false, MINIMAL_MANIFEST)
    const sw = updateStore.getState().steps.find(s => s.id === 'sw')
    expect(sw?.status).toBe('pending')
  })

  it('startUpdate skips dataset step when datasetOutdated is false', () => {
    updateStore.getState().startUpdate(true, false, false, MINIMAL_MANIFEST)
    const dataset = updateStore.getState().steps.find(s => s.id === 'dataset')
    expect(dataset?.status).toBe('skipped')
  })

  it('setProgress updates currentFile and progress', () => {
    updateStore.getState().startUpdate(false, true, false, MINIMAL_MANIFEST)
    updateStore.getState().setProgress('lesson-03.json', 45)
    expect(updateStore.getState().currentFile).toBe('lesson-03.json')
    expect(updateStore.getState().progress).toBe(45)
  })

  it('finish sets phase to done and progress to 100', () => {
    updateStore.getState().startUpdate(false, true, false, MINIMAL_MANIFEST)
    updateStore.getState().finish()
    expect(updateStore.getState().phase).toBe('done')
    expect(updateStore.getState().progress).toBe(100)
  })

  it('setStepActive marks only the target step as active', () => {
    updateStore.getState().startUpdate(false, true, false, MINIMAL_MANIFEST)
    updateStore.getState().setStepActive('check')
    const check = updateStore.getState().steps.find(s => s.id === 'check')
    expect(check?.status).toBe('active')
  })

  it('setStepDone marks target step as done', () => {
    updateStore.getState().startUpdate(false, true, false, MINIMAL_MANIFEST)
    updateStore.getState().setStepActive('check')
    updateStore.getState().setStepDone('check')
    const check = updateStore.getState().steps.find(s => s.id === 'check')
    expect(check?.status).toBe('done')
  })

  it('reset returns to idle with empty steps', () => {
    updateStore.getState().startUpdate(false, true, false, MINIMAL_MANIFEST)
    updateStore.getState().reset()
    expect(updateStore.getState().phase).toBe('idle')
    expect(updateStore.getState().steps).toEqual([])
    expect(updateStore.getState().error).toBeNull()
  })

  it('setError sets the error field', () => {
    updateStore.getState().setError('Network timeout')
    expect(updateStore.getState().error).toBe('Network timeout')
  })

  it('setNeedsReload sets the needsReload flag', () => {
    updateStore.getState().setNeedsReload(true)
    expect(updateStore.getState().needsReload).toBe(true)
  })

  it('startUpdate skips kanji step when kanjiOutdated is false', () => {
    updateStore.getState().startUpdate(false, true, false, MINIMAL_MANIFEST)
    const kanji = updateStore.getState().steps.find(s => s.id === 'kanji')
    expect(kanji?.status).toBe('skipped')
  })
})
