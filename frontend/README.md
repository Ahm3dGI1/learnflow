# Interactive Video Learning Platform - Frontend

An AI-powered educational tool that transforms passive video watching into an active, personalized learning experience.

## Features

### ✅ Fully Implemented (Frontend Complete)
- 🔐 **User Authentication** - Working sign-in and sign-up with localStorage
- 📝 **Video Submission** - Submit YouTube URLs and store them
- 📊 **Dashboard** - View all submitted videos with statistics
- 📚 **Video History** - Browse submitted videos with thumbnails
- 🎨 **Polished UI** - Complete, professional interface ready for backend

### 🚧 Backend Integration Points (Ready for Backend Team)
- 🎥 **Interactive Video Player** - Placeholder ready for React Player integration
- ✅ **Checkpoint System** - UI components ready, waiting for AI-generated checkpoints
- 🗣️ **AI Speech Tutor** - UI ready, waiting for AI backend integration
- 📚 **Study Material Generator** - UI ready, waiting for AI generation backend
- 📊 **Progress Tracking** - Data structure ready, waiting for backend persistence

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Video Player**: React Player
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Speech Recognition**: Web Speech API

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "CS162 Final project"
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
.
├── app/                    # Next.js app router pages
│   ├── dashboard/          # User dashboard
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── videos/[id]/        # Video player page
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/              # React components
│   ├── auth/               # Authentication components
│   ├── dashboard/          # Dashboard components
│   ├── layout/             # Layout components (Navbar)
│   ├── study/              # Study material components
│   ├── tutor/              # AI tutor components
│   ├── ui/                 # UI components (shadcn/ui)
│   └── video/              # Video player components
├── lib/                     # Utilities and configurations
│   ├── api.ts              # API client
│   ├── store.ts            # Zustand stores
│   └── utils.ts            # Utility functions
├── types/                   # TypeScript type definitions
└── public/                  # Static assets
```

## Key Components

### Video Player
- Custom controls with progress tracking
- Checkpoint overlay system
- Automatic checkpoint triggering
- Progress persistence

### AI Tutor
- Speech-to-text input
- Real-time conversation UI
- Text-to-speech output
- Context-aware responses

### Study Material Generator
- Quiz generation with multiple choice questions
- Summary creation (bullets or paragraphs)
- Structured notes with key points
- Interactive flashcards

### Authentication
- Login and registration forms
- Form validation with Zod
- Protected routes
- Token-based authentication

## Backend Integration

The frontend is fully functional with localStorage for now. When ready to connect to the backend:

1. Set `USE_LOCAL_STORAGE = false` in `/lib/api.ts`
2. Update `NEXT_PUBLIC_API_URL` in `.env.local` to your backend URL
3. Ensure your backend implements all endpoints as documented in `BACKEND_INTEGRATION.md`

### API Endpoints Expected

The frontend expects a backend API at `NEXT_PUBLIC_API_URL`. The API should implement:

- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/videos` - Get all videos
- `/api/videos/:id` - Get video by ID
- `/api/videos/:id/progress` - Get/update video progress
- `/api/checkpoints/:id/answer` - Submit checkpoint answer
- `/api/tutor/chat` - Send message to AI tutor
- `/api/study-materials/generate` - Generate study materials

## Development

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Features in Detail

### Interactive Checkpoints
- Videos pause automatically at checkpoint timestamps
- Questions must be answered correctly (if required) to continue
- Multiple question types supported
- Explanation shown after incorrect answers

### AI Speech Tutor
- Uses Web Speech API for speech recognition
- Context-aware responses based on video content
- Text-to-speech playback for responses
- Conversation history maintained during session

### Study Material Generator
- Quizzes with answer validation
- Summaries in bullet or paragraph format
- Structured notes with sections and key points
- Interactive flashcards for active recall
- Export to PDF or Markdown

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is part of a CS162 Final Project.

## Notes

- The backend API is expected to be running separately
- Speech recognition requires HTTPS in production (or localhost)
- Video playback may require CORS configuration on the backend
- Token-based authentication is used for API requests

