import { getPriceAndMarketCap } from './PandM';

async function checkCurrentPriceAndMarketCap(tokenAddress: string): Promise<{ currentPrice: number, currentMarketCap: number } | null> {
    const result = await getPriceAndMarketCap(tokenAddress);
    if (!result) {
        return null; 
    }
    const { price, marketCap } = result;
    return { currentPrice: price, currentMarketCap: marketCap };
}

export { checkCurrentPriceAndMarketCap };
