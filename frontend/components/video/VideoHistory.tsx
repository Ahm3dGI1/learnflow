'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Play } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { videoApi } from '@/lib/api'
import { Video, VideoProgress } from '@/types'
import { formatTime } from '@/lib/utils'

export function VideoHistory() {
  const [videos, setVideos] = useState<Video[]>([])
  const [progress, setProgress] = useState<Map<string, VideoProgress>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const response = await videoApi.getAll()
      const sortedVideos = response.data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setVideos(sortedVideos)

      // Fetch progress for each video
      const progressMap = new Map<string, VideoProgress>()
      for (const video of response.data) {
        try {
          const progressResponse = await videoApi.getProgress(video.id)
          progressMap.set(video.id, progressResponse.data)
        } catch (error) {
          // Progress might not exist yet
        }
      }
      setProgress(progressMap)
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getVideoThumbnail = (video: Video) => {
    // Extract YouTube video ID from URL
    const url = video.url || video.youtubeUrl || ''
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    const videoId = videoIdMatch ? videoIdMatch[1] : null
    
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }
    
    return video.thumbnail || null
  }

  const getProgressPercentage = (video: Video) => {
    const videoProgress = progress.get(video.id)
    if (!videoProgress || video.duration === 0) return 0
    return (videoProgress.currentTime / video.duration) * 100
  }

  const isCompleted = (video: Video) => {
    const videoProgress = progress.get(video.id)
    return videoProgress?.completed || false
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading your videos...</p>
        </CardContent>
      </Card>
    )
  }

  if (videos.length === 0) {
    return null // Don't show history section if no videos
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-2xl font-bold">Your Recent Videos</h2>
        </div>
        <Badge variant="secondary">{videos.length} video{videos.length !== 1 ? 's' : ''}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => {
          const thumbnail = getVideoThumbnail(video)
          const progressPercent = getProgressPercentage(video)
          const completed = isCompleted(video)

          return (
            <Link key={video.id} href={`/videos/${video.id}`}>
              <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden border-2 hover:border-primary">
                <div className="relative aspect-video bg-muted">
                  {thumbnail ? (
                    <>
                      <Image
                        src={thumbnail}
                        alt={video.title || 'Video thumbnail'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 1024px) 100vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/90 rounded-full p-3">
                            <Play className="h-6 w-6 text-primary" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Progress Bar */}
                  {progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}

                  {/* Completion Badge */}
                  {completed && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 hover:bg-green-600">
                        ✓ Completed
                      </Badge>
                    </div>
                  )}

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="secondary" className="bg-black/70 text-white border-0">
                      {formatTime(video.duration)}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {video.title || 'Untitled Video'}
                  </h3>
                  {video.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {video.description}
                    </p>
                  )}
                  {video.youtubeUrl && (
                    <p className="text-xs text-muted-foreground mb-2">
                      YouTube Video
                    </p>
                  )}
                  {progressPercent > 0 && !completed && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{Math.round(progressPercent)}% watched</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

