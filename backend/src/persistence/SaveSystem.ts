import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { AI } from '../ai/AI.js';
import { World } from '../world/World.js';
import { memoryLogger } from '../utils/logger.js';

interface SaveData {
  id: string;
  timestamp: number;
  version: string;
  ai: any;
  world: any;
  metadata: {
    playtime: number;
    experiences: number;
    vocabularySize: number;
    curiosityLevel: number;
    memoryCount: number;
  };
}

interface SaveSlot {
  name: string;
  data: SaveData;
  createdAt: number;
  lastModified: number;
  size: number;
}

export class SaveSystem {
  private savesDirectory: string;
  private backupsDirectory: string;
  private currentSaveSlot: string | null = null;

  constructor() {
    this.savesDirectory = path.join(process.cwd(), 'data', 'saves');
    this.backupsDirectory = path.join(this.savesDirectory, 'backups');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await fs.mkdir(this.savesDirectory, { recursive: true });
      await fs.mkdir(this.backupsDirectory, { recursive: true });

      memoryLogger.info('Save system initialized', {
        savesDirectory: this.savesDirectory,
        backupsDirectory: this.backupsDirectory
      });

    } catch (error) {
      memoryLogger.error('Failed to initialize save system:', error);
      throw error;
    }
  }

  async saveGame(slotName: string, ai: AI, world: World, metadata?: Partial<SaveData['metadata']>): Promise<string> {
    try {
      const saveId = this.generateSaveId();
      const timestamp = Date.now();

      memoryLogger.info('Starting save process', { slotName, saveId });

      // Collect AI state
      const aiState = await this.collectAIState(ai);

      // Collect world state
      const worldState = this.collectWorldState(world);

      // Create save data
      const saveData: SaveData = {
        id: saveId,
        timestamp,
        version: '1.0.0',
        ai: aiState,
        world: worldState,
        metadata: {
          playtime: world.getSimulationTime(),
          experiences: ai.getMemoryCount(),
          vocabularySize: ai.getVocabularySize(),
          curiosityLevel: ai.getCuriosityLevel(),
          ...metadata
        }
      };

      // Create backup of existing save if it exists
      await this.createBackup(slotName);

      // Save to file
      const saveFilePath = path.join(this.savesDirectory, `${slotName}.json`);
      const saveJson = JSON.stringify(saveData, null, 2);
      await fs.writeFile(saveFilePath, saveJson, 'utf8');

      // Save metadata
      const slotInfo: SaveSlot = {
        name: slotName,
        data: saveData,
        createdAt: timestamp,
        lastModified: timestamp,
        size: saveJson.length
      };

      await this.saveSlotMetadata(slotName, slotInfo);

      // Clean old backups
      await this.cleanOldBackups();

      this.currentSaveSlot = slotName;

      memoryLogger.info('Game saved successfully', {
        slotName,
        saveId,
        fileSize: slotInfo.size,
        experiences: saveData.metadata.experiences,
        vocabularySize: saveData.metadata.vocabularySize
      });

      return saveId;

    } catch (error) {
      memoryLogger.error('Failed to save game:', error);
      throw new Error(`Save failed: ${error.message}`);
    }
  }

  async loadGame(slotName: string, ai: AI, world: World): Promise<SaveData> {
    try {
      memoryLogger.info('Starting load process', { slotName });

      const saveFilePath = path.join(this.savesDirectory, `${slotName}.json`);
      const saveJson = await fs.readFile(saveFilePath, 'utf8');
      const saveData: SaveData = JSON.parse(saveJson);

      // Validate save data
      this.validateSaveData(saveData);

      // Restore AI state
      await this.restoreAIState(ai, saveData.ai);

      // Restore world state
      await this.restoreWorldState(world, saveData.world);

      this.currentSaveSlot = slotName;

      memoryLogger.info('Game loaded successfully', {
        slotName,
        saveId: saveData.id,
        experiences: saveData.metadata.experiences,
        vocabularySize: saveData.metadata.vocabularySize,
        playtime: saveData.metadata.playtime
      });

      return saveData;

    } catch (error) {
      memoryLogger.error('Failed to load game:', error);
      throw new Error(`Load failed: ${error.message}`);
    }
  }

  async autoSave(ai: AI, world: World): Promise<string> {
    try {
      const slotName = 'autosave';
      return await this.saveGame(slotName, ai, world);

    } catch (error) {
      memoryLogger.error('Auto-save failed:', error);
      throw error;
    }
  }

  async shutdownSave(ai: AI, world: World): Promise<string> {
    try {
      const slotName = 'autosave_shutdown';
      return await this.saveGame(slotName, ai, world, {
        shutdown: true
      });

    } catch (error) {
      memoryLogger.error('Shutdown save failed:', error);
      throw error;
    }
  }

  async deleteSave(slotName: string): Promise<boolean> {
    try {
      const saveFilePath = path.join(this.savesDirectory, `${slotName}.json`);
      const metadataFilePath = path.join(this.savesDirectory, `${slotName}.meta.json`);

      // Delete save file
      await fs.unlink(saveFilePath);

      // Delete metadata file
      try {
        await fs.unlink(metadataFilePath);
      } catch (error) {
        // Metadata file might not exist, that's okay
      }

      memoryLogger.info('Save deleted', { slotName });

      return true;

    } catch (error) {
      memoryLogger.error('Failed to delete save:', error);
      return false;
    }
  }

  async getSaveSlots(): Promise<SaveSlot[]> {
    try {
      const slotFiles = await fs.readdir(this.savesDirectory);
      const saveSlots: SaveSlot[] = [];

      for (const file of slotFiles) {
        if (file.endsWith('.json') && !file.endsWith('.meta.json')) {
          const slotName = file.replace('.json', '');
          try {
            const slotInfo = await this.loadSlotMetadata(slotName);
            if (slotInfo) {
              saveSlots.push(slotInfo);
            }
          } catch (error) {
            memoryLogger.warn('Failed to load slot metadata', { slotName, error });
          }
        }
      }

      return saveSlots.sort((a, b) => b.lastModified - a.lastModified);

    } catch (error) {
      memoryLogger.error('Failed to get save slots:', error);
      return [];
    }
  }

  async getSaveFileInfo(slotName: string): Promise<SaveSlot | null> {
    try {
      return await this.loadSlotMetadata(slotName);
    } catch (error) {
      memoryLogger.error('Failed to get save file info:', error);
      return null;
    }
  }

  private async collectAIState(ai: AI): Promise<any> {
    try {
      const aiState = ai.getState();

      return {
        id: aiState.id,
        age: aiState.age,
        totalExperiences: aiState.totalExperiences,
        emotions: aiState.emotions,
        curiosity: aiState.curiosity,
        learning: aiState.learning,
        memory: aiState.memory,
        language: aiState.language,
        // Additional AI component states would be collected here
        timestamp: Date.now()
      };

    } catch (error) {
      memoryLogger.error('Error collecting AI state:', error);
      throw error;
    }
  }

  private collectWorldState(world: World): Promise<any> {
    return Promise.resolve({
      time: world.getSimulationTime(),
      objects: world.getAllObjects(),
      aiPosition: world.getAIPosition(),
      objectCount: world.getObjectCount(),
      timestamp: Date.now()
    });
  }

  private async restoreAIState(ai: AI, aiState: any): Promise<void> {
    try {
      // This would restore the complete AI state
      // For now, we'll log the operation
      memoryLogger.info('Restoring AI state', {
        experiences: aiState.totalExperiences,
        vocabularySize: aiState.memory?.vocabularySize || 0
      });

      // TODO: Implement actual AI state restoration
      // await ai.setState(aiState);

    } catch (error) {
      memoryLogger.error('Error restoring AI state:', error);
      throw error;
    }
  }

  private async restoreWorldState(world: World, worldState: any): Promise<void> {
    try {
      // Clear existing objects
      const existingObjects = world.getAllObjects();
      for (const obj of existingObjects) {
        if (obj.id !== 'ground') { // Keep ground
          world.removeObject(obj.id);
        }
      }

      // Restore objects
      if (worldState.objects && Array.isArray(worldState.objects)) {
        for (const objData of worldState.objects) {
          if (objData.id !== 'ground') {
            world.addObject(objData);
          }
        }
      }

      memoryLogger.info('World state restored', {
        objectCount: worldState.objectCount,
        time: worldState.time
      });

    } catch (error) {
      memoryLogger.error('Error restoring world state:', error);
      throw error;
    }
  }

  private async saveSlotMetadata(slotName: string, slotInfo: SaveSlot): Promise<void> {
    try {
      const metadataFilePath = path.join(this.savesDirectory, `${slotName}.meta.json`);
      const metadata = {
        name: slotInfo.name,
        createdAt: slotInfo.createdAt,
        lastModified: slotInfo.lastModified,
        size: slotInfo.size,
        experiences: slotInfo.data.metadata.experiences,
        vocabularySize: slotInfo.data.metadata.vocabularySize,
        playtime: slotInfo.data.metadata.playtime,
        version: slotInfo.data.version
      };

      await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2), 'utf8');

    } catch (error) {
      memoryLogger.error('Error saving slot metadata:', error);
    }
  }

  private async loadSlotMetadata(slotName: string): Promise<SaveSlot | null> {
    try {
      const metadataFilePath = path.join(this.savesDirectory, `${slotName}.meta.json`);
      const metadataJson = await fs.readFile(metadataFilePath, 'utf8');
      const metadata = JSON.parse(metadataJson);

      // Load full save data to get complete information
      const saveFilePath = path.join(this.savesDirectory, `${slotName}.json`);
      const saveJson = await fs.readFile(saveFilePath, 'utf8');
      const saveData: SaveData = JSON.parse(saveJson);

      return {
        name: metadata.name,
        data: saveData,
        createdAt: metadata.createdAt,
        lastModified: metadata.lastModified,
        size: metadata.size
      };

    } catch (error) {
      memoryLogger.error('Error loading slot metadata:', error);
      return null;
    }
  }

  private async createBackup(slotName: string): Promise<void> {
    try {
      const saveFilePath = path.join(this.savesDirectory, `${slotName}.json`);
      const timestamp = Date.now();
      const backupFileName = `${slotName}_backup_${timestamp}.json`;
      const backupFilePath = path.join(this.backupsDirectory, backupFileName);

      // Check if original save exists
      try {
        await fs.access(saveFilePath);
        await fs.copyFile(saveFilePath, backupFilePath);
        memoryLogger.debug('Backup created', { slotName, backupFileName });
      } catch (error) {
        // Original file doesn't exist, no backup needed
        memoryLogger.debug('No original save to backup', { slotName });
      }

    } catch (error) {
      memoryLogger.error('Error creating backup:', error);
    }
  }

  private async cleanOldBackups(): Promise<void> {
    try {
      const backupFiles = await fs.readdir(this.backupsDirectory);
      const slotBackups = new Map<string, string[]>();

      // Group backups by slot
      for (const file of backupFiles) {
        if (file.endsWith('.json')) {
          const match = file.match(/^(.+)_backup_(\d+)\.json$/);
          if (match) {
            const slotName = match[1];
            const timestamp = match[2];

            if (!slotBackups.has(slotName)) {
              slotBackups.set(slotName, []);
            }
            slotBackups.get(slotName)!.push(`${slotName}_backup_${timestamp}.json`);
          }
        }
      }

      // Keep only the most recent backups for each slot
      const maxBackups = config.BACKUP_COUNT;
      for (const [slotName, backups] of slotBackups.entries()) {
        if (backups.length > maxBackups) {
          // Sort by timestamp (newest first)
          backups.sort((a, b) => {
            const timestampA = parseInt(a.split('_').pop() || '0');
            const timestampB = parseInt(b.split('_').pop() || '0');
            return timestampB - timestampA;
          });

          // Delete old backups
          const oldBackups = backups.slice(maxBackups);
          for (const oldBackup of oldBackups) {
            const oldBackupPath = path.join(this.backupsDirectory, oldBackup);
            await fs.unlink(oldBackupPath);
            memoryLogger.debug('Deleted old backup', { slotName, backup: oldBackup });
          }
        }
      }

    } catch (error) {
      memoryLogger.error('Error cleaning old backups:', error);
    }
  }

  private validateSaveData(saveData: SaveData): void {
    if (!saveData.id) {
      throw new Error('Invalid save data: missing ID');
    }

    if (!saveData.version) {
      throw new Error('Invalid save data: missing version');
    }

    if (!saveData.ai) {
      throw new Error('Invalid save data: missing AI state');
    }

    if (!saveData.world) {
      throw new Error('Invalid save data: missing world state');
    }

    if (!saveData.metadata) {
      throw new Error('Invalid save data: missing metadata');
    }

    // Check version compatibility
    if (!this.isVersionCompatible(saveData.version)) {
      throw new Error(`Incompatible save version: ${saveData.version}`);
    }
  }

  private isVersionCompatible(version: string): boolean {
    // Simple version check - can be made more sophisticated
    const supportedVersions = ['1.0.0'];
    return supportedVersions.includes(version);
  }

  private generateSaveId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Utility methods
  getCurrentSaveSlot(): string | null {
    return this.currentSaveSlot;
  }

  async exportSave(slotName: string, exportPath: string): Promise<boolean> {
    try {
      const saveFilePath = path.join(this.savesDirectory, `${slotName}.json`);
      const exportFilePath = path.join(exportPath, `${slotName}_export.json`);

      await fs.copyFile(saveFilePath, exportFilePath);

      memoryLogger.info('Save exported', { slotName, exportPath });
      return true;

    } catch (error) {
      memoryLogger.error('Failed to export save:', error);
      return false;
    }
  }

  async importSave(importPath: string, slotName: string): Promise<boolean> {
    try {
      const importFilePath = path.join(importPath, `${slotName}_export.json`);
      const saveFilePath = path.join(this.savesDirectory, `${slotName}.json`);

      await fs.copyFile(importFilePath, saveFilePath);

      memoryLogger.info('Save imported', { slotName, importPath });
      return true;

    } catch (error) {
      memoryLogger.error('Failed to import save:', error);
      return false;
    }
  }

  getStorageStats(): {
    totalSaves: number;
    totalSize: number;
    backupCount: number;
    largestSave: { slot: string; size: number } | null;
  } {
    // This would require scanning the save directory
    // For now, return placeholder values
    return {
      totalSaves: 0,
      totalSize: 0,
      backupCount: 0,
      largestSave: null
    };
  }

  dispose(): void {
    this.currentSaveSlot = null;
    memoryLogger.debug('Save system disposed');
  }
}