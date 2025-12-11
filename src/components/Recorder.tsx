import { useState, useRef, useEffect } from 'react';
import './Recorder.css';

interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isProcessing: boolean;
}

export default function Recorder({ onRecordingComplete, isProcessing }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Pre-initialize audio stream when component mounts
  useEffect(() => {
    const initializeStream = async () => {
      try {
        console.log('Pre-initializing microphone stream...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setIsStreamReady(true);
        console.log('Microphone stream ready!');
      } catch (error) {
        console.error('Error initializing microphone:', error);
      }
    };

    initializeStream();

    // Cleanup: stop stream when component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!streamRef.current) {
        console.error('Audio stream not initialized');
        alert('Microphone not ready. Please refresh the page and grant permission.');
        return;
      }

      console.log('Starting recording immediately...');

      // Try to use a compatible audio format, prioritizing formats with less encoder delay
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4', audioBitsPerSecond: 128000 };
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm', audioBitsPerSecond: 128000 };
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options = { mimeType: 'audio/ogg;codecs=opus', audioBitsPerSecond: 128000 };
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      console.log('Recording with MIME type:', mediaRecorder.mimeType);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Data chunk received:', event.data.size, 'bytes');
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('Recording started');
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        console.log('Recording stopped. Created blob with type:', mimeType, 'size:', audioBlob.size, 'chunks:', chunksRef.current.length);
        onRecordingComplete(audioBlob);
        // Don't stop the stream - keep it alive for future recordings

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      // Start recording with a very small timeslice (10ms) to capture audio immediately
      // This helps prevent encoder delay from skipping initial audio
      mediaRecorder.start(10);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please grant permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Request any remaining buffered data before stopping
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.requestData();
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="recorder">
      <div className="recorder-container">
        <button
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || !isStreamReady}
        >
          <div className="record-button-inner">
            {isRecording ? (
              <>
                <div className="stop-icon"></div>
                <div className="recording-pulse"></div>
              </>
            ) : (
              <div className="mic-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
            )}
          </div>
        </button>

        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            <span className="recording-time">{formatTime(recordingTime)}</span>
          </div>
        )}

        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <span>Processing your pebble...</span>
          </div>
        )}

        <div className="recorder-instructions">
          {isRecording
            ? 'Click to stop recording'
            : isProcessing
            ? 'Generating insights...'
            : !isStreamReady
            ? 'Initializing microphone...'
            : 'Click to start recording'}
        </div>
      </div>
    </div>
  );
}
