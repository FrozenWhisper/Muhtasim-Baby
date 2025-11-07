// World simulation type definitions

// Object types
export type ObjectType = 'sphere' | 'box' | 'cylinder' | 'ground' | 'plane' | 'wall';

export interface WorldObject {
  id: string;
  type: ObjectType;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  color: string;
  mass: number;
  material: string;
  isStatic: boolean;
  visible: boolean;
  properties: {
    friction: number;
    restitution: number;
    [key: string]: any;
  };
}

// Physics state
export interface PhysicsState {
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  angularVelocity: Vector3;
  acceleration: Vector3;
  forces: Vector3[];
}

// Vector types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

// Raycasting
export interface RaycastResult {
  body: string | null;
  hitPoint: Vector3;
  distance: number;
  normal: Vector3;
}

// Contact and collision
export interface Contact {
  bodyA: string;
  bodyB: string;
  point: Vector3;
  normal: Vector3;
  impact: number;
  timestamp: number;
}

// World configuration
export interface WorldConfig {
  gravity: number;
  friction: number;
  restitution: number;
  maxObjects: number;
  worldSize: Vector3;
  physicsSteps: number;
}

// World state
export interface WorldState {
  time: number;
  objects: WorldObject[];
  aiPosition: Vector3 | null;
  objectCount: number;
  physicsTime: number;
}

// Object creation data
export interface SphereObjectData {
  id?: string;
  type: 'sphere';
  position: Vector3;
  radius: number;
  color: string;
  mass: number;
  material?: string;
  isStatic?: boolean;
}

export interface BoxObjectData {
  id?: string;
  type: 'box';
  position: Vector3;
  dimensions: Vector3;
  color: string;
  mass: number;
  material?: string;
  isStatic?: boolean;
}

export interface CylinderObjectData {
  id?: string;
  type: 'cylinder';
  position: Vector3;
  radiusTop: number;
  radiusBottom: number;
  height: number;
  color: string;
  mass: number;
  material?: string;
  isStatic?: boolean;
}

export type ObjectCreationData = SphereObjectData | BoxObjectData | CylinderObjectData;

// Simulation events
export interface SimulationEvent {
  type: 'object_added' | 'object_removed' | 'collision' | 'contact' | 'state_change';
  timestamp: number;
  data: any;
}

export interface ObjectAddedEvent extends SimulationEvent {
  type: 'object_added';
  data: {
    object: WorldObject;
  };
}

export interface ObjectRemovedEvent extends SimulationEvent {
  type: 'object_removed';
  data: {
    objectId: string;
  };
}

export interface CollisionEvent extends SimulationEvent {
  type: 'collision';
  data: {
    bodyA: string;
    bodyB: string;
    point: Vector3;
    impact: number;
  };
}

export interface ContactEvent extends SimulationEvent {
  type: 'contact';
  data: {
    bodyA: string;
    bodyB: string;
    point: Vector3;
    normal: Vector3;
  };
}

// AI avatar state
export interface AIAvatarState {
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  currentAction: string | null;
  emotionalState: {
    valence: number;
    arousal: number;
  };
}

// World builder types
export interface WorldBuilderState {
  mode: 'select' | 'create' | 'modify';
  selectedTool: ObjectType;
  previewObject: WorldObject | null;
  gridVisible: boolean;
  snapToGrid: boolean;
}

// Performance metrics
export interface WorldPerformanceMetrics {
  objectCount: number;
  physicsTime: number;
  collisionTests: number;
  memoryUsage: number;
  fps: number;
}

// Validation types
export interface ObjectValidationError {
  field: string;
  message: string;
  value: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ObjectValidationError[];
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;