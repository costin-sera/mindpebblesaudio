import { useState, useRef, useEffect } from 'react';
import type { JournalEntry, ConversationTurn } from '../types';
import { continueConversation, generateSpeech } from '../utils/api';
import './ConversationMode.css';

interface ConversationModeProps {
  entry: JournalEntry;
  onUpdateEntry: (updatedEntry: JournalEntry) => void;
  onClose: () => void;
}

export default function ConversationMode({ entry, onUpdateEntry, onClose }: ConversationModeProps) {
  // Initialize conversation with the original AI feedback if not already in history
  const initialHistory = entry.conversation && entry.conversation.length > 0
    ? entry.conversation
    : [
        {
          role: 'assistant' as const,
          text: entry.feedbackText,
          audioUrl: entry.feedbackAudioUrl,
          timestamp: entry.createdAt,
        }
      ];

  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>(initialHistory);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Save initial conversation state if it's the first time opening
  useEffect(() => {
    if (!entry.conversation || entry.conversation.length === 0) {
      const updatedEntry = {
        ...entry,
        conversation: initialHistory,
      };
      onUpdateEntry(updatedEntry);
    }
  }, []); // Only run once on mount

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleUserMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleUserMessage = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Transcribe user's voice message
      const { transcribeAudio } = await import('../utils/api');
      const userText = await transcribeAudio(audioBlob);
      const userAudioUrl = URL.createObjectURL(audioBlob);

      // Add user message to conversation
      const userTurn: ConversationTurn = {
        role: 'user',
        text: userText,
        audioUrl: userAudioUrl,
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [...conversationHistory, userTurn];
      setConversationHistory(updatedHistory);

      // Build conversation history for API
      const apiHistory = updatedHistory.map(turn => ({
        role: turn.role,
        content: turn.text,
      }));

      // Get AI response
      const journalContext = {
        transcript: entry.transcript,
        emotions: entry.emotions.map(e => e.name),
        topics: entry.topics,
      };

      const aiResponse = await continueConversation(
        userText,
        apiHistory.slice(0, -1), // Exclude the current user message
        entry.voiceId,
        journalContext
      );

      // Generate speech for AI response
      const aiAudioUrl = await generateSpeech(aiResponse, entry.voiceId);

      // Add AI response to conversation
      const aiTurn: ConversationTurn = {
        role: 'assistant',
        text: aiResponse,
        audioUrl: aiAudioUrl,
        timestamp: new Date().toISOString(),
      };

      const finalHistory = [...updatedHistory, aiTurn];
      setConversationHistory(finalHistory);

      // Update entry with conversation history
      const updatedEntry = {
        ...entry,
        conversation: finalHistory,
      };
      onUpdateEntry(updatedEntry);

      // Auto-play AI response
      const audio = new Audio(aiAudioUrl);
      setCurrentAudio(audio);
      audio.play();
    } catch (error) {
      console.error('Error in conversation:', error);
      alert(`Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    if (currentAudio) {
      currentAudio.pause();
    }
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    audio.play();
  };

  return (
    <div className="conversation-mode">
      <div className="conversation-header">
        <h3>💭 Continue the Conversation</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="conversation-messages">
        {conversationHistory.map((turn, index) => (
          <div key={index} className={`message ${turn.role}`}>
            <div className="message-content">
              <div className="message-text">{turn.text}</div>
              {turn.audioUrl && (
                <button
                  className="play-audio-btn"
                  onClick={() => playAudio(turn.audioUrl!)}
                  title="Play audio"
                >
                  🔊
                </button>
              )}
            </div>
            <div className="message-time">
              {new Date(turn.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="message assistant processing">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={conversationEndRef} />
      </div>

      <div className="conversation-controls">
        <button
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isRecording ? '🛑 Stop Recording' : '🎤 Record Response'}
        </button>
        {isRecording && (
          <div className="recording-indicator">
            <span className="pulse"></span>
            Recording...
          </div>
        )}
      </div>
    </div>
  );
}
