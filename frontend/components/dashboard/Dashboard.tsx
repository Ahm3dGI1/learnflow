'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { VideoCard } from './VideoCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { videoApi } from '@/lib/api'
import { Video, VideoProgress } from '@/types'
import { useAuthStore } from '@/lib/store'
import { PlayCircle, BookOpen, TrendingUp } from 'lucide-react'

export function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([])
  const [progress, setProgress] = useState<Map<string, VideoProgress>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const videosResponse = await videoApi.getAll()
        setVideos(videosResponse.data)

        // Fetch progress for each video
        const progressMap = new Map<string, VideoProgress>()
        for (const video of videosResponse.data) {
          try {
            const progressResponse = await videoApi.getProgress(video.id)
            progressMap.set(video.id, progressResponse.data)
          } catch (error) {
            // Progress might not exist yet
          }
        }
        setProgress(progressMap)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const completedVideos = Array.from(progress.values()).filter((p) => p.completed).length
  const inProgressVideos = Array.from(progress.values()).filter(
    (p) => !p.completed && p.currentTime > 0
  ).length

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">
            Continue your learning journey
          </p>
        </div>
        <Link href="/learn">
          <Button size="lg">
            <span className="mr-2">+</span>
            Transform New Video
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videos.length}</div>
            <p className="text-xs text-muted-foreground">Available courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressVideos}</div>
            <p className="text-xs text-muted-foreground">Videos you&apos;re watching</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedVideos}</div>
            <p className="text-xs text-muted-foreground">Videos finished</p>
          </CardContent>
        </Card>
      </div>

      {/* Continue Watching */}
      {inProgressVideos > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Continue Watching</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from(progress.values())
              .filter((p) => !p.completed && p.currentTime > 0)
              .map((p) => {
                const video = videos.find((v) => v.id === p.videoId)
                return video ? (
                  <VideoCard
                    key={video.id}
                    video={video}
                    progress={p.currentTime}
                  />
                ) : null
              })
              .filter(Boolean)}
          </div>
        </div>
      )}

      {/* All Videos */}
      <div>
        <h2 className="text-2xl font-bold mb-4">All Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              progress={progress.get(video.id)?.currentTime}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

