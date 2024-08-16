import fs from 'fs';
import path from 'path';

interface AssetDetails {
    tokenAddress: string;
    boughtPrice: number;
    boughtMarketCap: number;
    remainingTokens: number | null;
}

const readAssetsFile = (): AssetDetails[] => {
    const filePath = path.join(__dirname, 'assets.txt');
    const data = fs.readFileSync(filePath, 'utf8').trim();
    return data.split('\n').map(line => {
        const [tokenAddress, boughtPrice, boughtMarketCap, remainingTokens] = line.split(',').map(item => item.trim());
        return {
            tokenAddress,
            boughtPrice: parseFloat(boughtPrice),
            boughtMarketCap: parseFloat(boughtMarketCap),
            remainingTokens: remainingTokens ? parseFloat(remainingTokens) : null
        };
    });
};

export { readAssetsFile, AssetDetails };
