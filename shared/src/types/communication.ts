// Communication protocol type definitions

// Base socket event structure
export interface SocketEvent {
  event: string;
  data: any;
  timestamp: number;
  clientId?: string;
}

// Client to Server events
export interface ClientToServerEvents {
  // Connection
  'ping': () => void;

  // Chat
  'chat_message': (data: ChatMessageData) => void;

  // World manipulation
  'world_create_object': (data: CreateObjectData) => void;
  'world_remove_object': (data: RemoveObjectData) => void;
  'world_update_object': (data: UpdateObjectData) => void;

  // Simulation control
  'simulation_control': (data: SimulationControlData) => void;

  // Save/Load
  'save_state': (data: SaveStateData) => void;
  'load_state': (data: LoadStateData) => void;
  'get_save_slots': () => void;

  // Subscriptions
  'subscribe': (data: SubscribeData) => void;
  'unsubscribe': (data: UnsubscribeData) => void;

  // World builder
  'world_builder_start': () => void;
  'world_builder_stop': () => void;
  'world_builder_preview': (data: PreviewObjectData) => void;
}

// Server to Client events
export interface ServerToClientEvents {
  // Connection
  'pong': (data: PongData) => void;
  'connected': (data: ConnectedData) => void;
  'disconnected': (data: DisconnectedData) => void;
  'error': (data: ErrorData) => void;

  // Initial state
  'ai_state_initial': (data: AIStateData) => void;
  'world_state_initial': (data: WorldStateData) => void;
  'config': (data: ConfigData) => void;

  // Updates
  'ai_state_update': (data: AIStateUpdateData) => void;
  'world_state_update': (data: WorldStateUpdateData) => void;
  'performance_update': (data: PerformanceUpdateData) => void;

  // Chat
  'chat_message_broadcast': (data: ChatMessageBroadcastData) => void;

  // World events
  'world_object_added': (data: WorldObjectAddedData) => void;
  'world_object_removed': (data: WorldObjectRemovedData) => void;
  'world_object_updated': (data: WorldObjectUpdatedData) => void;

  // Simulation control responses
  'simulation_control_success': (data: SimulationControlSuccessData) => void;
  'simulation_control_error': (data: SimulationControlErrorData) => void;
  'simulation_state_changed': (data: SimulationStateChangedData) => void;

  // World manipulation responses
  'world_create_success': (data: WorldCreateSuccessData) => void;
  'world_create_error': (data: WorldCreateErrorData) => void;
  'world_remove_success': (data: WorldRemoveSuccessData) => void;
  'world_remove_error': (data: WorldRemoveErrorData) => void;

  // Save/Load responses
  'save_success': (data: SaveSuccessData) => void;
  'save_error': (data: SaveErrorData) => void;
  'load_success': (data: LoadSuccessData) => void;
  'load_error': (data: LoadErrorData) => void;
  'state_saved': (data: StateSavedData) => void;
  'state_loaded': (data: StateLoadedData) => void;
  'save_slots_response': (data: SaveSlotsResponseData) => void;

  // Subscriptions
  'subscription_updated': (data: SubscriptionUpdatedData) => void;

  // System events
  'client_count_changed': (data: ClientCountChangedData) => void;
  'server_shutdown': (data: ServerShutdownData) => void;
}

// Event data types
export interface ChatMessageData {
  message: string;
  timestamp?: number;
}

export interface ChatMessageBroadcastData extends ChatMessageData {
  clientId: string;
  fromUser: boolean;
  timestamp: number;
}

export interface CreateObjectData {
  type: string;
  position: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  color?: string;
  mass?: number;
  material?: string;
}

export interface RemoveObjectData {
  objectId: string;
}

export interface UpdateObjectData {
  objectId: string;
  updates: Partial<{
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    color: string;
    visible: boolean;
  }>;
}

export interface SimulationControlData {
  action: 'play' | 'pause' | 'speed' | 'reset';
  speed?: number;
}

export interface SaveStateData {
  slot?: string;
}

export interface LoadStateData {
  slot: string;
}

export interface SubscribeData {
  events: string[];
}

export interface UnsubscribeData {
  events: string[];
}

export interface PreviewObjectData {
  type: string;
  position: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  color?: string;
}

// Response data types
export interface PongData {
  timestamp: number;
}

export interface ConnectedData {
  clientId: string;
  serverTime: number;
  totalClients: number;
}

export interface DisconnectedData {
  reason?: string;
  timestamp: number;
}

export interface ErrorData {
  message: string;
  code?: string;
  timestamp: number;
}

export interface AIStateData {
  id: string;
  age: number;
  totalExperiences: number;
  emotions: {
    valence: number;
    arousal: number;
    dimensions: number[];
  };
  curiosity: number;
  learning: {
    rate: number;
    totalAdjustments: number;
  };
  memory: {
    episodicCount: number;
    semanticCount: number;
    vocabularySize: number;
  };
  language: {
    currentThought: string | null;
    comprehensionLevel: number;
  };
  timestamp: number;
}

export interface WorldStateData {
  time: number;
  objects: any[];
  aiPosition: { x: number; y: number; z: number } | null;
  objectCount: number;
  timestamp: number;
}

export interface ConfigData {
  updateFrequency: number;
  simulationRunning: boolean;
  maxObjects: number;
  worldSize: { x: number; y: number; z: number };
}

export interface AIStateUpdateData {
  emotions: {
    valence: number;
    arousal: number;
    dimensions: number[];
  };
  thoughts: any[];
  attention: any;
  curiosity: number;
  memory: {
    episodicCount: number;
    semanticCount: number;
    vocabularySize: number;
  };
  language: {
    currentThought: string | null;
    comprehensionLevel: number;
  };
  timestamp: number;
}

export interface WorldStateUpdateData {
  time: number;
  aiPosition: { x: number; y: number; z: number } | null;
  objectCount: number;
  timestamp: number;
}

export interface PerformanceUpdateData {
  simulationTime: number;
  objectCount: number;
  clientCount: number;
  memoryCount: number;
  curiosityLevel: number;
  vocabularySize: number;
  fps?: number;
  timestamp: number;
}

export interface WorldObjectAddedData {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  mass: number;
  isStatic: boolean;
  visible: boolean;
  timestamp: number;
}

export interface WorldObjectRemovedData {
  objectId: string;
  timestamp: number;
}

export interface WorldObjectUpdatedData {
  objectId: string;
  updates: any;
  timestamp: number;
}

export interface SimulationControlSuccessData {
  action: string;
  speed?: number;
  timestamp: number;
}

export interface SimulationControlErrorData {
  message: string;
  action: string;
  timestamp: number;
}

export interface SimulationStateChangedData {
  running: boolean;
  speed?: number;
  timestamp: number;
}

export interface WorldCreateSuccessData {
  objectId: string;
  timestamp: number;
}

export interface WorldCreateErrorData {
  message: string;
  timestamp: number;
}

export interface WorldRemoveSuccessData {
  objectId: string;
  timestamp: number;
}

export interface WorldRemoveErrorData {
  message: string;
  objectId: string;
  timestamp: number;
}

export interface SaveSuccessData {
  slot: string;
  timestamp: number;
}

export interface SaveErrorData {
  message: string;
  slot?: string;
  timestamp: number;
}

export interface LoadSuccessData {
  slot: string;
  timestamp: number;
}

export interface LoadErrorData {
  message: string;
  slot: string;
  timestamp: number;
}

export interface StateSavedData {
  slot: string;
  timestamp: number;
}

export interface StateLoadedData {
  slot: string;
  timestamp: number;
}

export interface SaveSlotsResponseData {
  slots: Array<{
    name: string;
    createdAt: number;
    lastModified: number;
    size: number;
    experiences: number;
    vocabularySize: number;
    playtime: number;
  }>;
  timestamp: number;
}

export interface SubscriptionUpdatedData {
  events: string[];
  subscribed: boolean;
  timestamp: number;
}

export interface ClientCountChangedData {
  count: number;
  timestamp: number;
}

export interface ServerShutdownData {
  reason: string;
  timestamp: number;
  countdown?: number;
}

// Validation types
export interface EventValidationError {
  field: string;
  message: string;
  receivedValue: any;
  expectedType?: string;
}

export interface EventValidationResult {
  isValid: boolean;
  errors: EventValidationError[];
}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Connection health
export interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'disconnected';
  latency: number;
  uptime: number;
  lastPing: number;
  messagesPerSecond: number;
}

// Message queuing
export interface QueuedMessage {
  id: string;
  event: string;
  data: any;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
}

// Connection metadata
export interface ConnectionMetadata {
  clientId: string;
  connectedAt: number;
  userAgent?: string;
  ip?: string;
  subscriptions: Set<string>;
  messageCount: number;
  lastActivity: number;
}