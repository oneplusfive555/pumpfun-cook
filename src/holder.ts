import { Connection, PublicKey, ParsedInstruction, PartiallyDecodedInstruction, ParsedAccountData } from '@solana/web3.js';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

class HolderChecker {
  connection: Connection;
  TOP10MAX: number;
  TOPDEV: number;
  shouldCheckDevSnipping: boolean;
  shouldCheckTop10Max: boolean;

  constructor(connection: Connection) {
    this.connection = connection;
    this.TOP10MAX = parseFloat(process.env.TOP10MAX || '15'); // Default to 15 if not specified in .env
    this.TOPDEV = parseFloat(process.env.TOPDEV || '15'); // Default to 15 if not specified in .env
    this.shouldCheckDevSnipping = process.env.CHECK_DEV_SNIPPING === 'true';
    this.shouldCheckTop10Max = process.env.CHECK_TOP10MAX === 'true';
  }

  async checkIfDevSnipped(txId: string, devWallet: string, bondingCurve: string, mintAddress: string, mintPublicKey: PublicKey, totalMinted: bigint, decimals: number): Promise<boolean> {
    if (!this.shouldCheckDevSnipping) {
      logger.info('Dev snipping check is disabled');
      return true;
    }

    try {
      const tx = await this.connection.getParsedTransaction(txId, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) {
        logger.error(`Transaction not found: ${txId}`);
        return false;
      }

      const innerInstructions = tx.meta?.innerInstructions || [];
      let totalSnipped = 0;

      for (const innerIx of innerInstructions) {
        for (const ix of innerIx.instructions) {
          if (this.isParsedInstruction(ix) && ix.programId.toBase58() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' && ix.parsed?.type === 'transfer') {
            const { source, destination, amount } = ix.parsed.info;
            const amountParsed = Number(amount); 
            const totalMintedNum = Number(totalMinted); 
            const transferPercentage = (amountParsed / Math.pow(10, decimals)) / totalMintedNum * 100;

            logger.info(`Dev snipped [${(amountParsed / Math.pow(10, decimals)).toFixed(decimals)} | ${transferPercentage.toFixed(2)}%] of token supply`);

            if (source === bondingCurve && destination === devWallet) {
              totalSnipped += amountParsed / Math.pow(10, decimals);
            }

            if (transferPercentage > this.TOPDEV) {
              logger.info(`Warning: Dev snipped more than specified %`);
              return false;
            }
          }
        }
      }

      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to check if dev snipped: ${error.message}`);
      } else {
        logger.error('Failed to check if dev snipped: Unknown error');
      }
      return false;
    }
  }

  async calculateWalletHoldings(signature: string, mintPublicKey: PublicKey, totalMinted: bigint, decimals: number, devWallet: string, bondingCurve: string): Promise<boolean> {
    if (!this.shouldCheckTop10Max) {
      logger.info('Top 10 holders check is disabled');
      return true;
    }

    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) {
        logger.error(`Transaction not found: ${signature}`);
        return false;
      }

      const largestAccountsResponse = await this.connection.getTokenLargestAccounts(mintPublicKey);
      if (!largestAccountsResponse || !largestAccountsResponse.value) {
        logger.error(`Failed to get token largest accounts for: ${mintPublicKey.toBase58()}`);
        return false;
      }

      const accounts = largestAccountsResponse.value.map(account => ({
        address: account.address.toBase58(),
        uiAmount: Number(account.uiAmount ?? 0), 
      }));

      const filteredAccounts = accounts.filter(account => account.uiAmount > 0);
      const sortedAccounts = filteredAccounts.sort((a, b) => b.uiAmount - a.uiAmount);

      const percentageHolders = await Promise.all(
        sortedAccounts.map(async (account) => {
          const accountInfo = await this.connection.getParsedAccountInfo(new PublicKey(account.address));
          if (!accountInfo.value || !accountInfo.value.data) {
            logger.warn(`Account info not found for address: ${account.address}`);
            return null;
          }
          const data = accountInfo.value.data as ParsedAccountData;
          const ownerAddress = data.parsed.info.owner;
          return {
            owner: ownerAddress,
            percentage: (account.uiAmount / Number(totalMinted)) * 100, 
          };
        })
      );

      let devPercentage = 0;
      let bondingCurvePercentage = 0;
      let totalPercentage = 0;

      const percentages = percentageHolders
        .filter(holder => holder !== null)
        .map(holder => {
          let label = '';
          if (holder!.owner === devWallet) {
            devPercentage = holder!.percentage;
            label = 'D';
          } else if (holder!.owner === bondingCurve) {
            bondingCurvePercentage = holder!.percentage;
            return null; 
          } else {
            totalPercentage += holder!.percentage;
          }
          return `${label} ${holder!.percentage.toFixed(2)}%`;
        })
        .filter(Boolean); 

      logger.info(`All Holders: B ${bondingCurvePercentage.toFixed(2)}% | ${percentages.join(' | ')}`);

      const holdersExcludingBondingCurve = percentageHolders.filter(holder => holder !== null && holder!.owner !== bondingCurve);
      const top10Holders = holdersExcludingBondingCurve.slice(0, 10);
      const top10TotalPercentage = top10Holders.reduce((sum, holder) => sum + holder!.percentage, 0);

      if (top10TotalPercentage > this.TOP10MAX) {
        logger.info(`Warning: Top 10 holders collectively exceed threshold of ${this.TOP10MAX}% with ${top10TotalPercentage.toFixed(2)}%.`);
        return false;
      }

      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to calculate wallet holdings: ${error.message}`);
      } else {
        logger.error('Failed to calculate wallet holdings: Unknown error');
      }
      return false;
    }
  }

  private isParsedInstruction(instruction: ParsedInstruction | PartiallyDecodedInstruction): instruction is ParsedInstruction {
    return 'parsed' in instruction;
  }
}

export default HolderChecker;
