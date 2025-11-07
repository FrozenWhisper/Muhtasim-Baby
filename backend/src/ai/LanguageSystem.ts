import * as tf from '@tensorflow/tfjs-node';
import { config, CONSTANTS } from '../config/index.js';
import { Thought, WordAssociation, LanguageState } from '../../shared/src/types/ai.js';
import { languageLogger } from '../utils/logger.js';

interface VocabularyWord {
  word: string;
  embedding: Float32Array;
  associations: WordAssociation[];
  frequency: number;
  lastUsed: number;
  contexts: string[]; // Sensory contexts where word was heard
}

interface GrammarPattern {
  pattern: string[];
  frequency: number;
  meaning: Float32Array;
}

export class LanguageSystem {
  private vocabulary: Map<string, VocabularyWord> = new Map();
  private grammarPatterns: GrammarPattern[] = [];
  private currentComprehensionLevel: number = 0;
  private wordContextHistory: Array<{ word: string; context: any; timestamp: number }> = [];
  private languageProductionHistory: string[] = [];

  constructor() {
    this.initializeLanguageSystem();
  }

  initialize(): void {
    languageLogger.info('Language system initialized - starting with zero knowledge');
  }

  private initializeLanguageSystem(): void {
    // Start with empty vocabulary - AI must learn everything
    this.currentComprehensionLevel = 0;
    this.vocabulary.clear();
    this.grammarPatterns = [];
  }

  async processLanguageInput(languageInput: any, attention: any): Promise<void> {
    try {
      if (!languageInput || !languageInput.words) return;

      const words = this.tokenizeWords(languageInput.words);
      const sensoryContext = this.extractSensoryContext(languageInput);

      // Process each word
      for (const word of words) {
        await this.processWord(word, sensoryContext, attention);
      }

      // Learn grammar patterns from word sequences
      this.learnGrammarPatterns(words, sensoryContext);

      // Update comprehension level
      this.updateComprehensionLevel();

      languageLogger.debug('Processed language input', {
        words: words.length,
        vocabularySize: this.vocabulary.size,
        comprehensionLevel: this.currentComprehensionLevel.toFixed(3)
      });

    } catch (error) {
      languageLogger.error('Error processing language input:', error);
    }
  }

  private tokenizeWords(input: string): string[] {
    // Simple tokenization - can be improved later
    return input.toLowerCase()
      .replace(/[.,!?;:]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private extractSensoryContext(languageInput: any): any {
    // Extract relevant sensory context from language input
    return {
      visual: languageInput.visualContext || null,
      objects: languageInput.presentObjects || [],
      actions: languageInput.currentActions || [],
      emotions: languageInput.speakerEmotion || null,
      timestamp: Date.now()
    };
  }

  private async processWord(word: string, sensoryContext: any, attention: any): Promise<void> {
    try {
      if (!this.vocabulary.has(word)) {
        // New word - create initial entry
        await this.learnNewWord(word, sensoryContext, attention);
      } else {
        // Existing word - strengthen associations
        await this.strengthenWordAssociations(word, sensoryContext, attention);
      }

      // Store word-context pair for learning
      this.wordContextHistory.push({
        word,
        context: sensoryContext,
        timestamp: Date.now()
      });

      // Maintain history size
      if (this.wordContextHistory.length > 10000) {
        this.wordContextHistory = this.wordContextHistory.slice(-5000);
      }

    } catch (error) {
      languageLogger.debug('Error processing word:', word, error);
    }
  }

  private async learnNewWord(word: string, sensoryContext: any, attention: any): Promise<void> {
    try {
      // Create initial embedding based on sensory context
      const embedding = this.createInitialEmbedding(sensoryContext, attention);

      const vocabularyWord: VocabularyWord = {
        word,
        embedding,
        associations: [],
        frequency: 1,
        lastUsed: Date.now(),
        contexts: [this.serializeContext(sensoryContext)]
      };

      this.vocabulary.set(word, vocabularyWord);

      // Create initial associations if context is strong
      if (attention && attention.target) {
        const association = this.createInitialAssociation(word, sensoryContext, attention);
        if (association) {
          vocabularyWord.associations.push(association);
        }
      }

      languageLogger.debug('Learned new word', { word, associations: vocabularyWord.associations.length });

    } catch (error) {
      languageLogger.error('Error learning new word:', word, error);
    }
  }

  private createInitialEmbedding(sensoryContext: any, attention: any): Float32Array {
    const embedding = new Float32Array(CONSTANTS.LANGUAGE.SEMANTIC_VECTOR_SIZE).fill(0);

    try {
      // Use sensory features to create initial word embedding
      let featureIndex = 0;

      // Visual features
      if (sensoryContext.visual && Array.isArray(sensoryContext.visual)) {
        const visualFeatures = sensoryContext.visual.slice(0, 20);
        for (let i = 0; i < Math.min(visualFeatures.length, 20); i++) {
          embedding[featureIndex++] = visualFeatures[i];
        }
      }

      // Object features
      if (sensoryContext.objects && sensoryContext.objects.length > 0) {
        const objectFeatures = this.extractObjectFeatures(sensoryContext.objects);
        for (let i = 0; i < Math.min(objectFeatures.length, 15); i++) {
          embedding[featureIndex++] = objectFeatures[i];
        }
      }

      // Action features
      if (sensoryContext.actions && sensoryContext.actions.length > 0) {
        const actionFeatures = this.extractActionFeatures(sensoryContext.actions);
        for (let i = 0; i < Math.min(actionFeatures.length, 15); i++) {
          embedding[featureIndex++] = actionFeatures[i];
        }
      }

      // Attention features
      if (attention) {
        embedding[featureIndex++] = attention.intensity || 0;
        embedding[featureIndex++] = attention.novelty || 0;
      }

      // Random features for unknown dimensions
      while (featureIndex < embedding.length) {
        embedding[featureIndex++] = (Math.random() - 0.5) * 0.1;
      }

      // Normalize embedding
      this.normalizeEmbedding(embedding);

    } catch (error) {
      languageLogger.debug('Error creating initial embedding:', error);
    }

    return embedding;
  }

  private extractObjectFeatures(objects: any[]): number[] {
    const features = new Array(15).fill(0);

    try {
      // Simple object feature extraction
      features[0] = Math.min(objects.length / 10, 1); // Object count
      features[1] = objects.some(obj => obj.type === 'sphere') ? 1 : 0;
      features[2] = objects.some(obj => obj.type === 'box') ? 1 : 0;
      features[3] = objects.some(obj => obj.type === 'cylinder') ? 1 : 0;

      // Average color features
      let totalColor = 0, colorCount = 0;
      objects.forEach(obj => {
        if (obj.color) {
          totalColor += obj.color;
          colorCount++;
        }
      });
      features[4] = colorCount > 0 ? totalColor / colorCount : 0;

    } catch (error) {
      languageLogger.debug('Error extracting object features:', error);
    }

    return features;
  }

  private extractActionFeatures(actions: any[]): number[] {
    const features = new Array(15).fill(0);

    try {
      features[0] = Math.min(actions.length / 5, 1); // Action count
      features[1] = actions.some(action => action.type === 'movement') ? 1 : 0;
      features[2] = actions.some(action => action.type === 'manipulation') ? 1 : 0;
      features[3] = actions.some(action => action.type === 'communication') ? 1 : 0;

    } catch (error) {
      languageLogger.debug('Error extracting action features:', error);
    }

    return features;
  }

  private createInitialAssociation(word: string, sensoryContext: any, attention: any): WordAssociation | null {
    try {
      if (!attention || !attention.target) return null;

      return {
        word,
        target: attention.target.id || 'unknown',
        targetFeatures: this.extractTargetFeatures(attention.target),
        strength: attention.intensity || 0.5,
        contexts: [this.serializeContext(sensoryContext)],
        lastConfirmed: Date.now()
      };

    } catch (error) {
      languageLogger.debug('Error creating initial association:', error);
      return null;
    }
  }

  private extractTargetFeatures(target: any): Float32Array {
    const features = new Float32Array(10).fill(0);

    try {
      features[0] = target.position?.x || 0;
      features[1] = target.position?.y || 0;
      features[2] = target.position?.z || 0;
      features[3] = target.color || 0;
      features[4] = target.size || 0;
      features[5] = target.type === 'sphere' ? 1 : 0;
      features[6] = target.type === 'box' ? 1 : 0;
      features[7] = target.type === 'cylinder' ? 1 : 0;

    } catch (error) {
      languageLogger.debug('Error extracting target features:', error);
    }

    return features;
  }

  private async strengthenWordAssociations(word: string, sensoryContext: any, attention: any): Promise<void> {
    try {
      const vocabularyWord = this.vocabulary.get(word);
      if (!vocabularyWord) return;

      // Update frequency and last used
      vocabularyWord.frequency++;
      vocabularyWord.lastUsed = Date.now();

      // Add context to contexts list
      const serializedContext = this.serializeContext(sensoryContext);
      if (!vocabularyWord.contexts.includes(serializedContext)) {
        vocabularyWord.contexts.push(serializedContext);
        // Limit contexts to prevent memory issues
        if (vocabularyWord.contexts.length > 100) {
          vocabularyWord.contexts = vocabularyWord.contexts.slice(-50);
        }
      }

      // Strengthen existing associations or create new ones
      if (attention && attention.target) {
        const existingAssociation = vocabularyWord.associations.find(
          assoc => assoc.target === attention.target.id
        );

        if (existingAssociation) {
          this.strengthenExistingAssociation(existingAssociation, sensoryContext, attention);
        } else {
          const newAssociation = this.createInitialAssociation(word, sensoryContext, attention);
          if (newAssociation) {
            vocabularyWord.associations.push(newAssociation);
          }
        }
      }

      // Update word embedding based on new context
      this.updateWordEmbedding(vocabularyWord, sensoryContext);

    } catch (error) {
      languageLogger.debug('Error strengthening word associations:', word, error);
    }
  }

  private strengthenExistingAssociation(association: WordAssociation, sensoryContext: any, attention: any): void {
    association.strength = Math.min(1.0, association.strength + 0.1);
    association.lastConfirmed = Date.now();

    const serializedContext = this.serializeContext(sensoryContext);
    if (!association.contexts.includes(serializedContext)) {
      association.contexts.push(serializedContext);
    }
  }

  private updateWordEmbedding(vocabularyWord: VocabularyWord, sensoryContext: any): void {
    try {
      // Create new embedding from current context
      const contextEmbedding = this.createContextEmbedding(sensoryContext);

      // Blend with existing embedding (learning rate)
      const learningRate = 0.1;
      for (let i = 0; i < vocabularyWord.embedding.length; i++) {
        vocabularyWord.embedding[i] =
          vocabularyWord.embedding[i] * (1 - learningRate) +
          contextEmbedding[i] * learningRate;
      }

      // Normalize updated embedding
      this.normalizeEmbedding(vocabularyWord.embedding);

    } catch (error) {
      languageLogger.debug('Error updating word embedding:', error);
    }
  }

  private createContextEmbedding(sensoryContext: any): Float32Array {
    const embedding = new Float32Array(CONSTANTS.LANGUAGE.SEMANTIC_VECTOR_SIZE).fill(0);

    // Create embedding from current context (similar to initial embedding)
    const objectFeatures = this.extractObjectFeatures(sensoryContext.objects || []);
    const actionFeatures = this.extractActionFeatures(sensoryContext.actions || []);

    // Combine features
    let featureIndex = 0;
    for (let i = 0; i < Math.min(objectFeatures.length, 20); i++) {
      embedding[featureIndex++] = objectFeatures[i];
    }
    for (let i = 0; i < Math.min(actionFeatures.length, 15); i++) {
      embedding[featureIndex++] = actionFeatures[i];
    }

    return embedding;
  }

  private normalizeEmbedding(embedding: Float32Array): void {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }
  }

  private learnGrammarPatterns(words: string[], sensoryContext: any): void {
    try {
      if (words.length < 2) return;

      // Learn n-grams (simple grammar patterns)
      for (let n = 2; n <= Math.min(words.length, 3); n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const pattern = words.slice(i, i + n);
          this.updateGrammarPattern(pattern, sensoryContext);
        }
      }

    } catch (error) {
      languageLogger.debug('Error learning grammar patterns:', error);
    }
  }

  private updateGrammarPattern(pattern: string[], sensoryContext: any): void {
    const patternString = pattern.join(' ');
    const existingPattern = this.grammarPatterns.find(p => p.pattern.join(' ') === patternString);

    if (existingPattern) {
      existingPattern.frequency++;
    } else {
      const newPattern: GrammarPattern = {
        pattern,
        frequency: 1,
        meaning: this.createPatternMeaning(pattern, sensoryContext)
      };
      this.grammarPatterns.push(newPattern);
    }

    // Limit grammar patterns
    if (this.grammarPatterns.length > 1000) {
      this.grammarPatterns = this.grammarPatterns
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 500);
    }
  }

  private createPatternMeaning(pattern: string[], sensoryContext: any): Float32Array {
    // Create meaning vector for grammar pattern based on constituent words
    const meaning = new Float32Array(CONSTANTS.LANGUAGE.SEMANTIC_VECTOR_SIZE).fill(0);

    let wordCount = 0;
    for (const word of pattern) {
      const vocabWord = this.vocabulary.get(word);
      if (vocabWord) {
        for (let i = 0; i < meaning.length; i++) {
          meaning[i] += vocabWord.embedding[i];
        }
        wordCount++;
      }
    }

    // Average the embeddings
    if (wordCount > 0) {
      for (let i = 0; i < meaning.length; i++) {
        meaning[i] /= wordCount;
      }
    }

    return meaning;
  }

  private updateComprehensionLevel(): void {
    try {
      // Calculate comprehension based on vocabulary size and grammar patterns
      const vocabularyScore = Math.min(this.vocabulary.size / 100, 1.0);
      const grammarScore = Math.min(this.grammarPatterns.length / 200, 1.0);
      const associationScore = this.calculateAssociationStrength();

      this.currentComprehensionLevel = (vocabularyScore * 0.4 + grammarScore * 0.3 + associationScore * 0.3);

    } catch (error) {
      languageLogger.debug('Error updating comprehension level:', error);
    }
  }

  private calculateAssociationStrength(): number {
    if (this.vocabulary.size === 0) return 0;

    let totalAssociations = 0;
    let totalStrength = 0;

    for (const vocabWord of this.vocabulary.values()) {
      totalAssociations += vocabWord.associations.length;
      totalStrength += vocabWord.associations.reduce((sum, assoc) => sum + assoc.strength, 0);
    }

    const avgAssociations = totalAssociations / this.vocabulary.size;
    const avgStrength = totalAssociations > 0 ? totalStrength / totalAssociations : 0;

    return Math.min((avgAssociations / 5) * avgStrength, 1.0);
  }

  async generateThought(internalState: Float32Array): Promise<Thought | null> {
    try {
      // Only generate thoughts if we have sufficient vocabulary
      if (this.vocabulary.size < 5) return null;

      const thought = await this.generateLinguisticThought(internalState);
      return thought;

    } catch (error) {
      languageLogger.debug('Error generating thought:', error);
      return null;
    }
  }

  private async generateLinguisticThought(internalState: Float32Array): Promise<Thought | null> {
    try {
      // Find words most similar to current internal state
      const relevantWords = this.findWordsForInternalState(internalState, 5);

      if (relevantWords.length === 0) return null;

      // Generate simple thought based on most relevant words
      const primaryWord = relevantWords[0];
      const thoughtContent = this.generateThoughtContent(relevantWords, internalState);

      const thought: Thought = {
        id: this.generateThoughtId(),
        type: 'linguistic',
        content: thoughtContent,
        properties: {
          confidence: this.calculateThoughtConfidence(relevantWords, internalState),
          complexity: Math.min(relevantWords.length / 3, 1.0),
          coherence: this.calculateThoughtCoherence(relevantWords),
          emotionalTone: this.getEmotionalTone(internalState),
          vocabularyUsed: relevantWords.map(w => w.word)
        },
        timestamp: Date.now()
      };

      // Store in production history
      this.languageProductionHistory.push(thoughtContent);
      if (this.languageProductionHistory.length > 1000) {
        this.languageProductionHistory = this.languageProductionHistory.slice(-500);
      }

      languageLogger.debug('Generated linguistic thought', {
        content: thoughtContent,
        confidence: thought.properties.confidence.toFixed(3),
        wordsUsed: relevantWords.length
      });

      return thought;

    } catch (error) {
      languageLogger.debug('Error generating linguistic thought:', error);
      return null;
    }
  }

  private findWordsForInternalState(internalState: Float32Array, limit: number): Array<{ word: string; similarity: number }> {
    const wordSimilarities: Array<{ word: string; similarity: number }> = [];

    for (const [word, vocabWord] of this.vocabulary.entries()) {
      const similarity = this.calculateEmbeddingSimilarity(internalState, vocabWord.embedding);
      if (similarity > CONSTANTS.LANGUAGE.WORD_ASSOCIATION_THRESHOLD) {
        wordSimilarities.push({ word, similarity });
      }
    }

    return wordSimilarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private calculateEmbeddingSimilarity(embedding1: Float32Array, embedding2: Float32Array): number {
    if (embedding1.length !== embedding2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private generateThoughtContent(relevantWords: Array<{ word: string; similarity: number }>, internalState: Float32Array): string {
    if (relevantWords.length === 0) return '';

    // Simple thought generation - can be made more sophisticated
    const primaryWord = relevantWords[0].word;

    if (relevantWords.length === 1) {
      return primaryWord;
    }

    // Try to use grammar patterns
    const pattern = this.findGrammarPattern(relevantWords.slice(0, 3));
    if (pattern) {
      return pattern.join(' ');
    }

    // Fallback: concatenate words
    return relevantWords.slice(0, Math.min(3, relevantWords.length)).map(w => w.word).join(' ');
  }

  private findGrammarPattern(words: Array<{ word: string; similarity: number }>): string[] | null {
    const wordStrings = words.map(w => w.word);

    for (const pattern of this.grammarPatterns) {
      if (pattern.frequency > 2) { // Only use established patterns
        // Check if pattern words match our relevant words
        const patternMatches = pattern.pattern.every(patternWord =>
          wordStrings.includes(patternWord)
        );

        if (patternMatches) {
          return pattern.pattern;
        }
      }
    }

    return null;
  }

  private calculateThoughtConfidence(relevantWords: Array<{ word: string; similarity: number }>, internalState: Float32Array): number {
    if (relevantWords.length === 0) return 0;

    const avgSimilarity = relevantWords.reduce((sum, w) => sum + w.similarity, 0) / relevantWords.length;
    const vocabularyFactor = Math.min(this.vocabulary.size / 50, 1.0);

    return avgSimilarity * vocabularyFactor;
  }

  private calculateThoughtCoherence(relevantWords: Array<{ word: string; similarity: number }>): number {
    if (relevantWords.length < 2) return 1.0;

    // Check how well the words relate to each other
    let totalCoherence = 0;
    let comparisons = 0;

    for (let i = 0; i < relevantWords.length; i++) {
      for (let j = i + 1; j < relevantWords.length; j++) {
        const word1 = this.vocabulary.get(relevantWords[i].word);
        const word2 = this.vocabulary.get(relevantWords[j].word);

        if (word1 && word2) {
          const similarity = this.calculateEmbeddingSimilarity(word1.embedding, word2.embedding);
          totalCoherence += similarity;
          comparisons++;
        }
      }
    }

    return comparisons > 0 ? totalCoherence / comparisons : 0.5;
  }

  private getEmotionalTone(internalState: Float32Array): 'positive' | 'negative' | 'neutral' {
    // Simple emotional tone based on internal state
    const average = internalState.reduce((sum, val) => sum + val, 0) / internalState.length;
    if (average > 0.1) return 'positive';
    if (average < -0.1) return 'negative';
    return 'neutral';
  }

  private serializeContext(context: any): string {
    return JSON.stringify(context);
  }

  private generateThoughtId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public getters
  getVocabularySize(): number {
    return this.vocabulary.size;
  }

  getComprehensionLevel(): number {
    return this.currentComprehensionLevel;
  }

  getWordAssociations(word: string): WordAssociation[] {
    const vocabWord = this.vocabulary.get(word);
    return vocabWord ? [...vocabWord.associations] : [];
  }

  getMostFrequentWords(limit: number): Array<{ word: string; frequency: number }> {
    const words = Array.from(this.vocabulary.entries())
      .map(([word, data]) => ({ word, frequency: data.frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);

    return words;
  }

  async getState(): Promise<LanguageState> {
    return {
      vocabularySize: this.vocabulary.size,
      grammarPatterns: this.grammarPatterns.length,
      comprehensionLevel: this.currentComprehensionLevel,
      totalWordUsage: Array.from(this.vocabulary.values()).reduce((sum, word) => sum + word.frequency, 0),
      productionsGenerated: this.languageProductionHistory.length
    };
  }

  async setState(state: LanguageState): Promise<void> {
    // Restore language state
    this.currentComprehensionLevel = state.comprehensionLevel;
    languageLogger.info('Language state restored', state);
  }

  dispose(): void {
    this.vocabulary.clear();
    this.grammarPatterns = [];
    this.wordContextHistory = [];
    this.languageProductionHistory = [];
    languageLogger.debug('Language system disposed');
  }
}