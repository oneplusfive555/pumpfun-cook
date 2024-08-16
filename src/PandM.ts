import { Connection, PublicKey } from '@solana/web3.js';
import { BondingCurveAccount } from 'pumpdotfun-sdk';
import dotenv from 'dotenv';


dotenv.config();

const PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const DEFAULT_COMMITMENT = 'finalized';
const DECIMALS = 6; 
const connection = new Connection(process.env.HELIUS_RPC_URL!, DEFAULT_COMMITMENT);

async function getBondingCurveAccount(mint: PublicKey): Promise<BondingCurveAccount> {
  const bondingCurvePDA = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    new PublicKey(PROGRAM_ID)
  )[0];

  const accountInfo = await connection.getAccountInfo(bondingCurvePDA, DEFAULT_COMMITMENT);
  if (!accountInfo) {
    throw new Error('Bonding curve account not found');
  }

  return BondingCurveAccount.fromBuffer(accountInfo.data); 
}


async function getPriceAndMarketCap(mintAddress: string): Promise<{ price: number, marketCap: number } | null> {
  try {
    const mint = new PublicKey(mintAddress);
    const bondingCurveAccount = await getBondingCurveAccount(mint);

    const totalSupplyRaw = bondingCurveAccount.tokenTotalSupply;
    const virtualSolReserves = bondingCurveAccount.virtualSolReserves;
    const virtualTokenReserves = bondingCurveAccount.virtualTokenReserves;

   
    const pricePerTokenInLamports = (virtualSolReserves * 10n ** BigInt(DECIMALS)) / virtualTokenReserves;
    const pricePerTokenInSOL = Number(pricePerTokenInLamports) / 10 ** 9; // Convert to SOL, maintaining precision

    
    const marketCapInLamports = (totalSupplyRaw * pricePerTokenInLamports) / (10n ** BigInt(DECIMALS));
    const marketCapInSOL = Number(marketCapInLamports) / 10 ** 9; // Convert to SOL

    // Display results
    //console.log(`Price per Token in SOL for ${mintAddress}:`, pricePerTokenInSOL.toFixed(9));
    //console.log(`Market Cap in SOL for ${mintAddress}:`, marketCapInSOL.toFixed(9));

    
    return {
      price: pricePerTokenInSOL,
      marketCap: marketCapInSOL
    };
  } catch (error) {
    console.error(`Error fetching price and market cap for ${mintAddress}:`, (error as Error).message);
    return null; 
  }
}

export {
  getPriceAndMarketCap,
};
