'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Play, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTime } from '@/lib/utils'
import { Video } from '@/types'

interface VideoCardProps {
  video: Video
  progress?: number
}

export function VideoCard({ video, progress }: VideoCardProps) {
  const progressPercentage = progress ? (progress / video.duration) * 100 : 0

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-video bg-muted">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title || 'Video thumbnail'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {progressPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/50">
            <div
              className="h-full bg-primary"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-background/80">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(video.duration)}
          </Badge>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-2">{video.title || 'Untitled Video'}</CardTitle>
        {video.description && (
          <CardDescription className="line-clamp-2">
            {video.description}
          </CardDescription>
        )}
        {!video.description && (
          <CardDescription className="line-clamp-2 text-muted-foreground">
            YouTube video submitted for processing
          </CardDescription>
        )}
      </CardHeader>
      <CardFooter>
        <Link href={`/videos/${video.id}`} className="w-full">
          <Button className="w-full">
            {progressPercentage > 0 ? 'Continue Watching' : 'Watch Now'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

