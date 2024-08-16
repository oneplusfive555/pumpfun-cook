import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import logger from './logger'; // Adjust import based on how logger is exported in TypeScript
import { create } from 'ipfs-http-client';

dotenv.config();

const gateways = [
  'https://cf-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.fleek.co/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://w3s.link/ipfs/'
];

// In-memory cache to store fetched metadata by URI
const metadataCache = new Map<string, any>();

// Function to clear the cache
function clearCache(): void {
  metadataCache.clear();
  logger.info('Cache cleared.');
}

async function fetchAdditionalInfo(uri: string, tokenName: string, tokenSymbol: string): Promise<boolean> {
  try {
    let metadata = metadataCache.get(uri);
    if (!metadata) {
      metadata = await fetchSocialLinks(uri);
      metadataCache.set(uri, metadata);
    } else {
      //logger.info(`Using cached metadata for URI: ${uri}`);
    }

    //logger.info('Running specified social checks...');

    const shouldCheckTelegram = process.env.CHECK_TELEGRAM === 'true';
    const shouldCheckTwitter = process.env.CHECK_TWITTER === 'true';
    const shouldCheckWebsite = process.env.CHECK_WEBSITE === 'true';
    const requireAtLeastOneSocial = process.env.REQUIRE_AT_LEAST_ONE_SOCIAL === 'true';

    const hasTelegram = metadata.telegram && checkLink(metadata.telegram, 't.me/');
    const hasTwitter = metadata.twitter && (checkLink(metadata.twitter, 'x.com/') || checkLink(metadata.twitter, 'twitter.com/'));
    const hasWebsite = metadata.website && !checkLink(metadata.website, 't.me/') && !checkLink(metadata.website, 'x.com/') && !checkLink(metadata.website, 'twitter.com/');

    if (!shouldCheckTelegram && !shouldCheckTwitter && !shouldCheckWebsite && requireAtLeastOneSocial) {
      if (!metadata.telegram && !metadata.twitter && !metadata.website) {
        //logger.warn(`At least one social link required but none found for: ${uri}`);
        return false;
      } else {
        //logger.info(`At least one social link found for: ${uri}`);
        return true;
      }
    }

    if ((shouldCheckTelegram && !hasTelegram) || (shouldCheckTwitter && !hasTwitter) || (shouldCheckWebsite && !hasWebsite)) {
      logger.warn('Invalid social links');
      return false;
    }

    const isTelegramValid = shouldCheckTelegram ? await checkWebsite(metadata.telegram) : true;
    const isTwitterValid = shouldCheckTwitter ? await checkWebsite(metadata.twitter) : true;
    const isWebsiteValid = shouldCheckWebsite ? await checkWebsite(metadata.website) : true;

    if ((shouldCheckTelegram && !isTelegramValid) || (shouldCheckTwitter && !isTwitterValid) || (shouldCheckWebsite && !isWebsiteValid)) {
      logger.info('Either TG, X, or website link invalid');
      return false;
    }

    const twitterContainsTokenName = shouldCheckTwitter ? checkContentForTokenNameOrSymbol(metadata.twitter, tokenName, tokenSymbol) : true;
    const websiteContainsTokenName = shouldCheckWebsite ? checkContentForTokenNameOrSymbol(metadata.website, tokenName, tokenSymbol) : true;

    if (shouldCheckTwitter && !twitterContainsTokenName) {
      const twitterContainsVariation = checkContentForTokenNameOrSymbol(metadata.twitter, tokenName, tokenSymbol, true);
      if (!twitterContainsVariation) {
        logger.info('Token name or symbol not found in X link');
        return false;
      }
    }

    if (shouldCheckWebsite && !websiteContainsTokenName) {
      const websiteContainsVariation = checkContentForTokenNameOrSymbol(metadata.website, tokenName, tokenSymbol, true);
      if (!websiteContainsVariation) {
        logger.info('Token name or symbol not found in website link');
        return false;
      }
    }

    //logger.info('All Social links are valid');
    return true;
  } catch (error) {
    logger.error('Error fetching additional info:', error);
    return false;
  }
}

async function fetchSocialLinks(uri: string, gatewayIndex = 0): Promise<any> {
  const cid = uri.split('/').pop() || ''; // Ensure CID is always a string
  let success = false;
  let data = null;

  const usePublicGateways = process.env.USE_PUBLIC_GATEWAYS === 'true';
  const useLocalIPFS = process.env.USE_LOCAL_IPFS === 'true';

  if (usePublicGateways) {
    gatewayIndex = gatewayIndex % gateways.length;

    for (let i = 0; i < gateways.length; i++) {
      const currentGateway = gateways[(gatewayIndex + i) % gateways.length];
      const url = `${currentGateway}${cid}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.headers.get('content-type')?.includes('application/json')) {
          const metadata = await response.json();
          data = {
            telegram: metadata.telegram,
            twitter: metadata.twitter,
            website: metadata.website
          };
          success = true;
          break;
        } else {
          logger.error(`Invalid content type from ${currentGateway}: ${response.headers.get('content-type')}`);
        }
      } catch (error) {
        logger.error(`Error fetching from ${currentGateway}: ${(error as Error).message}`);
      }
    }

    if (success) return data;
  }

  if (!success && useLocalIPFS) {
    try {
      const ipfs = create({
        host: process.env.LOCAL_IPFS_HOST as string,
        port: process.env.LOCAL_IPFS_PORT ? parseInt(process.env.LOCAL_IPFS_PORT, 10) : undefined,
        protocol: process.env.LOCAL_IPFS_PROTOCOL as string
      });

      const dataChunks = [];
      for await (const chunk of ipfs.cat(cid)) {
        dataChunks.push(chunk);
      }
      const metadataString = Buffer.concat(dataChunks).toString();
      const metadata = JSON.parse(metadataString);

      data = {
        telegram: metadata.telegram,
        twitter: metadata.twitter,
        website: metadata.website
      };
      success = true;
    } catch (error) {
      logger.error('Error fetching metadata from local IPFS node:', (error as Error).message);
    }
  }

  if (!success) {
    throw new Error('Failed to fetch metadata from all gateways and local IPFS node');
  }

  return data;
}

function checkWebsite(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      rejectUnauthorized: false // Ignore SSL certificate errors
    };

    let isCallbackCalled = false;

    const request = protocol.get(url, options, (response) => {
      if (!isCallbackCalled) {
        const { statusCode } = response;
        isCallbackCalled = true;
        resolve(statusCode !== undefined && statusCode >= 200 && statusCode < 300);
      }
    });

    request.on('error', () => {
      if (!isCallbackCalled) {
        isCallbackCalled = true;
        resolve(false);
      }
    });

    request.setTimeout(5000, () => {
      if (!isCallbackCalled) {
        request.destroy();
        isCallbackCalled = true;
        resolve(false);
      }
    });
  });
}

function checkContentForTokenNameOrSymbol(content: string, tokenName: string, tokenSymbol: string, checkVariations = false): boolean {
  const loweredContent = content.toLowerCase();
  const loweredTokenName = tokenName.toLowerCase().replace(/\s+/g, '');
  const loweredTokenSymbol = tokenSymbol.toLowerCase().replace(/\s+/g, '');

  if (loweredContent.includes(loweredTokenName) || loweredContent.includes(loweredTokenSymbol)) {
    return true;
  }

  if (checkVariations) {
    const tokenNameVariations = generateTokenNameVariations(loweredTokenName);
    const tokenSymbolVariations = generateTokenNameVariations(loweredTokenSymbol);

    return [...tokenNameVariations, ...tokenSymbolVariations].some(variation => loweredContent.includes(variation));
  }

  return false;
}

function generateTokenNameVariations(tokenPart: string): string[] {
  const variations = new Set([tokenPart.toLowerCase()]);
  const substitutionRules = [
    { from: 'o', to: '0' },
    { from: '0', to: 'o' },
    { from: 'i', to: '1' },
    { from: '1', to: 'i' },
    { from: 'e', to: '3' },
    { from: '3', to: 'e' },
  ];

  substitutionRules.forEach(rule => {
    const newVariations = new Set<string>();
    variations.forEach(variation => {
      if (variation.includes(rule.from)) {
        newVariations.add(variation.replace(new RegExp(rule.from, 'g'), rule.to));
      }
      if (variation.includes(rule.to)) {
        newVariations.add(variation.replace(new RegExp(rule.to, 'g'), rule.from));
      }
    });
    newVariations.forEach(variation => variations.add(variation));
  });

  const delimitedVariations = new Set<string>();
  variations.forEach(variation => {
    delimitedVariations.add(variation.replace(/ /g, '_'));
    delimitedVariations.add(variation.replace(/ /g, '-'));
    delimitedVariations.add(variation.replace(/ /g, ''));
    delimitedVariations.add(variation.replace(/_/g, ''));
    delimitedVariations.add(variation.replace(/-/g, ''));
  });

  delimitedVariations.forEach(variation => variations.add(variation));

  return Array.from(variations);
}

function checkLink(link: string, requiredSubstring: string): boolean {
  const protocols = ['https://', 'http://', 'www.'];
  return protocols.some(protocol => link.startsWith(protocol) && link.includes(requiredSubstring));
}

export {
  fetchAdditionalInfo,
  clearCache
};
