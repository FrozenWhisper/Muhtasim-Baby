import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/index.js';
import { WebSocketHandler } from './communication/WebSocketHandler.js';
import { AI } from './ai/AI.js';
import { World } from './world/World.js';
import { logger } from './utils/logger.js';

async function startServer(): Promise<void> {
  try {
    // Initialize Express app
    const app = express();
    const httpServer = createServer(app);

    // Configure CORS
    app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }));

    // Configure Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
      }
    });

    // Initialize core systems
    logger.info('Initializing AI system...');
    const ai = new AI();

    logger.info('Initializing world simulation...');
    const world = new World();

    logger.info('Initializing communication handler...');
    const wsHandler = new WebSocketHandler(io, ai, world);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ai: {
          initialized: ai.isInitialized(),
          memoryCount: ai.getMemoryCount(),
          curiosityLevel: ai.getCuriosityLevel()
        },
        world: {
          objectCount: world.getObjectCount(),
          simulationTime: world.getSimulationTime()
        }
      });
    });

    // Start server
    httpServer.listen(config.PORT, () => {
      logger.info(`🚀 Conscious AI Server started on port ${config.PORT}`);
      logger.info(`🧠 AI System: ${ai.isInitialized() ? 'Initialized' : 'Loading...'}`);
      logger.info(`🌍 World Simulation: Active`);
      logger.info(`📡 WebSocket: Ready for connections`);
      logger.info(`🔗 Health Check: http://localhost:${config.PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      try {
        // Auto-save AI state
        await ai.saveState('autosave_shutdown');
        logger.info('✅ AI state saved successfully');

        // Stop world simulation
        world.stop();
        logger.info('✅ World simulation stopped');

        // Close server
        httpServer.close(() => {
          logger.info('✅ Server closed gracefully');
          process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
          logger.error('❌ Forced shutdown after timeout');
          process.exit(1);
        }, 10000);

      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});