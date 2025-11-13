'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Youtube, Sparkles, Loader2, CheckCircle2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { videoApi } from '@/frontend/lib/api'
import { useRouter } from 'next/navigation'

const videoSchema = z.object({
  youtubeUrl: z.string().url('Invalid URL').refine(
    (url) => url.includes('youtube.com') || url.includes('youtu.be'),
    'Must be a YouTube URL'
  ),
})

type VideoFormData = z.infer<typeof videoSchema>

export function VideoTransformForm() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [processedVideoId, setProcessedVideoId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema),
  })

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const onSubmit = async (data: VideoFormData) => {
    setIsProcessing(true)
    setProcessingStatus('processing')
    setErrorMessage(null)

    try {
      const videoId = extractVideoId(data.youtubeUrl)
      if (!videoId) {
        throw new Error('Could not extract video ID from URL')
      }

      // Extract title - backend will fetch actual title from YouTube API
      // For now, use a descriptive placeholder that includes the video ID
      const defaultTitle = `YouTube Video - ${videoId.substring(0, 8)}...`
      
      // Submit video URL - backend will process it later with AI and fetch real title
      const response = await videoApi.create({
        title: defaultTitle,
        description: `Educational video submitted for AI processing. Video ID: ${videoId}`,
        youtubeUrl: data.youtubeUrl,
        videoId: videoId,
        type: 'youtube',
      })

      setProcessedVideoId(response.data.id)
      setProcessingStatus('success')
      
      // Reset form and refresh video list
      reset()
      setTimeout(() => {
        setProcessingStatus('idle')
        setProcessedVideoId(null)
        // Refresh the page to show new video in history
        window.location.reload()
      }, 2000)
      
      // Note: Video player integration will be handled by backend team
    } catch (error: any) {
      setProcessingStatus('error')
      setErrorMessage(error.response?.data?.message || 'Failed to submit video. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle>Submit YouTube Video for AI Processing</CardTitle>
          </div>
          <CardDescription>
            Paste a YouTube video URL below. The video will be saved and processed by AI later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Video submission is currently for storing URLs only. 
              AI features (transcription, checkpoints, tutor) will be added when the backend is ready.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="youtubeUrl" className="text-sm font-medium">
                YouTube Video URL
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="youtubeUrl"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="pl-10"
                    {...register('youtubeUrl')}
                    disabled={isProcessing}
                    onBlur={(e) => {
                      // Try to extract title from URL or fetch video info
                      const url = e.target.value
                      if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
                        const videoId = extractVideoId(url)
                        if (videoId) {
                          // In a real app, this would fetch from YouTube API
                          // For now, we'll show a better placeholder
                        }
                      }
                    }}
                  />
                </div>
                <Button type="submit" disabled={isProcessing} size="lg">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Video
                      </>
                    )}
                </Button>
              </div>
              {errors.youtubeUrl && (
                <p className="text-sm text-destructive">{errors.youtubeUrl.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                The video title will be automatically fetched when the backend is integrated.
              </p>
            </div>
          </form>

          {processingStatus === 'processing' && (
            <div className="mt-6 p-6 bg-primary/10 border border-primary rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <h3 className="font-semibold">Submitting Video...</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Your video URL is being saved. AI processing will be added later.
              </p>
            </div>
          )}

          {processingStatus === 'success' && (
            <div className="mt-6 p-6 bg-green-500/10 border border-green-500 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-green-600">
                  Video Submitted Successfully!
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Your video has been saved. It will appear in your video history below.
                AI processing (transcription, checkpoints, tutor) will be added when the backend is ready.
              </p>
            </div>
          )}

          {processingStatus === 'error' && errorMessage && (
            <div className="mt-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

