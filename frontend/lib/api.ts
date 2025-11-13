import axios from 'axios'
import { Video, Checkpoint, CheckpointAnswer, StudyMaterial, AITutorMessage, User } from '@/types'
import {
  userStorage,
  videoStorage,
  progressStorage,
  extractYouTubeVideoId,
  initStorage,
} from './storage'

// Initialize storage
if (typeof window !== 'undefined') {
  initStorage()
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Use localStorage-based storage if API is not available
const USE_LOCAL_STORAGE = true // Set to false when backend is ready

// Helper to get current user ID
function getCurrentUserId(): string | null {
  const userStr = localStorage.getItem('current_user')
  if (!userStr) return null
  try {
    const user = JSON.parse(userStr)
    return user.id
  } catch {
    return null
  }
}

// Simulated API responses using localStorage
async function simulateApi<T>(
  endpoint: string,
  method: string,
  data?: any
): Promise<{ data: T }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  const userId = getCurrentUserId()

  // Auth endpoints
  if (endpoint === '/auth/login' && method === 'POST') {
    const user = userStorage.findByEmail(data.email)
    if (!user) {
      throw { response: { data: { message: 'Invalid credentials' } } }
    }
    localStorage.setItem('current_user', JSON.stringify(user))
    localStorage.setItem('token', `token-${Date.now()}`)
    return { data: { user, token: localStorage.getItem('token') } as any }
  }

  if (endpoint === '/auth/register' && method === 'POST') {
    const existingUser = userStorage.findByEmail(data.email)
    if (existingUser) {
      throw { response: { data: { message: 'User already exists' } } }
    }
    const user = userStorage.create({
      email: data.email,
      name: data.name,
    })
    localStorage.setItem('current_user', JSON.stringify(user))
    localStorage.setItem('token', `token-${Date.now()}`)
    return { data: { user, token: localStorage.getItem('token') } as any }
  }

  if (endpoint === '/auth/me' && method === 'GET') {
    const userStr = localStorage.getItem('current_user')
    if (!userStr) throw { response: { status: 401 } }
    return { data: JSON.parse(userStr) as User }
  }

  // Video endpoints
  if (endpoint === '/videos' && method === 'GET') {
    return { data: videoStorage.getAll() as any }
  }

  if (endpoint.startsWith('/videos/') && method === 'GET') {
    const parts = endpoint.split('/videos/')
    if (parts.length < 2) throw { response: { status: 404 } }
    const id = parts[1].split('/')[0] // Get ID before any additional path
    const video = videoStorage.getById(id)
    if (!video) throw { response: { status: 404 } }
    return { data: video as any }
  }

  if (endpoint === '/videos' && method === 'POST') {
    // Extract YouTube metadata
    const videoId = extractYouTubeVideoId(data.youtubeUrl)
    if (!videoId) {
      throw { response: { data: { message: 'Invalid YouTube URL' } } }
    }

    // Create video with provided data
    // Backend will fetch actual title, description, and duration from YouTube API
    const video: Omit<Video, 'id' | 'createdAt' | 'checkpoints'> = {
      title: data.title || `YouTube Video - ${videoId.substring(0, 11)}`,
      description: data.description || `Video submitted for processing. Video ID: ${videoId}`,
      url: data.youtubeUrl,
      youtubeUrl: data.youtubeUrl,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 0, // Will be updated when video is processed by backend
    }

    const createdVideo = videoStorage.create(video)
    
    // Video is saved - AI processing will be done by backend later
    // No checkpoints or processing needed at this stage

    return { data: createdVideo as any }
  }

  // Progress endpoints
  if (endpoint.includes('/progress') && method === 'GET') {
    const videoId = endpoint.split('/videos/')[1].split('/progress')[0]
    if (!userId) throw { response: { status: 401 } }
    const progress = progressStorage.get(videoId, userId)
    if (!progress) throw { response: { status: 404 } }
    return { data: progress as any }
  }

  if (endpoint.includes('/progress') && method === 'PUT') {
    const videoId = endpoint.split('/videos/')[1].split('/progress')[0]
    if (!userId) throw { response: { status: 401 } }
    const progress = progressStorage.createOrUpdate(videoId, userId, {
      currentTime: data.currentTime,
    })
    return { data: progress as any }
  }

  // Checkpoint endpoints
  if (endpoint.includes('/checkpoints') && method === 'PUT') {
    const videoId = endpoint.split('/videos/')[1].split('/checkpoints')[0]
    const updated = videoStorage.updateCheckpoints(videoId, data.checkpoints)
    if (!updated) throw { response: { status: 404 } }
    return { data: updated as any }
  }

  // Default: try real API
  throw { response: { status: 404, data: { message: 'Endpoint not found' } } }
}

// Intercept requests
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Use localStorage if enabled
  if (USE_LOCAL_STORAGE) {
    try {
      const response = await simulateApi(
        config.url || '',
        config.method?.toUpperCase() || 'GET',
        config.data
      )
      return Promise.reject({
        __isLocalStorageResponse: true,
        data: response.data,
      } as any)
    } catch (error: any) {
      if (error.__isLocalStorageResponse) {
        throw error
      }
      // If simulation fails, continue to real API
    }
  }

  return config
})

// Intercept responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle localStorage responses
    if (error.__isLocalStorageResponse) {
      return Promise.resolve({
        data: error.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
      })
    }

    // If API fails and we're using localStorage, try simulation
    if (USE_LOCAL_STORAGE && !error.response) {
      try {
        const response = await simulateApi(
          error.config?.url || '',
          error.config?.method?.toUpperCase() || 'GET',
          error.config?.data
        )
        return Promise.resolve({
          data: response.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
        })
      } catch (simError) {
        // Continue to original error
      }
    }

    return Promise.reject(error)
  }
)

export const videoApi = {
  getAll: () => api.get<Video[]>('/videos'),
  getById: (id: string) => api.get<Video>(`/videos/${id}`),
  getProgress: (videoId: string) => api.get(`/videos/${videoId}/progress`),
  updateProgress: (videoId: string, time: number) =>
    api.put(`/videos/${videoId}/progress`, { currentTime: time }),
  create: (data: {
    title: string
    description: string
    youtubeUrl: string
    videoId: string
    type: 'youtube'
  }) => api.post<Video>('/videos', data),
  update: (id: string, data: Partial<Video>) => api.put<Video>(`/videos/${id}`, data),
  delete: (id: string) => api.delete(`/videos/${id}`),
}

export const checkpointApi = {
  submitAnswer: (checkpointId: string, answer: CheckpointAnswer) =>
    api.post(`/checkpoints/${checkpointId}/answer`, answer),
  validateAnswer: (checkpointId: string, answer: string | string[]) =>
    api.post(`/checkpoints/${checkpointId}/validate`, { answer }),
  updateVideoCheckpoints: (videoId: string, checkpoints: Checkpoint[]) =>
    api.put(`/videos/${videoId}/checkpoints`, { checkpoints }),
}

// Helper to switch between localStorage and real API
export function setUseLocalStorage(use: boolean) {
  // This would be set via environment variable or config
  // For now, it's hardcoded in the api.ts file
}

export const tutorApi = {
  sendMessage: (videoId: string, message: string, context: string) =>
    api.post<AITutorMessage>(`/tutor/chat`, {
      videoId,
      message,
      context,
    }),
  startSpeech: (videoId: string) => api.post(`/tutor/speech/start`, { videoId }),
  stopSpeech: () => api.post(`/tutor/speech/stop`),
}

export const studyMaterialApi = {
  generate: (videoId: string, type: 'quiz' | 'summary' | 'notes' | 'flashcards') =>
    api.post<StudyMaterial>(`/study-materials/generate`, { videoId, type }),
  getByVideo: (videoId: string) => api.get<StudyMaterial[]>(`/study-materials/video/${videoId}`),
  export: (materialId: string, format: 'pdf' | 'markdown') =>
    api.get(`/study-materials/${materialId}/export/${format}`, { responseType: 'blob' }),
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
}

export default api

