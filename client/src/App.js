import { useState } from 'react';
import InputBar from './components/InputBar';
import './App.css';

export default function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');

  const extractVideoId = (url) => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const handleSend = () => {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1`);
      console.log('Loading video:', videoId);
    } else if (videoUrl.trim()) {
      alert('Please enter a valid YouTube URL');
    }
  };

  return (
    <div className="App">
      <main className="container">
        {!embedUrl && <InputBar 
          videoUrl={videoUrl} 
          setVideoUrl={setVideoUrl} 
          onSend={handleSend} 
        />}
        
        {embedUrl && (
          <div className="video-section">
            <div className="video-wrapper">
              <div className="video-container">
                <iframe
                  src={embedUrl}
                  title="YouTube video player"
                  className="video-iframe"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}