import { CONSTANTS } from '../constants/index.js';

export class SensorySystem {
  private currentInput: any = null;
  private processedData: Float32Array | null = null;
  private sensoryHistory: any[] = [];
  private maxHistoryLength: number = 100;

  constructor() {
    this.initializeEmptySensoryState();
  }

  initialize(): void {
    console.log('Sensory system initialized');
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

  processInput(rawInput: any): Float32Array {
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
    this.processedData = new Float32Array(combinedInput);

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

    return this.processedData;
  }

  private processVision(visionInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.VISION).fill(0);

    if (!visionInput || visionInput.length === 0) return processed;

    for (let i = 0; i < Math.min(visionInput.length, processed.length); i++) {
      if (i < 40) {
        processed[i] = this.normalizeDistance(visionInput[i]);
      } else if (i < 100) {
        processed[i] = this.normalizeColor(visionInput[i]);
      } else {
        processed[i] = Math.max(0, Math.min(1, visionInput[i]));
      }
    }

    return this.enhanceVisualFeatures(processed);
  }

  private processTouch(touchInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.TOUCH).fill(0);

    if (!touchInput || touchInput.length === 0) return processed;

    for (let i = 0; i < Math.min(touchInput.length, processed.length); i++) {
      if (i < 20) {
        processed[i] = this.normalizePressure(touchInput[i]);
      } else if (i < 40) {
        processed[i] = this.normalizeTexture(touchInput[i]);
      } else {
        processed[i] = this.normalizeTemperature(touchInput[i]);
      }
    }

    return processed;
  }

  private processSound(soundInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.SOUND).fill(0);

    if (!soundInput || soundInput.length === 0) return processed;

    for (let i = 0; i < Math.min(soundInput.length, processed.length); i++) {
      if (i < 10) {
        processed[i] = this.normalizeVolume(soundInput[i]);
      } else if (i < 30) {
        processed[i] = this.normalizePitch(soundInput[i]);
      } else {
        processed[i] = Math.max(0, Math.min(1, soundInput[i]));
      }
    }

    return processed;
  }

  private processSmell(smellInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.SMELL).fill(0);

    if (!smellInput || smellInput.length === 0) return processed;

    for (let i = 0; i < Math.min(smellInput.length, processed.length); i++) {
      processed[i] = Math.max(0, Math.min(1, smellInput[i]));
    }

    return processed;
  }

  private processTaste(tasteInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.TASTE).fill(0);

    if (!tasteInput || tasteInput.length === 0) return processed;

    for (let i = 0; i < Math.min(tasteInput.length, processed.length); i++) {
      processed[i] = Math.max(0, Math.min(1, tasteInput[i]));
    }

    return processed;
  }

  private processProprioception(proprioceptionInput: number[]): number[] {
    const processed = new Array(CONSTANTS.SENSORY_DIMENSIONS.PROPRIOCEPTION).fill(0);

    if (!proprioceptionInput || proprioceptionInput.length === 0) return processed;

    for (let i = 0; i < Math.min(proprioceptionInput.length, processed.length); i++) {
      if (i < 10) {
        processed[i] = this.normalizePosition(proprioceptionInput[i]);
      } else {
        processed[i] = this.normalizeVelocity(proprioceptionInput[i]);
      }
    }

    return processed;
  }

  // Normalization helpers
  private normalizeDistance(distance: number): number {
    const maxDistance = 50;
    return Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
  }

  private normalizeColor(colorValue: number): number {
    return Math.max(0, Math.min(1, colorValue / 255));
  }

  private normalizePressure(pressure: number): number {
    const maxPressure = 100;
    return Math.max(0, Math.min(1, pressure / maxPressure));
  }

  private normalizeTexture(texture: number): number {
    return Math.max(0, Math.min(1, texture));
  }

  private normalizeTemperature(temperature: number): number {
    const roomTemp = 20;
    const maxDelta = 30;
    const normalized = 0.5 + ((temperature - roomTemp) / maxDelta);
    return Math.max(0, Math.min(1, normalized));
  }

  private normalizeVolume(volume: number): number {
    const maxVolume = 120;
    return Math.max(0, Math.min(1, volume / maxVolume));
  }

  private normalizePitch(pitch: number): number {
    const minPitch = 20;
    const maxPitch = 20000;
    const normalized = (Math.log(pitch) - Math.log(minPitch)) / (Math.log(maxPitch) - Math.log(minPitch));
    return Math.max(0, Math.min(1, normalized));
  }

  private normalizePosition(position: number): number {
    const worldSize = 100;
    return Math.max(0, Math.min(1, (position + worldSize/2) / worldSize));
  }

  private normalizeVelocity(velocity: number): number {
    const maxVelocity = 10;
    return Math.max(0, Math.min(1, Math.abs(velocity) / maxVelocity));
  }

  private enhanceVisualFeatures(visualData: number[]): number[] {
    const enhanced = [...visualData];

    for (let i = 1; i < enhanced.length - 1; i++) {
      const edge = Math.abs(enhanced[i+1] - enhanced[i-1]);
      enhanced[i] = enhanced[i] * 0.7 + edge * 0.3;
    }

    return enhanced;
  }

  private storeInHistory(sensoryData: any): void {
    this.sensoryHistory.push(sensoryData);

    if (this.sensoryHistory.length > this.maxHistoryLength) {
      this.sensoryHistory.shift();
    }
  }

  getCurrentState(): any {
    if (!this.currentInput) {
      this.initializeEmptySensoryState();
    }

    return { ...this.currentInput };
  }

  getProcessedData(): Float32Array | null {
    return this.processedData;
  }

  dispose(): void {
    if (this.processedData) {
      // Float32Array doesn't need explicit disposal in browser
      this.processedData = null;
    }
    this.sensoryHistory = [];
  }
}