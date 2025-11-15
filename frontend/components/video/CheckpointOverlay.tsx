'use client'

import { useState } from 'react'
import { Checkpoint } from '@/types'
import { MultipleChoiceQuestion } from './checkpoints/MultipleChoiceQuestion'
import { OpenEndedQuestion } from './checkpoints/OpenEndedQuestion'
import { TrueFalseQuestion } from './checkpoints/TrueFalseQuestion'
import { Card } from '@/components/ui/card'

interface CheckpointOverlayProps {
  checkpoint: Checkpoint
  onComplete: () => void
}

export function CheckpointOverlay({ checkpoint, onComplete }: CheckpointOverlayProps) {
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  const handleAnswer = (answer: string | string[], correct: boolean) => {
    setIsCorrect(correct)
    if (correct) {
      setTimeout(() => {
        onComplete()
      }, 2000)
    } else {
      setShowExplanation(true)
    }
  }

  const renderQuestion = () => {
    switch (checkpoint.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            checkpoint={checkpoint}
            onAnswer={handleAnswer}
            showResult={isCorrect !== null}
          />
        )
      case 'open_ended':
        return (
          <OpenEndedQuestion
            checkpoint={checkpoint}
            onAnswer={handleAnswer}
            showResult={isCorrect !== null}
          />
        )
      case 'true_false':
        return (
          <TrueFalseQuestion
            checkpoint={checkpoint}
            onAnswer={handleAnswer}
            showResult={isCorrect !== null}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2">Checkpoint</h2>
          <p className="text-muted-foreground">
            Answer this question to continue watching
          </p>
        </div>

        {renderQuestion()}

        {showExplanation && checkpoint.explanation && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-semibold mb-2">Explanation:</p>
            <p className="text-sm">{checkpoint.explanation}</p>
          </div>
        )}

        {isCorrect === false && (
          <div className="mt-4">
            <button
              onClick={onComplete}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {isCorrect === true && (
          <div className="mt-4 p-4 bg-green-500/20 text-green-600 rounded-lg">
            <p className="font-semibold">✓ Correct! Continuing video...</p>
          </div>
        )}
      </Card>
    </div>
  )
}




