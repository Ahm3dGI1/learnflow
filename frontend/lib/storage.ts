// LocalStorage-based data layer to simulate backend API
import { User, Video, VideoProgress, Checkpoint } from '@/types'

const STORAGE_KEYS = {
  USERS: 'learnvid_users',
  VIDEOS: 'learnvid_videos',
  PROGRESS: 'learnvid_progress',
  CURRENT_USER: 'learnvid_current_user',
}

// Initialize storage if empty
export function initStorage() {
  if (typeof window === 'undefined') return

  // Initialize users
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]))
  }

  // Initialize videos
  if (!localStorage.getItem(STORAGE_KEYS.VIDEOS)) {
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify([]))
  }

  // Initialize progress
  if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify([]))
  }
}

// User operations
export const userStorage = {
  create: (user: Omit<User, 'id' | 'createdAt'>): User => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    users.push(newUser)
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users))
    return newUser
  },

  findByEmail: (email: string): User | null => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
    return users.find((u: User) => u.email === email) || null
  },

  findById: (id: string): User | null => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
    return users.find((u: User) => u.id === id) || null
  },
}

// Video operations
export const videoStorage = {
  getAll: (): Video[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.VIDEOS) || '[]')
  },

  getById: (id: string): Video | null => {
    const videos = JSON.parse(localStorage.getItem(STORAGE_KEYS.VIDEOS) || '[]')
    return videos.find((v: Video) => v.id === id) || null
  },

  create: (video: Omit<Video, 'id' | 'createdAt' | 'checkpoints'>): Video => {
    const videos = JSON.parse(localStorage.getItem(STORAGE_KEYS.VIDEOS) || '[]')
    const newVideo: Video = {
      ...video,
      id: `video-${Date.now()}`,
      createdAt: new Date().toISOString(),
      checkpoints: [],
    }
    videos.push(newVideo)
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos))
    return newVideo
  },

  update: (id: string, updates: Partial<Video>): Video | null => {
    const videos = JSON.parse(localStorage.getItem(STORAGE_KEYS.VIDEOS) || '[]')
    const index = videos.findIndex((v: Video) => v.id === id)
    if (index === -1) return null

    videos[index] = { ...videos[index], ...updates }
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos))
    return videos[index]
  },

  updateCheckpoints: (videoId: string, checkpoints: Checkpoint[]): Video | null => {
    const videos = JSON.parse(localStorage.getItem(STORAGE_KEYS.VIDEOS) || '[]')
    const index = videos.findIndex((v: Video) => v.id === videoId)
    if (index === -1) return null

    videos[index].checkpoints = checkpoints
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos))
    return videos[index]
  },
}

// Progress operations
export const progressStorage = {
  get: (videoId: string, userId: string): VideoProgress | null => {
    const progressList = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS) || '[]')
    return (
      progressList.find(
        (p: VideoProgress) => p.videoId === videoId && p.userId === userId
      ) || null
    )
  },

  createOrUpdate: (
    videoId: string,
    userId: string,
    updates: Partial<VideoProgress>
  ): VideoProgress => {
    const progressList = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS) || '[]')
    const existing = progressList.find(
      (p: VideoProgress) => p.videoId === videoId && p.userId === userId
    )

    if (existing) {
      const updated = { ...existing, ...updates, lastWatched: new Date().toISOString() }
      const index = progressList.findIndex(
        (p: VideoProgress) => p.videoId === videoId && p.userId === userId
      )
      progressList[index] = updated
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressList))
      return updated
    } else {
      const newProgress: VideoProgress = {
        videoId,
        userId,
        currentTime: 0,
        completedCheckpoints: [],
        lastWatched: new Date().toISOString(),
        completed: false,
        ...updates,
      }
      progressList.push(newProgress)
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressList))
      return newProgress
    }
  },
}

// Helper to extract YouTube video ID
export function extractYouTubeVideoId(url: string): string | null {
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

// Initialize on load
if (typeof window !== 'undefined') {
  initStorage()
}




