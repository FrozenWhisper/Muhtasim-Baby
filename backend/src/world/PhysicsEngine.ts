import * as CANNON from 'cannon-es';
import { config, CONSTANTS } from '../config/index.js';
import { worldLogger } from '../utils/logger.js';

export class PhysicsEngine {
  private world: CANNON.World;
  private defaultMaterial: CANNON.Material;
  private contactMaterial: CANNON.ContactMaterial;
  private timeStep: number;
  private maxSubSteps: number;
  private fixedTimeStep: number;

  constructor() {
    this.timeStep = 1 / config.UPDATE_FREQUENCY;
    this.maxSubSteps = 3;
    this.fixedTimeStep = config.PHYSICS_TIMESTEP;
  }

  async initialize(): Promise<void> {
    try {
      // Create physics world
      this.world = new CANNON.World({
        gravity: new CANNON.Vec3(0, config.GRAVITY, 0) // -9.81 m/s^2
      });

      // Configure world settings
      this.world.broadphase = new CANNON.NaiveBroadphase();
      this.world.solver.iterations = 10;
      this.world.defaultContactMaterial.friction = 0.4;
      this.world.defaultContactMaterial.restitution = 0.3;

      // Create materials
      this.createMaterials();

      // Set up contact detection
      this.setupContactDetection();

      worldLogger.info('Physics engine initialized', {
        gravity: config.GRAVITY,
        timeStep: this.timeStep,
        maxSubSteps: this.maxSubSteps
      });

    } catch (error) {
      worldLogger.error('Failed to initialize physics engine:', error);
      throw error;
    }
  }

  private createMaterials(): void {
    try {
      // Create default material
      this.defaultMaterial = new CANNON.Material('default');
      this.defaultMaterial.friction = 0.4;
      this.defaultMaterial.restitution = 0.3;

      // Create contact material for interactions
      this.contactMaterial = new CANNON.ContactMaterial(
        this.defaultMaterial,
        this.defaultMaterial,
        {
          friction: 0.4,
          restitution: 0.3
        }
      );

      // Add contact material to world
      this.world.addContactMaterial(this.contactMaterial);

      worldLogger.debug('Physics materials created');

    } catch (error) {
      worldLogger.error('Error creating physics materials:', error);
      throw error;
    }
  }

  private setupContactDetection(): void {
    try {
      // Listen for contact events
      this.world.addEventListener('beginContact', (event: any) => {
        this.handleContactStart(event);
      });

      this.world.addEventListener('endContact', (event: any) => {
        this.handleContactEnd(event);
      });

      worldLogger.debug('Contact detection set up');

    } catch (error) {
      worldLogger.error('Error setting up contact detection:', error);
    }
  }

  private handleContactStart(event: any): void {
    try {
      const bodyA = event.bodyA as CANNON.Body;
      const bodyB = event.bodyB as CANNON.Body;

      // Calculate impact force
      const relativeVelocity = bodyA.velocity.vsub(bodyB.velocity);
      const impact = relativeVelocity.length();

      // Store contact information for sensory processing
      if (!bodyA.contactData) bodyA.contactData = [];
      if (!bodyB.contactData) bodyB.contactData = [];

      const contactData = {
        otherBody: bodyB === this.getDefaultBody() ? bodyA : bodyB,
        impact,
        timestamp: Date.now()
      };

      bodyA.contactData.push(contactData);
      bodyB.contactData.push({ ...contactData, otherBody: bodyA });

      // Limit contact data size
      if (bodyA.contactData.length > 10) bodyA.contactData.shift();
      if (bodyB.contactData.length > 10) bodyB.contactData.shift();

      worldLogger.debug('Contact started', {
        impact: impact.toFixed(3),
        bodyA: bodyA.name || 'unnamed',
        bodyB: bodyB.name || 'unnamed'
      });

    } catch (error) {
      worldLogger.debug('Error handling contact start:', error);
    }
  }

  private handleContactEnd(event: any): void {
    try {
      const bodyA = event.bodyA as CANNON.Body;
      const bodyB = event.bodyB as CANNON.Body;

      // Clear old contact data
      if (bodyA.contactData) {
        bodyA.contactData = bodyA.contactData.filter(
          contact => contact.otherBody !== bodyB
        );
      }

      if (bodyB.contactData) {
        bodyB.contactData = bodyB.contactData.filter(
          contact => contact.otherBody !== bodyA
        );
      }

    } catch (error) {
      worldLogger.debug('Error handling contact end:', error);
    }
  }

  step(deltaTime: number): void {
    try {
      // Step the physics simulation
      this.world.step(this.fixedTimeStep, deltaTime, this.maxSubSteps);

    } catch (error) {
      worldLogger.error('Error in physics step:', error);
    }
  }

  addBody(body: CANNON.Body): void {
    try {
      // Set default material if not already set
      if (!body.material) {
        body.material = this.defaultMaterial;
      }

      this.world.addBody(body);

      worldLogger.debug('Added physics body', {
        mass: body.mass,
        position: body.position,
        type: body.type === CANNON.Body.KINEMATIC ? 'kinematic' :
                body.type === CANNON.Body.STATIC ? 'static' : 'dynamic'
      });

    } catch (error) {
      worldLogger.error('Error adding physics body:', error);
    }
  }

  removeBody(body: CANNON.Body): void {
    try {
      this.world.removeBody(body);
      worldLogger.debug('Removed physics body');

    } catch (error) {
      worldLogger.error('Error removing physics body:', error);
    }
  }

  createBody(options: {
    mass?: number;
    shape: CANNON.Shape;
    position?: CANNON.Vec3;
    material?: CANNON.Material;
    type?: 'dynamic' | 'static' | 'kinematic';
  }): CANNON.Body {
    try {
      const body = new CANNON.Body({
        mass: options.mass || 0,
        shape: options.shape,
        position: options.position || new CANNON.Vec3(0, 0, 0),
        material: options.material || this.defaultMaterial
      });

      // Set body type
      if (options.type === 'static') {
        body.type = CANNON.Body.STATIC;
      } else if (options.type === 'kinematic') {
        body.type = CANNON.Body.KINEMATIC;
      } else {
        body.type = CANNON.Body.DYNAMIC;
      }

      // Apply default damping
      body.linearDamping = 0.01;
      body.angularDamping = 0.01;

      return body;

    } catch (error) {
      worldLogger.error('Error creating physics body:', error);
      throw error;
    }
  }

  createSphere(radius: number, options: any = {}): CANNON.Body {
    const shape = new CANNON.Sphere(radius);
    return this.createBody({ ...options, shape });
  }

  createBox(halfExtents: CANNON.Vec3, options: any = {}): CANNON.Body {
    const shape = new CANNON.Box(halfExtents);
    return this.createBody({ ...options, shape });
  }

  createCylinder(radiusTop: number, radiusBottom: number, height: number, options: any = {}): CANNON.Body {
    const shape = new CANNON.Cylinder(radiusTop, radiusBottom, height, 8);
    return this.createBody({ ...options, shape });
  }

  createPlane(options: any = {}): CANNON.Body {
    const shape = new CANNON.Plane();
    return this.createBody({ ...options, shape, mass: 0 });
  }

  // Raycasting for vision and distance detection
  raycast(from: CANNON.Vec3, to: CANNON.Vec3): { body: CANNON.Body | null; hitPointWorld: CANNON.Vec3; distance: number } {
    try {
      const result = new CANNON.RaycastResult();
      this.world.raycastClosest(from, to, {}, result);

      if (result.hasHit) {
        return {
          body: result.body,
          hitPointWorld: result.hitPointWorld,
          distance: from.distanceTo(result.hitPointWorld)
        };
      }

      return {
        body: null,
        hitPointWorld: to,
        distance: from.distanceTo(to)
      };

    } catch (error) {
      worldLogger.error('Error in raycast:', error);
      return {
        body: null,
        hitPointWorld: to,
        distance: from.distanceTo(to)
      };
    }
  }

  multiRaycast(from: CANNON.Vec3, directions: CANNON.Vec3[], maxDistance: number): Array<{
    body: CANNON.Body | null;
    direction: CANNON.Vec3;
    distance: number;
    hitPoint: CANNON.Vec3
  }> {
    const results: Array<{
      body: CANNON.Body | null;
      direction: CANNON.Vec3;
      distance: number;
      hitPoint: CANNON.Vec3
    }> = [];

    try {
      for (const direction of directions) {
        const to = from.vadd(direction.scale(maxDistance));
        const result = this.raycast(from, to);

        results.push({
          body: result.body,
          direction: direction,
          distance: result.distance,
          hitPoint: result.hitPointWorld
        });
      }

    } catch (error) {
      worldLogger.error('Error in multi-raycast:', error);
    }

    return results;
  }

  // Contact and collision detection
  getBodyContacts(body: CANNON.Body): Array<{ body: CANNON.Body; impact: number; point: CANNON.Vec3 }> {
    const contacts: Array<{ body: CANNON.Body; impact: number; point: CANNON.Vec3 }> = [];

    try {
      // Get contact data from the body
      if (body.contactData) {
        for (const contact of body.contactData) {
          contacts.push({
            body: contact.otherBody,
            impact: contact.impact,
            point: body.position // Simplified - actual contact point would be stored
          });
        }
      }

    } catch (error) {
      worldLogger.error('Error getting body contacts:', error);
    }

    return contacts;
  }

  getAllContacts(): Array<{ bodyA: CANNON.Body; bodyB: CANNON.Body; impact: number }> {
    const allContacts: Array<{ bodyA: CANNON.Body; bodyB: CANNON.Body; impact: number }> = [];

    try {
      // Iterate through all bodies and collect contacts
      const bodies = this.world.bodies;
      const processedPairs = new Set<string>();

      for (const body of bodies) {
        if (body.contactData) {
          for (const contact of body.contactData) {
            const pairKey = [body.id, contact.otherBody.id].sort().join('-');

            if (!processedPairs.has(pairKey)) {
              processedPairs.add(pairKey);
              allContacts.push({
                bodyA: body,
                bodyB: contact.otherBody,
                impact: contact.impact
              });
            }
          }
        }
      }

    } catch (error) {
      worldLogger.error('Error getting all contacts:', error);
    }

    return allContacts;
  }

  // Force and impulse application
  applyForce(body: CANNON.Body, force: CANNON.Vec3, worldPoint?: CANNON.Vec3): void {
    try {
      const point = worldPoint || body.position;
      body.applyForce(force, point);

    } catch (error) {
      worldLogger.error('Error applying force:', error);
    }
  }

  applyImpulse(body: CANNON.Body, impulse: CANNON.Vec3, worldPoint?: CANNON.Vec3): void {
    try {
      const point = worldPoint || body.position;
      body.applyImpulse(impulse, point);

    } catch (error) {
      worldLogger.error('Error applying impulse:', error);
    }
  }

  setVelocity(body: CANNON.Body, velocity: CANNON.Vec3): void {
    try {
      body.velocity.copy(velocity);

    } catch (error) {
      worldLogger.error('Error setting velocity:', error);
    }
  }

  setAngularVelocity(body: CANNON.Body, angularVelocity: CANNON.Vec3): void {
    try {
      body.angularVelocity.copy(angularVelocity);

    } catch (error) {
      worldLogger.error('Error setting angular velocity:', error);
    }
  }

  // Utility methods
  getDefaultMaterial(): CANNON.Material {
    return this.defaultMaterial;
  }

  getContactMaterial(): CANNON.ContactMaterial {
    return this.contactMaterial;
  }

  getWorld(): CANNON.World {
    return this.world;
  }

  createMaterial(options: { friction?: number; restitution?: number; name?: string }): CANNON.Material {
    const material = new CANNON.Material(options.name || 'custom');
    material.friction = options.friction || 0.4;
    material.restitution = options.restitution || 0.3;
    return material;
  }

  setBodyPosition(body: CANNON.Body, position: CANNON.Vec3): void {
    try {
      body.position.copy(position);
      // Update velocity to prevent physics glitches
      if (body.type === CANNON.Body.KINEMATIC) {
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
      }

    } catch (error) {
      worldLogger.error('Error setting body position:', error);
    }
  }

  setBodyQuaternion(body: CANNON.Body, quaternion: CANNON.Quaternion): void {
    try {
      body.quaternion.copy(quaternion);

    } catch (error) {
      worldLogger.error('Error setting body quaternion:', error);
    }
  }

  // Performance monitoring
  getPerformanceStats(): { bodyCount: number; contactCount: number } {
    try {
      return {
        bodyCount: this.world.bodies.length,
        contactCount: this.getAllContacts().length
      };

    } catch (error) {
      worldLogger.error('Error getting performance stats:', error);
      return { bodyCount: 0, contactCount: 0 };
    }
  }

  private getDefaultBody(): CANNON.Body {
    // Return a reference body for contact calculations
    return this.world.bodies[0] || new CANNON.Body();
  }

  dispose(): void {
    try {
      // Clear all bodies
      while (this.world.bodies.length > 0) {
        this.world.removeBody(this.world.bodies[0]);
      }

      // Remove contact materials
      this.world.removeContactMaterial(this.contactMaterial);

      worldLogger.debug('Physics engine disposed');

    } catch (error) {
      worldLogger.error('Error disposing physics engine:', error);
    }
  }
}