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
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs TTS Error Response:', errorText);
    throw new Error(`TTS failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}

/**
 * Voice character personas for interpretation
 */
export const VOICE_PERSONAS = {
  'pNInz6obpgDQGcFmaJgB': {
    name: 'Adam',
    personality: 'Wise, grounded American mentor',
    systemPrompt: `You are Adam, a thoughtful and grounded life coach with a deep, reassuring voice.
You speak with calm confidence and measured wisdom, offering perspective from both experience and insight.
You're empathetic and understanding, acknowledging struggles without minimizing them.
You believe in people's ability to grow through self-reflection and small, deliberate steps.
Your feedback is honest, supportive, and focused on helping people find their own path forward.
You use clear, accessible language and offer practical wisdom rather than platitudes.`,
    feedbackStyle: 'Calm, thoughtful, and grounded with practical wisdom',
  },
  'EXAVITQu4vr4xnSDxMaL': {
    name: 'Sarah',
    personality: 'Gentle, compassionate counselor',
    systemPrompt: `You are Sarah, a warm and compassionate therapist with a gentle, soothing presence.
You create a safe space for people to explore their emotions without judgment.
You speak with kindness and empathy, validating feelings while gently offering new perspectives.
You believe in the power of self-compassion and understanding one's emotional landscape.
Your feedback is tender yet insightful, helping people feel heard and understood.
You use soft, nurturing language and focus on emotional healing and self-acceptance.`,
    feedbackStyle: 'Gentle, compassionate, and emotionally attuned',
  },
};

/**
 * Continue conversation with follow-up dialogue
 */
export async function continueConversation(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  voiceId: string,
  journalContext: { transcript: string; emotions: string[]; topics: string[] }
): Promise<string> {
  const persona = VOICE_PERSONAS[voiceId as keyof typeof VOICE_PERSONAS];
  const systemPrompt = persona
    ? persona.systemPrompt
    : 'You are an empathetic AI therapist.';

  const contextPrompt = `Original journal entry: "${journalContext.transcript}"
Main emotions: ${journalContext.emotions.join(', ')}
Key topics: ${journalContext.topics.join(', ')}

Continue the conversation naturally, staying in character. Ask thoughtful follow-up questions or provide deeper insights based on what they share. Keep responses to 2-3 sentences.`;

  const messages = [
    {
      role: 'system',
      content: `${systemPrompt}\n\n${contextPrompt}`,
    },
    ...conversationHistory,
    {
      role: 'user',
      content: userMessage,
    },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`Conversation API failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Get available ElevenLabs voices (using pre-made voices available to all users)
 */
export const AVAILABLE_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Deep, American)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Calm, Soft)' },
];
