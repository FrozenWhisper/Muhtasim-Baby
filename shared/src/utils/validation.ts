// Validation utilities for the Conscious AI system

import { Vector3, WorldObject, ObjectType } from '../types/world.js';
import { SensoryInput, Emotion } from '../types/ai.js';
import { ERROR_CODES } from '../constants/index.js';

// Base validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value: any;
}

// Vector validation
export function validateVector3(vector: any, fieldName: string = 'vector'): ValidationResult {
  const errors: ValidationError[] = [];

  if (!vector || typeof vector !== 'object') {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_DATA,
      message: `${fieldName} must be an object with x, y, z properties`,
      value: vector
    });
    return { isValid: false, errors };
  }

  ['x', 'y', 'z'].forEach(axis => {
    const value = vector[axis];
    if (typeof value !== 'number' || !isFinite(value)) {
      errors.push({
        field: `${fieldName}.${axis}`,
        code: ERROR_CODES.INVALID_VALUE,
        message: `${fieldName}.${axis} must be a finite number`,
        value
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Color validation
export function validateColor(color: any, fieldName: string = 'color'): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof color !== 'string') {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} must be a string`,
      value: color
    });
    return { isValid: false, errors };
  }

  // Check hex color format (#RRGGBB or #RGB)
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexColorRegex.test(color)) {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} must be a valid hex color (e.g., #ff6b6b or #f63)`,
      value: color
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Object type validation
export function validateObjectType(type: any, fieldName: string = 'type'): ValidationResult {
  const errors: ValidationError[] = [];
  const validTypes: ObjectType[] = ['sphere', 'box', 'cylinder', 'ground', 'plane', 'wall'];

  if (typeof type !== 'string') {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} must be a string`,
      value: type
    });
  } else if (!validTypes.includes(type as ObjectType)) {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} must be one of: ${validTypes.join(', ')}`,
      value: type
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// World object validation
export function validateWorldObject(object: any, fieldName: string = 'object'): ValidationResult {
  const errors: ValidationError[] = [];

  if (!object || typeof object !== 'object') {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_DATA,
      message: `${fieldName} must be an object`,
      value: object
    });
    return { isValid: false, errors };
  }

  // Validate required fields
  const requiredFields = ['id', 'type', 'position', 'scale', 'color', 'mass'];
  for (const field of requiredFields) {
    if (!(field in object)) {
      errors.push({
        field: `${fieldName}.${field}`,
        code: ERROR_CODES.MISSING_FIELD,
        message: `${fieldName}.${field} is required`,
        value: undefined
      });
    }
  }

  // Validate type
  const typeValidation = validateObjectType(object.type, `${fieldName}.type`);
  errors.push(...typeValidation.errors);

  // Validate position
  if (object.position) {
    const positionValidation = validateVector3(object.position, `${fieldName}.position`);
    errors.push(...positionValidation.errors);
  }

  // Validate scale
  if (object.scale) {
    const scaleValidation = validateVector3(object.scale, `${fieldName}.scale`);
    errors.push(...scaleValidation.errors);

    // Scale must be positive
    ['x', 'y', 'z'].forEach(axis => {
      if (object.scale[axis] <= 0) {
        errors.push({
          field: `${fieldName}.scale.${axis}`,
          code: ERROR_CODES.INVALID_VALUE,
          message: `${fieldName}.scale.${axis} must be positive`,
          value: object.scale[axis]
        });
      }
    });
  }

  // Validate rotation (optional)
  if (object.rotation) {
    const rotationValidation = validateVector3(object.rotation, `${fieldName}.rotation`);
    errors.push(...rotationValidation.errors);
  }

  // Validate color
  const colorValidation = validateColor(object.color, `${fieldName}.color`);
  errors.push(...colorValidation.errors);

  // Validate mass
  if (typeof object.mass !== 'number' || !isFinite(object.mass) || object.mass < 0) {
    errors.push({
      field: `${fieldName}.mass`,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName}.mass must be a non-negative number`,
      value: object.mass
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Sensory input validation
export function validateSensoryInput(sensoryInput: any, fieldName: string = 'sensoryInput'): ValidationResult {
  const errors: ValidationError[] = [];

  if (!sensoryInput || typeof sensoryInput !== 'object') {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_DATA,
      message: `${fieldName} must be an object`,
      value: sensoryInput
    });
    return { isValid: false, errors };
  }

  // Validate sensory arrays
  const sensoryArrays = [
    { name: 'vision', minLength: 120 },
    { name: 'touch', minLength: 60 },
    { name: 'sound', minLength: 40 },
    { name: 'smell', minLength: 30 },
    { name: 'taste', minLength: 30 },
    { name: 'proprioception', minLength: 20 }
  ];

  for (const { name, minLength } of sensoryArrays) {
    const array = sensoryInput[name];

    if (!Array.isArray(array)) {
      errors.push({
        field: `${fieldName}.${name}`,
        code: ERROR_CODES.INVALID_VALUE,
        message: `${fieldName}.${name} must be an array`,
        value: array
      });
    } else if (array.length < minLength) {
      errors.push({
        field: `${fieldName}.${name}`,
        code: ERROR_CODES.INVALID_VALUE,
        message: `${fieldName}.${name} must have at least ${minLength} elements`,
        value: array.length
      });
    } else {
      // Validate array elements are numbers
      array.forEach((value, index) => {
        if (typeof value !== 'number' || !isFinite(value)) {
          errors.push({
            field: `${fieldName}.${name}[${index}]`,
            code: ERROR_CODES.INVALID_VALUE,
            message: `${fieldName}.${name}[${index}] must be a finite number`,
            value
          });
        }
      });
    }
  }

  // Validate timestamp
  if (typeof sensoryInput.timestamp !== 'number' || !isFinite(sensoryInput.timestamp)) {
    errors.push({
      field: `${fieldName}.timestamp`,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName}.timestamp must be a finite number`,
      value: sensoryInput.timestamp
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Emotion validation
export function validateEmotion(emotion: any, fieldName: string = 'emotion'): ValidationResult {
  const errors: ValidationError[] = [];

  if (!emotion || typeof emotion !== 'object') {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_DATA,
      message: `${fieldName} must be an object`,
      value: emotion
    });
    return { isValid: false, errors };
  }

  // Validate valence
  if (typeof emotion.valence !== 'number' || !isFinite(emotion.valence) ||
      emotion.valence < -1 || emotion.valence > 1) {
    errors.push({
      field: `${fieldName}.valence`,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName}.valence must be a number between -1 and 1`,
      value: emotion.valence
    });
  }

  // Validate arousal
  if (typeof emotion.arousal !== 'number' || !isFinite(emotion.arousal) ||
      emotion.arousal < 0 || emotion.arousal > 1) {
    errors.push({
      field: `${fieldName}.arousal`,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName}.arousal must be a number between 0 and 1`,
      value: emotion.arousal
    });
  }

  // Validate dimensions
  if (!Array.isArray(emotion.dimensions)) {
    errors.push({
      field: `${fieldName}.dimensions`,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName}.dimensions must be an array`,
      value: emotion.dimensions
    });
  } else {
    emotion.dimensions.forEach((value, index) => {
      if (typeof value !== 'number' || !isFinite(value)) {
        errors.push({
          field: `${fieldName}.dimensions[${index}]`,
          code: ERROR_CODES.INVALID_VALUE,
          message: `${fieldName}.dimensions[${index}] must be a finite number`,
          value
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Message validation
export function validateMessage(message: any, fieldName: string = 'message'): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof message !== 'string') {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} must be a string`,
      value: message
    });
    return { isValid: false, errors };
  }

  if (message.length === 0) {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} cannot be empty`,
      value: message
    });
  }

  if (message.length > 1000) {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} cannot exceed 1000 characters`,
      value: message.length
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Slot name validation
export function validateSlotName(slotName: any, fieldName: string = 'slotName'): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof slotName !== 'string') {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} must be a string`,
      value: slotName
    });
    return { isValid: false, errors };
  }

  if (slotName.length === 0) {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} cannot be empty`,
      value: slotName
    });
  }

  if (slotName.length > 20) {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} cannot exceed 20 characters`,
      value: slotName.length
    });
  }

  // Allow only alphanumeric characters, underscores, and hyphens
  const validSlotNameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validSlotNameRegex.test(slotName)) {
    errors.push({
      field: fieldName,
      code: ERROR_CODES.INVALID_VALUE,
      message: `${fieldName} can only contain letters, numbers, underscores, and hyphens`,
      value: slotName
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Rate limiting validation
export function validateRateLimit(actionCount: number, limit: number, timeWindow: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (actionCount > limit) {
    errors.push({
      field: 'rateLimit',
      code: ERROR_CODES.RATE_LIMITED,
      message: `Rate limit exceeded. Maximum ${limit} actions per ${timeWindow}ms allowed`,
      value: actionCount
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Type guard utilities
export function isValidVector3(value: any): value is Vector3 {
  const validation = validateVector3(value);
  return validation.isValid;
}

export function isValidWorldObject(value: any): value is WorldObject {
  const validation = validateWorldObject(value);
  return validation.isValid;
}

export function isValidSensoryInput(value: any): value is SensoryInput {
  const validation = validateSensoryInput(value);
  return validation.isValid;
}

export function isValidEmotion(value: any): value is Emotion {
  const validation = validateEmotion(value);
  return validation.isValid;
}

// Sanitization utilities
export function sanitizeMessage(message: string): string {
  return message
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 1000); // Limit length
}

export function sanitizeSlotName(slotName: string): string {
  return slotName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '') // Remove invalid characters
    .slice(0, 20); // Limit length
}

export function sanitizeColor(color: string): string {
  // Ensure hex color format
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (hexColorRegex.test(color)) {
    return color.toLowerCase();
  }

  // Return default color if invalid
  return '#ffffff';
}

// Composite validation for complex objects
export function validateObjectCreationData(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate type
  const typeValidation = validateObjectType(data.type);
  errors.push(...typeValidation.errors);

  // Validate position
  const positionValidation = validateVector3(data.position, 'position');
  errors.push(...positionValidation.errors);

  // Validate scale if provided
  if (data.scale) {
    const scaleValidation = validateVector3(data.scale, 'scale');
    errors.push(...scaleValidation.errors);
  }

  // Validate color if provided
  if (data.color) {
    const colorValidation = validateColor(data.color, 'color');
    errors.push(...colorValidation.errors);
  }

  // Validate mass if provided
  if (data.mass !== undefined) {
    if (typeof data.mass !== 'number' || !isFinite(data.mass) || data.mass < 0) {
      errors.push({
        field: 'mass',
        code: ERROR_CODES.INVALID_VALUE,
        message: 'mass must be a non-negative number',
        value: data.mass
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateSimulationControlData(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  const validActions = ['play', 'pause', 'speed', 'reset'];

  if (!validActions.includes(data.action)) {
    errors.push({
      field: 'action',
      code: ERROR_CODES.INVALID_VALUE,
      message: `action must be one of: ${validActions.join(', ')}`,
      value: data.action
    });
  }

  if (data.action === 'speed' && (typeof data.speed !== 'number' || !isFinite(data.speed) ||
      data.speed < 0.1 || data.speed > 5)) {
    errors.push({
      field: 'speed',
      code: ERROR_CODES.INVALID_VALUE,
      message: 'speed must be a number between 0.1 and 5',
      value: data.speed
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Error formatting utilities
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(error => `${error.field}: ${error.message}`).join('; ');
}

export function createErrorResponse(errors: ValidationError[]): {
  success: false;
  errors: ValidationError[];
  message: string;
} {
  return {
    success: false,
    errors,
    message: formatValidationErrors(errors)
  };
}