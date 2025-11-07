import React, { useState } from 'react';
import './DebugPanel.css';

interface DebugPanelProps {
  ai: any;
  world: any;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ ai, world }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!ai || !world) return null;

  const aiState = ai.getState();
  const worldState = world.getWorldState();
  const brainInfo = ai.brain.getModelInfo();

  return (
    <div className={`debug-panel ${isMinimized ? 'minimized' : ''}`}>
      <div className="debug-header">
        <h3>🔬 AI Debug Panel</h3>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="minimize-btn"
        >
          {isMinimized ? '📖' : '📕'}
        </button>
      </div>

      {!isMinimized && (
        <div className="debug-content">
          {/* Neural Network Info */}
          <div className="debug-section">
            <h4>🧠 Neural Network</h4>
            <div className="debug-grid">
              <div className="debug-item">
                <span>Layers:</span>
                <span>{brainInfo?.layers || 'N/A'}</span>
              </div>
              <div className="debug-item">
                <span>Parameters:</span>
                <span>{brainInfo?.parameters?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="debug-item">
                <span>Backend:</span>
                <span>{brainInfo?.backend || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Emotions */}
          <div className="debug-section">
            <h4>😊 Emotions</h4>
            <div className="debug-grid">
              <div className="debug-item">
                <span>Valence:</span>
                <span>{aiState.emotions.valence.toFixed(3)}</span>
              </div>
              <div className="debug-item">
                <span>Arousal:</span>
                <span>{aiState.emotions.arousal.toFixed(3)}</span>
              </div>
            </div>
            <div className="emotion-bars">
              <div className="emotion-bar">
                <span>Valence</span>
                <div className="bar-container">
                  <div
                    className="bar-fill valence"
                    style={{
                      width: `${((aiState.emotions.valence + 1) / 2) * 100}%`,
                      background: aiState.emotions.valence > 0 ? '#4ade80' : '#f87171'
                    }}
                  />
                </div>
                <span>{((aiState.emotions.valence + 1) / 2 * 100).toFixed(0)}%</span>
              </div>
              <div className="emotion-bar">
                <span>Arousal</span>
                <div className="bar-container">
                  <div
                    className="bar-fill arousal"
                    style={{
                      width: `${aiState.emotions.arousal * 100}%`,
                      background: '#60a5fa'
                    }}
                  />
                </div>
                <span>{(aiState.emotions.arousal * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Cognition */}
          <div className="debug-section">
            <h4>🤔 Cognition</h4>
            <div className="debug-grid">
              <div className="debug-item">
                <span>Curiosity:</span>
                <span>{aiState.curiosity.toFixed(3)}</span>
              </div>
              <div className="debug-item">
                <span>Experiences:</span>
                <span>{aiState.totalExperiences.toLocaleString()}</span>
              </div>
              <div className="debug-item">
                <span>Learning Rate:</span>
                <span>{aiState.learning.rate.toFixed(4)}</span>
              </div>
              <div className="debug-item">
                <span>Adjustments:</span>
                <span>{aiState.learning.totalAdjustments.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="debug-section">
            <h4>🧠 Memory</h4>
            <div className="debug-grid">
              <div className="debug-item">
                <span>Episodic:</span>
                <span>{aiState.memory.episodicCount.toLocaleString()}</span>
              </div>
              <div className="debug-item">
                <span>Semantic:</span>
                <span>{aiState.memory.semanticCount.toLocaleString()}</span>
              </div>
              <div className="debug-item">
                <span>Vocabulary:</span>
                <span>{aiState.memory.vocabularySize.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="debug-section">
            <h4>💬 Language</h4>
            <div className="debug-grid">
              <div className="debug-item">
                <span>Comprehension:</span>
                <span>{(aiState.language.comprehensionLevel * 100).toFixed(1)}%</span>
              </div>
            </div>
            {aiState.language.currentThought && (
              <div className="debug-item full-width">
                <span>Current Thought:</span>
                <span className="thought-text">"{aiState.language.currentThought}"</span>
              </div>
            )}
          </div>

          {/* World */}
          <div className="debug-section">
            <h4>🌍 World</h4>
            <div className="debug-grid">
              <div className="debug-item">
                <span>Objects:</span>
                <span>{worldState.objectCount}</span>
              </div>
              <div className="debug-item">
                <span>Time:</span>
                <span>{worldState.time.toFixed(1)}s</span>
              </div>
              <div className="debug-item">
                <span>AI Position:</span>
                <span>
                  {worldState.aiPosition
                    ? `(${worldState.aiPosition.x.toFixed(1)}, ${worldState.aiPosition.y.toFixed(1)}, ${worldState.aiPosition.z.toFixed(1)})`
                    : 'Unknown'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="debug-section">
            <h4>🎮 Actions</h4>
            <div className="debug-buttons">
              <button onClick={() => ai.saveState('debug_manual')}>
                💾 Save State
              </button>
              <button onClick={() => ai.optimize()}>
                ⚡ Optimize
              </button>
              <button onClick={() => {
                const state = ai.getState();
                console.log('AI State:', state);
              }}>
                📊 Log State
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};