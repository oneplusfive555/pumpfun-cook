import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const transports = [
  new winston.transports.Console(),
  ...(process.env.NODE_ENV === 'production' ? [new winston.transports.File({ filename: 'app.log' })] : [])
];

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: transports
});

export default logger;
