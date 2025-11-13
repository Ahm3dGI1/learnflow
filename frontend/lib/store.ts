import { create } from 'zustand'
import { Video, Checkpoint, VideoProgress, AITutorMessage, User } from '@/types'

interface VideoStore {
  currentVideo: Video | null
  currentTime: number
  isPlaying: boolean
  progress: VideoProgress | null
  setCurrentVideo: (video: Video | null) => void
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setProgress: (progress: VideoProgress) => void
  updateProgress: (updates: Partial<VideoProgress>) => void
}

interface CheckpointStore {
  activeCheckpoint: Checkpoint | null
  checkpointAnswers: Map<string, string | string[]>
  showCheckpoint: boolean
  setActiveCheckpoint: (checkpoint: Checkpoint | null) => void
  setCheckpointAnswer: (checkpointId: string, answer: string | string[]) => void
  setShowCheckpoint: (show: boolean) => void
  resetCheckpoints: () => void
}

interface AITutorStore {
  isOpen: boolean
  messages: AITutorMessage[]
  isListening: boolean
  isSpeaking: boolean
  videoContext: string
  setOpen: (open: boolean) => void
  addMessage: (message: AITutorMessage) => void
  setListening: (listening: boolean) => void
  setSpeaking: (speaking: boolean) => void
  setVideoContext: (context: string) => void
  clearMessages: () => void
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const useVideoStore = create<VideoStore>((set) => ({
  currentVideo: null,
  currentTime: 0,
  isPlaying: false,
  progress: null,
  setCurrentVideo: (video) => set({ currentVideo: video }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setProgress: (progress) => set({ progress }),
  updateProgress: (updates) =>
    set((state) => ({
      progress: state.progress ? { ...state.progress, ...updates } : null,
    })),
}))

export const useCheckpointStore = create<CheckpointStore>((set) => ({
  activeCheckpoint: null,
  checkpointAnswers: new Map(),
  showCheckpoint: false,
  setActiveCheckpoint: (checkpoint) => set({ activeCheckpoint: checkpoint }),
  setCheckpointAnswer: (checkpointId, answer) =>
    set((state) => {
      const newAnswers = new Map(state.checkpointAnswers)
      newAnswers.set(checkpointId, answer)
      return { checkpointAnswers: newAnswers }
    }),
  setShowCheckpoint: (show) => set({ showCheckpoint: show }),
  resetCheckpoints: () =>
    set({
      activeCheckpoint: null,
      checkpointAnswers: new Map(),
      showCheckpoint: false,
    }),
}))

export const useAITutorStore = create<AITutorStore>((set) => ({
  isOpen: false,
  messages: [],
  isListening: false,
  isSpeaking: false,
  videoContext: '',
  setOpen: (open) => set({ isOpen: open }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setListening: (listening) => set({ isListening: listening }),
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),
  setVideoContext: (context) => set({ videoContext: context }),
  clearMessages: () => set({ messages: [] }),
}))

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))




