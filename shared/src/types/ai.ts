// Core AI type definitions

// Sensory input types
export interface SensoryInput {
  vision: number[];
  touch: number[];
  sound: number[];
  smell: number[];
  taste: number[];
  proprioception: number[];
  language: LanguageInput | null;
  timestamp: number;
}

export interface LanguageInput {
  words: string;
  clientId?: string;
  timestamp: number;
}

export interface SensoryData {
  vision: number[];
  touch: number[];
  sound: number[];
  smell: number[];
  taste: number[];
  proprioception: number[];
  language?: LanguageInput;
  timestamp: number;
}

// Neural network types
export interface NeuralState {
  activations: Float32Array;
  weights: number[];
  learningRate: number;
  gradientNorm: number;
}

export interface NeuralOutput {
  actions: number[];
  internalState: Float32Array;
  predictions: number[];
  predictionError: number[];
  learningAdjustments: number;
}

// Emotion types
export interface Emotion {
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
  dimensions: number[]; // High-dimensional emotion space
  timestamp: number;
}

// Memory types
export interface Experience {
  id: string;
  timestamp: number;
  sensoryInput: SensoryInput;
  neuralOutput: NeuralOutput;
  emotions: Emotion;
  attention: Attention | null;
  curiosity: number;
  strength: number;
  recallCount: number;
  lastRecalled: number;
}

export interface SemanticMemory {
  id: string;
  concept: string;
  features: Float32Array;
  associations: string[];
  strength: number;
  createdAt: number;
  lastAccessed: number;
}

export interface WordAssociation {
  word: string;
  target: string;
  targetFeatures: Float32Array;
  strength: number;
  contexts: string[];
  lastConfirmed: number;
}

// Language types
export interface Thought {
  id: string;
  type: 'abstract' | 'linguistic';
  content: string;
  properties: {
    complexity: number;
    coherence: number;
    novelty: number;
    emotionalTone: 'positive' | 'negative' | 'neutral';
    confidence: number;
    vocabularyUsed?: string[];
  };
  timestamp: number;
}

// Attention and curiosity
export interface Attention {
  target: {
    id: string;
    features: Float32Array;
    type: string;
  };
  intensity: number;
  novelty: number;
  informationGain: number;
  timestamp: number;
}

export interface ExplorationTarget {
  id: string;
  features: Float32Array;
  novelty: number;
  informationGain: number;
  accessibility: number;
  lastVisited: number;
}

// Motor commands
export interface MotorCommand {
  id: string;
  type: 'movement' | 'manipulation' | 'communication' | 'expression' | 'gesture';
  parameters: Record<string, any>;
  priority: number;
  timestamp: number;
}

// AI state
export interface AIState {
  id: string;
  createdAt: number;
  age: number;
  totalExperiences: number;
  emotions: Emotion;
  thoughts: Thought[];
  attention: Attention | null;
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
}

// Language system state
export interface LanguageState {
  vocabularySize: number;
  grammarPatterns: number;
  comprehensionLevel: number;
  totalWordUsage: number;
  productionsGenerated: number;
}

// Memory system state
export interface MemoryState {
  episodicCount: number;
  semanticCount: number;
  lastSave: number;
  averageStrength: number;
}

// AI configuration
export interface AIConfig {
  learningRate: number;
  batchSize: number;
  epochs: number;
  memoryDecayRate: number;
  consolidationInterval: number;
  maxEpisodicMemories: number;
  curiosityThreshold: number;
  explorationBias: number;
}