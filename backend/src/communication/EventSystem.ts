import { EventEmitter } from 'events';
import { aiLogger, worldLogger, memoryLogger, emotionLogger, languageLogger, curiosityLogger } from '../utils/logger.js';

interface EventData {
  type: string;
  timestamp: number;
  source: string;
  data: any;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface EventSubscription {
  id: string;
  eventType: string;
  callback: (event: EventData) => void;
  filter?: (event: EventData) => boolean;
  once?: boolean;
}

export class EventSystem extends EventEmitter {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: EventData[] = [];
  private maxHistoryLength: number = 1000;
  private eventCounts: Map<string, number> = new Map();
  private performanceStats: {
    totalEvents: number;
    eventsPerSecond: number;
    lastResetTime: number;
  } = {
    totalEvents: 0,
    eventsPerSecond: 0,
    lastResetTime: Date.now()
  };

  constructor() {
    super();
    this.setupEventLogging();
  }

  private setupEventLogging(): void {
    // Log critical events
    this.on('critical', (event: EventData) => {
      this.logEvent(event, 'critical');
    });

    // Log high priority events
    this.on('high', (event: EventData) => {
      this.logEvent(event, 'high');
    });

    // Reset performance stats every second
    setInterval(() => {
      this.updatePerformanceStats();
    }, 1000);
  }

  publishEvent(eventData: {
    type: string;
    source: string;
    data: any;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): void {
    try {
      const event: EventData = {
        type: eventData.type,
        timestamp: Date.now(),
        source: eventData.source,
        data: eventData.data,
        priority: eventData.priority || 'medium'
      };

      // Add to history
      this.addToHistory(event);

      // Update event counts
      this.updateEventCounts(event);

      // Update performance stats
      this.performanceStats.totalEvents++;

      // Emit the event
      this.emit(event.type, event);
      this.emit(event.priority || 'medium', event);
      this.emit('*', event); // Wildcard event for all events

    } catch (error) {
      aiLogger.error('Error publishing event:', error);
    }
  }

  subscribe(eventType: string, callback: (event: EventData) => void, options: {
    filter?: (event: EventData) => boolean;
    once?: boolean;
    id?: string;
  } = {}): string {
    const subscription: EventSubscription = {
      id: options.id || this.generateSubscriptionId(),
      eventType,
      callback,
      filter: options.filter,
      once: options.once
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push(subscription);

    // Set up the actual event listener
    const eventCallback = (event: EventData) => {
      try {
        // Apply filter if present
        if (subscription.filter && !subscription.filter(event)) {
          return;
        }

        // Call the callback
        callback(event);

        // Remove subscription if it's a once subscription
        if (subscription.once) {
          this.unsubscribe(subscription.id);
        }

      } catch (error) {
        aiLogger.error('Error in event subscription callback:', error);
      }
    };

    this.on(eventType, eventCallback);

    aiLogger.debug('Event subscription created', {
      subscriptionId: subscription.id,
      eventType,
      hasFilter: !!subscription.filter,
      once: subscription.once
    });

    return subscription.id;
  }

  unsubscribe(subscriptionId: string): boolean {
    try {
      for (const [eventType, subscriptions] of this.subscriptions.entries()) {
        const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
        if (index !== -1) {
          const subscription = subscriptions[index];
          subscriptions.splice(index, 1);

          // Remove the event listener
          this.removeAllListeners(eventType);

          // Re-add remaining listeners
          subscriptions.forEach(remainingSub => {
            this.on(eventType, (event: EventData) => {
              if (remainingSub.filter && !remainingSub.filter(event)) {
                return;
              }
              remainingSub.callback(event);
            });
          });

          aiLogger.debug('Event subscription removed', {
            subscriptionId,
            eventType
          });

          return true;
        }
      }

      return false;

    } catch (error) {
      aiLogger.error('Error unsubscribing from event:', error);
      return false;
    }
  }

  unsubscribeAll(eventType?: string): void {
    try {
      if (eventType) {
        // Remove all subscriptions for a specific event type
        this.subscriptions.delete(eventType);
        this.removeAllListeners(eventType);
        aiLogger.debug('All subscriptions removed for event type', { eventType });
      } else {
        // Remove all subscriptions
        this.subscriptions.clear();
        this.removeAllListeners();
        aiLogger.debug('All event subscriptions removed');
      }

    } catch (error) {
      aiLogger.error('Error removing subscriptions:', error);
    }
  }

  // Convenience methods for common AI events
  publishAIEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    this.publishEvent({
      type: `ai.${eventType}`,
      source: 'ai_system',
      data,
      priority
    });
  }

  publishWorldEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    this.publishEvent({
      type: `world.${eventType}`,
      source: 'world_system',
      data,
      priority
    });
  }

  publishMemoryEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    this.publishEvent({
      type: `memory.${eventType}`,
      source: 'memory_system',
      data,
      priority
    });
  }

  publishEmotionEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    this.publishEvent({
      type: `emotion.${eventType}`,
      source: 'emotion_system',
      data,
      priority
    });
  }

  publishLanguageEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    this.publishEvent({
      type: `language.${eventType}`,
      source: 'language_system',
      data,
      priority
    });
  }

  publishCuriosityEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    this.publishEvent({
      type: `curiosity.${eventType}`,
      source: 'curiosity_system',
      data,
      priority
    });
  }

  // Query methods
  getEventHistory(eventType?: string, limit?: number): EventData[] {
    let history = eventType
      ? this.eventHistory.filter(event => event.type === eventType)
      : [...this.eventHistory];

    // Sort by timestamp (most recent first)
    history.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (limit) {
      history = history.slice(0, limit);
    }

    return history;
  }

  getEventCounts(eventType?: string): Map<string, number> {
    if (eventType) {
      const count = this.eventCounts.get(eventType) || 0;
      return new Map([[eventType, count]]);
    }

    return new Map(this.eventCounts);
  }

  getPerformanceStats(): {
    totalEvents: number;
    eventsPerSecond: number;
    topEventTypes: Array<{ type: string; count: number }>;
    subscriptionCount: number;
  } {
    const topEventTypes = Array.from(this.eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    let subscriptionCount = 0;
    for (const subscriptions of this.subscriptions.values()) {
      subscriptionCount += subscriptions.length;
    }

    return {
      totalEvents: this.performanceStats.totalEvents,
      eventsPerSecond: this.performanceStats.eventsPerSecond,
      topEventTypes,
      subscriptionCount
    };
  }

  // Utility methods
  createEventFilter(source?: string, dataFilter?: (data: any) => boolean): (event: EventData) => boolean {
    return (event: EventData) => {
      if (source && event.source !== source) {
        return false;
      }

      if (dataFilter && !dataFilter(event.data)) {
        return false;
      }

      return true;
    };
  }

  waitForEvent(eventType: string, timeout: number = 5000): Promise<EventData> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.unsubscribe(subscriptionId);
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);

      const subscriptionId = this.subscribe(eventType, (event) => {
        clearTimeout(timeoutId);
        resolve(event);
      }, { once: true });
    });
  }

  private addToHistory(event: EventData): void {
    this.eventHistory.push(event);

    // Maintain history size
    if (this.eventHistory.length > this.maxHistoryLength) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistoryLength / 2);
    }
  }

  private updateEventCounts(event: EventData): void {
    const currentCount = this.eventCounts.get(event.type) || 0;
    this.eventCounts.set(event.type, currentCount + 1);
  }

  private updatePerformanceStats(): void {
    const now = Date.now();
    const timeDiff = (now - this.performanceStats.lastResetTime) / 1000; // seconds

    if (timeDiff >= 1) {
      this.performanceStats.eventsPerSecond = this.performanceStats.totalEvents / timeDiff;
      this.performanceStats.totalEvents = 0;
      this.performanceStats.lastResetTime = now;
    }
  }

  private logEvent(event: EventData, level: string): void {
    const logMessage = `${event.type} from ${event.source}`;
    const logData = {
      eventType: event.type,
      source: event.source,
      timestamp: event.timestamp,
      data: event.data
    };

    switch (level) {
      case 'critical':
        aiLogger.error(`🚨 CRITICAL: ${logMessage}`, logData);
        break;
      case 'high':
        aiLogger.warn(`⚠️ HIGH: ${logMessage}`, logData);
        break;
      default:
        aiLogger.info(`📡 EVENT: ${logMessage}`, logData);
    }
  }

  private generateSubscriptionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Specialized AI event publishers
  publishPerceptionEvent(sensoryData: any, emotions: any): void {
    this.publishAIEvent('perception_processed', {
      sensoryData,
      emotions,
      timestamp: Date.now()
    });
  }

  publishActionEvent(actions: any[], outcome: any): void {
    this.publishAIEvent('actions_executed', {
      actions,
      outcome,
      timestamp: Date.now()
    });
  }

  publishLearningEvent(neuralAdjustments: number, predictionError: number): void {
    this.publishAIEvent('learning_occurred', {
      neuralAdjustments,
      predictionError,
      timestamp: Date.now()
    }, 'high');
  }

  publishMemoryEvent(memoryType: string, memoryId: string, operation: string): void {
    this.publishMemoryEvent(`${operation}_${memoryType}`, {
      memoryId,
      operation,
      timestamp: Date.now()
    });
  }

  publishThoughtEvent(thought: any): void {
    this.publishAIEvent('thought_generated', {
      thought,
      timestamp: Date.now()
    });
  }

  publishCuriosityEvent(novelty: number, attention: any): void {
    this.publishCuriosityEvent('attention_shifted', {
      novelty,
      attention,
      timestamp: Date.now()
    });
  }

  publishWorldEvent(objectAction: string, objectId: string, data: any): void {
    this.publishWorldEvent(`object_${objectAction}`, {
      objectId,
      ...data,
      timestamp: Date.now()
    });
  }

  // Debug and monitoring
  getSubscriptions(): Array<{ eventType: string; subscriptionCount: number; subscriptions: EventSubscription[] }> {
    const result: Array<{ eventType: string; subscriptionCount: number; subscriptions: EventSubscription[] }> = [];

    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      result.push({
        eventType,
        subscriptionCount: subscriptions.length,
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          hasFilter: !!sub.filter,
          once: sub.once
        }))
      });
    }

    return result;
  }

  clearHistory(): void {
    this.eventHistory = [];
    this.eventCounts.clear();
    aiLogger.info('Event system history cleared');
  }

  dispose(): void {
    try {
      this.removeAllListeners();
      this.subscriptions.clear();
      this.eventHistory = [];
      this.eventCounts.clear();
      aiLogger.info('Event system disposed');

    } catch (error) {
      aiLogger.error('Error disposing event system:', error);
    }
  }
}