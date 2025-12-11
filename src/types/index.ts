// Type definitions for MindPebbles

export interface Emotion {
  name: string;
  score: number;
}

export interface PsychMarker {
  name: string;
  level: 'low' | 'medium' | 'high';
  description: string;
}

export interface JournalEntry {
  id: string;
  createdAt: string;
  transcript: string;
  summary: string;
  emotions: Emotion[];
  topics: string[];
  psychMarkers: PsychMarker[];
  feedbackText: string;
  feedbackAudioUrl: string;
  originalAudioUrl: string;
  voiceId: string;
}
