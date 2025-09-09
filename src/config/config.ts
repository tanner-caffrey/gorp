import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
    // Discord Bot Configuration
    discord: {
        token: process.env.DISCORD_TOKEN || '',
        prefix: process.env.BOT_PREFIX || '!',
        intents: [
            'Guilds',
            'GuildMessages', 
            'MessageContent',
            'GuildMembers'
        ]
    },

    // Letta AI Configuration
    letta: {
        apiKey: process.env.LETTA_API_KEY || '',
        project: process.env.LETTA_PROJECT || 'default',
        serverUrl: process.env.LETTA_SERVER_URL || '',
        modelId: process.env.LETTA_MODEL_ID || '',
        enabled: true, // Always enabled since no API key required
        autoForward: process.env.LETTA_AUTO_FORWARD !== 'false', // Default to true unless explicitly disabled
        smartForward: process.env.LETTA_SMART_FORWARD !== 'false', // Default to true unless explicitly disabled
        // Smart forwarding timing configuration (in minutes)
        gorpInteractionTimeout: parseInt(process.env.LETTA_GORP_TIMEOUT || '5'), // 5 minutes default
        batchInterval: parseInt(process.env.LETTA_BATCH_INTERVAL || '30'), // 30 minutes default
        // Rate limiting configuration
        rateLimitPerHour: parseInt(process.env.LETTA_RATE_LIMIT_PER_HOUR || '100'), // 100 messages per hour default
        // Message history configuration
        messageHistoryLimit: parseInt(process.env.LETTA_MESSAGE_HISTORY_LIMIT || '10') // 10 messages default
    },

    // MCP Server Configuration
    mcp: {
        port: parseInt(process.env.MCP_PORT || '3001'),
        enabled: process.env.MCP_ENABLED !== 'false' // Default to true
    },

    // General Bot Configuration
    bot: {
        name: 'Gorp',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        adminUserId: process.env.BOT_ADMIN_USER_ID || ''
    }
};

// Validation
export function validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.discord.token) {
        errors.push('DISCORD_TOKEN is required');
    }

    if (!config.letta.serverUrl) {
        errors.push('LETTA_SERVER_URL is required');
    }

    if (!config.letta.modelId) {
        errors.push('LETTA_MODEL_ID is required');
    }

    if (!config.bot.adminUserId) {
        errors.push('BOT_ADMIN_USER_ID is required');
    }

    // API key is optional for this Letta server setup
    // if (!config.letta.apiKey) {
    //     errors.push('LETTA_API_KEY is required for full functionality');
    // }

    return {
        valid: errors.length === 0,
        errors
    };
}
