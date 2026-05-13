import { useState, useCallback, useEffect } from 'react'
import type { Macro } from './communicationTypes'
import { fetchMacros } from '../../../services/communicationService'

export function useMacros(eventUuid: string | undefined) {
  const [macros, setMacros] = useState<Macro[]>([])
  const [isLoadingMacros, setIsLoadingMacros] = useState(false)

  const loadMacros = useCallback(async () => {
    if (!eventUuid) {
      setMacros([])
      return
    }
    setIsLoadingMacros(true)
    try {
      const data = await fetchMacros(eventUuid)
      setMacros(data as Macro[])
    } catch {
      // fetchMacros throws; avoid wiping existing rows on transient failure
    } finally {
      setIsLoadingMacros(false)
    }
  }, [eventUuid])

  useEffect(() => {
    loadMacros()
  }, [loadMacros])

  return { macros, setMacros, isLoadingMacros, loadMacros }
}
