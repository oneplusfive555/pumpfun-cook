import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { PumpFunSDK, CreateEvent as SdkCreateEvent } from 'pumpdotfun-sdk'; // Ensure this is the correct import path
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { AnchorProvider } from '@coral-xyz/anchor';
import dotenv from 'dotenv';
import logger from './logger';
import EventEmitter from 'events';

dotenv.config();

interface BondingCurveData {
  tokenTotalSupply: bigint;
  decimals?: number;
}

interface NewMintEvent {
  signature: string;
  mintPublicKey: PublicKey;
  totalMinted: bigint;
  decimals: number;
  devWallet: string;
  bondingCurve: string;
  mintAddress: string;
  metadataUri: string;
  name: string;
  symbol: string;
}

class Listeners extends EventEmitter {
  private connection: Connection;
  private sdk: PumpFunSDK | null = null;
  private createEventId: number | null = null;
  private seenMints: Set<string> = new Set();

  constructor(connection: Connection) {
    super();
    this.connection = connection;
  }

  
  async initializeSDK(): Promise<void> {
    const wallet = new NodeWallet(Keypair.generate());
    const provider = new AnchorProvider(this.connection, wallet, { commitment: 'finalized' });
    this.sdk = new PumpFunSDK(provider);
  }

  
  async start(): Promise<void> {
    try {
      await this.initializeSDK();
      this.subscribeToCreateEvent();
    } catch (error) {
      logger.error(`Failed to start listeners: ${(error as Error).message}`);
    }
  }

  
  subscribeToCreateEvent(): void {
    try {
      if (this.sdk) {
        this.createEventId = this.sdk.addEventListener('createEvent', async (event: SdkCreateEvent, slot: number, signature: string) => {
          try {
            const mintAddress = event.mint.toBase58();
            if (!this.seenMints.has(mintAddress)) {
              this.seenMints.add(mintAddress);

              const name = event.name;
              const symbol = event.symbol;

              
              const bondingCurveData = await this.fetchBondingCurveData(new PublicKey(event.mint));
              if (bondingCurveData) {
                const totalMinted = BigInt(bondingCurveData.tokenTotalSupply);
                const decimals = bondingCurveData.decimals || 6;
                const adjustedTotalSupply = totalMinted / BigInt(Math.pow(10, decimals));

                
                const newMintEvent: NewMintEvent = {
                  signature,
                  mintPublicKey: new PublicKey(mintAddress),
                  totalMinted: adjustedTotalSupply,
                  decimals,
                  devWallet: event.user.toBase58(),
                  bondingCurve: event.bondingCurve.toBase58(),
                  mintAddress,
                  metadataUri: event.uri,
                  name,
                  symbol
                };
                this.emit('newMint', newMintEvent);
              } else {
                logger.warn(`Could not fetch bonding curve data for token: ${mintAddress}`);
              }
            }
          } catch (error) {
            logger.error(`Error processing createEvent: ${(error as Error).message}`);
          }
        });
        logger.info(`Searching for new tokens ....`);
      }
    } catch (error) {
      logger.error(`Failed to subscribe to createEvent: ${(error as Error).message}`);
    }
  }

  
  async stop(): Promise<void> {
    try {
      if (this.createEventId !== null && this.sdk) {
        await this.sdk.removeEventListener(this.createEventId);
        this.createEventId = null;
        logger.info('Unsubscribed from createEvent');
      }
    } catch (error) {
      logger.error(`Failed to stop listeners: ${(error as Error).message}`);
    }
  }

  
  async fetchBondingCurveData(mintPublicKey: PublicKey): Promise<BondingCurveData | null> {
    try {
      if (this.sdk) {
        const bondingCurveAccount = await this.sdk.getBondingCurveAccount(mintPublicKey);
        if (bondingCurveAccount) {
          return {
            tokenTotalSupply: bondingCurveAccount.tokenTotalSupply,
            decimals: 'decimals' in bondingCurveAccount ? bondingCurveAccount.decimals : undefined
          } as BondingCurveData;
        }
      }
      return null;
    } catch (error) {
      logger.error(`Failed to fetch bonding curve data for ${mintPublicKey.toBase58()}: ${(error as Error).message}`);
      return null;
    }
  }
}

export default Listeners;
