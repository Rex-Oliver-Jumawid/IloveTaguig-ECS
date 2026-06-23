import { useCallback, useEffect, useState } from 'react'

export function usePersistentBoolean(key, initialValue = false) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue
    const stored = window.localStorage.getItem(key)
    if (stored === 'true') return true
    if (stored === 'false') return false
    return initialValue
  })

  useEffect(() => {
    window.localStorage.setItem(key, String(value))
  }, [key, value])

  const toggle = useCallback(() => {
    setValue(current => !current)
  }, [])

  return [value, setValue, toggle]
}
