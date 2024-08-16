import fs from 'fs';
import path from 'path';

function writeAssetDetails(tokenAddress: string, priceAtBuy: number, marketCapAtBuy: number, tokenAmount: number): void {
    
    const formattedPrice = priceAtBuy.toFixed(9); 
    const formattedMarketCap = marketCapAtBuy.toFixed(9); 
    const formattedTokenAmount = tokenAmount.toFixed(6); 

    
    const data = `${tokenAddress}, ${formattedPrice}, ${formattedMarketCap}, ${formattedTokenAmount}\n`;
    const filePath = path.join(__dirname, 'assets.txt');

    try {
        fs.appendFileSync(filePath, data, 'utf8');
        console.log(`Successfully logged the purchase of token ${tokenAddress}`);
    } catch (error) {
        console.error(`Failed to write asset details: ${(error as Error).message}`);
    }
}

export { writeAssetDetails };
