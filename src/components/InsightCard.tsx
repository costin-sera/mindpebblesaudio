import { useState } from 'react';
import type { JournalEntry } from '../types';
import './InsightCard.css';

interface InsightCardProps {
  entry: JournalEntry;
}

export default function InsightCard({ entry }: InsightCardProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      stress: '#f5576c',
      anxiety: '#fa8231',
      hope: '#4facfe',
      joy: '#43e97b',
      sadness: '#667eea',
      fear: '#764ba2',
      excitement: '#f093fb',
      contentment: '#00f2fe',
      frustration: '#f5576c',
      peace: '#43e97b',
    };
    return colors[emotion.toLowerCase()] || '#667eea';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return '#f5576c';
      case 'medium': return '#fa8231';
      case 'low': return '#43e97b';
      default: return '#667eea';
    }
  };

  return (
    <div className="insight-card">
      {/* Header */}
      <div className="insight-header">
        <div className="insight-date">{formatDate(entry.createdAt)}</div>
        <div className="insight-voice">Voice: {entry.voiceId}</div>
      </div>

      {/* Summary */}
      <div className="insight-summary">
        <h3>Summary</h3>
        <p>{entry.summary}</p>
      </div>

      {/* Emotions */}
      <div className="insight-section">
        <h3>Emotional Profile</h3>
        <div className="emotions-list">
          {entry.emotions.map((emotion, idx) => (
            <div key={idx} className="emotion-item">
              <div className="emotion-header">
                <span className="emotion-name">{emotion.name}</span>
                <span className="emotion-score">{(emotion.score * 100).toFixed(0)}%</span>
              </div>
              <div className="emotion-bar-container">
                <div
                  className="emotion-bar"
                  style={{
                    width: `${emotion.score * 100}%`,
                    backgroundColor: getEmotionColor(emotion.name),
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="insight-section">
        <h3>Key Topics</h3>
        <div className="topics-list">
          {entry.topics.map((topic, idx) => (
            <span key={idx} className="topic-chip">{topic}</span>
          ))}
        </div>
      </div>

      {/* Psychological Markers */}
      <div className="insight-section">
        <h3>Psychological Markers</h3>
        <div className="markers-list">
          {entry.psychMarkers.map((marker, idx) => (
            <div key={idx} className="marker-item">
              <div className="marker-header">
                <span className="marker-name">{marker.name}</span>
                <span
                  className="marker-level"
                  style={{ color: getLevelColor(marker.level) }}
                >
                  {marker.level}
                </span>
              </div>
              <p className="marker-description">{marker.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transcript */}
      <div className="insight-section">
        <button
          className="transcript-toggle"
          onClick={() => setShowTranscript(!showTranscript)}
        >
          {showTranscript ? '▼' : '▶'} Transcript
        </button>
        {showTranscript && (
          <div className="transcript-content">
            <p>{entry.transcript}</p>
          </div>
        )}
      </div>

      {/* Audio Players */}
      <div className="insight-section">
        <h3>Audio</h3>
        <div className="audio-players">
          <div className="audio-player-item">
            <label>Your Recording</label>
            <audio controls src={entry.originalAudioUrl}>
              Your browser does not support audio playback.
            </audio>
          </div>
          <div className="audio-player-item">
            <label>AI Reflection</label>
            <audio controls src={entry.feedbackAudioUrl}>
              Your browser does not support audio playback.
            </audio>
          </div>
        </div>
      </div>

      {/* Feedback Text */}
      <div className="insight-feedback">
        <div className="feedback-icon">💭</div>
        <p>{entry.feedbackText}</p>
      </div>
    </div>
  );
}
