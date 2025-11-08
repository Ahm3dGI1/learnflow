import { useState } from 'react';

export function useYouTubeEmbed() {
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

  const handleLoadVideo = () => {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1`);
      console.log('Loading video:', videoId);
    } else if (videoUrl.trim()) {
      alert('Please enter a valid YouTube URL');
    }
  };

  const resetVideo = () => {
    setVideoUrl('');
    setEmbedUrl('');
  };

  return {
    videoUrl,
    setVideoUrl,
    embedUrl,
    handleLoadVideo,
    resetVideo,
  };
}
