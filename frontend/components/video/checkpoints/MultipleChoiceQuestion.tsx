'use client'

import { useState } from 'react'
import { Checkpoint } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface MultipleChoiceQuestionProps {
  checkpoint: Checkpoint
  onAnswer: (answer: string | string[], correct: boolean) => void
  showResult: boolean
}

export function MultipleChoiceQuestion({
  checkpoint,
  onAnswer,
  showResult,
}: MultipleChoiceQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSelect = (option: string) => {
    if (!submitted) {
      setSelectedAnswer(option)
    }
  }

  const handleSubmit = () => {
    if (!selectedAnswer) return

    setSubmitted(true)
    const correct = Array.isArray(checkpoint.correctAnswer)
      ? checkpoint.correctAnswer.includes(selectedAnswer)
      : checkpoint.correctAnswer === selectedAnswer

    onAnswer(selectedAnswer, correct)
  }

  const getOptionClass = (option: string) => {
    if (!submitted) {
      return selectedAnswer === option
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-muted'
    }

    const isCorrect = Array.isArray(checkpoint.correctAnswer)
      ? checkpoint.correctAnswer.includes(option)
      : checkpoint.correctAnswer === option

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

      <div className="space-y-3 mb-4">
        {checkpoint.options?.map((option, index) => (
          <Card
            key={index}
            className={`p-4 cursor-pointer transition-colors ${getOptionClass(option)}`}
            onClick={() => handleSelect(option)}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center font-semibold">
                {String.fromCharCode(65 + index)}
              </div>
              <span>{option}</span>
            </div>
          </Card>
        ))}
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




