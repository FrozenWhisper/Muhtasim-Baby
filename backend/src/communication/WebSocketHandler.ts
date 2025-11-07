import { Server, Socket } from 'socket.io';
import { AI } from '../ai/AI.js';
import { World } from '../world/World.js';
import { config } from '../config/index.js';
import { aiLogger, worldLogger } from '../utils/logger.js';

interface ClientData {
  id: string;
  connectedAt: number;
  lastPing: number;
  subscriptions: Set<string>;
}

export class WebSocketHandler {
  private io: Server;
  private ai: AI;
  private world: World;
  private clients: Map<string, ClientData> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isSimulationRunning: boolean = true;

  constructor(io: Server, ai: AI, world: World) {
    this.io = io;
    this.ai = ai;
    this.world = world;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleClientConnection(socket);
    });

    // Start AI update loop
    this.startAIUpdateLoop();

    // Start world update loop
    this.startWorldUpdateLoop();

    aiLogger.info('WebSocket handler initialized');
  }

  private handleClientConnection(socket: Socket): void {
    const clientData: ClientData = {
      id: socket.id,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      subscriptions: new Set(['ai_state', 'world_state'])
    };

    this.clients.set(socket.id, clientData);

    aiLogger.info('Client connected', {
      clientId: socket.id,
      totalClients: this.clients.size
    });

    // Send initial state
    this.sendInitialState(socket);

    // Set up client-specific event handlers
    this.setupClientEventHandlers(socket);

    // Set up update interval for this client
    this.setupClientUpdates(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleClientDisconnection(socket.id);
    });
  }

  private sendInitialState(socket: Socket): void {
    try {
      // Send AI initial state
      const aiState = this.ai.getState();
      socket.emit('ai_state_initial', aiState);

      // Send world initial state
      const worldState = this.world.getWorldState();
      socket.emit('world_state_initial', worldState);

      // Send configuration
      socket.emit('config', {
        updateFrequency: config.UPDATE_FREQUENCY,
        simulationRunning: this.isSimulationRunning
      });

    } catch (error) {
      aiLogger.error('Error sending initial state:', error);
    }
  }

  private setupClientEventHandlers(socket: Socket): void {
    // Chat messages
    socket.on('chat_message', (data) => {
      this.handleChatMessage(socket, data);
    });

    // World building
    socket.on('world_create_object', (data) => {
      this.handleWorldCreateObject(socket, data);
    });

    socket.on('world_remove_object', (data) => {
      this.handleWorldRemoveObject(socket, data);
    });

    // Simulation control
    socket.on('simulation_control', (data) => {
      this.handleSimulationControl(socket, data);
    });

    // Save/Load
    socket.on('save_state', (data) => {
      this.handleSaveState(socket, data);
    });

    socket.on('load_state', (data) => {
      this.handleLoadState(socket, data);
    });

    // Subscription management
    socket.on('subscribe', (data) => {
      this.handleSubscription(socket, data, true);
    });

    socket.on('unsubscribe', (data) => {
      this.handleSubscription(socket, data, false);
    });

    // Ping/Pong for connection health
    socket.on('ping', () => {
      const clientData = this.clients.get(socket.id);
      if (clientData) {
        clientData.lastPing = Date.now();
        socket.emit('pong', { timestamp: Date.now() });
      }
    });
  }

  private handleChatMessage(socket: Socket, data: { message: string }): void {
    try {
      const { message } = data;

      aiLogger.info('Received chat message', {
        clientId: socket.id,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
      });

      // Process message through AI language system
      // This would be integrated with AI perception
      const languageInput = {
        words: message,
        timestamp: Date.now(),
        clientId: socket.id
      };

      // Broadcast message to all clients
      this.io.emit('chat_message_broadcast', {
        message,
        clientId: socket.id,
        timestamp: Date.now(),
        fromUser: true
      });

      // TODO: Process through AI system
      // this.ai.processLanguageInput(languageInput);

    } catch (error) {
      aiLogger.error('Error handling chat message:', error);
      socket.emit('error', { message: 'Failed to process chat message' });
    }
  }

  private handleWorldCreateObject(socket: Socket, data: any): void {
    try {
      aiLogger.info('Creating world object', {
        clientId: socket.id,
        objectType: data.type,
        position: data.position
      });

      const worldObject = this.world.addObject(data);

      if (worldObject) {
        // Broadcast new object to all clients
        this.io.emit('world_object_added', worldObject);

        socket.emit('world_create_success', {
          objectId: worldObject.id,
          timestamp: Date.now()
        });
      } else {
        socket.emit('world_create_error', {
          message: 'Failed to create object',
          timestamp: Date.now()
        });
      }

    } catch (error) {
      aiLogger.error('Error creating world object:', error);
      socket.emit('world_create_error', {
        message: 'Server error while creating object',
        timestamp: Date.now()
      });
    }
  }

  private handleWorldRemoveObject(socket: Socket, data: { objectId: string }): void {
    try {
      const { objectId } = data;

      aiLogger.info('Removing world object', {
        clientId: socket.id,
        objectId
      });

      const success = this.world.removeObject(objectId);

      if (success) {
        // Broadcast removal to all clients
        this.io.emit('world_object_removed', { objectId });

        socket.emit('world_remove_success', {
          objectId,
          timestamp: Date.now()
        });
      } else {
        socket.emit('world_remove_error', {
          message: 'Object not found',
          objectId,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      aiLogger.error('Error removing world object:', error);
      socket.emit('world_remove_error', {
        message: 'Server error while removing object',
        objectId: data.objectId,
        timestamp: Date.now()
      });
    }
  }

  private handleSimulationControl(socket: Socket, data: { action: string; speed?: number }): void {
    try {
      const { action, speed } = data;

      aiLogger.info('Simulation control request', {
        clientId: socket.id,
        action,
        speed
      });

      switch (action) {
        case 'play':
          this.isSimulationRunning = true;
          break;

        case 'pause':
          this.isSimulationRunning = false;
          break;

        case 'speed':
          if (speed !== undefined) {
            // TODO: Implement speed control
            aiLogger.info('Speed control requested', { speed });
          }
          break;

        default:
          socket.emit('error', { message: 'Unknown simulation control action' });
          return;
      }

      // Broadcast simulation state change
      this.io.emit('simulation_state_changed', {
        running: this.isSimulationRunning,
        timestamp: Date.now()
      });

      socket.emit('simulation_control_success', {
        action,
        timestamp: Date.now()
      });

    } catch (error) {
      aiLogger.error('Error handling simulation control:', error);
      socket.emit('error', { message: 'Failed to control simulation' });
    }
  }

  private handleSaveState(socket: Socket, data: { slot?: string }): void {
    try {
      const slot = data.slot || 'manual_save';

      aiLogger.info('Saving state', {
        clientId: socket.id,
        slot
      });

      this.ai.saveState(slot)
        .then(() => {
          socket.emit('save_success', {
            slot,
            timestamp: Date.now()
          });

          // Broadcast save event to all clients
          this.io.emit('state_saved', {
            slot,
            timestamp: Date.now()
          });
        })
        .catch((error) => {
          aiLogger.error('Error saving state:', error);
          socket.emit('save_error', {
            message: 'Failed to save state',
            slot,
            timestamp: Date.now()
          });
        });

    } catch (error) {
      aiLogger.error('Error handling save state:', error);
      socket.emit('save_error', {
        message: 'Server error while saving',
        timestamp: Date.now()
      });
    }
  }

  private handleLoadState(socket: Socket, data: { slot: string }): void {
    try {
      const { slot } = data;

      aiLogger.info('Loading state', {
        clientId: socket.id,
        slot
      });

      this.ai.loadState(slot)
        .then(() => {
          socket.emit('load_success', {
            slot,
            timestamp: Date.now()
          });

          // Send updated AI state to all clients
          const aiState = this.ai.getState();
          this.io.emit('ai_state_update', aiState);

          // Broadcast load event to all clients
          this.io.emit('state_loaded', {
            slot,
            timestamp: Date.now()
          });
        })
        .catch((error) => {
          aiLogger.error('Error loading state:', error);
          socket.emit('load_error', {
            message: 'Failed to load state',
            slot,
            timestamp: Date.now()
          });
        });

    } catch (error) {
      aiLogger.error('Error handling load state:', error);
      socket.emit('load_error', {
        message: 'Server error while loading',
        timestamp: Date.now()
      });
    }
  }

  private handleSubscription(socket: Socket, data: { events: string[] }, subscribe: boolean): void {
    try {
      const clientData = this.clients.get(socket.id);
      if (!clientData) return;

      const { events } = data;

      for (const event of events) {
        if (subscribe) {
          clientData.subscriptions.add(event);
        } else {
          clientData.subscriptions.delete(event);
        }
      }

      socket.emit('subscription_updated', {
        events,
        subscribed: subscribe,
        timestamp: Date.now()
      });

    } catch (error) {
      aiLogger.error('Error handling subscription:', error);
    }
  }

  private setupClientUpdates(socket: Socket): void {
    const updateInterval = setInterval(() => {
      const clientData = this.clients.get(socket.id);
      if (!clientData) {
        clearInterval(updateInterval);
        return;
      }

      // Check if client is still responsive
      if (Date.now() - clientData.lastPing > 30000) { // 30 second timeout
        aiLogger.warn('Client unresponsive, disconnecting', { clientId: socket.id });
        socket.disconnect();
        return;
      }

      // Send updates based on subscriptions
      this.sendClientUpdates(socket, clientData);

    }, 1000 / config.UPDATE_FREQUENCY);

    this.updateIntervals.set(socket.id, updateInterval);
  }

  private sendClientUpdates(socket: Socket, clientData: ClientData): void {
    try {
      // AI state updates
      if (clientData.subscriptions.has('ai_state')) {
        const aiState = this.ai.getState();
        socket.emit('ai_state_update', {
          emotions: aiState.emotions,
          thoughts: aiState.thoughts,
          attention: aiState.attention,
          curiosity: aiState.curiosity,
          memory: aiState.memory,
          language: aiState.language,
          timestamp: Date.now()
        });
      }

      // World state updates
      if (clientData.subscriptions.has('world_state')) {
        const worldState = this.world.getWorldState();
        socket.emit('world_state_update', {
          time: worldState.time,
          objects: worldState.objects,
          aiPosition: worldState.aiPosition,
          timestamp: Date.now()
        });
      }

      // Performance updates
      if (clientData.subscriptions.has('performance')) {
        const performanceStats = this.getPerformanceStats();
        socket.emit('performance_update', performanceStats);
      }

    } catch (error) {
      aiLogger.error('Error sending client updates:', error);
    }
  }

  private startAIUpdateLoop(): void {
    setInterval(() => {
      if (!this.isSimulationRunning) return;

      try {
        // Get sensory data from world
        const sensoryData = this.world.getSensoryData();
        if (sensoryData) {
          // Process through AI
          this.ai.processPerception(sensoryData)
            .then(() => {
              // Generate actions
              return this.ai.generateActions();
            })
            .then((actions) => {
              // Apply actions to world
              this.applyAIActions(actions);
            })
            .catch((error) => {
              aiLogger.error('Error in AI update loop:', error);
            });
        }

      } catch (error) {
        aiLogger.error('Error in AI update loop:', error);
      }

    }, 1000 / config.UPDATE_FREQUENCY);
  }

  private startWorldUpdateLoop(): void {
    setInterval(() => {
      if (!this.isSimulationRunning) return;

      try {
        // World updates are handled by the world's internal simulation loop
        // This is mainly for broadcasting world state changes

        const worldState = this.world.getWorldState();

        // Broadcast to clients subscribed to world updates
        this.clients.forEach((clientData, clientId) => {
          if (clientData.subscriptions.has('world_state')) {
            this.io.to(clientId).emit('world_state_update', {
              time: worldState.time,
              aiPosition: worldState.aiPosition,
              objectCount: worldState.objectCount,
              timestamp: Date.now()
            });
          }
        });

      } catch (error) {
        worldLogger.error('Error in world update loop:', error);
      }

    }, 1000 / config.UPDATE_FREQUENCY);
  }

  private applyAIActions(actions: any[]): void {
    try {
      for (const action of actions) {
        switch (action.type) {
          case 'movement':
            this.world.applyAIMovement(action.parameters);
            break;

          case 'jump':
            this.world.applyAIJump(action.parameters.force || 10);
            break;

          case 'manipulation':
            // TODO: Implement object manipulation
            break;

          default:
            aiLogger.debug('Unknown AI action type', { type: action.type });
        }
      }

    } catch (error) {
      aiLogger.error('Error applying AI actions:', error);
    }
  }

  private getPerformanceStats(): any {
    try {
      return {
        simulationTime: this.world.getSimulationTime(),
        objectCount: this.world.getObjectCount(),
        clientCount: this.clients.size,
        memoryCount: this.ai.getMemoryCount(),
        curiosityLevel: this.ai.getCuriosityLevel(),
        vocabularySize: this.ai.getVocabularySize(),
        timestamp: Date.now()
      };

    } catch (error) {
      aiLogger.error('Error getting performance stats:', error);
      return {};
    }
  }

  private handleClientDisconnection(clientId: string): void {
    try {
      // Clean up client data
      this.clients.delete(clientId);

      // Clear update interval
      const updateInterval = this.updateIntervals.get(clientId);
      if (updateInterval) {
        clearInterval(updateInterval);
        this.updateIntervals.delete(clientId);
      }

      aiLogger.info('Client disconnected', {
        clientId,
        remainingClients: this.clients.size
      });

      // Broadcast client count change
      this.io.emit('client_count_changed', {
        count: this.clients.size,
        timestamp: Date.now()
      });

    } catch (error) {
      aiLogger.error('Error handling client disconnection:', error);
    }
  }

  // Public methods
  broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  broadcastToSubscribers(event: string, data: any, subscription: string): void {
    this.clients.forEach((clientData, clientId) => {
      if (clientData.subscriptions.has(subscription)) {
        this.io.to(clientId).emit(event, data);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  dispose(): void {
    try {
      // Clear all update intervals
      for (const interval of this.updateIntervals.values()) {
        clearInterval(interval);
      }
      this.updateIntervals.clear();

      // Disconnect all clients
      this.io.disconnectSockets();

      // Clear client data
      this.clients.clear();

      aiLogger.info('WebSocket handler disposed');

    } catch (error) {
      aiLogger.error('Error disposing WebSocket handler:', error);
    }
  }
}