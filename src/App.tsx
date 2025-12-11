import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import Recorder from './components/Recorder';
import InsightCard from './components/InsightCard';
import Timeline from './components/Timeline';
import type { JournalEntry } from './types';
import { transcribeAudio, analyzeTranscript, generateSpeech, AVAILABLE_VOICES } from './utils/api';
import './App.css';

function App() {
  const { user } = useUser();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState(AVAILABLE_VOICES[0].id);

  // Get user-specific storage key
  const getStorageKey = () => {
    return user ? `mindpebbles_entries_${user.id}` : 'mindpebbles_entries_guest';
  };

  // Load entries from localStorage on mount or when user changes
  useEffect(() => {
    const storageKey = getStorageKey();
    const stored = localStorage.getItem(storageKey);
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
    } else {
      setEntries([]);
      setSelectedEntry(null);
    }
  }, [user]);

  // Save entries to localStorage whenever they change
  useEffect(() => {
    const storageKey = getStorageKey();
    if (entries.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(entries));
    }
  }, [entries, user]);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Step 1: Transcribe audio
      console.log('Transcribing audio...');
      const transcript = await transcribeAudio(audioBlob);
      console.log('Transcript:', transcript);

      // Step 2: Analyze transcript with character-specific interpretation
      console.log('Analyzing transcript with voice persona:', selectedVoiceId);
      const analysis = await analyzeTranscript(transcript, selectedVoiceId);
      console.log('Analysis:', analysis);

      // Step 3: Generate spoken feedback
      console.log('Generating speech...');
      const feedbackAudioUrl = await generateSpeech(analysis.feedbackText, selectedVoiceId);
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
        voiceId: selectedVoiceId,
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

  const handleUpdateEntry = (updatedEntry: JournalEntry) => {
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    setSelectedEntry(updatedEntry);
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
          <div className="auth-section">
            {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY &&
             import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== 'pk_test_placeholder' ? (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="sign-in-button">Sign In</button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className="user-info">
                    <span className="welcome-text">Welcome, {user?.firstName || 'User'}!</span>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
              </>
            ) : (
              <div className="guest-mode-badge">
                <span>Guest Mode</span>
              </div>
            )}
          </div>
        </header>

        <div className="voice-selector">
          <label htmlFor="voice-select">AI Voice:</label>
          <select
            id="voice-select"
            value={selectedVoiceId}
            onChange={(e) => setSelectedVoiceId(e.target.value)}
            disabled={isProcessing}
          >
            {AVAILABLE_VOICES.map(voice => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
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
            <InsightCard entry={selectedEntry} onUpdateEntry={handleUpdateEntry} />
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
    </div>
  );
}

export default App;
