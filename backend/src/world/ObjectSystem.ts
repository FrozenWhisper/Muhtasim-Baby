import * as CANNON from 'cannon-es';
import { PhysicsEngine } from './PhysicsEngine.js';
import { WorldObject } from '../../shared/src/types/world.js';
import { worldLogger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class ObjectSystem {
  private objects: Map<string, WorldObject & { physicsBody?: CANNON.Body }> = new Map();
  private physicsEngine: PhysicsEngine | null = null;

  constructor() {
    // Physics engine will be set during initialization
  }

  initialize(): void {
    worldLogger.info('Object system initialized');
  }

  setPhysicsEngine(physicsEngine: PhysicsEngine): void {
    this.physicsEngine = physicsEngine;
  }

  createObject(objectData: any, physicsEngine?: PhysicsEngine): WorldObject | null {
    try {
      const engine = physicsEngine || this.physicsEngine;
      if (!engine) {
        throw new Error('Physics engine not available');
      }

      // Generate unique ID if not provided
      const id = objectData.id || uuidv4();

      // Create world object
      const worldObject: WorldObject & { physicsBody?: CANNON.Body } = {
        id,
        type: objectData.type || 'box',
        position: {
          x: objectData.position?.x || 0,
          y: objectData.position?.y || 1,
          z: objectData.position?.z || 0
        },
        rotation: {
          x: objectData.rotation?.x || 0,
          y: objectData.rotation?.y || 0,
          z: objectData.rotation?.z || 0
        },
        scale: {
          x: objectData.scale?.x || 1,
          y: objectData.scale?.y || 1,
          z: objectData.scale?.z || 1
        },
        color: objectData.color || '#ffffff',
        mass: objectData.mass !== undefined ? objectData.mass : 1,
        material: objectData.material || 'default',
        isStatic: objectData.isStatic || false,
        visible: objectData.visible !== false,
        properties: {
          friction: objectData.properties?.friction || 0.4,
          restitution: objectData.properties?.restitution || 0.3,
          ...objectData.properties
        }
      };

      // Create physics body
      const physicsBody = this.createPhysicsBody(worldObject, engine);
      if (physicsBody) {
        worldObject.physicsBody = physicsBody;
        physicsBody.name = id; // Set name for identification
      }

      // Store object
      this.objects.set(id, worldObject);

      worldLogger.info('Created world object', {
        id,
        type: worldObject.type,
        position: worldObject.position,
        mass: worldObject.mass,
        isStatic: worldObject.isStatic
      });

      return worldObject;

    } catch (error) {
      worldLogger.error('Error creating object:', error);
      return null;
    }
  }

  private createPhysicsBody(worldObject: WorldObject, engine: PhysicsEngine): CANNON.Body | null {
    try {
      let shape: CANNON.Shape;
      const position = new CANNON.Vec3(
        worldObject.position.x,
        worldObject.position.y,
        worldObject.position.z
      );

      // Create shape based on object type
      switch (worldObject.type) {
        case 'sphere':
          const radius = (worldObject.scale.x + worldObject.scale.y + worldObject.scale.z) / 6;
          shape = new CANNON.Sphere(radius);
          break;

        case 'box':
          const halfExtents = new CANNON.Vec3(
            worldObject.scale.x / 2,
            worldObject.scale.y / 2,
            worldObject.scale.z / 2
          );
          shape = new CANNON.Box(halfExtents);
          break;

        case 'cylinder':
          const radiusTop = worldObject.scale.x / 2;
          const radiusBottom = worldObject.scale.z / 2;
          const height = worldObject.scale.y;
          shape = new CANNON.Cylinder(radiusTop, radiusBottom, height, 8);
          break;

        case 'ground':
        case 'plane':
          shape = new CANNON.Plane();
          break;

        default:
          // Default to box
          const defaultHalfExtents = new CANNON.Vec3(
            worldObject.scale.x / 2,
            worldObject.scale.y / 2,
            worldObject.scale.z / 2
          );
          shape = new CANNON.Box(defaultHalfExtents);
          break;
      }

      // Create physics body
      const body = engine.createBody({
        mass: worldObject.isStatic ? 0 : worldObject.mass,
        shape: shape,
        position: position,
        type: worldObject.isStatic ? 'static' : 'dynamic'
      });

      // Set rotation
      const quaternion = new CANNON.Quaternion();
      quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), worldObject.rotation.x);
      const yRotation = new CANNON.Quaternion();
      yRotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), worldObject.rotation.y);
      const zRotation = new CANNON.Quaternion();
      zRotation.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), worldObject.rotation.z);

      // Combine rotations
      quaternion.mult(yRotation);
      quaternion.mult(zRotation);
      body.quaternion.copy(quaternion);

      // Set material properties
      const material = engine.createMaterial({
        friction: worldObject.properties.friction,
        restitution: worldObject.properties.restitution,
        name: `${worldObject.material}_material`
      });
      body.material = material;

      // Add damping for stability
      if (!worldObject.isStatic) {
        body.linearDamping = 0.05;
        body.angularDamping = 0.05;
      }

      // Add to physics world
      engine.addBody(body);

      return body;

    } catch (error) {
      worldLogger.error('Error creating physics body:', error);
      return null;
    }
  }

  removeObject(objectId: string, physicsEngine?: PhysicsEngine): boolean {
    try {
      const engine = physicsEngine || this.physicsEngine;
      const worldObject = this.objects.get(objectId);

      if (!worldObject) {
        worldLogger.warn('Object not found for removal', { id: objectId });
        return false;
      }

      // Remove from physics world
      if (worldObject.physicsBody && engine) {
        engine.removeBody(worldObject.physicsBody);
      }

      // Remove from object system
      this.objects.delete(objectId);

      worldLogger.info('Removed world object', { id: objectId });

      return true;

    } catch (error) {
      worldLogger.error('Error removing object:', error);
      return false;
    }
  }

  getObject(objectId: string): WorldObject | null {
    const worldObject = this.objects.get(objectId);
    if (!worldObject) return null;

    // Return copy without physics body
    const { physicsBody, ...objectCopy } = worldObject;
    return objectCopy;
  }

  getAllObjects(): WorldObject[] {
    return Array.from(this.objects.values()).map(obj => {
      const { physicsBody, ...objectCopy } = obj;
      return objectCopy;
    });
  }

  updateObject(objectId: string, updates: Partial<WorldObject>): boolean {
    try {
      const worldObject = this.objects.get(objectId);
      if (!worldObject) return false;

      // Update properties
      if (updates.position) {
        worldObject.position = { ...worldObject.position, ...updates.position };
        if (worldObject.physicsBody && this.physicsEngine) {
          const newPosition = new CANNON.Vec3(
            worldObject.position.x,
            worldObject.position.y,
            worldObject.position.z
          );
          this.physicsEngine.setBodyPosition(worldObject.physicsBody, newPosition);
        }
      }

      if (updates.rotation) {
        worldObject.rotation = { ...worldObject.rotation, ...updates.rotation };
        if (worldObject.physicsBody && this.physicsEngine) {
          const quaternion = new CANNON.Quaternion();
          quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), worldObject.rotation.x);
          const yRotation = new CANNON.Quaternion();
          yRotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), worldObject.rotation.y);
          const zRotation = new CANNON.Quaternion();
          zRotation.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), worldObject.rotation.z);
          quaternion.mult(yRotation);
          quaternion.mult(zRotation);
          this.physicsEngine.setBodyQuaternion(worldObject.physicsBody, quaternion);
        }
      }

      if (updates.color) {
        worldObject.color = updates.color;
      }

      if (updates.visible !== undefined) {
        worldObject.visible = updates.visible;
      }

      if (updates.properties) {
        worldObject.properties = { ...worldObject.properties, ...updates.properties };
      }

      worldLogger.debug('Updated object', { id: objectId, updates: Object.keys(updates) });

      return true;

    } catch (error) {
      worldLogger.error('Error updating object:', error);
      return false;
    }
  }

  update(deltaTime: number): void {
    try {
      // Update object positions based on physics bodies
      for (const [id, worldObject] of this.objects.entries()) {
        if (worldObject.physicsBody) {
          const body = worldObject.physicsBody;

          // Update position
          worldObject.position = {
            x: body.position.x,
            y: body.position.y,
            z: body.position.z
          };

          // Update rotation (convert quaternion to Euler angles)
          const euler = this.quaternionToEuler(body.quaternion);
          worldObject.rotation = {
            x: euler.x,
            y: euler.y,
            z: euler.z
          };
        }
      }

    } catch (error) {
      worldLogger.error('Error updating objects:', error);
    }
  }

  private quaternionToEuler(quaternion: CANNON.Quaternion): { x: number; y: number; z: number } {
    const q = quaternion;
    const test = q.x * q.y + q.z * q.w;

    if (test > 0.499) { // singularity at north pole
      return {
        x: 2 * Math.atan2(q.x, q.w),
        y: Math.PI / 2,
        z: 0
      };
    }

    if (test < -0.499) { // singularity at south pole
      return {
        x: -2 * Math.atan2(q.x, q.w),
        y: -Math.PI / 2,
        z: 0
      };
    }

    const sqx = q.x * q.x;
    const sqy = q.y * q.y;
    const sqz = q.z * q.z;
    return {
      x: Math.atan2(2 * q.y * q.w - 2 * q.x * q.z, 1 - 2 * sqy - 2 * sqz),
      y: Math.asin(2 * test),
      z: Math.atan2(2 * q.x * q.w - 2 * q.y * q.z, 1 - 2 * sqx - 2 * sqz)
    };
  }

  // Object creation helpers
  createSphere(options: {
    id?: string;
    position?: { x: number; y: number; z: number };
    radius?: number;
    color?: string;
    mass?: number;
    material?: string;
  }): WorldObject | null {
    const radius = options.radius || 1;
    return this.createObject({
      id: options.id,
      type: 'sphere',
      position: options.position || { x: 0, y: radius, z: 0 },
      scale: { x: radius * 2, y: radius * 2, z: radius * 2 },
      color: options.color || '#ffffff',
      mass: options.mass || 1,
      material: options.material || 'default'
    });
  }

  createBox(options: {
    id?: string;
    position?: { x: number; y: number; z: number };
    dimensions?: { x: number; y: number; z: number };
    color?: string;
    mass?: number;
    material?: string;
  }): WorldObject | null {
    const dimensions = options.dimensions || { x: 1, y: 1, z: 1 };
    return this.createObject({
      id: options.id,
      type: 'box',
      position: options.position || { x: 0, y: dimensions.y / 2, z: 0 },
      scale: dimensions,
      color: options.color || '#ffffff',
      mass: options.mass || 1,
      material: options.material || 'default'
    });
  }

  createCylinder(options: {
    id?: string;
    position?: { x: number; y: number; z: number };
    radius?: number;
    height?: number;
    color?: string;
    mass?: number;
    material?: string;
  }): WorldObject | null {
    const radius = options.radius || 1;
    const height = options.height || 2;
    return this.createObject({
      id: options.id,
      type: 'cylinder',
      position: options.position || { x: 0, y: height / 2, z: 0 },
      scale: { x: radius * 2, y: height, z: radius * 2 },
      color: options.color || '#ffffff',
      mass: options.mass || 1,
      material: options.material || 'default'
    });
  }

  // Utility methods
  getObjectCount(): number {
    return this.objects.size;
  }

  getObjectsByType(type: string): WorldObject[] {
    return this.getAllObjects().filter(obj => obj.type === type);
  }

  getObjectsInRadius(center: { x: number; y: number; z: number }, radius: number): WorldObject[] {
    return this.getAllObjects().filter(obj => {
      const distance = Math.sqrt(
        Math.pow(obj.position.x - center.x, 2) +
        Math.pow(obj.position.y - center.y, 2) +
        Math.pow(obj.position.z - center.z, 2)
      );
      return distance <= radius;
    });
  }

  clearAllObjects(): void {
    try {
      // Remove all physics bodies
      for (const [id, worldObject] of this.objects.entries()) {
        if (worldObject.physicsBody && this.physicsEngine) {
          this.physicsEngine.removeBody(worldObject.physicsBody);
        }
      }

      // Clear object map
      this.objects.clear();

      worldLogger.info('Cleared all objects');

    } catch (error) {
      worldLogger.error('Error clearing objects:', error);
    }
  }

  // Serialization for save/load
  serialize(): Array<WorldObject> {
    return this.getAllObjects();
  }

  deserialize(objectsData: Array<WorldObject>, physicsEngine?: PhysicsEngine): void {
    this.clearAllObjects();

    for (const objectData of objectsData) {
      this.createObject(objectData, physicsEngine);
    }

    worldLogger.info('Deserialized objects', { count: objectsData.length });
  }

  dispose(): void {
    this.clearAllObjects();
    this.physicsEngine = null;
    worldLogger.debug('Object system disposed');
  }
}