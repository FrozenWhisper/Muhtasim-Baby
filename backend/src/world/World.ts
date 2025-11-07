import * as CANNON from 'cannon-es';
import { config, CONSTANTS } from '../config/index.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { ObjectSystem } from './ObjectSystem.js';
import { WorldObject, WorldState } from '../../shared/src/types/world.js';
import { worldLogger } from '../utils/logger.js';

export class World {
  private physicsEngine: PhysicsEngine;
  private objectSystem: ObjectSystem;
  private aiBody: CANNON.Body | null = null;
  private simulationTime: number = 0;
  private isRunning: boolean = false;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000 / config.UPDATE_FREQUENCY; // in ms

  constructor() {
    this.physicsEngine = new PhysicsEngine();
    this.objectSystem = new ObjectSystem();
  }

  async initialize(): Promise<void> {
    try {
      worldLogger.info('Initializing world simulation...');

      // Initialize physics engine
      await this.physicsEngine.initialize();

      // Initialize object system
      this.objectSystem.initialize();

      // Create AI avatar
      this.createAIAvatar();

      // Create initial world objects
      this.createInitialObjects();

      // Start simulation
      this.startSimulation();

      worldLogger.info('✅ World simulation initialized successfully');

    } catch (error) {
      worldLogger.error('❌ Failed to initialize world simulation:', error);
      throw error;
    }
  }

  private createAIAvatar(): void {
    try {
      // Create physics body for AI
      const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1)); // 2x2x2 meter box
      this.aiBody = new CANNON.Body({
        mass: 10, // 10 kg
        shape: shape,
        position: new CANNON.Vec3(0, 2, 0), // Start 2 meters high
        material: this.physicsEngine.getDefaultMaterial()
      });

      // Add AI body to physics world
      this.physicsEngine.addBody(this.aiBody);

      // Configure AI body properties
      this.aiBody.material = this.physicsEngine.getDefaultMaterial();
      this.aiBody.linearDamping = 0.1;
      this.aiBody.angularDamping = 0.1;

      worldLogger.info('AI avatar created', {
        mass: this.aiBody.mass,
        position: this.aiBody.position,
        shape: 'box'
      });

    } catch (error) {
      worldLogger.error('Error creating AI avatar:', error);
      throw error;
    }
  }

  private createInitialObjects(): void {
    try {
      // Create ground plane
      this.createGround();

      // Create some initial objects for the AI to explore
      this.createStarterObjects();

      // Create boundaries
      this.createBoundaries();

      worldLogger.info('Initial world objects created');

    } catch (error) {
      worldLogger.error('Error creating initial objects:', error);
    }
  }

  private createGround(): void {
    try {
      // Large static ground plane
      const groundShape = new CANNON.Plane();
      const groundBody = new CANNON.Body({
        mass: 0, // Static body
        shape: groundShape,
        position: new CANNON.Vec3(0, 0, 0)
      });

      // Rotate plane to be horizontal
      groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

      this.physicsEngine.addBody(groundBody);

      // Add to object system
      this.objectSystem.addObject({
        id: 'ground',
        type: 'ground',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        scale: { x: 100, y: 100, z: 1 },
        color: '#4a5f3a',
        mass: 0,
        material: 'ground',
        isStatic: true,
        properties: {
          friction: 0.8,
          restitution: 0.2
        }
      });

    } catch (error) {
      worldLogger.error('Error creating ground:', error);
    }
  }

  private createStarterObjects(): void {
    try {
      // Create a few diverse objects for initial exploration
      const starterObjects = [
        {
          id: 'sphere_1',
          type: 'sphere',
          position: { x: 5, y: 1, z: 5 },
          radius: 1,
          color: '#ff6b6b',
          mass: 2
        },
        {
          id: 'box_1',
          type: 'box',
          position: { x: -5, y: 1, z: 3 },
          dimensions: { x: 1.5, y: 1.5, z: 1.5 },
          color: '#4ecdc4',
          mass: 3
        },
        {
          id: 'cylinder_1',
          type: 'cylinder',
          position: { x: 3, y: 1, z: -4 },
          radiusTop: 0.8,
          radiusBottom: 0.8,
          height: 2,
          color: '#ffe66d',
          mass: 2.5
        },
        {
          id: 'sphere_2',
          type: 'sphere',
          position: { x: -3, y: 1, z: -6 },
          radius: 0.7,
          color: '#a8e6cf',
          mass: 1.5
        }
      ];

      for (const objData of starterObjects) {
        this.objectSystem.createObject(objData, this.physicsEngine);
      }

      worldLogger.info('Created starter objects', { count: starterObjects.length });

    } catch (error) {
      worldLogger.error('Error creating starter objects:', error);
    }
  }

  private createBoundaries(): void {
    try {
      // Create invisible walls to keep AI in play area
      const boundaryThickness = 1;
      const boundaryHeight = 10;
      const areaSize = 50;

      const boundaries = [
        // North wall
        {
          id: 'wall_north',
          position: { x: 0, y: boundaryHeight / 2, z: -areaSize / 2 },
          dimensions: { x: areaSize, y: boundaryHeight, z: boundaryThickness }
        },
        // South wall
        {
          id: 'wall_south',
          position: { x: 0, y: boundaryHeight / 2, z: areaSize / 2 },
          dimensions: { x: areaSize, y: boundaryHeight, z: boundaryThickness }
        },
        // East wall
        {
          id: 'wall_east',
          position: { x: areaSize / 2, y: boundaryHeight / 2, z: 0 },
          dimensions: { x: boundaryThickness, y: boundaryHeight, z: areaSize }
        },
        // West wall
        {
          id: 'wall_west',
          position: { x: -areaSize / 2, y: boundaryHeight / 2, z: 0 },
          dimensions: { x: boundaryThickness, y: boundaryHeight, z: areaSize }
        }
      ];

      for (const wall of boundaries) {
        this.objectSystem.createObject({
          ...wall,
          type: 'box',
          color: '#333333',
          mass: 0,
          material: 'wall',
          isStatic: true,
          visible: false // Invisible boundaries
        }, this.physicsEngine);
      }

      worldLogger.info('Created world boundaries');

    } catch (error) {
      worldLogger.error('Error creating boundaries:', error);
    }
  }

  private startSimulation(): void {
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.simulationLoop();

    worldLogger.info('World simulation started', {
      updateFrequency: config.UPDATE_FREQUENCY,
      interval: this.updateInterval
    });
  }

  private simulationLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;

    if (deltaTime >= this.updateInterval) {
      this.update(deltaTime / 1000); // Convert to seconds
      this.lastUpdateTime = currentTime;
    }

    // Schedule next update
    setImmediate(this.simulationLoop);
  };

  private update(deltaTime: number): void {
    try {
      // Step physics simulation
      this.physicsEngine.step(deltaTime);

      // Update object positions
      this.objectSystem.update(deltaTime);

      // Update simulation time
      this.simulationTime += deltaTime;

    } catch (error) {
      worldLogger.error('Error in simulation update:', error);
    }
  }

  // AI interaction methods
  applyAIMovement(movement: { direction: { x: number; y: number; z: number }; speed: number }): void {
    if (!this.aiBody) return;

    try {
      const force = new CANNON.Vec3(
        movement.direction.x * movement.speed * 100,
        movement.direction.y * movement.speed * 100,
        movement.direction.z * movement.speed * 100
      );

      this.aiBody.applyForce(force, this.aiBody.position);

      worldLogger.debug('Applied AI movement', {
        force: { x: force.x, y: force.y, z: force.z },
        speed: movement.speed
      });

    } catch (error) {
      worldLogger.error('Error applying AI movement:', error);
    }
  }

  applyAIJump(force: number): void {
    if (!this.aiBody) return;

    try {
      const jumpForce = new CANNON.Vec3(0, force * 1000, 0);
      this.aiBody.applyImpulse(jumpForce, this.aiBody.position);

      worldLogger.debug('Applied AI jump', { force });

    } catch (error) {
      worldLogger.error('Error applying AI jump:', error);
    }
  }

  // Object manipulation methods
  addObject(objectData: any): WorldObject | null {
    try {
      const worldObject = this.objectSystem.createObject(objectData, this.physicsEngine);

      worldLogger.info('Added object to world', {
        id: objectData.id,
        type: objectData.type,
        position: objectData.position
      });

      return worldObject;

    } catch (error) {
      worldLogger.error('Error adding object:', error);
      return null;
    }
  }

  removeObject(objectId: string): boolean {
    try {
      const success = this.objectSystem.removeObject(objectId, this.physicsEngine);

      if (success) {
        worldLogger.info('Removed object from world', { id: objectId });
      }

      return success;

    } catch (error) {
      worldLogger.error('Error removing object:', error);
      return false;
    }
  }

  getObject(objectId: string): WorldObject | null {
    return this.objectSystem.getObject(objectId);
  }

  getAllObjects(): WorldObject[] {
    return this.objectSystem.getAllObjects();
  }

  // Sensory data generation
  getSensoryData(): any {
    if (!this.aiBody) return null;

    try {
      const aiPosition = this.aiBody.position;
      const aiVelocity = this.aiBody.velocity;

      // Get nearby objects for vision
      const visibleObjects = this.getVisibleObjects(aiPosition);
      const visionData = this.generateVisionData(visibleObjects, aiPosition);

      // Get touch/collision data
      const touchData = this.generateTouchData();

      // Get sound data (simulated)
      const soundData = this.generateSoundData();

      // Get proprioception data
      const proprioceptionData = this.generateProprioceptionData(aiPosition, aiVelocity);

      return {
        vision: visionData,
        touch: touchData,
        sound: soundData,
        smell: new Array(CONSTANTS.SENSORY_DIMENSIONS.SMELL).fill(0), // Not implemented yet
        taste: new Array(CONSTANTS.SENSORY_DIMENSIONS.TASTE).fill(0),   // Not implemented yet
        proprioception: proprioceptionData,
        timestamp: Date.now()
      };

    } catch (error) {
      worldLogger.error('Error generating sensory data:', error);
      return null;
    }
  }

  private getVisibleObjects(aiPosition: CANNON.Vec3): WorldObject[] {
    const maxVisionDistance = 20;
    const visibleObjects: WorldObject[] = [];

    for (const obj of this.objectSystem.getAllObjects()) {
      if (obj.id === 'ground' || obj.visible === false) continue;

      const distance = Math.sqrt(
        Math.pow(obj.position.x - aiPosition.x, 2) +
        Math.pow(obj.position.y - aiPosition.y, 2) +
        Math.pow(obj.position.z - aiPosition.z, 2)
      );

      if (distance <= maxVisionDistance) {
        visibleObjects.push({ ...obj, distance });
      }
    }

    return visibleObjects.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  private generateVisionData(visibleObjects: any[], aiPosition: CANNON.Vec3): number[] {
    const visionData = new Array(CONSTANTS.SENSORY_DIMENSIONS.VISION).fill(0);

    try {
      // Simple raycasting simulation for vision
      const numRays = 20; // Reduced for efficiency
      const angleStep = (Math.PI * 2) / numRays;

      for (let i = 0; i < numRays; i++) {
        const angle = i * angleStep;
        const rayDirection = new CANNON.Vec3(Math.cos(angle), 0, Math.sin(angle));

        // Find closest object in this direction
        let closestDistance = 50; // Max vision distance
        let closestColor = 0;

        for (const obj of visibleObjects) {
          const toObject = new CANNON.Vec3(
            obj.position.x - aiPosition.x,
            obj.position.y - aiPosition.y,
            obj.position.z - aiPosition.z
          ).unit();

          const dotProduct = rayDirection.dot(toObject);

          if (dotProduct > 0.7) { // Object is roughly in this direction
            const distance = obj.distance || 0;
            if (distance < closestDistance) {
              closestDistance = distance;
              closestColor = this.parseColorValue(obj.color);
            }
          }
        }

        // Store distance and color
        visionData[i * 6] = closestDistance / 50; // Normalized distance
        visionData[i * 6 + 1] = closestColor;     // Color
        visionData[i * 6 + 2] = obj.type === 'sphere' ? 1 : 0; // Shape indicator
        visionData[i * 6 + 3] = obj.type === 'box' ? 1 : 0;
        visionData[i * 6 + 4] = obj.type === 'cylinder' ? 1 : 0;
        visionData[i * 6 + 5] = (obj.distance || 0) / 50; // Distance confidence
      }

    } catch (error) {
      worldLogger.debug('Error generating vision data:', error);
    }

    return visionData;
  }

  private generateTouchData(): number[] {
    const touchData = new Array(CONSTANTS.SENSORY_DIMENSIONS.TOUCH).fill(0);

    try {
      if (!this.aiBody) return touchData;

      // Check for contacts/collisions
      const contacts = this.physicsEngine.getBodyContacts(this.aiBody);

      if (contacts.length > 0) {
        // Simple touch simulation
        touchData[0] = Math.min(contacts.length / 5, 1); // Contact count
        touchData[1] = contacts.reduce((sum, contact) => sum + Math.abs(contact.impact), 0) / contacts.length; // Average impact
        touchData[2] = 1; // Touch detected
      }

    } catch (error) {
      worldLogger.debug('Error generating touch data:', error);
    }

    return touchData;
  }

  private generateSoundData(): number[] {
    const soundData = new Array(CONSTANTS.SENSORY_DIMENSIONS.SOUND).fill(0);

    try {
      // Simulate sound based on collisions and movements
      const contacts = this.physicsEngine.getAllContacts();
      const numContacts = contacts.length;

      if (numContacts > 0) {
        soundData[0] = Math.min(numContacts / 10, 1); // Sound intensity
        soundData[1] = 0.5; // Mid frequency
        soundData[2] = Math.random(); // Random direction
      }

    } catch (error) {
      worldLogger.debug('Error generating sound data:', error);
    }

    return soundData;
  }

  private generateProprioceptionData(position: CANNON.Vec3, velocity: CANNON.Vec3): number[] {
    const proprioceptionData = new Array(CONSTANTS.SENSORY_DIMENSIONS.PROPRIOCEPTION).fill(0);

    try {
      // Position data (normalized)
      proprioceptionData[0] = (position.x + 25) / 50; // Normalize to 0-1
      proprioceptionData[1] = Math.max(0, position.y / 20); // Height
      proprioceptionData[2] = (position.z + 25) / 50;

      // Velocity data
      const speed = velocity.length();
      proprioceptionData[3] = Math.min(speed / 10, 1); // Normalized speed
      proprioceptionData[4] = velocity.x / 10;
      proprioceptionData[5] = velocity.y / 10;
      proprioceptionData[6] = velocity.z / 10;

      // Rotation data (simplified)
      if (this.aiBody) {
        const forward = this.aiBody.quaternion.vmult(new CANNON.Vec3(0, 0, 1));
        proprioceptionData[7] = (forward.x + 1) / 2;
        proprioceptionData[8] = (forward.z + 1) / 2;
      }

    } catch (error) {
      worldLogger.debug('Error generating proprioception data:', error);
    }

    return proprioceptionData;
  }

  private parseColorValue(color: string): number {
    // Simple color parsing - returns grayscale value
    const colorMap: { [key: string]: number } = {
      '#ff6b6b': 0.8, // Red
      '#4ecdc4': 0.5, // Cyan
      '#ffe66d': 0.9, // Yellow
      '#a8e6cf': 0.6, // Green
      '#4a5f3a': 0.3, // Dark green
      '#333333': 0.1  // Dark gray
    };

    return colorMap[color] || 0.5;
  }

  // Public getters
  getSimulationTime(): number {
    return this.simulationTime;
  }

  getObjectCount(): number {
    return this.objectSystem.getAllObjects().length;
  }

  getAIPosition(): { x: number; y: number; z: number } | null {
    if (!this.aiBody) return null;

    return {
      x: this.aiBody.position.x,
      y: this.aiBody.position.y,
      z: this.aiBody.position.z
    };
  }

  getWorldState(): WorldState {
    return {
      time: this.simulationTime,
      objects: this.getAllObjects(),
      aiPosition: this.getAIPosition(),
      objectCount: this.getObjectCount()
    };
  }

  stop(): void {
    this.isRunning = false;
    worldLogger.info('World simulation stopped');
  }

  dispose(): void {
    this.stop();
    this.physicsEngine.dispose();
    this.objectSystem.dispose();
    worldLogger.debug('World disposed');
  }
}