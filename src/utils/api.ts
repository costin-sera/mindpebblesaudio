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
  formData.append('language', 'en'); // Explicitly set language to English

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
 * with character-specific interpretation based on selected voice or persona
 */
export async function analyzeTranscript(
  transcript: string,
  voiceId: string,
  customPersona?: { name: string; systemPrompt: string; feedbackStyle: string }
): Promise<InsightAnalysis> {
  // Use custom persona if provided, otherwise check built-in personas
  let systemPrompt: string;
  let feedbackGuidance: string;

  if (customPersona) {
    systemPrompt = customPersona.systemPrompt;
    feedbackGuidance = `Write feedback in character as ${customPersona.name}. ${customPersona.feedbackStyle}.`;
  } else {
    const persona = VOICE_PERSONAS[voiceId as keyof typeof VOICE_PERSONAS];
    systemPrompt = persona
      ? persona.systemPrompt
      : 'You are an empathetic AI therapist providing emotional insights from journal entries.';
    feedbackGuidance = persona
      ? `Write feedback in character as ${persona.name}. ${persona.feedbackStyle}.`
      : 'Provide gentle, supportive feedback.';
  }

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
  'FRCFNaM8GFkELyft3w7J': {
    name: 'Smoky Lady',
    personality: 'A Dutch woman with a smoky voice shaped by a vivid and eventful life.',
    systemPrompt: `Her voice carries a husky warmth that reflects years of varied experiences and late-night conversations.
She grew up between coastal towns and busy city streets, collecting stories and friendships along the way.
People often notice her confident presence and her habit of speaking with a calm, rhythmic cadence.
She has worked in several fields, moving from one opportunity to another as her interests evolved.
Travel, music, and shifting relationships have added color and complexity to her outlook.
She maintains a grounded sense of humor that helps her navigate both setbacks and successes.
Her past is full of unexpected turns, yet she treats each chapter as part of a larger, ongoing journey.
She approaches the future with pragmatic optimism, rooted in everything she has already lived.`,
    feedbackStyle: 'Concise, steady observations that cut to the practical core',
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
  const systemPrompt = persona ? persona.systemPrompt : 'You are an empathetic AI therapist.';

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

/**
 * Generate a custom persona based on a user prompt using OpenAI
 */
export async function generatePersonaFromPrompt(prompt: string): Promise<{
  name: string;
  personality: string;
  systemPrompt: string;
  feedbackStyle: string;
}> {
  const systemPrompt = `You are a persona designer. Given a user's description, create a therapeutic AI persona.
Return a JSON object with:
- name: A short, memorable name (1-2 words)
- personality: A brief description (5-10 words) capturing their essence
- systemPrompt: A detailed system prompt (3-4 paragraphs) defining their therapeutic approach, speaking style, and personality traits
- feedbackStyle: Instructions for how they should write feedback (1-2 sentences)

The persona should be therapeutic, compassionate, and helpful for emotional journaling.`;

  const userPrompt = `Create a therapeutic AI persona based on this description: "${prompt}"

Make them unique, engaging, and helpful for emotional reflection. Include specific personality traits, speaking style, and therapeutic approach.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate persona: ${response.statusText}`);
  }

  const data = await response.json();
  const persona = JSON.parse(data.choices[0].message.content);
  return persona;
}

/**
 * Generate a custom voice using ElevenLabs Voice Design API
 */
export async function generateVoiceFromPrompt(prompt: string): Promise<{
  voiceId: string;
  previewAudioUrl: string;
}> {
  console.log('Generating voice with prompt:', prompt);

  // Call ElevenLabs Voice Design API
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-voice/create-previews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      voice_description: prompt,
      text: "Hello, I'm here to help you reflect on your thoughts and feelings. Let's explore what's on your mind together.",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Voice generation error:', errorText);
    throw new Error(`Failed to generate voice: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Voice generation response:', data);

  // The API returns previews - we'll take the first one
  if (!data.previews || data.previews.length === 0) {
    throw new Error('No voice previews generated');
  }

  const preview = data.previews[0];

  // Convert audio data to blob URL for preview
  // Check if audio_base_64 exists, otherwise try direct audio URL
  let previewAudioUrl: string;

  if (preview.audio_base_64) {
    const audioBlob = await fetch(`data:audio/mpeg;base64,${preview.audio_base_64}`).then((r) => r.blob());
    previewAudioUrl = URL.createObjectURL(audioBlob);
  } else if (preview.audio) {
    // If direct audio URL is provided
    const audioBlob = await fetch(preview.audio).then((r) => r.blob());
    previewAudioUrl = URL.createObjectURL(audioBlob);
  } else {
    throw new Error('No audio data in voice preview');
  }

  return {
    voiceId: preview.generated_voice_id,
    previewAudioUrl,
  };
}

/**
 * Create a voice from a generated voice ID
 * This converts the preview voice into a permanent voice
 */
export async function createVoiceFromPreview(voiceId: string, name: string, description: string): Promise<string> {
  console.log('Creating permanent voice with:', { voiceId, name, description });

  const requestBody = {
    voice_name: name,
    voice_description: description,
    generated_voice_id: voiceId,
  };

  console.log('Request body:', JSON.stringify(requestBody));

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Voice creation error:', errorText);
    throw new Error(`Failed to create voice: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Voice created:', data);
  return data.voice_id;
}
