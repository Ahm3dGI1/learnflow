'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
// VideoPlayer and AITutor will be integrated by backend team
import { StudyMaterialGenerator } from '@/components/study/StudyMaterialGenerator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import { videoApi } from '@/frontend/lib/api'
import { useVideoStore, useAuthStore } from '@/frontend/lib/store'
import { Video } from '@/types'
import Link from 'next/link'

export default function VideoPage() {
  const params = useParams()
  const router = useRouter()
  const videoId = params.id as string
  const [video, setVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'video' | 'study'>('video')
  const { setCurrentVideo } = useVideoStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    const fetchVideo = async () => {
      try {
        const response = await videoApi.getById(videoId)
        setVideo(response.data)
        setCurrentVideo(response.data)
        
        // Progress tracking will be handled by backend team
      } catch (error) {
        console.error('Error fetching video:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideo()
  }, [videoId, router, isAuthenticated, setCurrentVideo, setCurrentTime, setVideoContext])

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Video not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{video.title}</h1>
          <p className="text-muted-foreground">{video.description}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'video' | 'study')}>
        <TabsList>
          <TabsTrigger value="video">Video Player</TabsTrigger>
          <TabsTrigger value="study">Study Materials</TabsTrigger>
        </TabsList>

        <TabsContent value="video" className="space-y-4">
          {/* Video Player Placeholder - Backend team will integrate actual player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-600">
            <div className="text-center text-white p-8">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Video Player</h3>
              <p className="text-sm text-gray-400 mb-4">
                Interactive video player with checkpoints and AI tutor
              </p>
              {video.youtubeUrl && (
                <a
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                >
                  Watch on YouTube (Temporary)
                </a>
              )}
            </div>
          </div>

          {/* Video Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Video Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Title</h4>
                <p className="text-muted-foreground">{video.title || 'Untitled Video'}</p>
                {video.title && video.title.startsWith('YouTube Video -') && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Title will be updated when backend fetches video metadata from YouTube API
                  </p>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground">{video.description || 'No description provided'}</p>
                {!video.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Description will be fetched from YouTube when backend processes the video
                  </p>
                )}
              </div>
              {video.youtubeUrl && (
                <div>
                  <h4 className="font-semibold mb-2">YouTube URL</h4>
                  <a 
                    href={video.youtubeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {video.youtubeUrl}
                  </a>
                </div>
              )}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Backend team will integrate video player, interactive checkpoints, 
                  AI tutor, and study material generation.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feature Placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle className="text-sm">Interactive Checkpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  AI-generated questions at key moments
                </p>
              </CardContent>
            </Card>
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle className="text-sm">AI Tutor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Real-time speech-to-speech tutoring
                </p>
              </CardContent>
            </Card>
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle className="text-sm">Study Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Generate quizzes, summaries, notes, flashcards
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="study">
          {/* Study Material Generator - Backend team will integrate */}
          <Card>
            <CardHeader>
              <CardTitle>Study Materials</CardTitle>
              <CardDescription>
                Generate quizzes, summaries, notes, and flashcards
              </CardDescription>
            </CardHeader>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Study material generation will be integrated by the backend team.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                <Card className="opacity-60">
                  <CardHeader>
                    <CardTitle className="text-sm">Quiz</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Practice questions</p>
                  </CardContent>
                </Card>
                <Card className="opacity-60">
                  <CardHeader>
                    <CardTitle className="text-sm">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Key points</p>
                  </CardContent>
                </Card>
                <Card className="opacity-60">
                  <CardHeader>
                    <CardTitle className="text-sm">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Structured notes</p>
                  </CardContent>
                </Card>
                <Card className="opacity-60">
                  <CardHeader>
                    <CardTitle className="text-sm">Flashcards</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Active recall</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

