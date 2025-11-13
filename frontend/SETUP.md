# Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Features Implemented

### ✅ Video Player
- Custom video player with React Player
- Progress tracking and resume functionality
- Custom controls (play, pause, volume, fullscreen)
- Checkpoint markers on timeline

### ✅ Interactive Checkpoints
- Multiple choice questions
- Open-ended questions
- True/false questions
- Answer validation
- Conditional progression
- Explanation display

### ✅ AI Speech Tutor
- Web Speech API integration
- Speech-to-text input
- Real-time conversation UI
- Text-to-speech output
- Context-aware responses

### ✅ Study Material Generator
- Quiz generation with answer validation
- Summary creation (bullets/paragraphs)
- Structured notes with key points
- Interactive flashcards
- Export to PDF/Markdown

### ✅ Authentication
- Login page with form validation
- Registration page
- Protected routes
- Token-based authentication

### ✅ Dashboard
- Video listing with progress indicators
- Statistics (total videos, in progress, completed)
- Continue watching section
- Video cards with thumbnails

### ✅ State Management
- Zustand stores for:
  - Video state
  - Checkpoint state
  - AI tutor state
  - Authentication state

## API Endpoints Expected

The frontend expects these backend endpoints:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/videos` - Get all videos
- `GET /api/videos/:id` - Get video by ID
- `GET /api/videos/:id/progress` - Get video progress
- `PUT /api/videos/:id/progress` - Update video progress
- `POST /api/checkpoints/:id/answer` - Submit checkpoint answer
- `POST /api/checkpoints/:id/validate` - Validate checkpoint answer
- `POST /api/tutor/chat` - Send message to AI tutor
- `POST /api/study-materials/generate` - Generate study materials
- `GET /api/study-materials/video/:id` - Get study materials for video
- `GET /api/study-materials/:id/export/:format` - Export study material

## Project Structure

```
app/
  ├── dashboard/          # User dashboard page
  ├── login/              # Login page
  ├── register/           # Registration page
  ├── videos/[id]/        # Video player page
  ├── layout.tsx          # Root layout with navbar
  ├── page.tsx            # Home/landing page
  └── globals.css         # Global styles

components/
  ├── auth/               # Authentication components
  ├── dashboard/          # Dashboard components
  ├── layout/             # Layout components (Navbar)
  ├── study/              # Study material components
  ├── tutor/              # AI tutor components
  ├── ui/                 # Reusable UI components
  └── video/              # Video player components

lib/
  ├── api.ts              # API client with axios
  ├── store.ts            # Zustand stores
  └── utils.ts            # Utility functions

types/
  └── index.ts            # TypeScript type definitions
```

## Notes

- Speech recognition requires HTTPS in production (localhost works for development)
- Video playback may require CORS configuration on the backend
- All API requests include authentication token from localStorage
- Progress is automatically saved as user watches videos
- Checkpoints trigger automatically based on video timestamps

## Development Tips

1. **Hot Reload**: Changes are automatically reflected in the browser
2. **TypeScript**: All components are typed for better development experience
3. **Tailwind CSS**: Use utility classes for styling
4. **State Management**: Use Zustand stores for global state
5. **API Integration**: All API calls are centralized in `lib/api.ts`

## Building for Production

```bash
npm run build
npm start
```

The production build will be in the `.next` directory.




