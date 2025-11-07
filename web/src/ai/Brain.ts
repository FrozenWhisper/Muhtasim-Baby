import * as tf from '@tensorflow/tfjs';
import { CONSTANTS } from '../constants/index.js';

export class Brain {
  private model: tf.LayersModel | null = null;
  private optimizer: tf.Adam | null = null;
  private isInitialized: boolean = false;
  private backendInitialized: boolean = false;

  constructor() {
    this.initializeTensorFlow();
  }

  private async initializeTensorFlow(): Promise<void> {
    try {
      if (!this.backendInitialized) {
        // Try WebGL backend first (GPU acceleration)
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          console.log('✅ TensorFlow.js WebGL backend initialized');
        } catch (webglError) {
          console.warn('⚠️ WebGL not available, falling back to CPU:', webglError);
          await tf.setBackend('cpu');
          await tf.ready();
          console.log('✅ TensorFlow.js CPU backend initialized');
        }

        this.backendInitialized = true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize TensorFlow.js:', error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.initializeTensorFlow();

      if (this.isInitialized) return;

      console.log('Initializing neural network...');

      // Create the neural network architecture optimized for web
      this.model = this.createModel();

      // Initialize optimizer
      this.optimizer = tf.adam(0.001);

      // Initialize weights
      await this.initializeWeights();

      this.isInitialized = true;
      console.log('✅ Neural network initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize neural network:', error);
      throw error;
    }
  }

  private createModel(): tf.LayersModel {
    const input = tf.input({ shape: [CONSTANTS.NETWORK_DIMENSIONS.INPUT_SIZE] });

    // Hidden layers with batch normalization and dropout
    let x = tf.layers.dense({
      units: CONSTANTS.NETWORK_DIMENSIONS.HIDDEN_LAYERS[0],
      activation: 'relu',
      name: 'input_layer'
    })(input);

    x = tf.layers.batchNormalization()(x);
    x = tf.layers.dropout({ rate: 0.2 })(x);

    // Hidden layers
    for (let i = 0; i < CONSTANTS.NETWORK_DIMENSIONS.HIDDEN_LAYERS.length; i++) {
      x = tf.layers.dense({
        units: CONSTANTS.NETWORK_DIMENSIONS.HIDDEN_LAYERS[i],
        activation: 'relu',
        name: `hidden_layer_${i + 1}`
      })(x);

      x = tf.layers.batchNormalization()(x);
      x = tf.layers.dropout({ rate: 0.2 })(x);
    }

    // Output layer
    const output = tf.layers.dense({
      units: CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE,
      activation: 'tanh',
      name: 'output_layer'
    })(x);

    const model = tf.model({ inputs: input, outputs: output });

    // Optimize for web - use memory management
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mse']
    });

    return model;
  }

  private async initializeWeights(): Promise<void> {
    if (!this.model) return;

    // Initialize with small random weights
    this.model.getWeights().forEach(weight => {
      const shape = weight.shape;
      const scale = Math.sqrt(2.0 / (shape[0] + shape[shape.length - 1]));
      const randomWeights = tf.randomNormal(shape).mul(scale);
      weight.assign(randomWeights);
      randomWeights.dispose();
    });
  }

  async forward(sensoryInput: tf.Tensor): Promise<{
    actions: number[];
    internalState: number[];
    predictions: number[];
    predictionError: number[];
    learningAdjustments: number;
  }> {
    if (!this.model || !this.isInitialized) {
      throw new Error('Brain not initialized');
    }

    try {
      // Ensure input is properly shaped
      const input = sensoryInput.expandDims(0);

      // Forward pass
      const output = this.model.predict(input) as tf.Tensor;

      // Split output into components
      const splitSize = Math.floor(CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE / 3);

      const actions = output.slice([0, 0], [1, splitSize]);
      const internalState = output.slice([0, splitSize], [1, splitSize * 2]);
      const predictions = output.slice([0, splitSize * 2], [1, -1]);

      // Calculate prediction error
      const predictionError = tf.losses.meanSquaredError(input, predictions);

      // Perform learning
      const learningAdjustments = await this.performLearning(input, output, predictionError);

      // Convert tensors to arrays
      const result = {
        actions: await actions.data(),
        internalState: await internalState.data(),
        predictions: await predictions.data(),
        predictionError: await predictionError.data(),
        learningAdjustments
      };

      // Clean up tensors
      input.dispose();
      output.dispose();
      actions.dispose();
      internalState.dispose();
      predictions.dispose();
      predictionError.dispose();

      return result;

    } catch (error) {
      console.error('Error in forward pass:', error);
      throw error;
    }
  }

  private async performLearning(
    input: tf.Tensor,
    output: tf.Tensor,
    predictionError: tf.Tensor
  ): Promise<number> {
    try {
      if (!this.model || !this.optimizer) return 0;

      // Create loss function
      const loss = predictionError.add(output.mul(0.01).mean());

      // Use tf.variableGradients for learning
      const gradients = tf.variableGrads(() => {
        const forwardOutput = this.model!.predict(input) as tf.Tensor;
        return tf.losses.meanSquaredError(input, forwardOutput.slice([0, 40], [1, 40]));
      });

      if (gradients && gradients.grads) {
        // Apply gradients
        this.optimizer.applyGradients(gradients.grads);

        // Clean up gradient variables
        Object.values(gradients.grads).forEach(grad => grad.dispose());
        gradients.variables.forEach(variable => variable.dispose());

        const lossValue = await loss.data();
        loss.dispose();

        return lossValue[0];
      }

      return 0;

    } catch (error) {
      console.error('Error during learning:', error);
      return 0;
    }
  }

  async generateActions(currentSensoryState: tf.Tensor): Promise<number[]> {
    if (!this.model || !this.isInitialized) {
      return new Array(CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE / 3).fill(0);
    }

    try {
      const input = currentSensoryState.expandDims(0);
      const output = this.model.predict(input) as tf.Tensor;

      const actionSize = Math.floor(CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE / 3);
      const actions = output.slice([0, 0], [1, actionSize]);

      // Add exploration noise
      const noise = tf.randomNormal(actions.shape).mul(0.1);
      const noisyActions = actions.add(noise);

      const actionValues = await noisyActions.data();

      // Clean up
      input.dispose();
      output.dispose();
      actions.dispose();
      noisyActions.dispose();
      noise.dispose();

      return Array.from(actionValues);

    } catch (error) {
      console.error('Error generating actions:', error);
      return new Array(CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE / 3).fill(0);
    }
  }

  // Memory-efficient state management
  async getState(): Promise<any> {
    if (!this.model) return null;

    try {
      // Get weights as arrays
      const weights = await Promise.all(
        this.model.getWeights().map(weight => weight.array())
      );

      return {
        architecture: {
          inputSize: CONSTANTS.NETWORK_DIMENSIONS.INPUT_SIZE,
          hiddenLayers: CONSTANTS.NETWORK_DIMENSIONS.HIDDEN_LAYERS,
          outputSize: CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE
        },
        weights,
        backend: tf.getBackend()
      };

    } catch (error) {
      console.error('Error getting brain state:', error);
      return null;
    }
  }

  async setState(state: any): Promise<void> {
    if (!this.model || !state.weights) return;

    try {
      // Restore weights from arrays
      const weights = state.weights.map((weightArray: number[][]) =>
        tf.tensor(weightArray)
      );
      this.model.setWeights(weights);

      console.log('Brain state restored successfully');

    } catch (error) {
      console.error('Error setting brain state:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.isInitialized && this.backendInitialized;
  }

  getModelInfo(): any {
    if (!this.model) return null;

    return {
      layers: this.model.layers.length,
      parameters: this.model.countParams(),
      architecture: {
        inputSize: CONSTANTS.NETWORK_DIMENSIONS.INPUT_SIZE,
        hiddenLayers: CONSTANTS.NETWORK_DIMENSIONS.HIDDEN_LAYERS,
        outputSize: CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE
      },
      backend: tf.getBackend(),
      memory: tf.memory()
    };
  }

  // Memory management for browser
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
    console.log('Brain disposed');
  }

  // Performance optimization
  async warmup(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Warm up the model with dummy data
      const dummyInput = tf.randomNormal([1, CONSTANTS.NETWORK_DIMENSIONS.INPUT_SIZE]);
      await this.forward(dummyInput);
      dummyInput.dispose();
      console.log('Brain warmup completed');
    } catch (error) {
      console.error('Error during brain warmup:', error);
    }
  }
}