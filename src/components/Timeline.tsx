import type { JournalEntry } from '../types';
import './Timeline.css';

interface TimelineProps {
  entries: JournalEntry[];
  selectedId: string | null;
  onSelectEntry: (id: string) => void;
}

export default function Timeline({ entries, selectedId, onSelectEntry }: TimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getEmotionColor = (entry: JournalEntry) => {
    if (entry.emotions.length === 0) return '#667eea';

    // Get the dominant emotion (highest score)
    const dominant = entry.emotions.reduce((prev, current) =>
      current.score > prev.score ? current : prev
    );

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

    return colors[dominant.name.toLowerCase()] || '#667eea';
  };

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h2>Your Pebbles</h2>
        <div className="timeline-count">{entries.length}</div>
      </div>

      <div className="timeline-list">
        {entries.length === 0 ? (
          <div className="timeline-empty">
            <div className="empty-icon">🪨</div>
            <p>No pebbles yet</p>
            <span>Start by recording your first thought</span>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`timeline-item ${selectedId === entry.id ? 'selected' : ''}`}
              onClick={() => onSelectEntry(entry.id)}
              style={{
                borderLeftColor: getEmotionColor(entry),
              }}
            >
              <div className="timeline-item-header">
                <span className="timeline-item-time">{formatDate(entry.createdAt)}</span>
                <div
                  className="timeline-item-emotion-dot"
                  style={{ backgroundColor: getEmotionColor(entry) }}
                ></div>
              </div>

              <div className="timeline-item-topics">
                {entry.topics.slice(0, 2).map((topic, idx) => (
                  <span key={idx} className="timeline-topic">{topic}</span>
                ))}
                {entry.topics.length > 2 && (
                  <span className="timeline-topic-more">+{entry.topics.length - 2}</span>
                )}
              </div>

              <div className="timeline-item-emotions">
                {entry.emotions.slice(0, 2).map((emotion, idx) => (
                  <span key={idx} className="timeline-emotion">
                    {emotion.name} {Math.round(emotion.score * 100)}%
                  </span>
                ))}
              </div>

              <button className="timeline-play-button" onClick={(e) => {
                e.stopPropagation();
                const audio = new Audio(entry.feedbackAudioUrl);
                audio.play();
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
