'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VideoTransformForm } from '@/components/video/VideoTransformForm'
import { VideoHistory } from '@/components/video/VideoHistory'
import { useAuthStore } from '@/lib/store'

export default function LearnPage() {
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

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          Submit YouTube Videos for AI Processing
        </h1>
        <p className="text-xl text-muted-foreground">
          Paste a YouTube video URL to save it. AI features will be added when the backend is ready.
        </p>
      </div>

      {/* Video History Section */}
      <VideoHistory />

      {/* Transform New Video Form */}
      <VideoTransformForm />
    </div>
  )
}

