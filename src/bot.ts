import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
import winston from 'winston';
import Listeners from './listener';
import HolderChecker from './holder';
import { fetchAdditionalInfo, clearCache } from './social';
import { buyToken } from './buy';
import { Queue } from 'queue-typescript';
import { evaluateTokensContinuously } from './pnl'; 

dotenv.config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production' ? [new winston.transports.File({ filename: 'app.log' })] : [])
  ]
});

const validateEnvVariables = (): void => {
  if (!process.env.HELIUS_RPC_URL) {
    throw new Error('Please set HELIUS_RPC_URL in .env file');
  }
  if (!process.env.PROCESSING_DELAY) {
    throw new Error('Please set PROCESSING_DELAY in .env file');
  }
};

let transactionLock = false;

const withLock = async (fn: () => Promise<void>): Promise<void> => {
  if (transactionLock) {
    logger.warn('Transaction in progress. Waiting for lock to release...');
    return;
  }
  transactionLock = true;
  try {
    await fn();
  } finally {
    transactionLock = false;
  }
};

const main = async (): Promise<void> => {
  try {
    logger.info(`
                         ============================================================
                                             pumpfun-cook Bot! 🚀
                         ============================================================
                         Remember to trade responsibly. 
                         The market can be wild, and it's important to make informed decisions 
                         and manage your risks.
                         Happy sniping and may the gains be with you!
        
                         ============================================================
    `);

    validateEnvVariables();

    const connection = new Connection(process.env.HELIUS_RPC_URL!);
    const listeners = new Listeners(connection);
    const holderChecker = new HolderChecker(connection);
    const tokenQueue = new Queue<any>();
    let processing = false;

    const processQueue = async (): Promise<void> => {
      if (processing || tokenQueue.length === 0) return;
      processing = true;

      const data = tokenQueue.dequeue();
      const { signature, mintPublicKey, totalMinted, decimals, devWallet, bondingCurve, mintAddress, metadataUri, name, symbol } = data;

      try {
        logger.info(`New Token ${mintAddress}`);

        const socialCheckPassed = await fetchAdditionalInfo(metadataUri, name, symbol);
        if (!socialCheckPassed) {
          return;
        }

        const devSnippedCheckPassed = await holderChecker.checkIfDevSnipped(signature, devWallet, bondingCurve, mintAddress, mintPublicKey, totalMinted, decimals);
        if (!devSnippedCheckPassed) {
          return;
        }

        const holdingsCheckPassed = await holderChecker.calculateWalletHoldings(signature, mintPublicKey, totalMinted, decimals, devWallet, bondingCurve);
        if (!holdingsCheckPassed) {
          return;
        }

        await withLock(async () => {
          const buyResult = await buyToken(mintAddress);
          if (buyResult.success) {
            logger.info(`Buy Successful: ${buyResult.amount} tokens bought`);
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error processing token: ${error.message}`);
        } else {
          logger.error('Error processing token: Unknown error');
        }
      } finally {
        processing = false;
        processQueue();
      }
    };

    listeners.on('newMint', (data) => {
      tokenQueue.enqueue(data);
      processQueue();
    });

    await listeners.start();

    // Use the PROCESSING_DELAY from .env for delay before starting token evaluation
    const processingDelay = parseInt(process.env.PROCESSING_DELAY || '20000', 10);

    setTimeout(async () => {
      try {
        await withLock(async () => {
          await evaluateTokensContinuously();
          logger.info('Tokens are being evaluated continuously for sale..');
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error starting token evaluation: ${error.message}`);
        } else {
          logger.error('Error starting token evaluation: Unknown error');
        }
      }
    }, processingDelay); // Use the delay from .env

    process.stdin.resume();

    const gracefulShutdown = async () => {
      logger.info('\nShutting down...');
      clearCache(); 
      await listeners.stop();
      process.exit(0);
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error in main: ${error.message}`);
    } else {
      logger.error('Error in main: Unknown error');
    }
    process.exit(1);
  }
};

main();
