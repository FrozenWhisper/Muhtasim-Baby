import Dexie, { Table } from 'dexie';
import { CONSTANTS } from '../constants/index.js';

interface Experience {
  id?: string;
  timestamp: number;
  sensoryInput: any;
  neuralOutput: any;
  emotions: any;
  attention: any;
  curiosity: number;
  strength: number;
  recallCount: number;
  lastRecalled: number;
}

interface SemanticMemory {
  id?: string;
  concept: string;
  features: Float32Array;
  associations: string[];
  strength: number;
  createdAt: number;
  lastAccessed: number;
}

interface SaveState {
  id?: string;
  slot: string;
  timestamp: number;
  state: any;
}

interface AIState {
  id?: string;
  timestamp: number;
  state: any;
}

// IndexedDB database setup
class ConsciousAIDatabase extends Dexie {
  experiences!: Table<Experience>;
  semanticMemories!: Table<SemanticMemory>;
  saveStates!: Table<SaveState>;
  aiStates!: Table<AIState>;

  constructor() {
    super('ConsciousAIDatabase');

    this.version(1).stores({
      experiences: '++id, timestamp, strength, recallCount, lastRecalled',
      semanticMemories: '++id, concept, strength, createdAt, lastAccessed',
      saveStates: '++id, slot, timestamp',
      aiStates: '++id, timestamp'
    });
  }
}

export class MemorySystem {
  private db: ConsciousAIDatabase;
  private episodicMemories: Experience[] = [];
  private semanticMemories: SemanticMemory[] = [];
  private memoryConsolidationTimer?: number;
  private decayTimer?: number;

  constructor() {
    this.db = new ConsciousAIDatabase();
  }

  async initialize(): Promise<void> {
    try {
      await this.db.open();

      // Load existing memories
      await this.loadMemories();

      // Start background processes
      this.startMemoryConsolidation();
      this.startMemoryDecay();

      console.log('Memory system initialized', {
        episodicCount: this.episodicMemories.length,
        semanticCount: this.semanticMemories.length
      });

    } catch (error) {
      console.error('Failed to initialize memory system:', error);
      throw error;
    }
  }

  private async loadMemories(): Promise<void> {
    try {
      // Load episodic memories
      this.episodicMemories = await this.db.experiences.orderBy('timestamp').toArray();

      // Load semantic memories
      this.semanticMemories = await this.db.semanticMemories.toArray();

      console.log('Loaded memories from IndexedDB');
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  }

  async storeExperience(experience: Omit<Experience, 'id' | 'strength' | 'recallCount' | 'lastRecalled'>): Promise<void> {
    try {
      const fullExperience: Experience = {
        ...experience,
        id: this.generateId(),
        strength: this.calculateInitialStrength(experience),
        recallCount: 0,
        lastRecalled: Date.now()
      };

      // Add to episodic memory
      this.episodicMemories.push(fullExperience);

      // Store in IndexedDB
      await this.db.experiences.add(fullExperience);

      // Maintain memory limit
      if (this.episodicMemories.length > CONSTANTS.MEMORY.MAX_EPISODIC_MEMORIES) {
        await this.pruneWeakestMemories();
      }

      // Check for consolidation opportunities
      this.checkForConsolidation(fullExperience);

      console.debug('Stored experience', {
        id: fullExperience.id,
        strength: fullExperience.strength.toFixed(3),
        totalMemories: this.episodicMemories.length
      });

    } catch (error) {
      console.error('Error storing experience:', error);
    }
  }

  private calculateInitialStrength(experience: any): number {
    let strength = 0.5;

    // Emotional intensity increases memory strength
    if (experience.emotions) {
      const emotionalIntensity = Math.sqrt(
        experience.emotions.valence * experience.emotions.valence +
        experience.emotions.arousal * experience.emotions.arousal
      );
      strength += emotionalIntensity * 0.3;
    }

    // Novelty increases memory strength
    if (experience.curiosity !== undefined) {
      strength += experience.curiosity * 0.2;
    }

    // Prediction error increases memory strength
    if (experience.neuralOutput?.predictionError) {
      const predictionError = Array.isArray(experience.neuralOutput.predictionError)
        ? experience.neuralOutput.predictionError[0] || 0
        : experience.neuralOutput.predictionError || 0;
      strength += Math.min(predictionError * 0.2, 0.3);
    }

    return Math.min(1.0, Math.max(0.1, strength));
  }

  recallMemories(query: {
    sensoryInput?: any;
    emotions?: any;
    attention?: any;
    limit?: number;
  }): Experience[] {
    try {
      const memories = [...this.episodicMemories];
      const scoredMemories = memories.map(memory => ({
        memory,
        score: this.calculateRecallScore(memory, query)
      }));

      scoredMemories.sort((a, b) => b.score - a.score);
      const limit = query.limit || 10;
      const recalledMemories = scoredMemories.slice(0, limit);

      // Update recall statistics
      recalledMemories.forEach(async ({ memory }) => {
        memory.recallCount++;
        memory.lastRecalled = Date.now();
        memory.strength = Math.min(1.0, memory.strength * 1.05);

        // Update in database
        await this.db.experiences.update(memory.id!, {
          recallCount: memory.recallCount,
          lastRecalled: memory.lastRecalled,
          strength: memory.strength
        });
      });

      return recalledMemories.map(item => item.memory);

    } catch (error) {
      console.error('Error recalling memories:', error);
      return [];
    }
  }

  private calculateRecallScore(memory: Experience, query: any): number {
    let score = 0;
    let factors = 0;

    // Base score from strength
    score += memory.strength * 0.3;
    factors++;

    // Recency factor
    const age = Date.now() - memory.timestamp;
    const recency = Math.exp(-age / (7 * 24 * 60 * 60 * 1000)); // 7-day half-life
    score += recency * 0.2;
    factors++;

    // Recall frequency
    const recallFrequency = Math.min(memory.recallCount / 10, 1);
    score += recallFrequency * 0.1;
    factors++;

    // Similarity to query
    if (query.sensoryInput) {
      const sensorySimilarity = this.calculateSensorySimilarity(memory.sensoryInput, query.sensoryInput);
      score += sensorySimilarity * 0.2;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  private calculateSensorySimilarity(memory1: any, memory2: any): number {
    if (!memory1 || !memory2) return 0;

    let totalSimilarity = 0;
    let modalities = 0;

    const sensoryTypes = ['vision', 'touch', 'sound', 'smell', 'taste', 'proprioception'];

    for (const type of sensoryTypes) {
      if (memory1[type] && memory2[type]) {
        const similarity = this.calculateVectorSimilarity(memory1[type], memory2[type]);
        totalSimilarity += similarity;
        modalities++;
      }
    }

    return modalities > 0 ? totalSimilarity / modalities : 0;
  }

  private calculateVectorSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length || vector1.length === 0) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    const cosineSimilarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return (cosineSimilarity + 1) / 2; // Normalize to 0-1 range
  }

  reconstructMemory(memoryId: string): Experience | null {
    try {
      const memory = this.episodicMemories.find(m => m.id === memoryId);
      if (!memory) return null;

      // Apply reconstructive memory process
      const reconstructed = { ...memory };
      const age = Date.now() - memory.timestamp;
      const ageFactor = Math.min(age / (30 * 24 * 60 * 60 * 1000), 1); // 30-day max
      const strengthFactor = 1 - memory.strength;

      const reconstructionNoise = (ageFactor * 0.3 + strengthFactor * 0.2);

      // Apply noise to sensory data
      reconstructed.sensoryInput = this.addSensoryNoise(memory.sensoryInput, reconstructionNoise);

      return reconstructed;

    } catch (error) {
      console.error('Error reconstructing memory:', error);
      return null;
    }
  }

  private addSensoryNoise(sensoryInput: any, noiseLevel: number): any {
    if (!sensoryInput) return sensoryInput;

    const noisyInput = { ...sensoryInput };
    const sensoryTypes = ['vision', 'touch', 'sound', 'smell', 'taste', 'proprioception'];

    for (const type of sensoryTypes) {
      if (Array.isArray(noisyInput[type])) {
        noisyInput[type] = noisyInput[type].map((value: number) => {
          const noise = (Math.random() - 0.5) * 2 * noiseLevel;
          return Math.max(0, Math.min(1, value + noise));
        });
      }
    }

    return noisyInput;
  }

  private startMemoryConsolidation(): void {
    this.memoryConsolidationTimer = window.setInterval(() => {
      this.performMemoryConsolidation();
    }, CONSTANTS.MEMORY.CONSOLIDATION_INTERVAL);
  }

  private async performMemoryConsolidation(): Promise<void> {
    try {
      const recentMemories = this.episodicMemories.filter(
        memory => Date.now() - memory.timestamp < CONSTANTS.MEMORY.CONSOLIDATION_INTERVAL
      );

      if (recentMemories.length > 10) {
        const patterns = this.identifyPatterns(recentMemories);
        for (const pattern of patterns) {
          await this.createSemanticMemory(pattern);
        }

        console.debug('Memory consolidation completed', {
          memoriesProcessed: recentMemories.length,
          patternsFound: patterns.length
        });
      }

    } catch (error) {
      console.error('Error during memory consolidation:', error);
    }
  }

  private identifyPatterns(memories: Experience[]): any[] {
    const patterns: any[] = [];
    const processedMemories = new Set<string>();

    for (const memory of memories) {
      if (processedMemories.has(memory.id!)) continue;

      const similarMemories = memories.filter(other =>
        other.id !== memory.id &&
        !processedMemories.has(other.id!) &&
        this.calculateSensorySimilarity(memory.sensoryInput, other.sensoryInput) > 0.7
      );

      if (similarMemories.length >= 3) {
        patterns.push({
          type: 'recurring_pattern',
          memories: [memory, ...similarMemories],
          commonFeatures: this.extractCommonFeatures([memory, ...similarMemories])
        });

        similarMemories.forEach(similar => processedMemories.add(similar.id!));
      }

      processedMemories.add(memory.id!);
    }

    return patterns;
  }

  private extractCommonFeatures(memories: Experience[]): any {
    const features: any = {};

    // Average emotional states
    const avgEmotions = {
      valence: memories.reduce((sum, m) => sum + (m.emotions?.valence || 0), 0) / memories.length,
      arousal: memories.reduce((sum, m) => sum + (m.emotions?.arousal || 0), 0) / memories.length
    };
    features.emotions = avgEmotions;

    // Common sensory patterns
    if (memories[0]?.sensoryInput?.vision) {
      features.visionPattern = this.averageVectors(
        memories.map(m => m.sensoryInput?.vision || []).filter(v => v.length > 0)
      );
    }

    return features;
  }

  private averageVectors(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];

    const length = vectors[0].length;
    const average = new Array(length).fill(0);

    for (const vector of vectors) {
      for (let i = 0; i < length; i++) {
        average[i] += vector[i] / vectors.length;
      }
    }

    return average;
  }

  private async createSemanticMemory(pattern: any): Promise<void> {
    const semanticMemory: SemanticMemory = {
      id: this.generateId(),
      concept: pattern.type,
      features: new Float32Array(CONSTANTS.MEMORY.SEMANTIC_VECTOR_SIZE),
      associations: pattern.memories.map((m: Experience) => m.id!),
      strength: pattern.memories.length / 10,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    this.semanticMemories.push(semanticMemory);
    await this.db.semanticMemories.add(semanticMemory);
  }

  private startMemoryDecay(): void {
    this.decayTimer = window.setInterval(() => {
      this.applyMemoryDecay();
    }, 60000); // Every minute
  }

  private async applyMemoryDecay(): Promise<void> {
    try {
      let decayedCount = 0;

      for (const memory of this.episodicMemories) {
        const age = Date.now() - memory.timestamp;
        const decayFactor = Math.exp(-CONSTANTS.MEMORY.DECAY_RATE * age / (60 * 60 * 1000));
        const newStrength = memory.strength * decayFactor;

        if (newStrength < memory.strength) {
          memory.strength = Math.max(0.01, newStrength);
          decayedCount++;

          // Update in database
          await this.db.experiences.update(memory.id!, { strength: memory.strength });
        }
      }

      if (decayedCount > 0) {
        console.debug('Applied memory decay', { memoriesDecayed: decayedCount });
      }

    } catch (error) {
      console.error('Error applying memory decay:', error);
    }
  }

  private async pruneWeakestMemories(): Promise<void> {
    this.episodicMemories.sort((a, b) => b.strength - a.strength);
    const pruned = this.episodicMemories.splice(CONSTANTS.MEMORY.MAX_EPISODIC_MEMORIES);

    // Remove from database
    const idsToDelete = pruned.map(m => m.id!);
    await this.db.experiences.bulkDelete(idsToDelete);

    console.debug('Pruned weak memories', {
      removedCount: pruned.length,
      remainingCount: this.episodicMemories.length
    });
  }

  private checkForConsolidation(newExperience: Experience): void {
    const similarMemories = this.episodicMemories.filter(memory =>
      memory.id !== newExperience.id &&
      this.calculateSensorySimilarity(memory.sensoryInput, newExperience.sensoryInput) > 0.8
    );

    if (similarMemories.length >= 2) {
      const pattern = {
        type: 'immediate_pattern',
        memories: [newExperience, ...similarMemories],
        commonFeatures: this.extractCommonFeatures([newExperience, ...similarMemories])
      };
      this.createSemanticMemory(pattern);
    }
  }

  // Save/Load functionality
  async saveState(state: any, slot: string): Promise<void> {
    try {
      const saveState: SaveState = {
        id: this.generateId(),
        slot,
        timestamp: Date.now(),
        state
      };

      await this.db.saveStates.add(saveState);
      console.log('State saved', { slot, timestamp: saveState.timestamp });

    } catch (error) {
      console.error('Error saving state:', error);
      throw error;
    }
  }

  async loadState(slot: string): Promise<any> {
    try {
      const saveState = await this.db.saveStates
        .where('slot')
        .equals(slot)
        .reverse()
        .first();

      if (!saveState) {
        console.warn('No save state found for slot', { slot });
        return null;
      }

      console.log('State loaded', { slot, timestamp: saveState.timestamp });
      return saveState.state;

    } catch (error) {
      console.error('Error loading state:', error);
      throw error;
    }
  }

  async loadAutosave(): Promise<any> {
    return this.loadState('autosave_shutdown');
  }

  async getState(): Promise<any> {
    return {
      episodicCount: this.episodicMemories.length,
      semanticCount: this.semanticMemories.length,
      lastSave: Date.now(),
      averageStrength: this.episodicMemories.reduce((sum, m) => sum + m.strength, 0) / this.episodicMemories.length
    };
  }

  async setState(state: any): Promise<void> {
    console.log('Memory state restored', state);
  }

  // Public getters
  getEpisodicCount(): number {
    return this.episodicMemories.length;
  }

  getSemanticCount(): number {
    return this.semanticMemories.length;
  }

  dispose(): void {
    if (this.memoryConsolidationTimer) {
      window.clearInterval(this.memoryConsolidationTimer);
    }
    if (this.decayTimer) {
      window.clearInterval(this.decayTimer);
    }
    this.db.close();
    console.debug('Memory system disposed');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}