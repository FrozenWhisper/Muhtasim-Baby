import React from 'react';

interface LoadingScreenProps {
  progress: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
  const messages = [
    "Initializing Conscious AI...",
    "Loading neural networks...",
    "Setting up memory systems...",
    "Creating world simulation...",
    "Waking up the AI mind...",
    "Almost ready..."
  ];

  const currentMessage = messages[Math.floor((progress / 100) * messages.length)];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      zIndex: 9999
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid #fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '30px'
      }} />

      <div style={{
        fontSize: '20px',
        color: 'white',
        textAlign: 'center',
        marginBottom: '20px',
        maxWidth: '300px',
        lineHeight: 1.4
      }}>
        {currentMessage}
      </div>

      <div style={{
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        {progress}% Complete
      </div>

      <div style={{
        width: '250px',
        height: '6px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div
          style={{
            height: '100%',
            background: '#4CAF50',
            width: `${progress}%`,
            transition: 'width 0.3s ease',
            borderRadius: '3px'
          }}
        />
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};