# Pumpfun-cook Bot
The Pumpfun-cook Bot is a tool designed to automate the monitoring, buying, and selling of tokens on the pump.fun platform in the Solana blockchain. It executes trades based on predefined parameters and strategies set by the user.
The bot finds new token, checks for filters (if set), buys the token, adds the bought token to assets.txt, and sells them by checking for profit/loss.

## Prerequisites

Before running the script, ensure you have:

- **Created a new Solana wallet** with some SOL for transactions.

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/oneplusfive555/pumpfun-cook.git
    ```
2. Navigate to the project directory:
    ```bash
    cd pumpfun-cook
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Configure the environment variables:
   - Rename `.env.copy` to `.env` and update it with your details.

5. Start the bot:
    ```bash
    npm run start
    ```

    You should see output similar to the following:

    ```
    ============================================================
                        Pumpfun-cook Bot! 🚀
    ============================================================
    
    ```
## Configuration

### Wallet

- **PRIVATE_KEY**: Your wallet's private key.

### Connection

- **HELIUS_RPC_URL**: HTTPS RPC endpoint for interacting with the Solana network.
- **LOG_LEVEL**: Set logging level (e.g., info, debug, trace).

### IPFS Configuration

- **USE_PUBLIC_GATEWAYS**: Toggle the use of public IPFS gateways (true/false).
- **USE_LOCAL_IPFS**: Toggle the use of a local IPFS node (true/false).
- **LOCAL_IPFS_HOST**: Host for the local IPFS node.
- **LOCAL_IPFS_PORT**: Port for the local IPFS node.
- **LOCAL_IPFS_PROTOCOL**: Protocol for the local IPFS node (http/https).

### Social Filter

- **CHECK_TELEGRAM**: Set to true to require a Telegram link.
- **CHECK_TWITTER**: Set to true to require a Twitter link.
- **CHECK_WEBSITE**: Set to true to require a website link.
- **REQUIRE_AT_LEAST_ONE_SOCIAL**: Requires at least one social link to be present if all checks above are false.

### Holder Filter

- **CHECK_DEV_SNIPPING**: Set to true to check for developer sniping.
- **CHECK_TOP10MAX**: Set to true to check the top 10 holders' percentages.
- **TOPDEV**: Maximum percentage of tokens a developer can snipe.
- **TOP10MAX**: Maximum percentage of tokens the top 10 holders can hold.

### Buy Configuration

- **SLIPPAGE_BASIS_POINTS**: Basis points for allowed slippage during token purchase.
- **BUY_AMOUNT_SOL**: Amount of SOL to use for each token purchase.

### Sell Configuration

- **EVALUATION_INTERVAL**: Interval (ms) to check for price/mc changes to decide sell/hold.
- **PRICE_INCREASE_THRESHOLD**: Threshold (%) above which tokens will be sold.
- **PRICE_DECREASE_THRESHOLD**: Threshold (%) below which tokens will be sold.
- **SELL_PERCENTAGE_ON_INCREASE**: Percentage of tokens to sell when above the price increase threshold.
- **SELL_PERCENTAGE_ON_DECREASE**: Percentage of tokens to sell when below the price decrease threshold.

## Common Issues

- **RPC Node error**: Indicates issues related to the SDK or network connection.
- **Error fetching bonding curve data**: Related to SDK issues.
- **Error fetching data from URI**: You may have hit the limit on public IPFS gateways; consider using a private IPFS node.

-**Invalid asset data...... Skipping...**: No tokens in assets.txt at the time of checking

## Warning
**Just ignore**

**npm warn deprecated multiaddr-to-uri@8.0.0:**

**npm warn deprecated multiaddr@10.0.1:**

**npm warn deprecated ipfs-core-types@0.10.3:**

**npm warn deprecated ipfs-core-utils@0.14.3:**

**npm warn deprecated ipfs-http-client@56.0.3:**


## Disclaimer

The Pumpfun-cook Bot is provided "as is" for educational purposes. Trading cryptocurrencies and tokens involves risk, and past performance is not indicative of future results. The use of this bot is at your own risk, and the developers are not responsible for any losses incurred.

You are not permitted to sell, distribute, or otherwise use this software for commercial purposes. Modifications are allowed, but the software must remain free for all users. Any violation of this clause will result in a breach of the license agreement.

## contact 
telegram: t.me/k0rela
discord : @bokxa  
**If you want to leave a tip, you can send it to the following address: 8vJbsGogF3miHRt8YG2pmyW8c1NVHAXF1SAGKsg9zkFp**