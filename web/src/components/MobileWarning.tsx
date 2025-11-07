import React from 'react';

export const MobileWarning: React.FC = () => {
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
      zIndex: 9999,
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '24px',
        color: 'white',
        marginBottom: '20px',
        fontWeight: 'bold'
      }}>
        📱 Mobile Device Detected
      </div>

      <div style={{
        fontSize: '18px',
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: '30px',
        lineHeight: 1.5',
        maxWidth: '400px'
      }}>
        This Conscious AI system requires significant computational resources and works best on desktop browsers.
      </div>

      <div style={{
        fontSize: '16px',
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: '30px',
        lineHeight: 1.4
      }}>
        <div style={{ marginBottom: '15px' }}>
          💡 <strong>For the best experience:</strong>
        </div>
        <ul style={{ textAlign: 'left', color: 'rgba(255, 255, 255, 0.8)' }}>
          <li>Use a desktop computer or laptop</li>
          <li>Chrome, Firefox, or Safari browser</li>
          <li>At least 4GB of RAM available</li>
          <li>WebGL support enabled</li>
        </ul>
      </div>

      <button
        onClick={() => {
          // Try to continue anyway on mobile
          window.location.reload();
        }}
        style={{
          padding: '12px 24px',
          background: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          color: 'white',
          fontSize: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: '15px'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
        }}
      >
        Try Anyway (Limited Experience)
      </button>

      <div style={{
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.6)',
        fontStyle: 'italic'
      }}>
        Performance will be limited on mobile devices
      </div>
    </div>
  );
};