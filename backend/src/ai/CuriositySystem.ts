import * as tf from '@tensorflow/tfjs-node';
import { config, CONSTANTS } from '../config/index.js';
import { Attention } from '../../shared/src/types/ai.js';
import { curiosityLogger } from '../utils/logger.js';

interface NoveltyMap {
  [key: string]: {
    familiarity: number;
    lastEncountered: number;
    predictionErrors: number[];
    explorationValue: number;
  };
}

interface ExplorationTarget {
  id: string;
  features: Float32Array;
  novelty: number;
  informationGain: number;
  accessibility: number;
  lastVisited: number;
}

export class CuriositySystem {
  private noveltyMap: NoveltyMap = {};
  private explorationTargets: ExplorationTarget[] = [];
  private currentCuriosityLevel: number = 1.0;
  private attentionHistory: Attention[] = [];
  private predictionErrorHistory: number[] = [];
  private maxHistoryLength: number = 1000;

  constructor() {
    this.initializeCuriositySystem();
  }

  initialize(): void {
    curiosityLogger.info('Curiosity system initialized - maximum curiosity');
  }

  private initializeCuriositySystem(): void {
    // Start with maximum curiosity (everything is novel to a newborn)
    this.currentCuriosityLevel = 1.0;
  }

  generateAttention(sensoryInput: tf.Tensor): Attention | null {
    try {
      // Convert tensor to array for processing
      const sensoryData = sensoryData.arraySync() as number[];

      // Calculate novelty for different aspects of sensory input
      const sensoryFeatures = this.extractSensoryFeatures(sensoryData);
      const noveltyScores = this.calculateNoveltyScores(sensoryFeatures);

      // Find most novel target
      const mostNovelTarget = this.findMostNovelTarget(sensoryFeatures, noveltyScores);

      if (mostNovelTarget && mostNovelTarget.novelty > CONSTANTS.CURIOSITY.NOVELTY_THRESHOLD) {
        const attention: Attention = {
          target: {
            id: this.generateTargetId(),
            features: mostNovelTarget.features,
            type: this.determineTargetType(mostNovelTarget.features)
          },
          intensity: mostNovelTarget.novelty,
          novelty: mostNovelTarget.novelty,
          informationGain: mostNovelTarget.informationGain,
          timestamp: Date.now()
        };

        // Update attention history
        this.updateAttentionHistory(attention);

        curiosityLogger.debug('Generated attention', {
          targetType: attention.target.type,
          novelty: attention.novelty.toFixed(3),
          informationGain: attention.informationGain.toFixed(3)
        });

        return attention;
      }

      return null;

    } catch (error) {
      curiosityLogger.error('Error generating attention:', error);
      return null;
    }
  }

  private extractSensoryFeatures(sensoryData: number[]): Float32Array {
    // Extract key features from sensory input for novelty detection
    const features = new Float32Array(50); // Reduced feature set for efficiency

    try {
      // Visual features (first 20 dimensions)
      for (let i = 0; i < Math.min(20, sensoryData.length); i++) {
        features[i] = sensoryData[i];
      }

      // Touch/texture features (next 10 dimensions)
      const touchStart = 120;
      for (let i = 0; i < Math.min(10, sensoryData.length - touchStart); i++) {
        features[20 + i] = sensoryData[touchStart + i];
      }

      // Sound features (next 10 dimensions)
      const soundStart = 180;
      for (let i = 0; i < Math.min(10, sensoryData.length - soundStart); i++) {
        features[30 + i] = sensoryData[soundStart + i];
      }

      // Proprioception/bodily state (last 10 dimensions)
      const proprioStart = 280;
      for (let i = 0; i < Math.min(10, sensoryData.length - proprioStart); i++) {
        features[40 + i] = sensoryData[proprioStart + i];
      }

    } catch (error) {
      curiosityLogger.debug('Error extracting sensory features:', error);
    }

    return features;
  }

  private calculateNoveltyScores(features: Float32Array): number[] {
    const scores: number[] = [];

    try {
      // Calculate novelty for different sensory modalities
      const modalities = [
        { name: 'visual', start: 0, size: 20 },
        { name: 'touch', start: 20, size: 10 },
        { name: 'sound', start: 30, size: 10 },
        { name: 'proprioception', start: 40, size: 10 }
      ];

      for (const modality of modalities) {
        const modalityFeatures = features.slice(modality.start, modality.start + modality.size);
        const novelty = this.calculateModalityNovelty(modality.name, modalityFeatures);
        scores.push(novelty);
      }

    } catch (error) {
      curiosityLogger.debug('Error calculating novelty scores:', error);
    }

    return scores;
  }

  private calculateModalityNovelty(modality: string, features: Float32Array): number {
    try {
      const featureKey = `${modality}_${this.hashFeatures(features)}`;
      const currentMemory = this.noveltyMap[featureKey];

      if (!currentMemory) {
        // First time encountering this exact pattern
        this.noveltyMap[featureKey] = {
          familiarity: 0,
          lastEncountered: Date.now(),
          predictionErrors: [],
          explorationValue: 1.0
        };
        return 1.0; // Maximum novelty
      }

      // Calculate novelty based on familiarity and time
      const timeSinceEncounter = Date.now() - currentMemory.lastEncountered;
      const timeDecay = Math.exp(-timeSinceEncounter / (5 * 60 * 1000)); // 5-minute half-life

      // Update familiarity
      currentMemory.familiarity = Math.min(1.0, currentMemory.familiarity + 0.1);
      currentMemory.lastEncountered = Date.now();

      const novelty = (1 - currentMemory.familiarity) * (1 + timeDecay * 0.5);
      return Math.min(1.0, novelty);

    } catch (error) {
      curiosityLogger.debug('Error calculating modality novelty:', error);
      return 0.5; // Default novelty
    }
  }

  private hashFeatures(features: Float32Array): string {
    // Simple hash of feature vector for pattern matching
    let hash = 0;
    for (let i = 0; i < Math.min(features.length, 10); i++) {
      hash = (hash * 31 + Math.round(features[i] * 100)) % 1000000;
    }
    return hash.toString();
  }

  private findMostNovelTarget(features: Float32Array, noveltyScores: number[]): ExplorationTarget | null {
    try {
      const maxNovelty = Math.max(...noveltyScores);
      if (maxNovelty < CONSTANTS.CURIOSITY.NOVELTY_THRESHOLD) return null;

      const maxIndex = noveltyScores.indexOf(maxNovelty);
      const targetFeatures = this.extractTargetFeatures(features, maxIndex);

      const target: ExplorationTarget = {
        id: this.generateTargetId(),
        features: targetFeatures,
        novelty: maxNovelty,
        informationGain: this.calculateInformationGain(targetFeatures, maxNovelty),
        accessibility: this.calculateAccessibility(targetFeatures),
        lastVisited: Date.now()
      };

      // Update exploration targets
      this.updateExplorationTargets(target);

      return target;

    } catch (error) {
      curiosityLogger.debug('Error finding most novel target:', error);
      return null;
    }
  }

  private extractTargetFeatures(features: Float32Array, modalityIndex: number): Float32Array {
    // Extract features for the most novel modality
    const modalityRanges = [
      { start: 0, size: 20 },   // visual
      { start: 20, size: 10 },  // touch
      { start: 30, size: 10 },  // sound
      { start: 40, size: 10 }   // proprioception
    ];

    const range = modalityRanges[modalityIndex];
    return features.slice(range.start, range.start + range.size);
  }

  private calculateInformationGain(features: Float32Array, novelty: number): number {
    try {
      // Information gain based on novelty and complexity
      const complexity = this.calculateFeatureComplexity(features);
      const informationGain = novelty * complexity * (1 + this.currentCuriosityLevel * 0.5);

      return Math.min(1.0, informationGain);

    } catch (error) {
      curiosityLogger.debug('Error calculating information gain:', error);
      return novelty;
    }
  }

  private calculateFeatureComplexity(features: Float32Array): number {
    // Calculate complexity as variance and unpredictability
    const mean = features.reduce((sum, val) => sum + val, 0) / features.length;
    const variance = features.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / features.length;

    // Add complexity from non-uniform distribution
    const entropy = this.calculateEntropy(features);

    return Math.min(1.0, (variance + entropy) / 2);
  }

  private calculateEntropy(features: Float32Array): number {
    // Calculate Shannon entropy of feature distribution
    const bins = 10;
    const binCounts = new Array(bins).fill(0);

    // Bin the features
    for (const feature of features) {
      const binIndex = Math.min(Math.floor(Math.abs(feature) * bins), bins - 1);
      binCounts[binIndex]++;
    }

    // Calculate entropy
    let entropy = 0;
    const total = features.length;

    for (const count of binCounts) {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    }

    return Math.min(1.0, entropy / 3.321928); // Normalize by log2(10)
  }

  private calculateAccessibility(features: Float32Array): number {
    // Calculate how accessible/exploitable the target is
    // This could be based on distance, energy required, etc.
    try {
      // Simple accessibility based on feature intensity
      const avgIntensity = features.reduce((sum, val) => sum + Math.abs(val), 0) / features.length;
      return Math.min(1.0, avgIntensity * 2);

    } catch (error) {
      curiosityLogger.debug('Error calculating accessibility:', error);
      return 0.5;
    }
  }

  private determineTargetType(features: Float32Array): string {
    // Determine what type of target this is based on features
    try {
      // Simple classification based on feature patterns
      const visualDominance = features.slice(0, 20).reduce((sum, val) => sum + Math.abs(val), 0);
      const touchDominance = features.slice(20, 30).reduce((sum, val) => sum + Math.abs(val), 0);
      const soundDominance = features.slice(30, 40).reduce((sum, val) => sum + Math.abs(val), 0);

      if (visualDominance > touchDominance && visualDominance > soundDominance) {
        return 'visual_object';
      } else if (touchDominance > soundDominance) {
        return 'tactile_object';
      } else if (soundDominance > 0.1) {
        return 'sound_source';
      } else {
        return 'unknown';
      }

    } catch (error) {
      curiosityLogger.debug('Error determining target type:', error);
      return 'unknown';
    }
  }

  private updateAttentionHistory(attention: Attention): void {
    this.attentionHistory.push(attention);

    // Maintain history size
    if (this.attentionHistory.length > this.maxHistoryLength) {
      this.attentionHistory = this.attentionHistory.slice(-this.maxHistoryLength / 2);
    }
  }

  private updateExplorationTargets(target: ExplorationTarget): void {
    // Check if target already exists
    const existingIndex = this.explorationTargets.findIndex(
      t => this.calculateTargetSimilarity(t.features, target.features) > 0.8
    );

    if (existingIndex >= 0) {
      // Update existing target
      const existing = this.explorationTargets[existingIndex];
      existing.lastVisited = Date.now();
      existing.novelty = (existing.novelty + target.novelty) / 2;
      existing.informationGain = (existing.informationGain + target.informationGain) / 2;
    } else {
      // Add new target
      this.explorationTargets.push(target);
    }

    // Maintain target list size
    if (this.explorationTargets.length > 100) {
      this.explorationTargets = this.explorationTargets
        .sort((a, b) => b.informationGain - a.informationGain)
        .slice(0, 50);
    }
  }

  private calculateTargetSimilarity(features1: Float32Array, features2: Float32Array): number {
    if (features1.length !== features2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < features1.length; i++) {
      dotProduct += features1[i] * features2[i];
      norm1 += features1[i] * features1[i];
      norm2 += features2[i] * features2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  updateCuriosity(sensoryInput: tf.Tensor, prediction: Float32Array): number {
    try {
      // Calculate prediction error
      const actualInput = sensoryInput.arraySync() as number[];
      const predictionError = this.calculatePredictionError(actualInput, prediction);

      // Update prediction error history
      this.predictionErrorHistory.push(predictionError);
      if (this.predictionErrorHistory.length > this.maxHistoryLength) {
        this.predictionErrorHistory = this.predictionErrorHistory.slice(-this.maxHistoryLength / 2);
      }

      // Update curiosity based on prediction error and other factors
      const curiosity = this.calculateCuriosityFromError(predictionError);

      // Apply curiosity decay over time
      this.applyCuriosityDecay();

      curiosityLogger.debug('Updated curiosity', {
        curiosity: curiosity.toFixed(3),
        predictionError: predictionError.toFixed(3),
        historyLength: this.predictionErrorHistory.length
      });

      return curiosity;

    } catch (error) {
      curiosityLogger.error('Error updating curiosity:', error);
      return this.currentCuriosityLevel;
    }
  }

  private calculatePredictionError(actual: number[], predicted: number[]): number {
    if (actual.length !== predicted.length) return 0;

    let totalError = 0;
    for (let i = 0; i < actual.length; i++) {
      totalError += Math.abs(actual[i] - predicted[i]);
    }

    return totalError / actual.length;
  }

  private calculateCuriosityFromError(predictionError: number): number {
    try {
      // Base curiosity from prediction error
      let curiosity = predictionError * 2; // Scale up prediction error impact

      // Add contribution from recent prediction errors (surprise factor)
      if (this.predictionErrorHistory.length > 10) {
        const recentErrors = this.predictionErrorHistory.slice(-10);
        const avgRecentError = recentErrors.reduce((sum, error) => sum + error, 0) / recentErrors.length;
        const surprise = Math.max(0, predictionError - avgRecentError);
        curiosity += surprise * 3; // Surprise has stronger impact
      }

      // Add exploration bonus
      const explorationBonus = this.calculateExplorationBonus();
      curiosity += explorationBonus;

      // Apply saturation
      this.currentCuriosityLevel = Math.min(1.0, Math.max(0.1, curiosity));

      return this.currentCuriosityLevel;

    } catch (error) {
      curiosityLogger.debug('Error calculating curiosity from error:', error);
      return this.currentCuriosityLevel;
    }
  }

  private calculateExplorationBonus(): number {
    try {
      // Bonus for having diverse exploration targets
      const targetDiversity = this.calculateTargetDiversity();
      const unexploredTargets = this.explorationTargets.filter(
        t => Date.now() - t.lastVisited > 60000 // 1 minute
      ).length;

      const diversityBonus = targetDiversity * 0.1;
      const unexploredBonus = (unexploredTargets / Math.max(1, this.explorationTargets.length)) * 0.2;

      return diversityBonus + unexploredBonus;

    } catch (error) {
      curiosityLogger.debug('Error calculating exploration bonus:', error);
      return 0;
    }
  }

  private calculateTargetDiversity(): number {
    if (this.explorationTargets.length < 2) return 0;

    let totalDiversity = 0;
    let comparisons = 0;

    for (let i = 0; i < this.explorationTargets.length; i++) {
      for (let j = i + 1; j < this.explorationTargets.length; j++) {
        const similarity = this.calculateTargetSimilarity(
          this.explorationTargets[i].features,
          this.explorationTargets[j].features
        );
        totalDiversity += (1 - similarity); // Diversity = 1 - similarity
        comparisons++;
      }
    }

    return comparisons > 0 ? totalDiversity / comparisons : 0;
  }

  private applyCuriosityDecay(): void {
    // Slowly decay curiosity over time to prevent endless exploration
    const decayRate = 0.0001; // Very slow decay
    this.currentCuriosityLevel *= (1 - decayRate);
    this.currentCuriosityLevel = Math.max(0.1, this.currentCuriosityLevel);
  }

  generateExplorationGoal(): ExplorationTarget | null {
    try {
      if (this.explorationTargets.length === 0) return null;

      // Select target based on exploration vs exploitation balance
      const explorationBias = CONSTANTS.CURIOSITY.EXPLORATION_BIAS;

      // Sort targets by exploration value
      const sortedTargets = this.explorationTargets
        .map(target => ({
          ...target,
          explorationScore: this.calculateExplorationScore(target, explorationBias)
        }))
        .sort((a, b) => b.explorationScore - a.explorationScore);

      return sortedTargets[0] || null;

    } catch (error) {
      curiosityLogger.error('Error generating exploration goal:', error);
      return null;
    }
  }

  private calculateExplorationScore(target: ExplorationTarget, explorationBias: number): number {
    try {
      const timeSinceVisit = Date.now() - target.lastVisited;
      const timeBonus = Math.min(timeSinceVisit / (5 * 60 * 1000), 1); // 5-minute cap

      const noveltyScore = target.novelty;
      const informationScore = target.informationGain;
      const accessibilityScore = target.accessibility;

      // Weighted combination
      const explorationScore =
        noveltyScore * 0.3 +
        informationScore * 0.3 +
        timeBonus * 0.2 +
        accessibilityScore * 0.2;

      // Apply exploration bias
      return explorationScore * (explorationBias + (1 - explorationBias) * timeBonus);

    } catch (error) {
      curiosityLogger.debug('Error calculating exploration score:', error);
      return 0;
    }
  }

  // Public getters
  getCurrentCuriosityLevel(): number {
    return this.currentCuriosityLevel;
  }

  getAttentionHistory(): Attention[] {
    return [...this.attentionHistory];
  }

  getExplorationTargets(): ExplorationTarget[] {
    return [...this.explorationTargets];
  }

  getPredictionErrorHistory(): number[] {
    return [...this.predictionErrorHistory];
  }

  private generateTargetId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  dispose(): void {
    this.noveltyMap = {};
    this.explorationTargets = [];
    this.attentionHistory = [];
    this.predictionErrorHistory = [];
    curiosityLogger.debug('Curiosity system disposed');
  }
}