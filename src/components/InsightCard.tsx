import { useState } from 'react';
import type { JournalEntry } from '../types';
import ConversationMode from './ConversationMode';
import { AVAILABLE_VOICES } from '../utils/api';
import './InsightCard.css';

interface InsightCardProps {
  entry: JournalEntry;
  onUpdateEntry?: (updatedEntry: JournalEntry) => void;
}

export default function InsightCard({ entry, onUpdateEntry }: InsightCardProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showConversation, setShowConversation] = useState(false);

  const voiceName = AVAILABLE_VOICES.find(v => v.id === entry.voiceId)?.name || entry.voiceId;

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

  if (showConversation && onUpdateEntry) {
    return (
      <ConversationMode
        entry={entry}
        onUpdateEntry={onUpdateEntry}
        onClose={() => setShowConversation(false)}
      />
    );
  }

  return (
    <div className="insight-card">
      {/* Header */}
      <div className="insight-header">
        <div className="insight-date">{formatDate(entry.createdAt)}</div>
        <div className="insight-voice">Voice: {voiceName}</div>
      </div>

      {/* Continue Conversation Button */}
      {onUpdateEntry && (
        <button
          className="continue-conversation-btn"
          onClick={() => setShowConversation(true)}
        >
          💬 Continue Conversation
        </button>
      )}

      {/* AI Reflection - Featured at the top */}
      <div className="ai-reflection-featured">
        <div className="reflection-header">
          <div className="reflection-icon">🎧</div>
          <div className="reflection-title">
            <h2>AI Reflection</h2>
            <p className="reflection-subtitle">Listen to your personalized insight</p>
          </div>
        </div>
        <audio controls autoPlay src={entry.feedbackAudioUrl} className="reflection-audio">
          Your browser does not support audio playback.
        </audio>
        <div className="reflection-text">
          <div className="feedback-icon">💭</div>
          <p>{entry.feedbackText}</p>
        </div>
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

      {/* Original Recording */}
      <div className="insight-section">
        <h3>Your Original Recording</h3>
        <div className="audio-player-item">
          <audio controls src={entry.originalAudioUrl}>
            Your browser does not support audio playback.
          </audio>
        </div>
      </div>
    </div>
  );
}
