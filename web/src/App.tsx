import React, { useEffect, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Stats } from '@react-three/drei';
import { AI } from './ai/AI.js';
import { World } from './world/World.js';
import { World3D } from './components/World3D.js';
import { ChatPanel } from './components/ChatPanel.js';
import { DebugPanel } from './components/DebugPanel.js';
import { ControlPanel } from './components/ControlPanel.js';
import { WorldBuilder } from './components/WorldBuilder.js';
import { LoadingScreen } from './components/LoadingScreen.js';
import { MobileWarning } from './components/MobileWarning.js';
import { useAIStore } from './store/useAIStore.js';
import { useWorldStore } from './store/useWorldStore.js';
import { useUIStore } from './store/useUIStore.js';
import './App.css';

function App() {
  const [ai, setAI] = useState<AI | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Store hooks
  const aiState = useAIStore();
  const worldState = useWorldStore();
  const uiState = useUIStore();

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize AI and World
  useEffect(() => {
    const initialize = async () => {
      try {
        // Update loading progress
        uiState.setLoadingProgress(10);

        // Initialize AI
        const aiInstance = new AI();
        await aiInstance.initialize();
        setAI(aiInstance);
        uiState.setLoadingProgress(60);

        // Initialize World
        const worldInstance = new World();
        await worldInstance.initialize();
        setWorld(worldInstance);
        uiState.setLoadingProgress(80);

        // Connect AI state to store
        aiInstance.onStateChange((state) => {
          aiState.updateState(state);
        });

        // Start auto-save
        aiInstance.startAutoSave(300000); // 5 minutes
        uiState.setLoadingProgress(100);

        // Start simulation
        setTimeout(() => {
          setIsInitialized(true);
          uiState.setLoading(false);
        }, 500);

      } catch (error) {
        console.error('Failed to initialize application:', error);
        uiState.setError('Failed to initialize application. Please refresh the page.');
        uiState.setLoading(false);
      }
    };

    initialize();

    return () => {
      if (ai) {
        ai.dispose();
      }
      if (world) {
        world.dispose();
      }
    };
  }, []);

  // Main simulation loop
  useEffect(() => {
    if (!isInitialized || !ai || !world) return;

    let animationFrameId: number;

    const simulationLoop = async () => {
      try {
        // Get sensory data from world
        const sensoryData = world.getSensoryData();

        if (sensoryData) {
          // Process through AI
          await ai.processPerception(sensoryData);

          // Generate actions
          const actions = await ai.generateActions();

          // Apply actions to world
          world.applyAIActions(actions);
        }

        // Update world state
        worldState.updateWorld(world.getWorldState());

        animationFrameId = requestAnimationFrame(simulationLoop);
      } catch (error) {
        console.error('Error in simulation loop:', error);
      }
    };

    simulationLoop();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isInitialized, ai, world, aiState, worldState]);

  // Handle save/load
  const handleSave = useCallback(async (slot: string) => {
    if (!ai) return;

    try {
      await ai.saveState(slot);
      uiState.showNotification('Game saved successfully!', 'success');
    } catch (error) {
      console.error('Save failed:', error);
      uiState.showNotification('Save failed!', 'error');
    }
  }, [ai, uiState]);

  const handleLoad = useCallback(async (slot: string) => {
    if (!ai) return;

    try {
      await ai.loadState(slot);
      uiState.showNotification('Game loaded successfully!', 'success');
    } catch (error) {
      console.error('Load failed:', error);
      uiState.showNotification('Load failed!', 'error');
    }
  }, [ai, uiState]);

  // Show mobile warning for small screens
  if (isMobile && window.innerWidth < 768) {
    return <MobileWarning />;
  }

  // Show loading screen
  if (!isInitialized || uiState.isLoading) {
    return <LoadingScreen progress={uiState.loadingProgress} />;
  }

  return (
    <div className="app">
      {/* 3D World Canvas */}
      <div className="world-container">
        <Canvas
          camera={{ position: [10, 10, 10], fov: 60 }}
          shadows
          gl={{
            antialias: !isMobile,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true
          }}
          onCreated={(state) => {
            // Optimize for performance
            if (isMobile) {
              state.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            }
          }}
        >
          <World3D world={world!} />

          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* Controls */}
          <OrbitControls
            enablePan={!isMobile}
            enableRotate={true}
            enableZoom={true}
            minDistance={5}
            maxDistance={50}
            maxPolarAngle={Math.PI * 0.45}
          />

          {/* Grid for reference */}
          <Grid
            args={[100, 100]}
            cellSize={5}
            cellThickness={0.5}
            cellColor="#6b7280"
            sectionSize={25}
            sectionThickness={1}
            sectionColor="#374151"
            fadeDistance={100}
            fadeStrength={1}
            infiniteGrid={true}
          />

          {/* Performance stats (desktop only) */}
          {!isMobile && <Stats showPanel={0} className="stats-panel" />}
        </Canvas>
      </div>

      {/* UI Panels */}
      <div className="ui-overlay">
        {/* Chat Panel */}
        <ChatPanel
          ai={ai!}
          onMessage={(message) => {
            if (ai && world) {
              // Process chat message through AI
              const languageInput = {
                words: message,
                timestamp: Date.now(),
                clientId: 'user'
              };

              // Add to sensory input
              const currentSensoryData = world.getSensoryData();
              if (currentSensoryData) {
                currentSensoryData.language = languageInput;
                ai.processPerception(currentSensoryData);
              }
            }
          }}
        />

        {/* Debug Panel */}
        {!isMobile && <DebugPanel ai={ai!} world={world!} />}

        {/* Control Panel */}
        <ControlPanel
          ai={ai!}
          world={world!}
          onSave={handleSave}
          onLoad={handleLoad}
        />

        {/* World Builder */}
        {uiState.showWorldBuilder && (
          <WorldBuilder
            world={world!}
            onClose={() => uiState.setShowWorldBuilder(false)}
          />
        )}

        {/* Notifications */}
        {uiState.notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type}`}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 1000,
              padding: '12px 20px',
              borderRadius: '8px',
              background: notification.type === 'success' ? '#10b981' :
                           notification.type === 'error' ? '#ef4444' : '#3b82f6',
              color: 'white',
              fontSize: '14px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            {notification.message}
          </div>
        ))}

        {/* Mobile Controls */}
        {isMobile && (
          <div className="mobile-controls">
            <button
              onClick={() => uiState.setShowDebugPanel(!uiState.showDebugPanel)}
              className="mobile-btn"
            >
              📊
            </button>
            <button
              onClick={() => uiState.setShowWorldBuilder(!uiState.showWorldBuilder)}
              className="mobile-btn"
            >
              🏗️
            </button>
            <button
              onClick={() => handleSave('mobile_autosave')}
              className="mobile-btn"
            >
              💾
            </button>
          </div>
        )}
      </div>

      {/* Performance optimization for mobile */}
      {isMobile && (
        <style>
          {`
            * {
              -webkit-tap-highlight-color: transparent;
            }

            .mobile-controls {
              position: fixed;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              display: flex;
              gap: 10px;
              z-index: 1000;
            }

            .mobile-btn {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              border: none;
              background: rgba(59, 130, 246, 0.9);
              color: white;
              font-size: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            .mobile-btn:active {
              transform: scale(0.95);
            }
          `}
        </style>
      )}
    </div>
  );
}

export default App;