import { readAssetsFile, AssetDetails } from './reader';
import { checkCurrentPriceAndMarketCap } from './PandM2';
import { sellToken, updateAssetsFile } from './sell';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const PRICE_INCREASE_THRESHOLD = parseFloat(process.env.PRICE_INCREASE_THRESHOLD!);
const PRICE_DECREASE_THRESHOLD = parseFloat(process.env.PRICE_DECREASE_THRESHOLD!);
const SELL_PERCENTAGE_ON_INCREASE = parseFloat(process.env.SELL_PERCENTAGE_ON_INCREASE!);
const SELL_PERCENTAGE_ON_DECREASE = parseFloat(process.env.SELL_PERCENTAGE_ON_DECREASE!);
const EVALUATION_INTERVAL = parseInt(process.env.EVALUATION_INTERVAL!, 10);

interface EvaluationResult {
    tokenAddress: string | null;
    sold: boolean;
}

async function evaluateToken(asset: AssetDetails, sellerKeypair: Keypair): Promise<EvaluationResult> {
    if (!asset || !asset.tokenAddress) {
        console.log(`Invalid asset data...... Skipping...`);
        return { tokenAddress: null, sold: false };
    }

    try {
        const result = await checkCurrentPriceAndMarketCap(asset.tokenAddress);
        if (!result) {
            console.log(`Invalid data for token ${asset.tokenAddress}. Skipping...`);
            return { tokenAddress: asset.tokenAddress, sold: false };
        }

        const { currentPrice, currentMarketCap } = result;

        const basePrice = asset.boughtPrice;
        const baseMarketCap = asset.boughtMarketCap;

        const priceChange = ((currentPrice - basePrice) / basePrice) * 100;
        const marketCapChange = ((currentMarketCap - baseMarketCap) / baseMarketCap) * 100;

        const changePercentage = Math.min(priceChange, marketCapChange);

        let salePercentage = 0;
        let actionMessage = "No action needed.";

        if (priceChange <= PRICE_DECREASE_THRESHOLD) {
            salePercentage = SELL_PERCENTAGE_ON_DECREASE;
            actionMessage = `Selling token ${asset.tokenAddress} as Price/MC change (${priceChange.toFixed(2)}%) exceeds set threshold`;
        } else if (priceChange >= PRICE_INCREASE_THRESHOLD) {
            salePercentage = SELL_PERCENTAGE_ON_INCREASE;
            actionMessage = `Selling token ${asset.tokenAddress} as Price/MC change (${priceChange.toFixed(2)}%) exceeds set threshold`;
        }

        if (salePercentage > 0) {
            const { sold } = await sellToken(sellerKeypair, new PublicKey(asset.tokenAddress), salePercentage);
            if (sold) {
                console.log(`Token ${asset.tokenAddress} - Price/MC Change: ${changePercentage.toFixed(2)}%. Action: ${actionMessage}`);
                return { tokenAddress: asset.tokenAddress, sold: true };
            }
        }

        console.log(`Token ${asset.tokenAddress} - Price/MC Change: ${changePercentage.toFixed(2)}%. Action: ${actionMessage}`);
        return { tokenAddress: asset.tokenAddress, sold: false };
    } catch (error) {
        console.error(`Error checking ${asset.tokenAddress}:`, error);
        return { tokenAddress: asset.tokenAddress, sold: false };
    }
}

async function evaluateTokensContinuously() {
    const privateKey = bs58.decode(process.env.PRIVATE_KEY!);
    const sellerKeypair = Keypair.fromSecretKey(privateKey);

    let currentIndex = 0;

    setInterval(async () => {
        let assets = readAssetsFile();

        if (assets.length === 0) {
            console.log("No assets to evaluate. Waiting for new entries...");
            return;
        }

        if (currentIndex >= assets.length) {
            currentIndex = 0;
        }

        const asset = assets[currentIndex];

        if (asset) {
            const result = await evaluateToken(asset, sellerKeypair);

            if (result.sold) {
                assets = assets.filter(a => a.tokenAddress !== result.tokenAddress);
                updateAssetsFile(assets);
            }
        } else {
            console.log("No valid asset found at the current index. Skipping...");
        }

        currentIndex++;
    }, EVALUATION_INTERVAL); // Use the interval from .env file
}

export { evaluateTokensContinuously };
