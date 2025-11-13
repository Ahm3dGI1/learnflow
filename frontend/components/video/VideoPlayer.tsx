'use client'

import { useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import type ReactPlayerType from 'react-player'
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/frontend/lib/utils'
import { useVideoStore, useCheckpointStore } from '@/frontend/lib/store'
import { CheckpointOverlay } from './CheckpointOverlay'
import { Video } from '@/types'

interface VideoPlayerProps {
  video: Video
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayerType>(null)
  const [played, setPlayed] = useState(0)
  const [playedSeconds, setPlayedSeconds] = useState(0)
  const [seeking, setSeeking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [showControls, setShowControls] = useState(true)

  const {
    currentTime,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
    updateProgress,
  } = useVideoStore()
  const { activeCheckpoint, showCheckpoint, setShowCheckpoint } = useCheckpointStore()

  // Check for checkpoints at current time
  useEffect(() => {
    if (!video.checkpoints || video.checkpoints.length === 0) return

    const checkpoint = video.checkpoints.find(
      (cp) => Math.abs(cp.timestamp - playedSeconds) < 1 && cp.timestamp <= playedSeconds
    )

    if (checkpoint && !activeCheckpoint) {
      useCheckpointStore.getState().setActiveCheckpoint(checkpoint)
      useCheckpointStore.getState().setShowCheckpoint(true)
      setIsPlaying(false)
    }
  }, [playedSeconds, video.checkpoints, activeCheckpoint, setIsPlaying])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleProgress = (state: { played: number; playedSeconds: number }) => {
    if (!seeking) {
      setPlayed(state.played)
      setPlayedSeconds(state.playedSeconds)
      setCurrentTime(state.playedSeconds)
      updateProgress({ currentTime: state.playedSeconds })
    }
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value))
  }

  const handleSeekMouseDown = () => {
    setSeeking(true)
  }

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false)
    const newTime = parseFloat(e.currentTarget.value)
    playerRef.current?.seekTo(newTime)
    setPlayedSeconds(newTime * video.duration)
    setCurrentTime(newTime * video.duration)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value))
  }

  const toggleMute = () => {
    setMuted(!muted)
  }

  const handleFullscreen = () => {
    if (playerRef.current?.getInternalPlayer()) {
      const player = playerRef.current.getInternalPlayer() as HTMLVideoElement
      if (player.requestFullscreen) {
        player.requestFullscreen()
      }
    }
  }

  const handleCheckpointComplete = () => {
    setShowCheckpoint(false)
    setIsPlaying(true)
  }

  return (
    <div
      className="relative w-full bg-black rounded-lg overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <ReactPlayer
        ref={playerRef}
        url={video.url}
        playing={isPlaying}
        volume={volume}
        muted={muted}
        onProgress={handleProgress}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        width="100%"
        height="100%"
        className="react-player"
        config={{
          file: {
            attributes: {
              controlsList: 'nodownload',
            },
          },
        }}
      />

      {/* Checkpoint Overlay */}
      {showCheckpoint && activeCheckpoint && (
        <CheckpointOverlay
          checkpoint={activeCheckpoint}
          onComplete={handleCheckpointComplete}
        />
      )}

      {/* Custom Controls */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min={0}
              max={1}
              step="any"
              value={played}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-white text-sm mt-1">
              <span>{formatTime(playedSeconds)}</span>
              <span>{formatTime(video.duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step="any"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <span className="text-white text-sm">
                {formatTime(playedSeconds)} / {formatTime(video.duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Checkpoint Markers */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {video.checkpoints?.map((checkpoint) => (
          <div
            key={checkpoint.id}
            className="bg-primary/80 text-white px-2 py-1 rounded text-xs cursor-pointer hover:bg-primary"
            onClick={() => {
              playerRef.current?.seekTo(checkpoint.timestamp / video.duration)
              setPlayedSeconds(checkpoint.timestamp)
            }}
          >
            {formatTime(checkpoint.timestamp)}
          </div>
        ))}
      </div>
    </div>
  )
}

