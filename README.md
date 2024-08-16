# Pumpfuncook Bot

The Pumpfun-cook Bot is a tool designed to automate the monitoring, buying, and selling of tokens on pump.fun platform in solana blockchain. It executes trades based on predefined parameters and strategies set by the user.

### Prerequisites

Before running the script, ensure you have:

- **Created a new Solana wallet** with some SOL for transactions.

### Installation
1. clone the repository
2. cd pumpfun-cook
3. npm install
4. Configure the environment variables:
-Rename .env.copy to .env and update it with your details.
5. npm run start
You should see output similar to the following:

============================================================
                      pumpfun-cook Bot! 🚀
============================================================



## Configuration
Wallet
PRIVATE_KEY: Your wallet's private key.

Connection
HELIUS_RPC_URL: HTTPS RPC endpoint for interacting with the Solana network.

LOG_LEVEL: Set logging level (e.g., info, debug, trace).

IPFS Configuration
USE_PUBLIC_GATEWAYS: Toggle the use of public IPFS gateways (true/false).
USE_LOCAL_IPFS: Toggle the use of a local IPFS node (true/false).
LOCAL_IPFS_HOST: Host for the local IPFS node.
LOCAL_IPFS_PORT: Port for the local IPFS node.
LOCAL_IPFS_PROTOCOL: Protocol for the local IPFS node (http/https).

Social Filter
CHECK_TELEGRAM: Set to true to require a Telegram link.
CHECK_TWITTER: Set to true to require a Twitter link.
CHECK_WEBSITE: Set to true to require a website link.
REQUIRE_AT_LEAST_ONE_SOCIAL: Requires at least one social link to be present if all checks above are false.

Holder Filter
CHECK_DEV_SNIPPING: Set to true to check for developer sniping.
CHECK_TOP10MAX: Set to true to check the top 10 holders' percentages.
TOPDEV: Maximum percentage of tokens a developer can snipe.
TOP10MAX: Maximum percentage of tokens the top 10 holders can hold.

Buy Configuration
SLIPPAGE_BASIS_POINTS: Basis points for allowed slippage during token purchase.
BUY_AMOUNT_SOL: Amount of SOL to use for each token purchase.

Sell Configuration
EVALUATION_INTERVAL: Interval (ms) to check for price/mc changes to decide sell/hold.
PRICE_INCREASE_THRESHOLD: Threshold (%) above which tokens will be sold.
PRICE_DECREASE_THRESHOLD: Threshold (%) below which tokens will be sold.
SELL_PERCENTAGE_ON_INCREASE: Percentage of tokens to sell when above the price increase threshold.
SELL_PERCENTAGE_ON_DECREASE: Percentage of tokens to sell when below the price decrease threshold.

Common Issues
 RPC Node error 
 Error fetching bonding curve data means the issue is related to sdk
 Error fetching data from uri means you hit limit on public ipfs gateways, (there is option for private ipfs node)


Disclaimer
The pumpfuncook Bot is provided as is, for educational purposes. Trading cryptocurrencies and tokens involves risk, and past performance is not indicative of future results. The use of this bot is at your own risk, and the developers are not responsible for any losses incurred.