import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema
const configSchema = z.object({
  // Server
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // AI Configuration
  UPDATE_FREQUENCY: z.string().transform(Number).default('60'),
  NEURAL_LEARNING_RATE: z.string().transform(Number).default('0.001'),
  NEURAL_BATCH_SIZE: z.string().transform(Number).default('32'),
  NEURAL_EPOCHS: z.string().transform(Number).default('1'),

  // Memory Configuration
  MEMORY_DECAY_RATE: z.string().transform(Number).default('0.001'),
  MEMORY_CONSOLIDATION_INTERVAL: z.string().transform(Number).default('300000'),
  MAX_EPISODIC_MEMORIES: z.string().transform(Number).default('10000'),

  // Physics Configuration
  GRAVITY: z.string().transform(Number).default('-9.81'),
  PHYSICS_TIMESTEP: z.string().transform(Number).default('1/60'),
  MAX_OBJECTS: z.string().transform(Number).default('100'),

  // Persistence Configuration
  AUTO_SAVE_INTERVAL: z.string().transform(Number).default('300000'),
  MAX_SAVE_SLOTS: z.string().transform(Number).default('10'),
  BACKUP_COUNT: z.string().transform(Number).default('5'),

  // TensorFlow Configuration
  TF_BACKEND: z.string().default('tensorflow'),
  TF_GPU_MEMORY_GROWTH: z.string().transform(Boolean).default('true'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log')
});

// Validate and export configuration
export const config = configSchema.parse(process.env);

// Derived constants
export const CONSTANTS = {
  // Neural Network Architecture
  NETWORK_DIMENSIONS: {
    INPUT_SIZE: 300,      // Multi-sensory input vector
    HIDDEN_LAYERS: [512, 256, 128, 64],
    OUTPUT_SIZE: 150      // Action and internal state vector
  },

  // Sensory Input Dimensions
  SENSORY_DIMENSIONS: {
    VISION: 120,          // Visual perception (raycasting results)
    TOUCH: 60,            // Tactile feedback (collision data)
    SOUND: 40,            // Audio perception
    SMELL: 30,            // Chemical sensors
    TASTE: 30,            // Taste simulation
    PROPRIOCEPTION: 20    // Body position and movement
  },

  // Emotion System
  EMOTION: {
    VALENCE_RANGE: [-1, 1] as const,     // Positive to negative
    AROUSAL_RANGE: [0, 1] as const,      // Calm to excited
    DIMENSION_COUNT: 8                   // Internal emotion dimensions
  },

  // Memory System
  MEMORY: {
    EPISODIC_DETAIL_LEVEL: 50,           // Vector size for episodic details
    SEMANTIC_VECTOR_SIZE: 128,           // Semantic memory embedding size
    ASSOCIATION_THRESHOLD: 0.7,          // Minimum similarity for association
    RECONSTRUCTION_NOISE: 0.1            // Noise level for memory reconstruction
  },

  // Physics
  PHYSICS: {
    WORLD_SIZE: { x: 100, y: 50, z: 100 },
    AI_RADIUS: 1,
    AI_HEIGHT: 2,
    DEFAULT_MATERIAL: {
      friction: 0.4,
      restitution: 0.3,
      density: 1000
    }
  },

  // Curiosity System
  CURIOSITY: {
    NOVELTY_THRESHOLD: 0.3,             // Minimum prediction error for novelty
    EXPLORATION_BIAS: 0.6,              // Tendency to explore vs exploit
    ATTENTION_SPAN: 5000,               // milliseconds
    DISCOUNT_RATE: 0.95                 // Future curiosity discount
  },

  // Language System
  LANGUAGE: {
    VOCABULARY_SIZE_LIMIT: 10000,
    WORD_ASSOCIATION_THRESHOLD: 0.5,
    SYNTACTIC_COMPLEXITY_LIMIT: 10,
    SEMANTIC_VECTOR_SIZE: 64
  }
} as const;

// Validation helper
export function validateConfig(): boolean {
  try {
    configSchema.parse(process.env);
    return true;
  } catch (error) {
    console.error('Configuration validation failed:', error);
    return false;
  }
}

export default config;