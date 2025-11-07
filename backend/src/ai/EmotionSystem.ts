import * as tf from '@tensorflow/tfjs-node';
import { config, CONSTANTS } from '../config/index.js';
import { Emotion, Thought } from '../../shared/src/types/ai.js';
import { emotionLogger } from '../utils/logger.js';

export class EmotionSystem {
  private emotionHistory: Emotion[] = [];
  private emotionMemory: Map<string, number> = new Map();
  private maxHistoryLength: number = 500;
  private emotionalBaseline: { valence: number; arousal: number } = { valence: 0, arousal: 0.5 };

  constructor() {
    this.initializeEmotionSystem();
  }

  initialize(): void {
    emotionLogger.info('Emotion system initialized');
  }

  private initializeEmotionSystem(): void {
    // Initialize with neutral emotional state
    this.emotionHistory.push({
      valence: 0,
      arousal: 0.5,
      dimensions: new Array(CONSTANTS.EMOTION.DIMENSION_COUNT).fill(0),
      timestamp: Date.now()
    });
  }

  extractEmotions(internalState: Float32Array): Emotion {
    try {
      // Extract emotional dimensions from neural activations
      const dimensions = this.extractEmotionalDimensions(internalState);

      // Calculate valence (positive/negative) from dimensional activations
      const valence = this.calculateValence(dimensions);

      // Calculate arousal (energy level) from dimensional activations
      const arousal = this.calculateArousal(dimensions);

      const emotion: Emotion = {
        valence: this.clampValue(valence, -1, 1),
        arousal: this.clampValue(arousal, 0, 1),
        dimensions: dimensions.map(d => this.clampValue(d, -1, 1)),
        timestamp: Date.now()
      };

      // Update emotion history
      this.updateEmotionHistory(emotion);

      // Update emotional memory and baseline
      this.updateEmotionalMemory(emotion);

      emotionLogger.debug('Extracted emotion', {
        valence: emotion.valence.toFixed(3),
        arousal: emotion.arousal.toFixed(3),
        primaryDimension: this.getPrimaryDimension(emotion.dimensions)
      });

      return emotion;

    } catch (error) {
      emotionLogger.error('Error extracting emotions:', error);
      // Return neutral emotion on error
      return {
        valence: 0,
        arousal: 0.5,
        dimensions: new Array(CONSTANTS.EMOTION.DIMENSION_COUNT).fill(0),
        timestamp: Date.now()
      };
    }
  }

  private extractEmotionalDimensions(internalState: Float32Array): number[] {
    const dimensions: number[] = [];

    try {
      // Use different portions of the neural activation vector for different emotional dimensions
      const activationGroups = this.groupActivations(internalState);

      for (let i = 0; i < CONSTANTS.EMOTION.DIMENSION_COUNT; i++) {
        const groupIndex = i % activationGroups.length;
        const activationGroup = activationGroups[groupIndex];

        // Calculate emotional dimension from neural activations
        let dimensionValue = 0;

        // Use statistical properties of activations
        const mean = activationGroup.reduce((sum, val) => sum + val, 0) / activationGroup.length;
        const variance = this.calculateVariance(activationGroup, mean);
        const activation = this.calculateActivationLevel(activationGroup);

        // Combine different statistical measures to form emotional dimensions
        dimensionValue = (mean * 0.4) + (variance * 0.3) + (activation * 0.3);

        // Apply non-linear transformation for more complex emotional dynamics
        dimensionValue = this.applyEmotionalTransformation(dimensionValue, i);

        dimensions.push(dimensionValue);
      }

    } catch (error) {
      emotionLogger.debug('Error extracting emotional dimensions:', error);
      // Return neutral dimensions on error
      return new Array(CONSTANTS.EMOTION.DIMENSION_COUNT).fill(0);
    }

    return dimensions;
  }

  private groupActivations(activations: Float32Array): Float32Array[] {
    const groups: Float32Array[] = [];
    const groupSize = Math.floor(activations.length / CONSTANTS.EMOTION.DIMENSION_COUNT);

    for (let i = 0; i < activations.length; i += groupSize) {
      const group = activations.slice(i, Math.min(i + groupSize, activations.length));
      groups.push(group);
    }

    // Ensure we have enough groups
    while (groups.length < CONSTANTS.EMOTION.DIMENSION_COUNT) {
      groups.push(new Float32Array(groupSize).fill(0));
    }

    return groups;
  }

  private calculateVariance(values: Float32Array, mean: number): number {
    if (values.length === 0) return 0;

    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return variance;
  }

  private calculateActivationLevel(values: Float32Array): number {
    if (values.length === 0) return 0;

    // Calculate the average absolute activation (similar to firing rate)
    const totalActivation = values.reduce((sum, val) => sum + Math.abs(val), 0);
    return totalActivation / values.length;
  }

  private applyEmotionalTransformation(value: number, dimensionIndex: number): number {
    // Apply different non-linear transformations based on dimension type
    const transformations = [
      // Dimension 0: Approach/avoid tendency
      (x: number) => Math.tanh(x * 2),

      // Dimension 1: Social engagement
      (x: number) => 1 / (1 + Math.exp(-x * 3)),

      // Dimension 2: Exploration/exploitation balance
      (x: number) => (Math.sin(x * Math.PI) + 1) / 2,

      // Dimension 3: Certainty/confusion
      (x: number) => Math.abs(x),

      // Dimension 4: Energy conservation/expenditure
      (x: number) => Math.pow(Math.max(0, x), 0.5),

      // Dimension 5: Novelty seeking/familiarity preference
      (x: number) => Math.atan(x) / (Math.PI / 2),

      // Dimension 6: Risk tolerance
      (x: number) => Math.sign(x) * Math.pow(Math.abs(x), 0.7),

      // Dimension 7: Temporal orientation (past/future focus)
      (x: number) => x * 0.5
    ];

    const transformIndex = dimensionIndex % transformations.length;
    return transformations[transformIndex](value);
  }

  private calculateValence(dimensions: number[]): number {
    try {
      // Valence is calculated from specific emotional dimensions
      // These weights determine how each dimension contributes to positive/negative feeling

      const valenceWeights = [
        0.3,   // Approach/avoid (positive = approach)
        0.2,   // Social engagement (positive = social)
        0.1,   // Exploration (positive = exploration)
        0.15,  // Certainty (positive = certain)
        0.05,  // Energy (slightly positive = high energy)
        0.1,   // Novelty seeking (positive = novelty)
        -0.1,  // Risk tolerance (negative = risk seeking)
        0.0    // Temporal orientation (neutral for valence)
      ];

      let valence = 0;
      for (let i = 0; i < Math.min(dimensions.length, valenceWeights.length); i++) {
        valence += dimensions[i] * valenceWeights[i];
      }

      // Add emotional memory influence
      const memoryInfluence = this.getEmotionalMemoryInfluence();
      valence += memoryInfluence * 0.2;

      // Adjust by baseline
      valence -= this.emotionalBaseline.valence;

      return this.clampValue(valence, -1, 1);

    } catch (error) {
      emotionLogger.debug('Error calculating valence:', error);
      return 0;
    }
  }

  private calculateArousal(dimensions: number[]): number {
    try {
      // Arousal is calculated from dimensions related to energy and activation

      const arousalWeights = [
        0.2,   // Approach/avoid (high arousal = strong tendency)
        0.15,  // Social engagement (moderate arousal contribution)
        0.25,  // Exploration (high arousal = exploration)
        0.1,   // Certainty (low arousal = certainty)
        0.3,   // Energy (direct contribution to arousal)
        0.2,   // Novelty seeking (high arousal = novelty seeking)
        0.15,  // Risk tolerance (high arousal = risk taking)
        0.05   // Temporal orientation (minimal contribution)
      ];

      let arousal = 0;
      for (let i = 0; i < Math.min(dimensions.length, arousalWeights.length); i++) {
        arousal += Math.abs(dimensions[i]) * arousalWeights[i];
      }

      // Ensure minimum arousal level
      arousal = Math.max(0.1, arousal);

      // Adjust by baseline
      arousal -= this.emotionalBaseline.arousal;

      return this.clampValue(arousal, 0, 1);

    } catch (error) {
      emotionLogger.debug('Error calculating arousal:', error);
      return 0.5;
    }
  }

  private updateEmotionHistory(emotion: Emotion): void {
    this.emotionHistory.push(emotion);

    // Maintain maximum history length
    if (this.emotionHistory.length > this.maxHistoryLength) {
      this.emotionHistory.shift();
    }
  }

  private updateEmotionalMemory(emotion: Emotion): void {
    try {
      // Store significant emotional events in memory
      const emotionKey = this.categorizeEmotion(emotion);
      const currentStrength = this.emotionMemory.get(emotionKey) || 0;

      // Strengthen emotional memory based on intensity
      const intensity = Math.sqrt(emotion.valence * emotion.valence + emotion.arousal * emotion.arousal);
      const newStrength = Math.min(1.0, currentStrength + intensity * 0.01);

      this.emotionMemory.set(emotionKey, newStrength);

      // Update emotional baseline slowly over time
      this.updateEmotionalBaseline(emotion);

    } catch (error) {
      emotionLogger.debug('Error updating emotional memory:', error);
    }
  }

  private updateEmotionalBaseline(emotion: Emotion): void {
    const learningRate = 0.001;
    this.emotionalBaseline.valence += (emotion.valence - this.emotionalBaseline.valence) * learningRate;
    this.emotionalBaseline.arousal += (emotion.arousal - this.emotionalBaseline.arousal) * learningRate;
  }

  private getEmotionalMemoryInfluence(): number {
    if (this.emotionMemory.size === 0) return 0;

    // Calculate overall emotional memory bias
    const memoryValues = Array.from(this.emotionMemory.values());
    const averageStrength = memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length;

    // Return bias towards positive emotions (homeostatic tendency)
    return averageStrength * 0.1;
  }

  private categorizeEmotion(emotion: Emotion): string {
    // Categorize emotion based on valence and arousal
    if (emotion.valence > 0.5 && emotion.arousal > 0.7) return 'excited';
    if (emotion.valence > 0.5 && emotion.arousal < 0.3) return 'calm';
    if (emotion.valence > 0.3 && emotion.arousal > 0.5) return 'happy';
    if (emotion.valence < -0.5 && emotion.arousal > 0.7) return 'angry';
    if (emotion.valence < -0.5 && emotion.arousal < 0.3) return 'sad';
    if (emotion.valence < -0.3 && emotion.arousal > 0.5) return 'fearful';
    if (Math.abs(emotion.valence) < 0.2 && emotion.arousal > 0.6) return 'surprised';
    return 'neutral';
  }

  private getPrimaryDimension(dimensions: number[]): number {
    if (dimensions.length === 0) return 0;

    let maxValue = 0;
    let maxIndex = 0;

    for (let i = 0; i < dimensions.length; i++) {
      if (Math.abs(dimensions[i]) > maxValue) {
        maxValue = Math.abs(dimensions[i]);
        maxIndex = i;
      }
    }

    return maxIndex;
  }

  generateAbstractThought(internalState: tf.Tensor): Thought | null {
    try {
      // Generate non-linguistic abstract thoughts based on internal state
      const internalData = internalState.arraySync() as number[];

      // Calculate thought properties from neural state
      const complexity = this.calculateThoughtComplexity(internalData);
      const coherence = this.calculateThoughtCoherence(internalData);
      const novelty = this.calculateThoughtNovelty(internalData);

      // Only generate thought if conditions are met
      if (complexity > 0.3 && coherence > 0.4) {
        const thought: Thought = {
          id: this.generateThoughtId(),
          type: 'abstract',
          content: '',  // Empty for abstract thoughts
          properties: {
            complexity,
            coherence,
            novelty,
            emotionalTone: this.getEmotionalTone(internalData),
            confidence: coherence * (1 - novelty * 0.5)
          },
          timestamp: Date.now()
        };

        emotionLogger.debug('Generated abstract thought', {
          complexity: complexity.toFixed(3),
          coherence: coherence.toFixed(3),
          novelty: novelty.toFixed(3)
        });

        return thought;
      }

    } catch (error) {
      emotionLogger.debug('Error generating abstract thought:', error);
    }

    return null;
  }

  private calculateThoughtComplexity(internalData: number[]): number {
    // Complexity based on variation and patterns in neural activation
    const variance = this.calculateVariance(Float32Array.from(internalData),
      internalData.reduce((sum, val) => sum + val, 0) / internalData.length);
    return Math.min(1.0, variance * 10);
  }

  private calculateThoughtCoherence(internalData: number[]): number {
    // Coherence based on consistency of activation patterns
    const mean = internalData.reduce((sum, val) => sum + val, 0) / internalData.length;
    const consistency = 1 - this.calculateVariance(Float32Array.from(internalData), mean);
    return Math.max(0, consistency);
  }

  private calculateThoughtNovelty(internalData: number[]): number {
    // Novelty based on how different current state is from recent emotional states
    if (this.emotionHistory.length === 0) return 1.0;

    const recentEmotions = this.emotionHistory.slice(-10);
    let minDistance = Infinity;

    for (const emotion of recentEmotions) {
      const distance = this.calculateEmotionalDistance(internalData, emotion.dimensions);
      minDistance = Math.min(minDistance, distance);
    }

    return Math.min(1.0, minDistance);
  }

  private calculateEmotionalDistance(internalData: number[], emotionDimensions: number[]): number {
    if (internalData.length === 0 || emotionDimensions.length === 0) return 1.0;

    const minLength = Math.min(internalData.length, emotionDimensions.length);
    let totalDistance = 0;

    for (let i = 0; i < minLength; i++) {
      totalDistance += Math.abs(internalData[i] - emotionDimensions[i]);
    }

    return totalDistance / minLength;
  }

  private getEmotionalTone(internalData: number[]): 'positive' | 'negative' | 'neutral' {
    const mean = internalData.reduce((sum, val) => sum + val, 0) / internalData.length;
    if (mean > 0.1) return 'positive';
    if (mean < -0.1) return 'negative';
    return 'neutral';
  }

  private generateThoughtId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private clampValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // Public getters
  getEmotionHistory(): Emotion[] {
    return [...this.emotionHistory];
  }

  getCurrentEmotion(): Emotion | null {
    return this.emotionHistory.length > 0 ? this.emotionHistory[this.emotionHistory.length - 1] : null;
  }

  getEmotionalMemory(): Map<string, number> {
    return new Map(this.emotionMemory);
  }

  getEmotionalBaseline(): { valence: number; arousal: number } {
    return { ...this.emotionalBaseline };
  }

  dispose(): void {
    this.emotionHistory = [];
    this.emotionMemory.clear();
    emotionLogger.debug('Emotion system disposed');
  }
}