'use client'

import { useState } from 'react'
import { Checkpoint } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface OpenEndedQuestionProps {
  checkpoint: Checkpoint
  onAnswer: (answer: string | string[], correct: boolean) => void
  showResult: boolean
}

export function OpenEndedQuestion({
  checkpoint,
  onAnswer,
  showResult,
}: OpenEndedQuestionProps) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!answer.trim()) return

    setSubmitted(true)
    // In a real implementation, this would call the API to validate the answer
    // For now, we'll assume it's correct if it contains key terms
    const correct = checkpoint.correctAnswer
      ? answer.toLowerCase().includes(checkpoint.correctAnswer.toLowerCase())
      : true // If no correct answer specified, accept any answer

    onAnswer(answer, correct)
  }

  return (
    <div>
      <p className="text-lg font-semibold mb-4">{checkpoint.question}</p>

      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
        className="mb-4 min-h-[120px]"
        disabled={submitted}
      />

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="w-full"
        >
          Submit Answer
        </Button>
      )}

      {submitted && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm">
            Your answer has been submitted. The AI tutor will review it.
          </p>
        </div>
      )}
    </div>
  )
}




