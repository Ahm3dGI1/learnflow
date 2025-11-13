'use client'

import { useState } from 'react'
import { Checkpoint } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface TrueFalseQuestionProps {
  checkpoint: Checkpoint
  onAnswer: (answer: string | string[], correct: boolean) => void
  showResult: boolean
}

export function TrueFalseQuestion({
  checkpoint,
  onAnswer,
  showResult,
}: TrueFalseQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const resolveCorrectAnswer = () => {
    const { correctAnswer } = checkpoint
    if (Array.isArray(correctAnswer)) {
      return correctAnswer.some((ans) => ans.toLowerCase() === 'true')
    }
    if (typeof correctAnswer === 'string') {
      return correctAnswer.toLowerCase() === 'true'
    }
    if (typeof correctAnswer === 'boolean') {
      return correctAnswer
    }
    return true
  }

  const handleSelect = (option: 'True' | 'False') => {
    if (!submitted) {
      setSelectedAnswer(option)
    }
  }

  const handleSubmit = () => {
    if (!selectedAnswer) return

    setSubmitted(true)
    const correctAnswer = resolveCorrectAnswer()
    const isCorrect = (selectedAnswer === 'True') === correctAnswer

    onAnswer(selectedAnswer, isCorrect)
  }

  const getOptionClass = (option: 'True' | 'False') => {
    if (!submitted) {
      return selectedAnswer === option
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-muted'
    }

    const correctAnswer = resolveCorrectAnswer()
    const isCorrect = (option === 'True') === correctAnswer

    if (selectedAnswer === option) {
      return isCorrect
        ? 'bg-green-500 text-white'
        : 'bg-red-500 text-white'
    }
    if (isCorrect) {
      return 'bg-green-500/20 border-green-500'
    }
    return 'opacity-50'
  }

  return (
    <div>
      <p className="text-lg font-semibold mb-4">{checkpoint.question}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card
          className={`p-6 cursor-pointer transition-colors text-center ${getOptionClass('True')}`}
          onClick={() => handleSelect('True')}
        >
          <span className="text-xl font-bold">True</span>
        </Card>
        <Card
          className={`p-6 cursor-pointer transition-colors text-center ${getOptionClass('False')}`}
          onClick={() => handleSelect('False')}
        >
          <span className="text-xl font-bold">False</span>
        </Card>
      </div>

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          className="w-full"
        >
          Submit Answer
        </Button>
      )}
    </div>
  )
}




