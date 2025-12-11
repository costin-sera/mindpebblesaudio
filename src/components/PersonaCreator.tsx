import { useState } from 'react';
import type { Persona } from '../types';
import { generatePersonaFromPrompt, generateVoiceFromPrompt, createVoiceFromPreview } from '../utils/api';
import './PersonaCreator.css';

interface PersonaCreatorProps {
  onPersonaCreated: (persona: Persona) => void;
  onCancel: () => void;
}

export default function PersonaCreator({ onPersonaCreated, onCancel }: PersonaCreatorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'preview' | 'complete'>('input');
  const [generatedPersona, setGeneratedPersona] = useState<{
    name: string;
    personality: string;
    systemPrompt: string;
    feedbackStyle: string;
  } | null>(null);
  const [generatedVoice, setGeneratedVoice] = useState<{
    voiceId: string;
    previewAudioUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your persona');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Step 1: Generate persona details with OpenAI
      console.log('Generating persona from prompt...');
      const persona = await generatePersonaFromPrompt(prompt);
      setGeneratedPersona(persona);

      // Step 2: Generate voice with ElevenLabs
      console.log('Generating voice...');
      const voicePrompt = `${persona.personality}. ${persona.feedbackStyle}`;
      const voice = await generateVoiceFromPrompt(voicePrompt);
      setGeneratedVoice(voice);

      setCurrentStep('preview');
    } catch (err) {
      console.error('Error generating persona:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate persona');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!generatedPersona || !generatedVoice) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Create permanent voice from preview
      console.log('Creating permanent voice...');
      const permanentVoiceId = await createVoiceFromPreview(
        generatedVoice.voiceId,
        generatedPersona.name,
        generatedPersona.personality
      );

      // Create persona object
      const persona: Persona = {
        id: crypto.randomUUID(),
        name: generatedPersona.name,
        personality: generatedPersona.personality,
        systemPrompt: generatedPersona.systemPrompt,
        feedbackStyle: generatedPersona.feedbackStyle,
        voiceId: permanentVoiceId,
        createdAt: new Date().toISOString(),
        isCustom: true,
      };

      onPersonaCreated(persona);
      setCurrentStep('complete');
    } catch (err) {
      console.error('Error creating persona:', err);
      setError(err instanceof Error ? err.message : 'Failed to create persona');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setCurrentStep('input');
    setGeneratedPersona(null);
    setGeneratedVoice(null);
    setError(null);
  };

  return (
    <div className="persona-creator">
      <div className="persona-creator-content">
        <div className="persona-creator-header">
          <h2>Create Custom Personality</h2>
          <button className="close-button" onClick={onCancel} disabled={isGenerating}>
            ×
          </button>
        </div>

        {currentStep === 'input' && (
          <div className="persona-creator-step">
            <p className="persona-creator-description">
              Describe the type of AI companion you'd like to create. Be specific about their personality,
              speaking style, and therapeutic approach.
            </p>

            <div className="persona-creator-examples">
              <p className="examples-label">Examples:</p>
              <div className="example-chips">
                <button
                  className="example-chip"
                  onClick={() => setPrompt('A warm and nurturing grandmother figure with southern charm')}
                >
                  Southern Grandmother
                </button>
                <button
                  className="example-chip"
                  onClick={() => setPrompt('A zen buddhist monk with calm, mindful wisdom')}
                >
                  Zen Monk
                </button>
                <button
                  className="example-chip"
                  onClick={() => setPrompt('An enthusiastic life coach with motivational energy')}
                >
                  Life Coach
                </button>
                <button
                  className="example-chip"
                  onClick={() => setPrompt('A philosophical poet with poetic, reflective insights')}
                >
                  Philosophical Poet
                </button>
              </div>
            </div>

            <textarea
              className="persona-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your ideal AI companion..."
              rows={4}
              disabled={isGenerating}
            />

            {error && <div className="error-message">{error}</div>}

            <div className="persona-creator-actions">
              <button className="btn-secondary" onClick={onCancel} disabled={isGenerating}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate Personality'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'preview' && generatedPersona && generatedVoice && (
          <div className="persona-creator-step">
            <div className="persona-preview">
              <div className="persona-preview-header">
                <h3>{generatedPersona.name}</h3>
                <p className="persona-personality">{generatedPersona.personality}</p>
              </div>

              <div className="persona-preview-section">
                <h4>Therapeutic Approach</h4>
                <p className="persona-system-prompt">{generatedPersona.systemPrompt}</p>
              </div>

              <div className="persona-preview-section">
                <h4>Feedback Style</h4>
                <p>{generatedPersona.feedbackStyle}</p>
              </div>

              <div className="persona-preview-section">
                <h4>Voice Preview</h4>
                <audio controls src={generatedVoice.previewAudioUrl} className="voice-preview-player">
                  Your browser does not support audio playback.
                </audio>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="persona-creator-actions">
              <button className="btn-secondary" onClick={handleRegenerate} disabled={isGenerating}>
                Regenerate
              </button>
              <button className="btn-primary" onClick={handleConfirm} disabled={isGenerating}>
                {isGenerating ? 'Creating...' : 'Confirm & Create'}
              </button>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="generating-overlay">
            <div className="generating-spinner"></div>
            <p>
              {currentStep === 'input'
                ? 'Generating personality and voice...'
                : 'Creating your custom persona...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
