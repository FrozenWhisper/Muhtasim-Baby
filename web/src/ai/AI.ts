import { Brain } from './Brain.js';
import { SensorySystem } from './SensorySystem.js';
import { MotorSystem } from './MotorSystem.js';
import { EmotionSystem } from './EmotionSystem.js';
import { MemorySystem } from './MemorySystem.js';
import { LanguageSystem } from './LanguageSystem.js';
import { CuriositySystem } from './CuriositySystem.js';
import { CONSTANTS } from '../constants/index.js';

export class AI {
  private brain: Brain;
  private sensorySystem: SensorySystem;
  private motorSystem: MotorSystem;
  private emotionSystem: EmotionSystem;
  private memorySystem: MemorySystem;
  private languageSystem: LanguageSystem;
  private curiositySystem: CuriositySystem;

  private currentState: {
    id: string;
    age: number;
    totalExperiences: number;
    emotions: {
      valence: number;
      arousal: number;
      dimensions: number[];
    };
    thoughts: Array<{
      id: string;
      type: 'abstract' | 'linguistic';
      content: string;
      timestamp: number;
    }>;
    attention: any;
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
  };

  private isRunning: boolean = false;
  private onStateChangeCallback?: (state: any) => void;

  constructor() {
    this.brain = new Brain();
    this.sensorySystem = new SensorySystem();
    this.motorSystem = new MotorSystem();
    this.emotionSystem = new EmotionSystem();
    this.memorySystem = new MemorySystem();
    this.languageSystem = new LanguageSystem();
    this.curiositySystem = new CuriositySystem();

    this.currentState = {
      id: this.generateId(),
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
        rate: 0.001,
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
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing AI system...');

      // Initialize all systems
      await this.brain.initialize();
      await this.memorySystem.initialize();
      this.sensorySystem.initialize();
      this.motorSystem.initialize();
      this.emotionSystem.initialize();
      this.languageSystem.initialize();
      this.curiositySystem.initialize();

      // Try to load previous state
      await this.loadPreviousState();

      // Warm up the neural network
      await this.brain.warmup();

      this.isRunning = true;
      console.log('✅ AI system fully initialized and ready');

    } catch (error) {
      console.error('❌ Failed to initialize AI system:', error);
      throw error;
    }
  }

  async processPerception(sensoryInput: any): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Process sensory input
      const processedInput = this.sensorySystem.processInput(sensoryInput);

      // Generate attention
      const attention = this.curiositySystem.generateAttention(processedInput);
      this.currentState.attention = attention;

      // Forward pass through neural network
      const neuralOutput = await this.brain.forward(processedInput);

      // Extract emotions
      const emotions = this.emotionSystem.extractEmotions(neuralOutput.internalState);
      this.currentState.emotions = emotions;

      // Generate thoughts
      const thoughts = await this.generateThoughts(neuralOutput.internalState);
      this.currentState.thoughts = thoughts;

      // Update curiosity
      const curiosity = this.curiositySystem.updateCuriosity(processedInput, neuralOutput.predictions);
      this.currentState.curiosity = curiosity;

      // Store experience
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

      // Notify state change
      this.notifyStateChange();

    } catch (error) {
      console.error('Error processing perception:', error);
    }
  }

  async generateActions(): Promise<any[]> {
    if (!this.isRunning) return [];

    try {
      const currentSensoryState = this.sensorySystem.getCurrentState();
      const actionIntentions = await this.brain.generateActions(currentSensoryState);
      const motorCommands = this.motorSystem.executeActions(actionIntentions);

      return motorCommands;

    } catch (error) {
      console.error('Error generating actions:', error);
      return [];
    }
  }

  private async generateThoughts(internalState: Float32Array): Promise<Array<{
    id: string;
    type: 'abstract' | 'linguistic';
    content: string;
    timestamp: number;
  }>> {
    const thoughts = [];

    try {
      // Generate linguistic thoughts if vocabulary exists
      if (this.languageSystem.getVocabularySize() > 10) {
        const linguisticThought = await this.languageSystem.generateThought(internalState);
        if (linguisticThought) {
          thoughts.push(linguisticThought);
          this.currentState.language.currentThought = linguisticThought.content;
        }
      }

      // Generate abstract thoughts
      const abstractThought = this.emotionSystem.generateAbstractThought(internalState);
      if (abstractThought) {
        thoughts.push(abstractThought);
      }

    } catch (error) {
      console.debug('Error generating thoughts:', error);
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
      const savedState = await this.memorySystem.loadAutosave();
      if (savedState) {
        await this.restoreState(savedState);
        console.log('✅ Restored previous AI state');
      }
    } catch (error) {
      console.debug('No previous state found, starting fresh');
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
        brainState: await this.brain.getState(),
        memoryState: await this.memorySystem.getState(),
        languageState: await this.languageSystem.getState()
      };

      await this.memorySystem.saveState(state, slot);
      console.log(`💾 AI state saved to slot: ${slot}`);

    } catch (error) {
      console.error('Failed to save AI state:', error);
      throw error;
    }
  }

  async loadState(slot: string): Promise<void> {
    try {
      const savedState = await this.memorySystem.loadState(slot);
      if (savedState) {
        await this.restoreState(savedState);
        console.log(`📂 AI state loaded from slot: ${slot}`);
      } else {
        throw new Error(`No saved state found in slot: ${slot}`);
      }
    } catch (error) {
      console.error('Failed to load AI state:', error);
      throw error;
    }
  }

  private async restoreState(savedState: any): Promise<void> {
    this.currentState = {
      ...this.currentState,
      ...savedState
    };

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

  // Public getters
  getState(): any {
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

  // Performance and state management
  onStateChange(callback: (state: any) => void): void {
    this.onStateChangeCallback = callback;
  }

  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.getState());
    }
  }

  // Auto-save functionality
  startAutoSave(intervalMs: number = 300000): void { // 5 minutes default
    setInterval(() => {
      if (this.isRunning) {
        this.saveState('autosave').catch(console.error);
      }
    }, intervalMs);
  }

  // Performance optimization
  async optimize(): Promise<void> {
    try {
      // Clean up memory
      tf.tidy(() => {
        // Run garbage collection if available
        if (window.gc) {
          window.gc();
        }
      });

      console.log('AI optimization completed');
    } catch (error) {
      console.error('Error during AI optimization:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  stop(): void {
    this.isRunning = false;
    console.log('AI system stopped');
  }

  dispose(): void {
    this.stop();
    this.brain.dispose();
    this.sensorySystem.dispose();
    this.motorSystem.dispose();
    this.emotionSystem.dispose();
    this.memorySystem.dispose();
    this.languageSystem.dispose();
    this.curiositySystem.dispose();
    console.log('AI system disposed');
  }
}