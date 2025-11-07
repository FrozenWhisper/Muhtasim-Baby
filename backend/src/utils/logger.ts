import winston from 'winston';
import { config } from '../config/index.js';

// Create logger instance
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'conscious-ai-backend' },
  transports: [
    // Write all logs with importance level of 'error' or less to 'error.log'
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to 'combined.log'
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, log to the console
if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        let log = `${timestamp} [${service}] ${level}: ${message}`;
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        return log;
      })
    )
  }));
}

// Create special loggers for different AI components
export const aiLogger = logger.child({ component: 'ai' });
export const worldLogger = logger.child({ component: 'world' });
export const memoryLogger = logger.child({ component: 'memory' });
export const emotionLogger = logger.child({ component: 'emotion' });
export const languageLogger = logger.child({ component: 'language' });
export const curiosityLogger = logger.child({ component: 'curiosity' });
export const networkLogger = logger.child({ component: 'neural-network' });

export default logger;