'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { useAuthStore } from '@/lib/store'

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  return <Dashboard />
}




