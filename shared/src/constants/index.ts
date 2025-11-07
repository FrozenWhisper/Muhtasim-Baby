// Shared constants for the Conscious AI system

// Network dimensions
export const NETWORK_DIMENSIONS = {
  INPUT_SIZE: 300,
  HIDDEN_LAYERS: [512, 256, 128, 64],
  OUTPUT_SIZE: 150
} as const;

// Sensory dimensions
export const SENSORY_DIMENSIONS = {
  VISION: 120,
  TOUCH: 60,
  SOUND: 40,
  SMELL: 30,
  TASTE: 30,
  PROPRIOCEPTION: 20
} as const;

// Emotion system constants
export const EMOTION = {
  VALENCE_RANGE: [-1, 1] as const,
  AROUSAL_RANGE: [0, 1] as const,
  DIMENSION_COUNT: 8,
  UPDATE_FREQUENCY: 10, // Hz
  DECAY_RATE: 0.001
} as const;

// Memory system constants
export const MEMORY = {
  EPISODIC_DETAIL_LEVEL: 50,
  SEMANTIC_VECTOR_SIZE: 128,
  ASSOCIATION_THRESHOLD: 0.7,
  RECONSTRUCTION_NOISE: 0.1,
  DECAY_RATE: 0.001,
  CONSOLIDATION_INTERVAL: 300000, // 5 minutes
  MAX_EPISODIC_MEMORIES: 10000
} as const;

// Language system constants
export const LANGUAGE = {
  VOCABULARY_SIZE_LIMIT: 10000,
  WORD_ASSOCIATION_THRESHOLD: 0.5,
  SYNTACTIC_COMPLEXITY_LIMIT: 10,
  SEMANTIC_VECTOR_SIZE: 64,
  COMPREHENSION_UPDATE_RATE: 0.1,
  CONTEXT_HISTORY_SIZE: 1000
} as const;

// Curiosity system constants
export const CURIOSITY = {
  NOVELTY_THRESHOLD: 0.3,
  EXPLORATION_BIAS: 0.6,
  ATTENTION_SPAN: 5000, // milliseconds
  DISCOUNT_RATE: 0.95,
  DECAY_RATE: 0.0001,
  MAX_TARGETS: 100
} as const;

// Physics constants
export const PHYSICS = {
  GRAVITY: -9.81,
  DEFAULT_FRICTION: 0.4,
  DEFAULT_RESTITUTION: 0.3,
  TIME_STEP: 1 / 60,
  MAX_SUB_STEPS: 3,
  WORLD_SIZE: { x: 100, y: 50, z: 100 },
  AI_RADIUS: 1,
  AI_HEIGHT: 2,
  MAX_OBJECTS: 100,
  VISION_DISTANCE: 20,
  RAYCAST_COUNT: 20
} as const;

// Material properties
export const MATERIALS = {
  DEFAULT: {
    friction: 0.4,
    restitution: 0.3,
    density: 1000
  },
  RUBBER: {
    friction: 0.8,
    restitution: 0.9,
    density: 1200
  },
  METAL: {
    friction: 0.3,
    restitution: 0.1,
    density: 7800
  },
  WOOD: {
    friction: 0.5,
    restitution: 0.4,
    density: 700
  },
  GLASS: {
    friction: 0.2,
    restitution: 0.05,
    density: 2500
  }
} as const;

// Object types
export const OBJECT_TYPES = {
  SPHERE: 'sphere',
  BOX: 'box',
  CYLINDER: 'cylinder',
  GROUND: 'ground',
  PLANE: 'plane',
  WALL: 'wall'
} as const;

// Color palette
export const COLORS = {
  PRIMARY: {
    RED: '#ff6b6b',
    BLUE: '#4dabf7',
    GREEN: '#51cf66',
    YELLOW: '#ffd43b',
    PURPLE: '#9775fa',
    ORANGE: '#ff922b'
  },
  NEUTRAL: {
    WHITE: '#ffffff',
    BLACK: '#212529',
    GRAY: '#868e96',
    LIGHT_GRAY: '#f1f3f5'
  },
  ENVIRONMENT: {
    GROUND: '#4a5f3a',
    SKY: '#87ceeb',
    WALLS: '#333333'
  },
  EMOTIONAL: {
    HAPPY: '#ffd43b',
    SAD: '#74c0fc',
    ANGRY: '#ff6b6b',
    FEARFUL: '#9775fa',
    SURPRISED: '#ff922b',
    CALM: '#51cf66'
  }
} as const;

// WebSocket events
export const WEBSOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',

  // AI State
  AI_STATE_INITIAL: 'ai_state_initial',
  AI_STATE_UPDATE: 'ai_state_update',

  // World State
  WORLD_STATE_INITIAL: 'world_state_initial',
  WORLD_STATE_UPDATE: 'world_state_update',

  // Chat
  CHAT_MESSAGE: 'chat_message',
  CHAT_MESSAGE_BROADCAST: 'chat_message_broadcast',

  // World Manipulation
  WORLD_CREATE_OBJECT: 'world_create_object',
  WORLD_REMOVE_OBJECT: 'world_remove_object',
  WORLD_UPDATE_OBJECT: 'world_update_object',
  WORLD_OBJECT_ADDED: 'world_object_added',
  WORLD_OBJECT_REMOVED: 'world_object_removed',
  WORLD_OBJECT_UPDATED: 'world_object_updated',

  // Simulation Control
  SIMULATION_CONTROL: 'simulation_control',
  SIMULATION_STATE_CHANGED: 'simulation_state_changed',

  // Save/Load
  SAVE_STATE: 'save_state',
  LOAD_STATE: 'load_state',
  SAVE_SUCCESS: 'save_success',
  SAVE_ERROR: 'save_error',
  LOAD_SUCCESS: 'load_success',
  LOAD_ERROR: 'load_error',

  // Subscriptions
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  SUBSCRIPTION_UPDATED: 'subscription_updated',

  // Performance
  PERFORMANCE_UPDATE: 'performance_update',

  // System
  CLIENT_COUNT_CHANGED: 'client_count_changed',
  SERVER_SHUTDOWN: 'server_shutdown'
} as const;

// Validation constants
export const VALIDATION = {
  MESSAGE_MAX_LENGTH: 1000,
  OBJECT_NAME_MAX_LENGTH: 50,
  SLOT_NAME_MAX_LENGTH: 20,
  MAX_OBJECTS_PER_CLIENT: 10,
  RATE_LIMIT: {
    MESSAGES_PER_MINUTE: 60,
    OBJECT_ACTIONS_PER_MINUTE: 30,
    SAVE_LOADS_PER_HOUR: 10
  }
} as const;

// Error codes
export const ERROR_CODES = {
  // Connection errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Validation errors
  INVALID_DATA: 'INVALID_DATA',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_VALUE: 'INVALID_VALUE',

  // System errors
  AI_SYSTEM_ERROR: 'AI_SYSTEM_ERROR',
  WORLD_ERROR: 'WORLD_ERROR',
  SAVE_ERROR: 'SAVE_ERROR',
  LOAD_ERROR: 'LOAD_ERROR',

  // Resource errors
  MEMORY_LIMIT: 'MEMORY_LIMIT',
  OBJECT_LIMIT: 'OBJECT_LIMIT',
  PROCESSING_ERROR: 'PROCESSING_ERROR'
} as const;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  FPS_WARNING: 30,
  FPS_CRITICAL: 15,
  MEMORY_WARNING: 0.8, // 80% of available memory
  MEMORY_CRITICAL: 0.95, // 95% of available memory
  LATENCY_WARNING: 100, // ms
  LATENCY_CRITICAL: 500 // ms
} as const;

// Development vs Production
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
} as const;

// Logging levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;

// File paths and directories
export const PATHS = {
  DATA: 'data',
  SAVES: 'data/saves',
  BACKUPS: 'data/saves/backups',
  LOGS: 'logs',
  MODELS: 'data/models',
  MEMORY: 'data/memory'
} as const;

// Time constants
export const TIME = {
  MILLISECOND: 1,
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000
} as const;

// Math constants
export const MATH = {
  PI: Math.PI,
  TWO_PI: Math.PI * 2,
  HALF_PI: Math.PI / 2,
  EPSILON: Number.EPSILON,
  SQRT_2: Math.SQRT2,
  SQRT_3: Math.sqrt(3)
} as const;

// Animation and interpolation
export const ANIMATION = {
  DEFAULT_DURATION: 300, // ms
  FAST_DURATION: 150,
  SLOW_DURATION: 600,
  EASING_FUNCTIONS: {
    LINEAR: 'linear',
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out'
  }
} as const;

// UI Constants
export const UI = {
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1200
  },
  PANEL_SIZES: {
    CHAT_WIDTH: 300,
    DEBUG_WIDTH: 350,
    CONTROL_HEIGHT: 200
  },
  COLORS: {
    PRIMARY: '#1890ff',
    SUCCESS: '#52c41a',
    WARNING: '#faad14',
    ERROR: '#ff4d4f',
    INFO: '#1890ff'
  }
} as const;