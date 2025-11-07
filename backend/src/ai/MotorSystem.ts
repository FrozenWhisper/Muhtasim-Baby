import { config, CONSTANTS } from '../config/index.js';
import { MotorCommand } from '../../shared/src/types/ai.js';
import { aiLogger } from '../utils/logger.js';

export class MotorSystem {
  private currentActions: MotorCommand[] = [];
  private motorHistory: MotorCommand[] = [];
  private learningProgress: Map<string, number> = new Map();
  private maxHistoryLength: number = 200;

  constructor() {
    this.initializeMotorSystem();
  }

  initialize(): void {
    aiLogger.info('Motor system initialized');
  }

  private initializeMotorSystem(): void {
    // Initialize motor learning progress for different action types
    this.learningProgress.set('movement', 0.1);
    this.learningProgress.set('manipulation', 0.1);
    this.learningProgress.set('communication', 0.1);
    this.learningProgress.set('exploration', 0.1);
  }

  executeActions(actionIntentions: Float32Array): MotorCommand[] {
    try {
      const commands: MotorCommand[] = [];

      // Parse action intentions into specific motor commands
      const movementCommands = this.parseMovementActions(actionIntentions);
      const manipulationCommands = this.parseManipulationActions(actionIntentions);
      const communicationCommands = this.parseCommunicationActions(actionIntentions);

      commands.push(...movementCommands, ...manipulationCommands, ...communicationCommands);

      // Apply motor learning and skill improvement
      const enhancedCommands = this.applyMotorLearning(commands);

      // Store current actions
      this.currentActions = enhancedCommands;

      // Update motor history
      this.updateMotorHistory(enhancedCommands);

      aiLogger.debug('Executed motor actions', {
        commandCount: enhancedCommands.length,
        primaryAction: enhancedCommands[0]?.type || 'none'
      });

      return enhancedCommands;

    } catch (error) {
      aiLogger.error('Error executing actions:', error);
      return [];
    }
  }

  private parseMovementActions(intentions: Float32Array): MotorCommand[] {
    const commands: MotorCommand[] = [];

    try {
      // Movement intentions are in the first portion of the action vector
      const movementStart = 0;
      const movementEnd = 20;

      // Extract movement parameters
      const forwardMovement = intentions[movementStart] || 0;
      const sidewaysMovement = intentions[movementStart + 1] || 0;
      const rotation = intentions[movementStart + 2] || 0;
      const jump = intentions[movementStart + 3] || 0;
      const speed = intentions[movementStart + 4] || 0;

      // Create movement command if there's significant intention
      const movementMagnitude = Math.sqrt(
        forwardMovement * forwardMovement +
        sidewaysMovement * sidewaysMovement +
        rotation * rotation +
        jump * jump
      );

      if (movementMagnitude > 0.1) {
        const skillLevel = this.learningProgress.get('movement') || 0.1;

        commands.push({
          id: this.generateCommandId(),
          type: 'movement',
          parameters: {
            direction: {
              x: sidewaysMovement * (0.5 + skillLevel * 0.5),  // Improve with skill
              y: jump * Math.max(0, skillLevel - 0.3),          // Jumping requires more skill
              z: forwardMovement * (0.5 + skillLevel * 0.5)
            },
            rotation: rotation * (0.5 + skillLevel * 0.5),
            speed: Math.max(0.1, Math.min(1.0, speed * (0.3 + skillLevel * 0.7))),
            skill: skillLevel
          },
          priority: this.calculatePriority('movement', movementMagnitude),
          timestamp: Date.now()
        });
      }

    } catch (error) {
      aiLogger.debug('Error parsing movement actions:', error);
    }

    return commands;
  }

  private parseManipulationActions(intentions: Float32Array): MotorCommand[] {
    const commands: MotorCommand[] = [];

    try {
      // Manipulation intentions are in the middle portion
      const manipulationStart = 20;
      const manipulationEnd = 40;

      // Extract manipulation parameters
      const reach = intentions[manipulationStart] || 0;
      const grasp = intentions[manipulationStart + 1] || 0;
      const push = intentions[manipulationStart + 2] || 0;
      const pull = intentions[manipulationStart + 3] || 0;
      const targetX = intentions[manipulationStart + 4] || 0;
      const targetY = intentions[manipulationStart + 5] || 0;
      const targetZ = intentions[manipulationStart + 6] || 0;

      // Determine manipulation type based on strongest intention
      const intentions = [
        { type: 'reach', value: Math.abs(reach) },
        { type: 'grasp', value: Math.abs(grasp) },
        { type: 'push', value: Math.abs(push) },
        { type: 'pull', value: Math.abs(pull) }
      ];

      const strongestIntention = intentions.reduce((max, current) =>
        current.value > max.value ? current : max
      );

      if (strongestIntention.value > 0.2) {
        const skillLevel = this.learningProgress.get('manipulation') || 0.1;

        commands.push({
          id: this.generateCommandId(),
          type: 'manipulation',
          parameters: {
            action: strongestIntention.type,
            target: {
              x: targetX,
              y: targetY,
              z: targetZ
            },
            force: strongestIntention.value * (0.4 + skillLevel * 0.6),
            precision: skillLevel,
            skill: skillLevel
          },
          priority: this.calculatePriority('manipulation', strongestIntention.value),
          timestamp: Date.now()
        });
      }

    } catch (error) {
      aiLogger.debug('Error parsing manipulation actions:', error);
    }

    return commands;
  }

  private parseCommunicationActions(intentions: Float32Array): MotorCommand[] {
    const commands: MotorCommand[] = [];

    try {
      // Communication intentions are in the final portion
      const communicationStart = 40;
      const communicationEnd = 50;

      // Extract communication parameters
      const vocalization = intentions[communicationStart] || 0;
      const gesture = intentions[communicationStart + 1] || 0;
      const expression = intentions[communicationStart + 2] || 0;

      // Parse facial expressions
      if (expression > 0.1) {
        const skillLevel = this.learningProgress.get('communication') || 0.1;

        commands.push({
          id: this.generateCommandId(),
          type: 'expression',
          parameters: {
            expression: this.mapExpressionFromValue(expression),
            intensity: expression * (0.3 + skillLevel * 0.7),
            duration: 1000 + (1 - expression) * 2000, // 1-3 seconds
            skill: skillLevel
          },
          priority: this.calculatePriority('communication', expression),
          timestamp: Date.now()
        });
      }

      // Parse gestures
      if (gesture > 0.1) {
        const skillLevel = this.learningProgress.get('communication') || 0.1;

        commands.push({
          id: this.generateCommandId(),
          type: 'gesture',
          parameters: {
            gesture: this.mapGestureFromValue(gesture),
            direction: this.mapGestureDirection(intentions, communicationStart + 3),
            energy: gesture * (0.4 + skillLevel * 0.6),
            skill: skillLevel
          },
          priority: this.calculatePriority('communication', gesture),
          timestamp: Date.now()
        });
      }

    } catch (error) {
      aiLogger.debug('Error parsing communication actions:', error);
    }

    return commands;
  }

  private applyMotorLearning(commands: MotorCommand[]): MotorCommand[] {
    return commands.map(command => {
      const skillLevel = this.learningProgress.get(command.type) || 0.1;

      // Apply skill-based improvements
      const enhancedCommand = { ...command };

      // Improve precision based on skill level
      if (command.parameters.skill !== undefined) {
        enhancedCommand.parameters.skill = Math.min(1.0, skillLevel);
      }

      // Reduce execution noise based on skill
      const noise = (1.0 - skillLevel) * 0.2;
      if (command.parameters.direction) {
        enhancedCommand.parameters.direction = {
          x: this.addNoise(command.parameters.direction.x, noise),
          y: this.addNoise(command.parameters.direction.y, noise),
          z: this.addNoise(command.parameters.direction.z, noise)
        };
      }

      return enhancedCommand;
    });
  }

  private updateMotorHistory(commands: MotorCommand[]): void {
    // Add commands to history
    this.motorHistory.push(...commands);

    // Maintain maximum history length
    if (this.motorHistory.length > this.maxHistoryLength) {
      this.motorHistory = this.motorHistory.slice(-this.maxHistoryLength);
    }

    // Update learning progress based on successful actions
    this.updateLearningProgress(commands);
  }

  private updateLearningProgress(commands: MotorCommand[]): void {
    const typeGroups = new Map<string, MotorCommand[]>();

    // Group commands by type
    commands.forEach(command => {
      if (!typeGroups.has(command.type)) {
        typeGroups.set(command.type, []);
      }
      typeGroups.get(command.type)!.push(command);
    });

    // Update learning progress for each type
    typeGroups.forEach((typeCommands, type) => {
      const currentProgress = this.learningProgress.get(type) || 0.1;
      const improvement = this.calculateImprovement(typeCommands);
      const newProgress = Math.min(1.0, currentProgress + improvement);
      this.learningProgress.set(type, newProgress);

      if (improvement > 0.001) {
        aiLogger.debug(`Motor skill improved: ${type}`, {
          previous: currentProgress.toFixed(3),
          new: newProgress.toFixed(3),
          improvement: improvement.toFixed(4)
        });
      }
    });
  }

  private calculateImprovement(commands: MotorCommand[]): number {
    if (commands.length === 0) return 0;

    // Calculate improvement based on command diversity and success
    const diversity = commands.length;
    const avgPriority = commands.reduce((sum, cmd) => sum + cmd.priority, 0) / commands.length;
    const avgSkill = commands.reduce((sum, cmd) =>
      sum + (cmd.parameters.skill || 0), 0) / commands.length;

    // Small incremental improvement
    return diversity * 0.0001 * avgPriority * (1 - avgSkill);
  }

  private calculatePriority(type: string, intention: number): number {
    // Base priority depends on intention strength
    let priority = intention;

    // Adjust priority based on current needs and context
    switch (type) {
      case 'movement':
        // Movement is generally high priority for exploration
        priority *= 1.2;
        break;
      case 'manipulation':
        // Manipulation priority depends on skill level
        const manipulationSkill = this.learningProgress.get('manipulation') || 0.1;
        priority *= (0.5 + manipulationSkill);
        break;
      case 'communication':
        // Communication priority increases with social development
        const communicationSkill = this.learningProgress.get('communication') || 0.1;
        priority *= (0.3 + communicationSkill * 0.7);
        break;
    }

    return Math.min(1.0, priority);
  }

  private mapExpressionFromValue(value: number): string {
    // Map neural activation to facial expressions
    if (value < 0.2) return 'neutral';
    if (value < 0.4) return 'curious';
    if (value < 0.6) return 'interested';
    if (value < 0.8) return 'excited';
    return 'joyful';
  }

  private mapGestureFromValue(value: number): string {
    // Map neural activation to gestures
    if (value < 0.25) return 'point';
    if (value < 0.5) return 'reach';
    if (value < 0.75) return 'wave';
    return 'embrace';
  }

  private mapGestureDirection(intentions: Float32Array, startIndex: number): { x: number; y: number; z: number } {
    return {
      x: intentions[startIndex] || 0,
      y: intentions[startIndex + 1] || 0,
      z: intentions[startIndex + 2] || 0
    };
  }

  private addNoise(value: number, noiseLevel: number): number {
    const noise = (Math.random() - 0.5) * 2 * noiseLevel;
    return Math.max(-1, Math.min(1, value + noise));
  }

  private generateCommandId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public getters
  getCurrentActions(): MotorCommand[] {
    return [...this.currentActions];
  }

  getMotorHistory(): MotorCommand[] {
    return [...this.motorHistory];
  }

  getSkillLevel(type: string): number {
    return this.learningProgress.get(type) || 0.1;
  }

  getAllSkillLevels(): Map<string, number> {
    return new Map(this.learningProgress);
  }

  dispose(): void {
    this.currentActions = [];
    this.motorHistory = [];
    this.learningProgress.clear();
    aiLogger.debug('Motor system disposed');
  }
}