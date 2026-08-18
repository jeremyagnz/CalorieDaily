import type { AppState } from '../types'

const STORAGE_KEY = 'caloriedaily-state'

const defaultState: AppState = {
  profile: null,
  dailyLogs: {},
  exerciseEntries: [],
  weightEntries: [],
}

export function loadAppState(): AppState {
  if (typeof window === 'undefined') {
    return defaultState
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return defaultState
  }

  try {
    return {
      ...defaultState,
      ...JSON.parse(stored),
    } as AppState
  } catch {
    return defaultState
  }
}

export function saveAppState(state: AppState) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}
