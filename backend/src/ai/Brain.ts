import * as tf from '@tensorflow/tfjs-node';
import { config, CONSTANTS } from '../config/index.js';
import { SensoryInput, NeuralOutput } from '../../shared/src/types/ai.js';
import { networkLogger } from '../utils/logger.js';

export class Brain {
  private model: tf.Sequential | null = null;
  private optimizer: tf.Adam | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize with empty brain
  }

  async initialize(): Promise<void> {
    try {
      networkLogger.info('Initializing neural network...');

      // Create the neural network architecture
      this.model = this.createModel();

      // Initialize optimizer
      this.optimizer = tf.adam(config.NEURAL_LEARNING_RATE);

      // Initialize weights
      await this.initializeWeights();

      this.isInitialized = true;
      networkLogger.info('✅ Neural network initialized successfully');

    } catch (error) {
      networkLogger.error('❌ Failed to initialize neural network:', error);
      throw error;
    }
  }

  private createModel(): tf.Sequential {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.dense({
      inputShape: [CONSTANTS.NETWORK_DIMENSIONS.INPUT_SIZE],
      units: CONSTANTS.NETWORK_DIMENSIONS.HIDDEN_LAYERS[0],
      activation: 'relu',
      name: 'input_layer'
    }));

    // Hidden layers with recurrent connections
    CONSTANTS.NETWORK_DIMENSIONS.HIDDEN_LAYERS.forEach((units, index) => {
      model.add(tf.layers.dense({
        units,
        activation: 'relu',
        name: `hidden_layer_${index + 1}`
      }));

      // Add batch normalization for training stability
      model.add(tf.layers.batchNormalization());

      // Add dropout for regularization
      model.add(tf.layers.dropout({ rate: 0.2 }));
    });

    // Output layer for actions and internal state
    model.add(tf.layers.dense({
      units: CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE,
      activation: 'tanh',
      name: 'output_layer'
    }));

    return model;
  }

  private async initializeWeights(): Promise<void> {
    if (!this.model) return;

    // Initialize with random weights using Xavier initialization
    const weights = this.model.getWeights();
    const newWeights = weights.map(weight => {
      const [inputSize, outputSize] = weight.shape;
      const scale = Math.sqrt(2.0 / (inputSize + outputSize));
      return tf.randomNormal(weight.shape).mul(scale);
    });

    this.model.setWeights(newWeights);

    // Dispose of tensors to prevent memory leaks
    newWeights.forEach(w => w.dispose());
  }

  async forward(sensoryInput: tf.Tensor): Promise<NeuralOutput> {
    if (!this.model || !this.isInitialized) {
      throw new Error('Brain not initialized');
    }

    try {
      // Forward pass through the network
      const output = this.model.predict(sensoryInput.expandDims(0)) as tf.Tensor;

      // Split output into different components
      const splitSize = CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE / 3;

      const actions = output.slice([0, 0], [1, splitSize]);
      const internalState = output.slice([0, splitSize], [1, splitSize]);
      const predictions = output.slice([0, splitSize * 2], [1, splitSize]);

      // Calculate prediction error for learning
      const predictionError = tf.losses.meanSquaredError(
        sensoryInput.expandDims(0),
        predictions
      );

      const learningAdjustments = await this.performLearning(
        sensoryInput,
        output,
        predictionError
      );

      // Convert tensors to regular values for output
      const result = {
        actions: await actions.data(),
        internalState: await internalState.data(),
        predictions: await predictions.data(),
        predictionError: await predictionError.data(),
        learningAdjustments
      };

      // Clean up tensors
      output.dispose();
      actions.dispose();
      internalState.dispose();
      predictions.dispose();
      predictionError.dispose();

      return result;

    } catch (error) {
      networkLogger.error('Error in forward pass:', error);
      throw error;
    }
  }

  private async performLearning(
    sensoryInput: tf.Tensor,
    output: tf.Tensor,
    predictionError: tf.Tensor
  ): Promise<number> {
    try {
      if (!this.model || !this.optimizer) return 0;

      // Calculate loss (combination of prediction error and sparsity)
      const sparsityLoss = tf.mean(tf.abs(output)).mul(0.01);
      const totalLoss = predictionError.add(sparsityLoss);

      // Compute gradients
      const gradients = tf.variableGrads(() => {
        const forwardOutput = this.model!.predict(sensoryInput.expandDims(0)) as tf.Tensor;
        return totalLoss;
      });

      if (gradients && gradients.grads) {
        // Apply gradients
        this.optimizer.applyGradients(gradients.grads);

        // Dispose gradient variables
        Object.values(gradients.grads).forEach(grad => grad.dispose());
        gradients.variables.forEach(variable => variable.dispose());

        networkLogger.debug('Learning applied', {
          loss: await totalLoss.data(),
          learningRate: this.optimizer.learningRate
        });
      }

      const lossValue = await totalLoss.data();
      totalLoss.dispose();
      sparsityLoss.dispose();

      return lossValue[0];

    } catch (error) {
      networkLogger.error('Error during learning:', error);
      return 0;
    }
  }

  async generateActions(currentSensoryState: tf.Tensor): Promise<Float32Array> {
    if (!this.model || !this.isInitialized) {
      return new Float32Array(CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE / 3);
    }

    try {
      // Forward pass to get action intentions
      const output = this.model.predict(currentSensoryState.expandDims(0)) as tf.Tensor;

      // Extract action portion (first third of output)
      const actionSize = CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE / 3;
      const actions = output.slice([0, 0], [1, actionSize]);

      // Apply noise for exploration (based on curiosity)
      const noise = tf.randomNormal(actions.shape).mul(0.1);
      const noisyActions = actions.add(noise);

      // Get action values
      const actionValues = new Float32Array(await noisyActions.data());

      // Clean up tensors
      output.dispose();
      actions.dispose();
      noisyActions.dispose();
      noise.dispose();

      return actionValues;

    } catch (error) {
      networkLogger.error('Error generating actions:', error);
      return new Float32Array(CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE / 3);
    }
  }

  async getState(): Promise<any> {
    if (!this.model) return null;

    try {
      const weights = this.model.getWeights();
      const serializedWeights = await Promise.all(
        weights.map(weight => weight.array())
      );

      return {
        architecture: {
          inputSize: CONSTANTS.NETWORK_DIMENSIONS.INPUT_SIZE,
          hiddenLayers: CONSTANTS.NETWORK_DIMENSIONS.HIDDEN_LAYERS,
          outputSize: CONSTANTS.NETWORK_DIMENSIONS.OUTPUT_SIZE
        },
        weights: serializedWeights,
        optimizerConfig: {
          learningRate: this.optimizer?.learningRate
        }
      };

    } catch (error) {
      networkLogger.error('Error getting brain state:', error);
      return null;
    }
  }

  async setState(state: any): Promise<void> {
    if (!this.model || !state.weights) return;

    try {
      // Restore weights
      const weights = state.weights.map((weightArray: number[][]) =>
        tf.tensor(weightArray)
      );
      this.model.setWeights(weights);

      // Restore optimizer configuration
      if (state.optimizerConfig?.learningRate && this.optimizer) {
        this.optimizer.learningRate = state.optimizerConfig.learningRate;
      }

      networkLogger.info('Brain state restored successfully');

    } catch (error) {
      networkLogger.error('Error setting brain state:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.isInitialized;
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
      }
    };
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
    networkLogger.info('Brain disposed');
  }
}