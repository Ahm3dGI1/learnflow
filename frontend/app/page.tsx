import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayCircle, BookOpen, MessageSquare, FileText, CheckCircle, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Transform Passive Watching Into
          <span className="text-primary"> Active Learning</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Interactive video learning platform with AI-powered checkpoints, real-time tutoring,
          and personalized study materials.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/learn">
            <Button size="lg">Start Learning</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">
              Sign Up
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <PlayCircle className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Interactive Checkpoints</CardTitle>
              <CardDescription>
                Pause at key moments to test your understanding before continuing
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-10 w-10 text-primary mb-2" />
              <CardTitle>AI Speech Tutor</CardTitle>
              <CardDescription>
                Real-time conversations with an AI tutor that understands the video content
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Study Materials</CardTitle>
              <CardDescription>
                Generate quizzes, summaries, notes, and flashcards tailored to each video
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Progress Tracking</CardTitle>
              <CardDescription>
                Monitor your learning journey with detailed analytics and progress reports
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BookOpen className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Personalized Learning</CardTitle>
              <CardDescription>
                Customized learning paths that adapt to your pace and understanding
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Real-Time Feedback</CardTitle>
              <CardDescription>
                Get immediate feedback on checkpoints and answers to reinforce learning
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/50 rounded-lg">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-foreground">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Watch & Learn</h3>
            <p className="text-muted-foreground">
              Start watching educational videos with interactive checkpoints embedded throughout
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-foreground">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Engage & Understand</h3>
            <p className="text-muted-foreground">
              Answer questions at checkpoints and chat with the AI tutor when you need help
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-foreground">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Study & Review</h3>
            <p className="text-muted-foreground">
              Generate personalized study materials to reinforce your learning
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
        <p className="text-muted-foreground mb-8">
          Transform any YouTube video into an interactive learning experience
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/learn">
            <Button size="lg">Transform a Video Now</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">
              Sign Up Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

