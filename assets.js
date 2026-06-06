const assetsToFetch = [
    // STOCKS 
    {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        class: 'Stock',
        region: 'US',
        providerName: 'Yahoo Finance',
        providerType: 'Public API',
        attributes: { sector: 'Technology', CEO: 'Tim Cook' }
    },
    {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        class: 'Stock',
        region: 'US',
        providerName: 'Yahoo Finance',
        providerType: 'Public API',
        attributes: { sector: 'Automotive', CEO: 'Elon Musk' }
    },
    {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        class: 'Stock',
        region: 'US',
        providerName: 'Yahoo Finance',
        providerType: 'Public API',
        attributes: { sector: 'Technology', CEO: 'Satya Nadella' }
    },
    {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        class: 'Stock',
        region: 'US',
        providerName: 'Yahoo Finance',
        providerType: 'Public API',
        attributes: { sector: 'Semiconductors', CEO: 'Jensen Huang' }
    },
    {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        class: 'Stock',
        region: 'US',
        providerName: 'Yahoo Finance',
        providerType: 'Public API',
        attributes: { sector: 'Consumer Discretionary', CEO: 'Andy Jassy' }
    },

    // CRYPTO 
    {
        symbol: 'BTC-USD',
        name: 'Bitcoin USD',
        class: 'Crypto',
        region: 'Global',
        providerName: 'CoinGecko',
        providerType: 'Crypto API',
        attributes: {
            blockchain: 'Bitcoin Network',
            maxSupply: 21000000,
            consensus: 'Proof of Work'
        }
    },
    {
        symbol: 'ETH-USD',
        name: 'Ethereum USD',
        class: 'Crypto',
        region: 'Global',
        providerName: 'CoinGecko',
        providerType: 'Crypto API',
        attributes: {
            blockchain: 'Ethereum',
            maxSupply: null,
            consensus: 'Proof of Stake'
        }
    },
    {
        symbol: 'SOL-USD',
        name: 'Solana USD',
        class: 'Crypto',
        region: 'Global',
        providerName: 'CoinGecko',
        providerType: 'Crypto API',
        attributes: {
            blockchain: 'Solana',
            consensus: 'Proof of Stake'
        }
    },
    {
        symbol: 'XRP-USD',
        name: 'XRP USD',
        class: 'Crypto',
        region: 'Global',
        providerName: 'CoinGecko',
        providerType: 'Crypto API',
        attributes: {
            blockchain: 'XRP Ledger',
            consensus: 'RPCA'
        }
    },

    // METALS 
    {
        symbol: 'GC=F',
        name: 'Gold Futures',
        class: 'Commodity',
        region: 'Global',
        providerName: 'NASDAQ Data Link',
        providerType: 'Premium Feed (Simulated)',
        attributes: {
            assetType: 'Precious Metal',
            tradingUnit: '100 troy ounces'
        }
    },
    {
        symbol: 'SI=F',
        name: 'Silver Futures',
        class: 'Commodity',
        region: 'Global',
        providerName: 'NASDAQ Data Link',
        providerType: 'Premium Feed (Simulated)',
        attributes: {
            assetType: 'Precious Metal',
            tradingUnit: '5000 troy ounces'
        }
    },
    {
        symbol: 'PL=F',
        name: 'Platinum Futures',
        class: 'Commodity',
        region: 'Global',
        providerName: 'NASDAQ Data Link',
        providerType: 'Premium Feed (Simulated)',
        attributes: {
            assetType: 'Precious Metal',
            tradingUnit: '50 troy ounces'
        }
    },

    // INTEREST RATE
    {
        symbol: '^TNX',
        name: '10-Year Treasury Note Yield',
        class: 'Interest Rate',
        region: 'US',
        providerName: 'US Treasury Dept',
        providerType: 'Government Feed (Simulated)',
        attributes: {
            maturity: '10 Years',
            issuer: 'US Government',
            type: 'Fixed Income'
        }
    },

    // INDEX 
    {
        symbol: '^GSPC',
        name: 'S&P 500',
        class: 'Index',
        region: 'US',
        providerName: 'Standard & Poor',
        providerType: 'Index Provider',
        attributes: {
            components: 500,
            weightingMethod: 'Market Cap'
        }
    },

    // CURRENCIES 
    {
        symbol: 'EURUSD=X',
        name: 'EUR/USD Exchange Rate',
        class: 'Currency',
        region: 'Europe/US',
        providerName: 'Bloomberg',
        providerType: 'Forex Feed (Simulated)',
        attributes: {
            baseCurrency: 'EUR',
            quoteCurrency: 'USD'
        }
    },
    {
        symbol: 'GBPUSD=X',
        name: 'GBP/USD Exchange Rate',
        class: 'Currency',
        region: 'UK/US',
        providerName: 'Bloomberg',
        providerType: 'Forex Feed (Simulated)',
        attributes: {
            baseCurrency: 'GBP',
            quoteCurrency: 'USD'
        }
    },
    {
        symbol: 'USDJPY=X',
        name: 'USD/JPY Exchange Rate',
        class: 'Currency',
        region: 'US/Japan',
        providerName: 'Bloomberg',
        providerType: 'Forex Feed (Simulated)',
        attributes: {
            baseCurrency: 'USD',
            quoteCurrency: 'JPY'
        }
    },
    {
        symbol: 'AUDUSD=X',
        name: 'AUD/USD Exchange Rate',
        class: 'Currency',
        region: 'Australia/US',
        providerName: 'Bloomberg',
        providerType: 'Forex Feed (Simulated)',
        attributes: {
            baseCurrency: 'AUD',
            quoteCurrency: 'USD'
        }
    },
    {
        symbol: 'USDCAD=X',
        name: 'USD/CAD Exchange Rate',
        class: 'Currency',
        region: 'US/Canada',
        providerName: 'Bloomberg',
        providerType: 'Forex Feed (Simulated)',
        attributes: {
            baseCurrency: 'USD',
            quoteCurrency: 'CAD'
        }
    }
];

module.exports = assetsToFetch;