import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { memoryLogger } from '../utils/logger.js';

interface DatabaseSchema {
  experiences: any[];
  semanticMemories: any[];
  aiStates: any[];
  worldStates: any[];
  statistics: {
    totalPlaytime: number;
    totalExperiences: number;
    maxVocabularySize: number;
    lastSaveTime: number;
    sessionCount: number;
    averageCuriosity: number;
  };
  config: {
    version: string;
    lastMigration: number;
    settings: any;
  };
}

export class DataManager {
  private db: Low<DatabaseSchema>;
  private dataDirectory: string;
  private backupDirectory: string;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor() {
    this.dataDirectory = path.join(process.cwd(), 'data');
    this.backupDirectory = path.join(this.dataDirectory, 'backups');
    const dbPath = path.join(this.dataDirectory, 'database.json');
    this.db = new Low(new JSONFile(dbPath), this.getDefaultDatabase());
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await fs.mkdir(this.dataDirectory, { recursive: true });
      await fs.mkdir(this.backupDirectory, { recursive: true });

      // Load database
      await this.db.read();

      // Initialize default data if needed
      if (!this.db.data) {
        this.db.data = this.getDefaultDatabase();
        await this.db.write();
        memoryLogger.info('Database initialized with default data');
      }

      // Run migrations if needed
      await this.runMigrations();

      // Start auto-save timer
      this.startAutoSave();

      // Create initial backup
      await this.createBackup('initialization');

      memoryLogger.info('Data manager initialized', {
        dataDirectory: this.dataDirectory,
        experiences: this.db.data.experiences.length,
        semanticMemories: this.db.data.semanticMemories.length,
        statistics: this.db.data.statistics
      });

    } catch (error) {
      memoryLogger.error('Failed to initialize data manager:', error);
      throw error;
    }
  }

  private getDefaultDatabase(): DatabaseSchema {
    return {
      experiences: [],
      semanticMemories: [],
      aiStates: [],
      worldStates: [],
      statistics: {
        totalPlaytime: 0,
        totalExperiences: 0,
        maxVocabularySize: 0,
        lastSaveTime: Date.now(),
        sessionCount: 1,
        averageCuriosity: 1.0
      },
      config: {
        version: '1.0.0',
        lastMigration: 0,
        settings: {}
      }
    };
  }

  private async runMigrations(): Promise<void> {
    try {
      const currentVersion = this.db.data!.config.version;
      const lastMigration = this.db.data!.config.lastMigration;

      memoryLogger.info('Checking database migrations', {
        currentVersion,
        lastMigration
      });

      // Migration logic would go here
      // For now, we'll just ensure the database structure is up to date

      this.db.data!.config.version = '1.0.0';
      this.db.data!.config.lastMigration = Date.now();

      await this.db.write();

    } catch (error) {
      memoryLogger.error('Error running migrations:', error);
      throw error;
    }
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      try {
        await this.performAutoSave();
      } catch (error) {
        memoryLogger.error('Auto-save failed:', error);
      }
    }, config.AUTO_SAVE_INTERVAL);

    memoryLogger.debug('Auto-save timer started', {
      interval: config.AUTO_SAVE_INTERVAL
    });
  }

  private async performAutoSave(): Promise<void> {
    try {
      await this.db.write();
      memoryLogger.debug('Auto-save completed');

    } catch (error) {
      memoryLogger.error('Auto-save error:', error);
    }
  }

  // Experience management
  async addExperience(experience: any): Promise<void> {
    try {
      this.db.data!.experiences.push({
        ...experience,
        id: experience.id || this.generateId(),
        storedAt: Date.now()
      });

      // Update statistics
      this.db.data!.statistics.totalExperiences++;
      this.db.data!.statistics.lastSaveTime = Date.now();

      await this.db.write();

      memoryLogger.debug('Experience added', {
        id: experience.id,
        totalExperiences: this.db.data!.experiences.length
      });

    } catch (error) {
      memoryLogger.error('Error adding experience:', error);
      throw error;
    }
  }

  async getExperiences(filter?: {
    limit?: number;
    sortBy?: 'timestamp' | 'strength' | 'recallCount';
    sortOrder?: 'asc' | 'desc';
    minStrength?: number;
    timeRange?: { start: number; end: number };
  }): Promise<any[]> {
    try {
      let experiences = [...this.db.data!.experiences];

      // Apply filters
      if (filter) {
        if (filter.minStrength) {
          experiences = experiences.filter(exp => (exp.strength || 0) >= filter.minStrength!);
        }

        if (filter.timeRange) {
          experiences = experiences.filter(exp =>
            exp.timestamp >= filter.timeRange!.start &&
            exp.timestamp <= filter.timeRange!.end
          );
        }

        // Sort
        if (filter.sortBy) {
          experiences.sort((a, b) => {
            const aVal = a[filter.sortBy!] || 0;
            const bVal = b[filter.sortBy!] || 0;
            return filter.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
          });
        }

        // Apply limit
        if (filter.limit) {
          experiences = experiences.slice(0, filter.limit);
        }
      }

      return experiences;

    } catch (error) {
      memoryLogger.error('Error getting experiences:', error);
      return [];
    }
  }

  async updateExperience(experienceId: string, updates: any): Promise<boolean> {
    try {
      const index = this.db.data!.experiences.findIndex(exp => exp.id === experienceId);
      if (index === -1) return false;

      this.db.data!.experiences[index] = {
        ...this.db.data!.experiences[index],
        ...updates,
        updatedAt: Date.now()
      };

      await this.db.write();

      memoryLogger.debug('Experience updated', { id: experienceId });
      return true;

    } catch (error) {
      memoryLogger.error('Error updating experience:', error);
      return false;
    }
  }

  async deleteExperience(experienceId: string): Promise<boolean> {
    try {
      const index = this.db.data!.experiences.findIndex(exp => exp.id === experienceId);
      if (index === -1) return false;

      this.db.data!.experiences.splice(index, 1);
      await this.db.write();

      memoryLogger.debug('Experience deleted', { id: experienceId });
      return true;

    } catch (error) {
      memoryLogger.error('Error deleting experience:', error);
      return false;
    }
  }

  // Semantic memory management
  async addSemanticMemory(memory: any): Promise<void> {
    try {
      this.db.data!.semanticMemories.push({
        ...memory,
        id: memory.id || this.generateId(),
        storedAt: Date.now()
      });

      await this.db.write();

      memoryLogger.debug('Semantic memory added', {
        id: memory.id,
        totalMemories: this.db.data!.semanticMemories.length
      });

    } catch (error) {
      memoryLogger.error('Error adding semantic memory:', error);
      throw error;
    }
  }

  async getSemanticMemories(filter?: {
    limit?: number;
    category?: string;
    minStrength?: number;
  }): Promise<any[]> {
    try {
      let memories = [...this.db.data!.semanticMemories];

      if (filter) {
        if (filter.category) {
          memories = memories.filter(mem => mem.category === filter.category);
        }

        if (filter.minStrength) {
          memories = memories.filter(mem => (mem.strength || 0) >= filter.minStrength!);
        }

        if (filter.limit) {
          memories = memories.slice(0, filter.limit);
        }
      }

      return memories;

    } catch (error) {
      memoryLogger.error('Error getting semantic memories:', error);
      return [];
    }
  }

  // AI state management
  async saveAIState(aiState: any): Promise<void> {
    try {
      // Keep only recent AI states (limit storage)
      this.db.data!.aiStates.push({
        ...aiState,
        savedAt: Date.now()
      });

      // Keep only last 100 AI states
      if (this.db.data!.aiStates.length > 100) {
        this.db.data!.aiStates = this.db.data!.aiStates.slice(-100);
      }

      // Update statistics
      if (aiState.vocabularySize) {
        this.db.data!.statistics.maxVocabularySize = Math.max(
          this.db.data!.statistics.maxVocabularySize,
          aiState.vocabularySize
        );
      }

      if (aiState.curiosity !== undefined) {
        // Update average curiosity (simple moving average)
        const currentAvg = this.db.data!.statistics.averageCuriosity;
        this.db.data!.statistics.averageCuriosity = (currentAvg * 0.9) + (aiState.curiosity * 0.1);
      }

      await this.db.write();

      memoryLogger.debug('AI state saved', {
        vocabularySize: aiState.vocabularySize,
        curiosity: aiState.curiosity
      });

    } catch (error) {
      memoryLogger.error('Error saving AI state:', error);
      throw error;
    }
  }

  async getLatestAIState(): Promise<any | null> {
    try {
      const states = this.db.data!.aiStates;
      return states.length > 0 ? states[states.length - 1] : null;

    } catch (error) {
      memoryLogger.error('Error getting latest AI state:', error);
      return null;
    }
  }

  // Statistics management
  async updateStatistics(updates: Partial<DatabaseSchema['statistics']>): Promise<void> {
    try {
      this.db.data!.statistics = {
        ...this.db.data!.statistics,
        ...updates,
        lastSaveTime: Date.now()
      };

      await this.db.write();

      memoryLogger.debug('Statistics updated', updates);

    } catch (error) {
      memoryLogger.error('Error updating statistics:', error);
    }
  }

  getStatistics(): DatabaseSchema['statistics'] {
    return { ...this.db.data!.statistics };
  }

  // Data maintenance
  async cleanupOldData(): Promise<void> {
    try {
      const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
      let removedExperiences = 0;
      let removedMemories = 0;

      // Clean old experiences (keep only strong ones)
      const originalExperiencesLength = this.db.data!.experiences.length;
      this.db.data!.experiences = this.db.data!.experiences.filter(exp => {
        const isRecent = exp.timestamp > cutoffTime;
        const isStrong = (exp.strength || 0) > 0.5;
        const isFrequentlyRecalled = (exp.recallCount || 0) > 5;
        return isRecent || isStrong || isFrequentlyRecalled;
      });
      removedExperiences = originalExperiencesLength - this.db.data!.experiences.length;

      // Clean old semantic memories
      const originalMemoriesLength = this.db.data!.semanticMemories.length;
      this.db.data!.semanticMemories = this.db.data!.semanticMemories.filter(mem => {
        const isRecent = mem.storedAt > cutoffTime;
        const isStrong = (mem.strength || 0) > 0.3;
        return isRecent || isStrong;
      });
      removedMemories = originalMemoriesLength - this.db.data!.semanticMemories.length;

      // Clean old AI states (keep only last 50)
      const originalStatesLength = this.db.data!.aiStates.length;
      if (this.db.data!.aiStates.length > 50) {
        this.db.data!.aiStates = this.db.data!.aiStates.slice(-50);
      }

      await this.db.write();

      memoryLogger.info('Data cleanup completed', {
        removedExperiences,
        removedMemories,
        removedAIStates: originalStatesLength - this.db.data!.aiStates.length
      });

    } catch (error) {
      memoryLogger.error('Error during data cleanup:', error);
    }
  }

  async createBackup(reason: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const backupFileName = `backup_${reason}_${timestamp}.json`;
      const backupFilePath = path.join(this.backupDirectory, backupFileName);

      // Create backup
      await fs.copyFile(
        path.join(this.dataDirectory, 'database.json'),
        backupFilePath
      );

      // Clean old backups (keep last 10)
      const backupFiles = await fs.readdir(this.backupDirectory);
      const jsonBackups = backupFiles.filter(file => file.endsWith('.json'));

      if (jsonBackups.length > 10) {
        jsonBackups.sort();
        const oldBackups = jsonBackups.slice(0, -10);

        for (const oldBackup of oldBackups) {
          await fs.unlink(path.join(this.backupDirectory, oldBackup));
        }
      }

      memoryLogger.info('Backup created', {
        reason,
        fileName: backupFileName
      });

      return backupFileName;

    } catch (error) {
      memoryLogger.error('Error creating backup:', error);
      throw error;
    }
  }

  async restoreBackup(backupFileName: string): Promise<boolean> {
    try {
      const backupFilePath = path.join(this.backupDirectory, backupFileName);
      const dbFilePath = path.join(this.dataDirectory, 'database.json');

      // Create backup before restoring
      await this.createBackup('pre_restore');

      // Restore from backup
      await fs.copyFile(backupFilePath, dbFilePath);

      // Reload database
      await this.db.read();

      memoryLogger.info('Backup restored', { backupFileName });
      return true;

    } catch (error) {
      memoryLogger.error('Error restoring backup:', error);
      return false;
    }
  }

  async exportData(exportPath: string): Promise<boolean> {
    try {
      const exportData = {
        version: this.db.data!.config.version,
        exportDate: Date.now(),
        experiences: this.db.data!.experiences,
        semanticMemories: this.db.data!.semanticMemories,
        statistics: this.db.data!.statistics
      };

      const exportJson = JSON.stringify(exportData, null, 2);
      await fs.writeFile(exportPath, exportJson, 'utf8');

      memoryLogger.info('Data exported', { exportPath });
      return true;

    } catch (error) {
      memoryLogger.error('Error exporting data:', error);
      return false;
    }
  }

  async importData(importPath: string): Promise<boolean> {
    try {
      const importJson = await fs.readFile(importPath, 'utf8');
      const importData = JSON.parse(importJson);

      // Create backup before importing
      await this.createBackup('pre_import');

      // Merge imported data
      if (importData.experiences) {
        this.db.data!.experiences.push(...importData.experiences);
      }

      if (importData.semanticMemories) {
        this.db.data!.semanticMemories.push(...importData.semanticMemories);
      }

      if (importData.statistics) {
        this.db.data!.statistics = {
          ...this.db.data!.statistics,
          ...importData.statistics
        };
      }

      await this.db.write();

      memoryLogger.info('Data imported', { importPath });
      return true;

    } catch (error) {
      memoryLogger.error('Error importing data:', error);
      return false;
    }
  }

  getDatabaseInfo(): {
    experiencesCount: number;
    semanticMemoriesCount: number;
    aiStatesCount: number;
    databaseSize: number;
    lastSaveTime: number;
  } {
    return {
      experiencesCount: this.db.data!.experiences.length,
      semanticMemoriesCount: this.db.data!.semanticMemories.length,
      aiStatesCount: this.db.data!.aiStates.length,
      databaseSize: JSON.stringify(this.db.data).length,
      lastSaveTime: this.db.data!.statistics.lastSaveTime
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  dispose(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    memoryLogger.debug('Data manager disposed');
  }
}