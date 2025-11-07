import * as tf from '@tensorflow/tfjs-node';
import { config, CONSTANTS } from '../config/index.js';
import { SensoryInput, SensoryData } from '../../shared/src/types/ai.js';
import { aiLogger } from '../utils/logger.js';

export class SensorySystem {
  private currentInput: SensoryInput | null = null;
  private processedData: tf.Tensor | null = null;
  private sensoryHistory: SensoryData[] = [];
  private maxHistoryLength: number = 100;

  constructor() {
    this.initializeEmptySensoryState();
  }

  initialize(): void {
    aiLogger.info('Sensory system initialized');
  }

  private initializeEmptySensoryState(): void {
    this.currentInput = {
      vision: new Array(CONSTANTS.SENSORY_DIMENSIONS.VISION).fill(0),
      touch: new Array(CONSTANTS.SENSORY_DIMENSIONS.TOUCH).fill(0),
      sound: new Array(CONSTANTS.SENSORY_DIMENSIONS.SOUND).fill(0),
      smell: new Array(CONSTANTS.SENSORY_DIMENSIONS.SMELL).fill(0),
      taste: new Array(CONSTANTS.SENSORY_DIMENSIONS.TASTE).fill(0),
      proprioception: new Array(CONSTANTS.SENSORY_DIMENSIONS.PROPRIOCEPTION).fill(0),
      language: null,
      timestamp: Date.now()
    };
  }

  processInput(rawInput: SensoryInput): tf.Tensor {
    try {
      // Store current input
      this.currentInput = { ...rawInput, timestamp: Date.now() };

      // Normalize and process each sensory modality
      const processedVision = this.processVision(rawInput.vision);
      const processedTouch = this.processTouch(rawInput.touch);
      const processedSound = this.processSound(rawInput.sound);
      const processedSmell = this.processSmell(rawInput.smell);
      const processedTaste = this.processTaste(rawInput.taste);
      const processedProprioception = this.processProprioception(rawInput.proprioception);

      // Combine all sensory modalities into unified input vector
      const combinedInput = [
        ...processedVision,
        ...processedTouch,
        ...processedSound,
        ...processedSmell,
        ...processedTaste,
        ...processedProprioception
      ];

      // Convert to tensor
      this.processedData = tf.tensor1d(combinedInput);

      // Store in history
      this.storeInHistory({
        timestamp: Date.now(),
        vision: processedVision,
        touch: processedTouch,
        sound: processedSound,
        smell: processedSmell,
        taste: processedTaste,
        proprioception: processedProprioception,
        language: rawInput.language
      });

      aiLogger.debug('Processed sensory input', {
        inputSize: combinedInput.length,
        hasLanguage: !!rawInput.language
      });

      return this.processedData;

    } catch (error) {
      aiLogger.error('Error processing sensory input:', error);
      // Return empty tensor on error
      return tf.zeros([CONSTANTS.NETWORK_DIMENSIONS.INPUT_SIZE]);
    }
  }

  private processVision(visionInput: number[]): number[] {
    // Process visual data (raycasting results)
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.VISION).fill(0);

    if (!visionInput || visionInput.length === 0) return processed;

    try {
      // Normalize visual input
      for (let i = 0; i < Math.min(visionInput.length, processed.length); i++) {
        // Normalize distance values (assuming first 40 values are distances)
        if (i < 40) {
          processed[i] = this.normalizeDistance(visionInput[i]);
        }
        // Normalize color values (assuming next 60 values are RGB channels)
        else if (i < 100) {
          processed[i] = this.normalizeColor(visionInput[i]);
        }
        // Normalize shape/object features (remaining 20 values)
        else {
          processed[i] = Math.max(0, Math.min(1, visionInput[i]));
        }
      }

      // Apply edge detection and feature enhancement
      return this.enhanceVisualFeatures(processed);

    } catch (error) {
      aiLogger.debug('Error processing vision input:', error);
      return processed;
    }
  }

  private processTouch(touchInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.TOUCH).fill(0);

    if (!touchInput || touchInput.length === 0) return processed;

    try {
      // Process tactile feedback
      for (let i = 0; i < Math.min(touchInput.length, processed.length); i++) {
        // Normalize force/pressure values
        if (i < 20) {
          processed[i] = this.normalizePressure(touchInput[i]);
        }
        // Normalize texture values
        else if (i < 40) {
          processed[i] = this.normalizeTexture(touchInput[i]);
        }
        // Normalize temperature values
        else {
          processed[i] = this.normalizeTemperature(touchInput[i]);
        }
      }

      return processed;

    } catch (error) {
      aiLogger.debug('Error processing touch input:', error);
      return processed;
    }
  }

  private processSound(soundInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.SOUND).fill(0);

    if (!soundInput || soundInput.length === 0) return processed;

    try {
      // Process audio features
      for (let i = 0; i < Math.min(soundInput.length, processed.length); i++) {
        // Normalize volume/loudness
        if (i < 10) {
          processed[i] = this.normalizeVolume(soundInput[i]);
        }
        // Normalize pitch/frequency
        else if (i < 30) {
          processed[i] = this.normalizePitch(soundInput[i]);
        }
        // Normalize direction/source location
        else {
          processed[i] = Math.max(0, Math.min(1, soundInput[i]));
        }
      }

      return processed;

    } catch (error) {
      aiLogger.debug('Error processing sound input:', error);
      return processed;
    }
  }

  private processSmell(smellInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.SMELL).fill(0);

    if (!smellInput || smellInput.length === 0) return processed;

    try {
      // Process chemical sensor data
      for (let i = 0; i < Math.min(smellInput.length, processed.length); i++) {
        // Normalize chemical concentration
        processed[i] = Math.max(0, Math.min(1, smellInput[i]));
      }

      return processed;

    } catch (error) {
      aiLogger.debug('Error processing smell input:', error);
      return processed;
    }
  }

  private processTaste(tasteInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.TASTE).fill(0);

    if (!tasteInput || tasteInput.length === 0) return processed;

    try {
      // Process taste simulation
      for (let i = 0; i < Math.min(tasteInput.length, processed.length); i++) {
        // Normalize taste intensity (sweet, sour, salty, bitter, umami)
        processed[i] = Math.max(0, Math.min(1, tasteInput[i]));
      }

      return processed;

    } catch (error) {
      aiLogger.debug('Error processing taste input:', error);
      return processed;
    }
  }

  private processProprioception(proprioceptionInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.PROPRIOCEPTION).fill(0);

    if (!proprioceptionInput || proprioceptionInput.length === 0) return processed;

    try {
      // Process body position and movement data
      for (let i = 0; i < Math.min(proprioceptionInput.length, processed.length); i++) {
        // Normalize position/orientation values
        if (i < 10) {
          processed[i] = this.normalizePosition(proprioceptionInput[i]);
        }
        // Normalize velocity/force values
        else {
          processed[i] = this.normalizeVelocity(proprioceptionInput[i]);
        }
      }

      return processed;

    } catch (error) {
      aiLogger.debug('Error processing proprioception input:', error);
      return processed;
    }
  }

  // Normalization helper functions
  private normalizeDistance(distance: number): number {
    // Convert distance to normalized proximity (0 = far, 1 = near)
    const maxDistance = 50; // Maximum detectable distance
    return Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
  }

  private normalizeColor(colorValue: number): number {
    // Normalize color values (0-255 -> 0-1)
    return Math.max(0, Math.min(1, colorValue / 255));
  }

  private normalizePressure(pressure: number): number {
    // Normalize pressure values
    const maxPressure = 100; // Maximum pressure sensor value
    return Math.max(0, Math.min(1, pressure / maxPressure));
  }

  private normalizeTexture(texture: number): number {
    // Normalize texture roughness values
    return Math.max(0, Math.min(1, texture));
  }

  private normalizeTemperature(temperature: number): number {
    // Normalize temperature values (assuming input is in Celsius)
    // Map to 0-1 range where 0.5 is room temperature (20°C)
    const roomTemp = 20;
    const maxDelta = 30; // Maximum temperature deviation from room temp
    const normalized = 0.5 + ((temperature - roomTemp) / maxDelta);
    return Math.max(0, Math.min(1, normalized));
  }

  private normalizeVolume(volume: number): number {
    // Normalize audio volume (decibels to 0-1)
    const maxVolume = 120; // Maximum decibel level
    return Math.max(0, Math.min(1, volume / maxVolume));
  }

  private normalizePitch(pitch: number): number {
    // Normalize pitch frequency (Hz to 0-1)
    const minPitch = 20;   // Minimum detectable frequency
    const maxPitch = 20000; // Maximum detectable frequency
    const normalized = (Math.log(pitch) - Math.log(minPitch)) / (Math.log(maxPitch) - Math.log(minPitch));
    return Math.max(0, Math.min(1, normalized));
  }

  private normalizePosition(position: number): number {
    // Normalize position coordinates
    const worldSize = 100; // World dimension
    return Math.max(0, Math.min(1, (position + worldSize/2) / worldSize));
  }

  private normalizeVelocity(velocity: number): number {
    // Normalize velocity values
    const maxVelocity = 10; // Maximum expected velocity
    return Math.max(0, Math.min(1, Math.abs(velocity) / maxVelocity));
  }

  private enhanceVisualFeatures(visualData: number[]): number[] {
    // Apply simple edge detection and feature enhancement
    const enhanced = [...visualData];

    try {
      // Simple edge detection using discrete differences
      for (let i = 1; i < enhanced.length - 1; i++) {
        const edge = Math.abs(enhanced[i+1] - enhanced[i-1]);
        enhanced[i] = enhanced[i] * 0.7 + edge * 0.3; // Blend original with edge detection
      }

      // Apply contrast enhancement
      const mean = enhanced.reduce((sum, val) => sum + val, 0) / enhanced.length;
      const contrastFactor = 1.2;
      for (let i = 0; i < enhanced.length; i++) {
        enhanced[i] = Math.max(0, Math.min(1, (enhanced[i] - mean) * contrastFactor + mean));
      }

    } catch (error) {
      aiLogger.debug('Error enhancing visual features:', error);
    }

    return enhanced;
  }

  private storeInHistory(sensoryData: SensoryData): void {
    this.sensoryHistory.push(sensoryData);

    // Maintain maximum history length
    if (this.sensoryHistory.length > this.maxHistoryLength) {
      this.sensoryHistory.shift();
    }
  }

  getCurrentState(): SensoryInput {
    if (!this.currentInput) {
      this.initializeEmptySensoryState();
    }

    return { ...this.currentInput! };
  }

  getProcessedData(): tf.Tensor | null {
    return this.processedData;
  }

  getSensoryHistory(): SensoryData[] {
    return [...this.sensoryHistory];
  }

  detectNovelty(newInput: SensoryInput): number {
    if (this.sensoryHistory.length === 0) return 1.0;

    try {
      // Compare with recent sensory history to detect novelty
      const recentInputs = this.sensoryHistory.slice(-10);
      let totalDifference = 0;
      let comparisons = 0;

      for (const historicalInput of recentInputs) {
        const difference = this.calculateSensoryDifference(newInput, historicalInput);
        totalDifference += difference;
        comparisons++;
      }

      const averageDifference = comparisons > 0 ? totalDifference / comparisons : 0;
      return Math.min(1.0, averageDifference);

    } catch (error) {
      aiLogger.debug('Error detecting novelty:', error);
      return 0.5; // Default novelty level
    }
  }

  private calculateSensoryDifference(input1: SensoryInput, input2: SensoryData): number {
    let totalDifference = 0;
    let features = 0;

    // Compare each sensory modality
    const modalities: (keyof SensoryInput)[] = ['vision', 'touch', 'sound', 'smell', 'taste', 'proprioception'];

    for (const modality of modalities) {
      const data1 = input1[modality] as number[];
      const data2 = input2[modality];

      if (data1 && data2) {
        for (let i = 0; i < Math.min(data1.length, data2.length); i++) {
          totalDifference += Math.abs(data1[i] - data2[i]);
          features++;
        }
      }
    }

    return features > 0 ? totalDifference / features : 0;
  }

  dispose(): void {
    if (this.processedData) {
      this.processedData.dispose();
      this.processedData = null;
    }
    this.sensoryHistory = [];
    aiLogger.debug('Sensory system disposed');
  }
}