import { useState, useEffect } from 'react';
import Recorder from './components/Recorder';
import InsightCard from './components/InsightCard';
import Timeline from './components/Timeline';
import PersonaCreator from './components/PersonaCreator';
import type { JournalEntry, Persona } from './types';
import { transcribeAudio, analyzeTranscript, generateSpeech, AVAILABLE_VOICES } from './utils/api';
import './App.css';

const STORAGE_KEY = 'mindpebbles_entries';
const PERSONAS_STORAGE_KEY = 'mindpebbles_personas';

function App() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState(AVAILABLE_VOICES[0].id);
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);
  const [showPersonaCreator, setShowPersonaCreator] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  // Load entries from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setEntries(parsed);
        if (parsed.length > 0) {
          setSelectedEntry(parsed[0]);
        }
      } catch (error) {
        console.error('Error loading entries:', error);
      }
    }
  }, []);

  // Load custom personas from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PERSONAS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCustomPersonas(parsed);
      } catch (error) {
        console.error('Error loading personas:', error);
      }
    }
  }, []);

  // Save entries to localStorage whenever they change
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries]);

  // Save custom personas to localStorage whenever they change
  useEffect(() => {
    if (customPersonas.length > 0) {
      localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(customPersonas));
    }
  }, [customPersonas]);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Step 1: Transcribe audio
      console.log('Transcribing audio...');
      const transcript = await transcribeAudio(audioBlob);
      console.log('Transcript:', transcript);

      // Step 2: Analyze transcript with character-specific interpretation
      console.log('Analyzing transcript with voice persona:', selectedPersona?.name || selectedVoiceId);
      const analysis = await analyzeTranscript(
        transcript,
        selectedPersona?.voiceId || selectedVoiceId,
        selectedPersona ? {
          name: selectedPersona.name,
          systemPrompt: selectedPersona.systemPrompt,
          feedbackStyle: selectedPersona.feedbackStyle,
        } : undefined
      );
      console.log('Analysis:', analysis);

      // Step 3: Generate spoken feedback
      console.log('Generating speech...');
      const voiceIdForTTS = selectedPersona?.voiceId || selectedVoiceId;
      const feedbackAudioUrl = await generateSpeech(analysis.feedbackText, voiceIdForTTS);
      console.log('Speech generated');

      // Create audio URL for original recording
      const originalAudioUrl = URL.createObjectURL(audioBlob);

      // Create new journal entry
      const newEntry: JournalEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        transcript,
        summary: analysis.summary,
        emotions: analysis.emotions,
        topics: analysis.topics,
        psychMarkers: analysis.psychMarkers,
        feedbackText: analysis.feedbackText,
        feedbackAudioUrl,
        originalAudioUrl,
        voiceId: selectedPersona?.name || AVAILABLE_VOICES.find(v => v.id === selectedVoiceId)?.name || 'Unknown',
      };

      // Add to entries and select it
      setEntries(prev => [newEntry, ...prev]);
      setSelectedEntry(newEntry);
    } catch (error) {
      console.error('Error processing recording:', error);
      alert(`Failed to process recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectEntry = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      setSelectedEntry(entry);
    }
  };

  const handlePersonaCreated = (persona: Persona) => {
    setCustomPersonas(prev => [...prev, persona]);
    setSelectedPersona(persona);
    setShowPersonaCreator(false);
    alert(`Persona "${persona.name}" created successfully! You can now use it for journaling.`);
  };

  const handlePersonaChange = (value: string) => {
    if (value === 'create-new') {
      setShowPersonaCreator(true);
    } else if (value.startsWith('custom-')) {
      const personaId = value.replace('custom-', '');
      const persona = customPersonas.find(p => p.id === personaId);
      setSelectedPersona(persona || null);
      setSelectedVoiceId(''); // Clear built-in voice selection
    } else {
      setSelectedPersona(null);
      setSelectedVoiceId(value);
    }
  };

  return (
    <div className="app">
      <div className="app-main">
        <header className="app-header">
          <div className="app-logo">
            <span className="logo-icon">🪨</span>
            <h1>MindPebbles</h1>
          </div>
          <p className="app-tagline">Drop a pebble, create ripples of insight</p>
        </header>

        <div className="voice-selector">
          <label htmlFor="voice-select">AI Personality:</label>
          <select
            id="voice-select"
            value={selectedPersona ? `custom-${selectedPersona.id}` : selectedVoiceId}
            onChange={(e) => handlePersonaChange(e.target.value)}
            disabled={isProcessing}
          >
            <optgroup label="Built-in Voices">
              {AVAILABLE_VOICES.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </optgroup>
            {customPersonas.length > 0 && (
              <optgroup label="Custom Personalities">
                {customPersonas.map(persona => (
                  <option key={persona.id} value={`custom-${persona.id}`}>
                    {persona.name} - {persona.personality}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Actions">
              <option value="create-new">+ Create New Personality</option>
            </optgroup>
          </select>
        </div>

        <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />

        {isProcessing && (
          <div className="processing-container">
            <div className="processing-animation">
              <div className="pebble-drop">
                <div className="pebble"></div>
                <div className="ripple ripple-1"></div>
                <div className="ripple ripple-2"></div>
                <div className="ripple ripple-3"></div>
              </div>
              <h3>Creating your MindPebble...</h3>
              <p className="processing-steps">
                <span className="step">Transcribing</span>
                <span className="step-separator">•</span>
                <span className="step">Analyzing emotions</span>
                <span className="step-separator">•</span>
                <span className="step">Generating insights</span>
              </p>
            </div>
          </div>
        )}

        {!isProcessing && selectedEntry && (
          <div className="insight-container">
            <InsightCard entry={selectedEntry} />
          </div>
        )}

        {!isProcessing && !selectedEntry && entries.length === 0 && (
          <div className="welcome-message">
            <h2>Welcome to MindPebbles</h2>
            <p>
              Start by recording a voice note about your thoughts, feelings, or experiences.
              Our AI will analyze your entry and provide gentle, compassionate insights.
            </p>
            <div className="welcome-features">
              <div className="feature">
                <span>🎤</span>
                <span>Record your thoughts</span>
              </div>
              <div className="feature">
                <span>🧠</span>
                <span>AI analyzes emotions</span>
              </div>
              <div className="feature">
                <span>💭</span>
                <span>Get spoken reflections</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Timeline
        entries={entries}
        selectedId={selectedEntry?.id || null}
        onSelectEntry={handleSelectEntry}
      />

      {showPersonaCreator && (
        <PersonaCreator
          onPersonaCreated={handlePersonaCreated}
          onCancel={() => setShowPersonaCreator(false)}
        />
      )}
    </div>
  );
}

export default App;
