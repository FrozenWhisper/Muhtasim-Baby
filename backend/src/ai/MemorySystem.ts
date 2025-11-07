import { config, CONSTANTS } from '../config/index.js';
import { SensoryInput, NeuralOutput, Emotion, Experience, MemoryState } from '../../shared/src/types/ai.js';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { memoryLogger } from '../utils/logger.js';

interface DatabaseSchema {
  experiences: Experience[];
  semanticMemories: any[];
  saveStates: any[];
  lastSave: number;
}

export class MemorySystem {
  private db: Low<DatabaseSchema>;
  private episodicMemories: Experience[] = [];
  private semanticMemories: any[] = [];
  private memoryConsolidationTimer?: NodeJS.Timeout;
  private decayTimer?: NodeJS.Timeout;

  constructor() {
    const dbPath = path.join(process.cwd(), 'data', 'memory', 'database.json');
    this.db = new Low(new JSONFile(dbPath), this.getDefaultDatabase());
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.join(process.cwd(), 'data', 'memory');
      await fs.mkdir(dataDir, { recursive: true });

      // Load database
      await this.db.read();

      // Initialize default data if needed
      if (!this.db.data) {
        this.db.data = this.getDefaultDatabase();
        await this.db.write();
      }

      // Load memories into memory
      this.episodicMemories = this.db.data.experiences || [];
      this.semanticMemories = this.db.data.semanticMemories || [];

      // Start background processes
      this.startMemoryConsolidation();
      this.startMemoryDecay();

      memoryLogger.info('Memory system initialized', {
        episodicCount: this.episodicMemories.length,
        semanticCount: this.semanticMemories.length,
        lastSave: new Date(this.db.data.lastSave || 0).toISOString()
      });

    } catch (error) {
      memoryLogger.error('Failed to initialize memory system:', error);
      throw error;
    }
  }

  private getDefaultDatabase(): DatabaseSchema {
    return {
      experiences: [],
      semanticMemories: [],
      saveStates: [],
      lastSave: Date.now()
    };
  }

  async storeExperience(experience: Omit<Experience, 'id' | 'strength' | 'recallCount' | 'lastRecalled'>): Promise<void> {
    try {
      // Create full experience object
      const fullExperience: Experience = {
        id: uuidv4(),
        ...experience,
        strength: this.calculateInitialStrength(experience),
        recallCount: 0,
        lastRecalled: Date.now()
      };

      // Add to episodic memory
      this.episodicMemories.push(fullExperience);

      // Maintain maximum memory limit
      if (this.episodicMemories.length > CONSTANTS.MAX_EPISODIC_MEMORIES) {
        this.pruneWeakestMemories();
      }

      // Update database
      this.db.data!.experiences = this.episodicMemories;
      await this.db.write();

      // Check for consolidation opportunities
      this.checkForConsolidation(fullExperience);

      memoryLogger.debug('Stored experience', {
        id: fullExperience.id,
        strength: fullExperience.strength.toFixed(3),
        curiosity: experience.curiosity.toFixed(3),
        totalMemories: this.episodicMemories.length
      });

    } catch (error) {
      memoryLogger.error('Error storing experience:', error);
    }
  }

  private calculateInitialStrength(experience: any): number {
    let strength = 0.5; // Base strength

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
    sensoryInput?: Partial<SensoryInput>;
    emotions?: Partial<Emotion>;
    attention?: any;
    limit?: number;
  }): Experience[] {
    try {
      const memories = [...this.episodicMemories];
      const scoredMemories = memories.map(memory => ({
        memory,
        score: this.calculateRecallScore(memory, query)
      }));

      // Sort by recall score and update recall statistics
      scoredMemories.sort((a, b) => b.score - a.score);
      const limit = query.limit || 10;
      const recalledMemories = scoredMemories.slice(0, limit);

      // Update recall statistics for accessed memories
      recalledMemories.forEach(({ memory }) => {
        memory.recallCount++;
        memory.lastRecalled = Date.now();
        // Strengthen memory through recall
        memory.strength = Math.min(1.0, memory.strength * 1.05);
      });

      // Save updated recall statistics
      this.db.data!.experiences = this.episodicMemories;
      this.db.write();

      memoryLogger.debug('Recalled memories', {
        queryType: query.sensoryInput ? 'sensory' : query.emotions ? 'emotional' : 'general',
        memoriesRecalled: recalledMemories.length,
        topScore: recalledMemories[0]?.score.toFixed(3) || 0
      });

      return recalledMemories.map(item => item.memory);

    } catch (error) {
      memoryLogger.error('Error recalling memories:', error);
      return [];
    }
  }

  private calculateRecallScore(memory: Experience, query: any): number {
    let score = 0;
    let factors = 0;

    // Factor in current memory strength
    score += memory.strength * 0.3;
    factors++;

    // Factor in recency (more recent memories are more accessible)
    const age = Date.now() - memory.timestamp;
    const recency = Math.exp(-age / (7 * 24 * 60 * 60 * 1000)); // 7-day half-life
    score += recency * 0.2;
    factors++;

    // Factor in recall frequency (frequently recalled memories are more accessible)
    const recallFrequency = Math.min(memory.recallCount / 10, 1);
    score += recallFrequency * 0.1;
    factors++;

    // Factor in similarity to query
    if (query.sensoryInput) {
      const sensorySimilarity = this.calculateSensorySimilarity(memory.sensoryInput, query.sensoryInput);
      score += sensorySimilarity * 0.2;
      factors++;
    }

    if (query.emotions) {
      const emotionalSimilarity = this.calculateEmotionalSimilarity(memory.emotions, query.emotions);
      score += emotionalSimilarity * 0.15;
      factors++;
    }

    if (query.attention && memory.attention) {
      const attentionSimilarity = this.calculateAttentionSimilarity(memory.attention, query.attention);
      score += attentionSimilarity * 0.05;
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

  private calculateEmotionalSimilarity(emotion1: any, emotion2: any): number {
    if (!emotion1 || !emotion2) return 0;

    const valenceDiff = Math.abs((emotion1.valence || 0) - (emotion2.valence || 0));
    const arousalDiff = Math.abs((emotion1.arousal || 0) - (emotion2.arousal || 0));

    // Calculate similarity based on inverse difference
    const valenceSimilarity = 1 - valenceDiff;
    const arousalSimilarity = 1 - arousalDiff;

    return (valenceSimilarity + arousalSimilarity) / 2;
  }

  private calculateAttentionSimilarity(attention1: any, attention2: any): number {
    if (!attention1 || !attention2) return 0;

    // Simple similarity based on attention target type
    if (attention1.target && attention2.target) {
      return attention1.target === attention2.target ? 1 : 0;
    }

    return 0;
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

      // Add reconstruction noise based on memory age and strength
      const age = Date.now() - memory.timestamp;
      const ageFactor = Math.min(age / (30 * 24 * 60 * 60 * 1000), 1); // 30-day max
      const strengthFactor = 1 - memory.strength;

      const reconstructionNoise = (ageFactor * 0.3 + strengthFactor * 0.2);

      // Apply noise to sensory data
      reconstructed.sensoryInput = this.addSensoryNoise(memory.sensoryInput, reconstructionNoise);

      // Slightly modify emotional intensity
      if (reconstructed.emotions) {
        const emotionalNoise = reconstructionNoise * 0.1;
        reconstructed.emotions.valence += (Math.random() - 0.5) * emotionalNoise;
        reconstructed.emotions.arousal += (Math.random() - 0.5) * emotionalNoise;
      }

      memoryLogger.debug('Reconstructed memory', {
        id: memoryId,
        noiseLevel: reconstructionNoise.toFixed(3),
        strength: memory.strength.toFixed(3)
      });

      return reconstructed;

    } catch (error) {
      memoryLogger.error('Error reconstructing memory:', error);
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
    this.memoryConsolidationTimer = setInterval(() => {
      this.performMemoryConsolidation();
    }, config.MEMORY_CONSOLIDATION_INTERVAL);
  }

  private performMemoryConsolidation(): void {
    try {
      // Find patterns in recent memories and create semantic memories
      const recentMemories = this.episodicMemories.filter(
        memory => Date.now() - memory.timestamp < config.MEMORY_CONSOLIDATION_INTERVAL
      );

      if (recentMemories.length > 10) {
        const patterns = this.identifyPatterns(recentMemories);
        patterns.forEach(pattern => {
          this.createSemanticMemory(pattern);
        });

        memoryLogger.debug('Memory consolidation completed', {
          memoriesProcessed: recentMemories.length,
          patternsFound: patterns.length
        });
      }

    } catch (error) {
      memoryLogger.error('Error during memory consolidation:', error);
    }
  }

  private identifyPatterns(memories: Experience[]): any[] {
    // Simple pattern identification based on similar experiences
    const patterns: any[] = [];
    const processedMemories = new Set<string>();

    for (const memory of memories) {
      if (processedMemories.has(memory.id)) continue;

      // Find similar memories
      const similarMemories = memories.filter(other =>
        other.id !== memory.id &&
        !processedMemories.has(other.id) &&
        this.calculateSensorySimilarity(memory.sensoryInput, other.sensoryInput) > 0.7
      );

      if (similarMemories.length >= 3) {
        patterns.push({
          type: 'recurring_pattern',
          memories: [memory, ...similarMemories],
          commonFeatures: this.extractCommonFeatures([memory, ...similarMemories])
        });

        similarMemories.forEach(similar => processedMemories.add(similar.id));
      }

      processedMemories.add(memory.id);
    }

    return patterns;
  }

  private extractCommonFeatures(memories: Experience[]): any {
    // Extract common features from a group of memories
    const features: any = {};

    // Average emotional states
    const avgEmotions = {
      valence: memories.reduce((sum, m) => sum + (m.emotions?.valence || 0), 0) / memories.length,
      arousal: memories.reduce((sum, m) => sum + (m.emotions?.arousal || 0), 0) / memories.length
    };
    features.emotions = avgEmotions;

    // Common sensory patterns (simplified)
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

  private createSemanticMemory(pattern: any): void {
    const semanticMemory = {
      id: uuidv4(),
      type: pattern.type,
      features: pattern.commonFeatures,
      strength: pattern.memories.length / 10, // Normalize by group size
      createdAt: Date.now(),
      consolidatedFrom: pattern.memories.map((m: Experience) => m.id)
    };

    this.semanticMemories.push(semanticMemory);
    this.db.data!.semanticMemories = this.semanticMemories;
    this.db.write();
  }

  private startMemoryDecay(): void {
    this.decayTimer = setInterval(() => {
      this.applyMemoryDecay();
    }, 60000); // Apply decay every minute
  }

  private applyMemoryDecay(): void {
    try {
      let decayedCount = 0;

      this.episodicMemories.forEach(memory => {
        const age = Date.now() - memory.timestamp;
        const decayFactor = Math.exp(-config.MEMORY_DECAY_RATE * age / (60 * 60 * 1000)); // Per hour

        const newStrength = memory.strength * decayFactor;
        if (newStrength < memory.strength) {
          memory.strength = Math.max(0.01, newStrength);
          decayedCount++;
        }
      });

      if (decayedCount > 0) {
        this.db.data!.experiences = this.episodicMemories;
        this.db.write();
        memoryLogger.debug('Applied memory decay', { memoriesDecayed: decayedCount });
      }

    } catch (error) {
      memoryLogger.error('Error applying memory decay:', error);
    }
  }

  private pruneWeakestMemories(): void {
    // Sort by strength and remove weakest memories
    this.episodicMemories.sort((a, b) => b.strength - a.strength);
    const pruned = this.episodicMemories.splice(CONSTANTS.MAX_EPISODIC_MEMORIES);

    memoryLogger.debug('Pruned weak memories', {
      removedCount: pruned.length,
      remainingCount: this.episodicMemories.length
    });
  }

  private checkForConsolidation(newExperience: Experience): void {
    // Check if new experience triggers immediate consolidation
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
      const saveState = {
        id: uuidv4(),
        slot,
        timestamp: Date.now(),
        state
      };

      this.db.data!.saveStates.push(saveState);
      this.db.data!.lastSave = Date.now();
      await this.db.write();

      memoryLogger.info('State saved', { slot, timestamp: saveState.timestamp });

    } catch (error) {
      memoryLogger.error('Error saving state:', error);
      throw error;
    }
  }

  async loadState(slot: string): Promise<any> {
    try {
      const saveState = this.db.data!.saveStates
        .sort((a, b) => b.timestamp - a.timestamp)
        .find(state => state.slot === slot);

      if (!saveState) {
        memoryLogger.warn('No save state found for slot', { slot });
        return null;
      }

      memoryLogger.info('State loaded', { slot, timestamp: saveState.timestamp });
      return saveState.state;

    } catch (error) {
      memoryLogger.error('Error loading state:', error);
      throw error;
    }
  }

  async loadAutosave(): Promise<any> {
    return this.loadState('autosave_shutdown');
  }

  async getState(): Promise<MemoryState> {
    return {
      episodicCount: this.episodicMemories.length,
      semanticCount: this.semanticMemories.length,
      lastSave: this.db.data!.lastSave,
      averageStrength: this.episodicMemories.reduce((sum, m) => sum + m.strength, 0) / this.episodicMemories.length
    };
  }

  async setState(state: MemoryState): Promise<void> {
    // This would restore memory system state
    // For now, just log the operation
    memoryLogger.info('Memory state restored', state);
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
      clearInterval(this.memoryConsolidationTimer);
    }
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
    }
    memoryLogger.debug('Memory system disposed');
  }
}