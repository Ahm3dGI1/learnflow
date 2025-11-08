export default function VideoPlayer({ embedUrl }) {
  if (!embedUrl) return null;

  return (
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
  );
}
