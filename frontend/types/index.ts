export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
}

export interface Video {
  id: string
  title: string
  description: string
  url: string
  youtubeUrl?: string
  thumbnail?: string
  duration: number
  createdAt: string
  checkpoints: Checkpoint[]
  transcript?: string
}

export interface Checkpoint {
  id: string
  videoId: string
  timestamp: number
  type: 'multiple_choice' | 'open_ended' | 'true_false'
  question: string
  options?: string[]
  correctAnswer?: string | string[]
  explanation?: string
  required: boolean
}

export interface CheckpointAnswer {
  checkpointId: string
  answer: string | string[]
  isCorrect: boolean
  timestamp: number
}

export interface VideoProgress {
  videoId: string
  userId: string
  currentTime: number
  completedCheckpoints: string[]
  lastWatched: string
  completed: boolean
}

export interface AITutorMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  audioUrl?: string
}

export interface StudyMaterial {
  id: string
  videoId: string
  type: 'quiz' | 'summary' | 'notes' | 'flashcards'
  content: any
  createdAt: string
}

export interface Quiz {
  questions: {
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
  }[]
}

export interface Summary {
  type: 'bullets' | 'paragraph'
  content: string
}

export interface Notes {
  sections: {
    title: string
    content: string
    keyPoints: string[]
  }[]
}

export interface Flashcard {
  front: string
  back: string
}

