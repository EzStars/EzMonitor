import type { ReactNode } from 'react'
import { createContext, useContext, useMemo, useState } from 'react'

export type QueryRange = [string, string]

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function createDefaultRange(days = 7): QueryRange {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)
  return [formatDateInput(start), formatDateInput(end)]
}

interface FilterContextValue {
  appId: string
  setAppId: (value: string) => void
  range: QueryRange
  setRange: (value: QueryRange) => void
  reset: () => void
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [appId, setAppId] = useState('')
  const [range, setRange] = useState<QueryRange>(createDefaultRange())

  const value = useMemo<FilterContextValue>(() => ({
    appId,
    setAppId,
    range,
    setRange,
    reset: () => {
      setAppId('')
      setRange(createDefaultRange())
    },
  }), [appId, range])

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilterContext() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilterContext must be used within FilterProvider')
  }
  return context
}
