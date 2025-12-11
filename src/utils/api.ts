// API utility functions for MindPebbles

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export interface Emotion {
  name: string;
  score: number;
}

export interface PsychMarker {
  name: string;
  level: 'low' | 'medium' | 'high';
  description: string;
}

export interface InsightAnalysis {
  summary: string;
  emotions: Emotion[];
  topics: string[];
  psychMarkers: PsychMarker[];
  feedbackText: string;
}

/**
 * Transcribe audio using ElevenLabs Speech-to-Text
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

  if (audioBlob.size === 0) {
    throw new Error('Audio blob is empty. Please record for at least 1 second.');
  }

  const formData = new FormData();

  // Determine file extension based on MIME type
  let filename = 'recording.webm';
  const mimeType = audioBlob.type || 'audio/webm';

  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    filename = 'recording.mp4';
  } else if (mimeType.includes('ogg')) {
    filename = 'recording.ogg';
  } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
    filename = 'recording.mp3';
  }

  // ElevenLabs expects the parameter to be named 'file'
  const audioFile = new File([audioBlob], filename, { type: mimeType });
  formData.append('file', audioFile);
  formData.append('model_id', 'scribe_v1');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs STT Error Response:', errorText);
    throw new Error(`STT failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.text;
}

/**
 * Analyze transcript using OpenAI to extract emotional insights
 */
export async function analyzeTranscript(transcript: string): Promise<InsightAnalysis> {
  const prompt = `You are an empathetic AI therapist analyzing a voice journal entry. Analyze the following transcript and provide structured insights.

Transcript: "${transcript}"

Return a JSON object with this exact structure:
{
  "summary": "A brief 1-2 sentence summary of the entry",
  "emotions": [
    { "name": "emotion_name", "score": 0.0-1.0 }
  ],
  "topics": ["topic1", "topic2"],
  "psychMarkers": [
    { "name": "marker_name", "level": "low|medium|high", "description": "brief explanation" }
  ],
  "feedbackText": "A gentle, supportive 2-3 sentence reflection that acknowledges their feelings and offers a compassionate perspective"
}

Include 2-4 emotions, 2-3 topics, and 1-3 psychological markers.
Common emotions: stress, anxiety, hope, joy, sadness, fear, excitement, contentment, frustration, peace
Common markers: rumination, self-criticism, avoidance, resilience, growth-mindset, catastrophizing

Return ONLY the JSON object, no additional text.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an empathetic AI therapist providing emotional insights from journal entries. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI analysis failed: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const analysis = JSON.parse(content);

  return analysis;
}

/**
 * Generate spoken feedback using ElevenLabs Text-to-Speech
 */
export async function generateSpeech(text: string, voiceId: string): Promise<string> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}

/**
 * Get available ElevenLabs voices
 */
export const AVAILABLE_VOICES = [
  { id: 'keLVje3aBMuRpxuu0bqO', name: 'Scott (Energetic, Scottish)' },
  { id: 'hUCL5yChll0oZqA0wCKH', name: 'Old American Guy (Old, American)' },
];
