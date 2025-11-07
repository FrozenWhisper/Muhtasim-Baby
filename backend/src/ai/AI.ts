import * as tf from '@tensorflow/tfjs-node';
import { config, CONSTANTS } from '../config/index.js';
import { Brain } from './Brain.js';
import { SensorySystem } from './SensorySystem.js';
import { MotorSystem } from './MotorSystem.js';
import { EmotionSystem } from './EmotionSystem.js';
import { MemorySystem } from './MemorySystem.js';
import { LanguageSystem } from './LanguageSystem.js';
import { CuriositySystem } from './CuriositySystem.js';
import { SensoryInput, AIState, Thought } from '../../shared/src/types/ai.js';
import { aiLogger } from '../utils/logger.js';

export class AI {
  private brain: Brain;
  private sensorySystem: SensorySystem;
  private motorSystem: MotorSystem;
  private emotionSystem: EmotionSystem;
  private memorySystem: MemorySystem;
  private languageSystem: LanguageSystem;
  private curiositySystem: CuriositySystem;

  private currentState: AIState;
  private isRunning: boolean = false;
  private simulationInterval?: NodeJS.Timeout;

  constructor() {
    // Initialize core AI components
    this.brain = new Brain();
    this.sensorySystem = new SensorySystem();
    this.motorSystem = new MotorSystem();
    this.emotionSystem = new EmotionSystem();
    this.memorySystem = new MemorySystem();
    this.languageSystem = new LanguageSystem();
    this.curiositySystem = new CuriositySystem();

    // Initialize AI state
    this.currentState = {
      id: this.generateId(),
      createdAt: Date.now(),
      age: 0,
      totalExperiences: 0,
      emotions: {
        valence: 0,
        arousal: 0.5,
        dimensions: new Array(CONSTANTS.EMOTION.DIMENSION_COUNT).fill(0)
      },
      thoughts: [],
      attention: null,
      curiosity: 1.0,
      learning: {
        rate: config.NEURAL_LEARNING_RATE,
        totalAdjustments: 0
      },
      memory: {
        episodicCount: 0,
        semanticCount: 0,
        vocabularySize: 0
      },
      language: {
        currentThought: null,
        comprehensionLevel: 0
      }
    };

    aiLogger.info('AI system initialized');
  }

  async initialize(): Promise<void> {
    try {
      aiLogger.info('Initializing AI components...');

      // Initialize TensorFlow.js backend
      await this.initializeTensorFlow();

      // Initialize brain neural network
      await this.brain.initialize();

      // Initialize memory system with potential existing data
      await this.memorySystem.initialize();

      // Initialize other systems
      this.sensorySystem.initialize();
      this.motorSystem.initialize();
      this.emotionSystem.initialize();
      this.languageSystem.initialize();
      this.curiositySystem.initialize();

      // Load existing state if available
      await this.loadPreviousState();

      this.isRunning = true;
      aiLogger.info('✅ AI system fully initialized and ready');

    } catch (error) {
      aiLogger.error('❌ Failed to initialize AI system:', error);
      throw error;
    }
  }

  private async initializeTensorFlow(): Promise<void> {
    try {
      if (config.TF_BACKEND === 'tensorflow') {
        // Try to use GPU if available
        try {
          await tf.setBackend('tensorflow');
          aiLogger.info('✅ TensorFlow backend initialized');
        } catch (error) {
          aiLogger.warn('⚠️ GPU not available, falling back to CPU');
          await tf.setBackend('cpu');
        }
      }

      // Configure memory growth for GPU
      if (config.TF_GPU_MEMORY_GROWTH) {
        tf.ENV.set('WEBGL_CONVOLUTIONAL_INFERENCE_FORWARD', false);
      }

    } catch (error) {
      aiLogger.error('Failed to initialize TensorFlow:', error);
      throw error;
    }
  }

  async processPerception(sensoryInput: SensoryInput): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Process sensory input through sensory system
      const processedInput = this.sensorySystem.processInput(sensoryInput);

      // Generate attention focus based on curiosity
      const attention = this.curiositySystem.generateAttention(processedInput);
      this.currentState.attention = attention;

      // Forward pass through neural network
      const neuralOutput = await this.brain.forward(processedInput);

      // Extract emotional state from neural activations
      const emotions = this.emotionSystem.extractEmotions(neuralOutput.internalState);
      this.currentState.emotions = emotions;

      // Generate thoughts if language capability exists
      const thoughts = await this.generateThoughts(neuralOutput.internalState);
      this.currentState.thoughts = thoughts;

      // Update curiosity based on prediction error
      const curiosity = this.curiositySystem.updateCuriosity(
        processedInput,
        neuralOutput.prediction
      );
      this.currentState.curiosity = curiosity;

      // Store experience in memory
      await this.memorySystem.storeExperience({
        id: this.generateId(),
        timestamp: Date.now(),
        sensoryInput: processedInput,
        neuralOutput,
        emotions,
        attention,
        curiosity
      });

      // Update learning progress
      this.currentState.totalExperiences++;
      this.currentState.learning.totalAdjustments += neuralOutput.learningAdjustments;

      // Update memory statistics
      this.updateMemoryStats();

      aiLogger.debug('Processed perception cycle', {
        experienceCount: this.currentState.totalExperiences,
        curiosity: curiosity.toFixed(3),
        valence: emotions.valence.toFixed(3),
        arousal: emotions.arousal.toFixed(3)
      });

    } catch (error) {
      aiLogger.error('Error processing perception:', error);
    }
  }

  async generateActions(): Promise<any[]> {
    if (!this.isRunning) return [];

    try {
      // Get current sensory state
      const currentSensoryState = this.sensorySystem.getCurrentState();

      // Generate action intentions through neural network
      const actionIntentions = await this.brain.generateActions(currentSensoryState);

      // Convert neural output to motor commands
      const motorCommands = this.motorSystem.executeActions(actionIntentions);

      // Update language processing if there are linguistic inputs
      if (currentSensoryState.language) {
        await this.languageSystem.processLanguageInput(
          currentSensoryState.language,
          this.currentState.attention
        );
      }

      return motorCommands;

    } catch (error) {
      aiLogger.error('Error generating actions:', error);
      return [];
    }
  }

  private async generateThoughts(internalState: tf.Tensor): Promise<Thought[]> {
    const thoughts: Thought[] = [];

    try {
      // Generate linguistic thoughts if vocabulary exists
      if (this.languageSystem.getVocabularySize() > 10) {
        const linguisticThought = await this.languageSystem.generateThought(internalState);
        if (linguisticThought) {
          thoughts.push(linguisticThought);
          this.currentState.language.currentThought = linguisticThought.content;
        }
      }

      // Generate non-linguistic abstract thoughts
      const abstractThought = this.emotionSystem.generateAbstractThought(internalState);
      if (abstractThought) {
        thoughts.push(abstractThought);
      }

    } catch (error) {
      aiLogger.debug('Error generating thoughts:', error);
    }

    return thoughts;
  }

  private updateMemoryStats(): void {
    this.currentState.memory.episodicCount = this.memorySystem.getEpisodicCount();
    this.currentState.memory.semanticCount = this.memorySystem.getSemanticCount();
    this.currentState.memory.vocabularySize = this.languageSystem.getVocabularySize();
  }

  private async loadPreviousState(): Promise<void> {
    try {
      // Try to load the most recent autosave
      const savedState = await this.memorySystem.loadAutosave();
      if (savedState) {
        await this.restoreState(savedState);
        aiLogger.info('✅ Restored previous AI state from autosave');
      }
    } catch (error) {
      aiLogger.debug('No previous state found, starting fresh:', error);
    }
  }

  async saveState(slot: string = 'autosave_manual'): Promise<void> {
    try {
      const state = {
        id: this.currentState.id,
        timestamp: Date.now(),
        age: this.currentState.age,
        totalExperiences: this.currentState.totalExperiences,
        emotions: this.currentState.emotions,
        curiosity: this.currentState.curiosity,
        learning: this.currentState.learning,
        memory: this.currentState.memory,
        language: this.currentState.language,

        // Component states
        brainState: await this.brain.getState(),
        memoryState: await this.memorySystem.getState(),
        languageState: await this.languageSystem.getState()
      };

      await this.memorySystem.saveState(state, slot);
      aiLogger.info(`💾 AI state saved to slot: ${slot}`);

    } catch (error) {
      aiLogger.error('Failed to save AI state:', error);
      throw error;
    }
  }

  async loadState(slot: string): Promise<void> {
    try {
      const savedState = await this.memorySystem.loadState(slot);
      if (savedState) {
        await this.restoreState(savedState);
        aiLogger.info(`📂 AI state loaded from slot: ${slot}`);
      } else {
        throw new Error(`No saved state found in slot: ${slot}`);
      }
    } catch (error) {
      aiLogger.error('Failed to load AI state:', error);
      throw error;
    }
  }

  private async restoreState(savedState: any): Promise<void> {
    // Restore basic state
    this.currentState = {
      ...this.currentState,
      ...savedState
    };

    // Restore component states
    if (savedState.brainState) {
      await this.brain.setState(savedState.brainState);
    }
    if (savedState.memoryState) {
      await this.memorySystem.setState(savedState.memoryState);
    }
    if (savedState.languageState) {
      await this.languageSystem.setState(savedState.languageState);
    }
  }

  // Public getters for current state
  getState(): AIState {
    return { ...this.currentState };
  }

  isInitialized(): boolean {
    return this.isRunning && this.brain.isInitialized();
  }

  getMemoryCount(): number {
    return this.currentState.memory.episodicCount + this.currentState.memory.semanticCount;
  }

  getCuriosityLevel(): number {
    return this.currentState.curiosity;
  }

  getVocabularySize(): number {
    return this.currentState.memory.vocabularySize;
  }

  getCurrentEmotion(): { valence: number; arousal: number } {
    return {
      valence: this.currentState.emotions.valence,
      arousal: this.currentState.emotions.arousal
    };
  }

  getCurrentThought(): string | null {
    return this.currentState.language.currentThought;
  }

  getAttention(): any {
    return this.currentState.attention;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  stop(): void {
    this.isRunning = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    aiLogger.info('AI system stopped');
  }
}