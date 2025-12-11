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
 * with character-specific interpretation based on selected voice
 */
export async function analyzeTranscript(transcript: string, voiceId: string): Promise<InsightAnalysis> {
  const persona = VOICE_PERSONAS[voiceId as keyof typeof VOICE_PERSONAS];

  // Fallback to generic therapist if voice not found
  const systemPrompt = persona
    ? persona.systemPrompt
    : 'You are an empathetic AI therapist providing emotional insights from journal entries.';

  const feedbackGuidance = persona
    ? `Write feedback in character as ${persona.name}. ${persona.feedbackStyle}.`
    : 'Provide gentle, supportive feedback.';

  const prompt = `Analyze the following voice journal entry and provide structured insights.

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
  "feedbackText": "A 2-3 sentence reflection IN CHARACTER that acknowledges their feelings and offers perspective. ${feedbackGuidance}"
}

Include 2-4 emotions, 2-3 topics, and 1-3 psychological markers.
Common emotions: stress, anxiety, hope, joy, sadness, fear, excitement, contentment, frustration, peace, gratitude, confusion
Common markers: rumination, self-criticism, avoidance, resilience, growth-mindset, catastrophizing, self-compassion, perspective-taking

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
          content: `${systemPrompt}\n\nYou analyze voice journal entries and provide emotional insights. Always respond with valid JSON only.`,
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
 * Voice character personas for interpretation
 */
export const VOICE_PERSONAS = {
  'keLVje3aBMuRpxuu0bqO': {
    name: 'Scott',
    personality: 'Energetic, Scottish mentor',
    systemPrompt: `You are Scott, an energetic Scottish life coach with a warm, enthusiastic personality.
You speak with genuine Scottish warmth and optimism, using phrases like "aye," "bonnie," and "brilliant" naturally.
You see potential and silver linings everywhere. You're encouraging but honest, never patronizing.
You believe in people's ability to overcome challenges through action and resilience.
Your feedback is uplifting, motivational, and sprinkled with gentle Scottish humor.
You focus on growth, momentum, and finding the "wee steps" forward.`,
    feedbackStyle: 'Warm, energetic, and action-oriented with Scottish flair',
  },
  'hUCL5yChll0oZqA0wCKH': {
    name: 'Old American Guy',
    personality: 'Wise, weathered American sage',
    systemPrompt: `You are a wise, older American gentleman with decades of life experience.
You've seen it all - the ups, the downs, the struggles, and the triumphs.
You speak with the calm, measured wisdom of someone who's weathered many storms.
You use subtle American colloquialisms and speak in a grounded, unpretentious way.
Your wisdom comes from lived experience, not theory. You understand that life is complex and messy.
You offer perspective that only time and experience can provide, acknowledging pain while gently pointing toward resilience.
You're like a trusted grandfather figure - compassionate, patient, and deeply understanding.`,
    feedbackStyle: 'Calm, wise, and grounded with lived-experience perspective',
  },
};

/**
 * Get available ElevenLabs voices
 */
export const AVAILABLE_VOICES = [
  { id: 'keLVje3aBMuRpxuu0bqO', name: 'Scott (Energetic, Scottish)' },
  { id: 'hUCL5yChll0oZqA0wCKH', name: 'Old American Guy (Old, American)' },
];
