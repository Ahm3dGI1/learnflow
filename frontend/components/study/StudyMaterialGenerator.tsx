'use client'

import { useState } from 'react'
import { FileText, BookOpen, StickyNote, CreditCard, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { studyMaterialApi } from '@/lib/api'
import { StudyMaterial, Quiz, Summary, Notes, Flashcard } from '@/types'

interface StudyMaterialGeneratorProps {
  videoId: string
}

type MaterialType = 'quiz' | 'summary' | 'notes' | 'flashcards'

export function StudyMaterialGenerator({ videoId }: StudyMaterialGeneratorProps) {
  const [selectedType, setSelectedType] = useState<MaterialType | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMaterial, setGeneratedMaterial] = useState<StudyMaterial | null>(null)
  const [error, setError] = useState<string | null>(null)

  const materialTypes: { type: MaterialType; icon: any; title: string; description: string }[] = [
    {
      type: 'quiz',
      icon: FileText,
      title: 'Quiz',
      description: 'Generate practice questions based on the video content',
    },
    {
      type: 'summary',
      icon: BookOpen,
      title: 'Summary',
      description: 'Create a concise summary of key points',
    },
    {
      type: 'notes',
      icon: StickyNote,
      title: 'Notes',
      description: 'Generate structured notes with key concepts',
    },
    {
      type: 'flashcards',
      icon: CreditCard,
      title: 'Flashcards',
      description: 'Create flashcards for active recall',
    },
  ]

  const handleGenerate = async (type: MaterialType) => {
    setSelectedType(type)
    setIsGenerating(true)
    setError(null)
    setGeneratedMaterial(null)

    try {
      const response = await studyMaterialApi.generate(videoId, type)
      setGeneratedMaterial(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate study material')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'markdown') => {
    if (!generatedMaterial) return

    try {
      const response = await studyMaterialApi.export(generatedMaterial.id, format)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `study-material.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const renderMaterial = () => {
    if (!generatedMaterial) return null

    switch (generatedMaterial.type) {
      case 'quiz':
        return <QuizView quiz={generatedMaterial.content as Quiz} />
      case 'summary':
        return <SummaryView summary={generatedMaterial.content as Summary} />
      case 'notes':
        return <NotesView notes={generatedMaterial.content as Notes} />
      case 'flashcards':
        return <FlashcardsView flashcards={generatedMaterial.content as Flashcard[]} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Generate Study Materials</h2>
        <p className="text-muted-foreground">
          Create personalized study materials based on the video content
        </p>
      </div>

      {/* Material Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {materialTypes.map(({ type, icon: Icon, title, description }) => (
          <Card
            key={type}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleGenerate(type)}
          >
            <CardHeader>
              <Icon className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Generating State */}
      {isGenerating && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              Generating {selectedType}... This may take a moment.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Generated Material */}
      {generatedMaterial && !isGenerating && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="capitalize">{generatedMaterial.type}</CardTitle>
                <CardDescription>
                  Generated on {new Date(generatedMaterial.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('markdown')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Markdown
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderMaterial()}</CardContent>
        </Card>
      )}
    </div>
  )
}

function QuizView({ quiz }: { quiz: Quiz }) {
  const [selectedAnswers, setSelectedAnswers] = useState<Map<number, number>>(new Map())
  const [showResults, setShowResults] = useState(false)

  const handleAnswer = (questionIndex: number, answerIndex: number) => {
    if (showResults) return
    const newAnswers = new Map(selectedAnswers)
    newAnswers.set(questionIndex, answerIndex)
    setSelectedAnswers(newAnswers)
  }

  const checkAnswers = () => {
    setShowResults(true)
  }

  return (
    <div className="space-y-6">
      {quiz.questions.map((question, qIndex) => (
        <Card key={qIndex}>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">
              {qIndex + 1}. {question.question}
            </h3>
            <div className="space-y-2">
              {question.options.map((option, oIndex) => {
                const isSelected = selectedAnswers.get(qIndex) === oIndex
                const isCorrect = oIndex === question.correctAnswer
                const showCorrect = showResults && isCorrect
                const showIncorrect = showResults && isSelected && !isCorrect

                return (
                  <div
                    key={oIndex}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      showCorrect
                        ? 'bg-green-500/20 border-green-500'
                        : showIncorrect
                        ? 'bg-red-500/20 border-red-500'
                        : isSelected
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleAnswer(qIndex, oIndex)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {String.fromCharCode(65 + oIndex)}.
                      </span>
                      <span>{option}</span>
                      {showCorrect && <Badge variant="default" className="ml-auto">Correct</Badge>}
                      {showIncorrect && (
                        <Badge variant="destructive" className="ml-auto">Incorrect</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {showResults && question.explanation && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-1">Explanation:</p>
                <p className="text-sm">{question.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {!showResults && (
        <Button onClick={checkAnswers} className="w-full">
          Check Answers
        </Button>
      )}
    </div>
  )
}

function SummaryView({ summary }: { summary: Summary }) {
  return (
    <div className="prose max-w-none">
      {summary.type === 'bullets' ? (
        <ul className="list-disc list-inside space-y-2">
          {summary.content.split('\n').map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      ) : (
        <p className="whitespace-pre-wrap">{summary.content}</p>
      )}
    </div>
  )
}

function NotesView({ notes }: { notes: Notes }) {
  return (
    <div className="space-y-6">
      {notes.sections.map((section, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-lg">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{section.content}</p>
            {section.keyPoints.length > 0 && (
              <div>
                <p className="font-semibold mb-2">Key Points:</p>
                <ul className="list-disc list-inside space-y-1">
                  {section.keyPoints.map((point, pIndex) => (
                    <li key={pIndex} className="text-sm">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FlashcardsView({ flashcards }: { flashcards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const currentCard = flashcards[currentIndex]

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length)
    setIsFlipped(false)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
    setIsFlipped(false)
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">
          Card {currentIndex + 1} of {flashcards.length}
        </p>
      </div>

      <Card
        className="h-64 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <CardContent className="h-full flex items-center justify-center p-6">
          <p className="text-lg text-center">
            {isFlipped ? currentCard.back : currentCard.front}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          Previous
        </Button>
        <Button variant="outline" onClick={() => setIsFlipped(!isFlipped)}>
          {isFlipped ? 'Show Front' : 'Show Back'}
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
        >
          Next
        </Button>
      </div>
    </div>
  )
}




