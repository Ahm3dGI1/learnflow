'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser } = useAuthStore()

  useEffect(() => {
    // Restore user session on page load
    const userStr = localStorage.getItem('current_user')
    const token = localStorage.getItem('token')
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        setUser(user)
      } catch (error) {
        // Try to fetch current user from API
        authApi.getCurrentUser()
          .then((response) => {
            setUser(response.data)
          })
          .catch(() => {
            // Not authenticated
            localStorage.removeItem('token')
            localStorage.removeItem('current_user')
          })
      }
    }
  }, [setUser])

  return <>{children}</>
}

