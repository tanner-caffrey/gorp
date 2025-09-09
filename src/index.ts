import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import { config, validateConfig } from './config/config';
import { LettaService } from './services/lettaService';
import { DiscordMCPHttpServer } from './mcp/httpServer';
import { ActivityTracker } from './services/activityTracker';
import { RateLimiter } from './services/rateLimiter';
import { processImageAttachments, ImageData } from './utils/imageUtils';

// Validate configuration
const validation = validateConfig();
if (!validation.valid) {
    console.error('❌ Configuration errors:', validation.errors);
    if (validation.errors.includes('DISCORD_TOKEN is required')) {
        process.exit(1);
    }
}

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize Letta service
const lettaService = new LettaService(
    config.letta.serverUrl,
    config.letta.modelId
);

// Initialize rate limiter
const rateLimiter = new RateLimiter();

// Initialize activity tracker
const activityTracker = new ActivityTracker(client, lettaService, rateLimiter);

// Initialize MCP HTTP server
const mcpServer = new DiscordMCPHttpServer(client, config.mcp.port);

// Bot ready event
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`🤖 Gorp is ready! Logged in as ${readyClient.user.tag}`);
    console.log(`🔗 Connected to ${readyClient.guilds.cache.size} guilds`);

    // Test Letta connection if enabled
    if (config.letta.enabled) {
        console.log(`🔍 Testing Letta connection...`);
        const connectionSuccess = await lettaService.testConnection();
        if (connectionSuccess) {
            console.log(`✅ Letta connection test passed!`);
        } else {
            console.log(`❌ Letta connection test failed! Check your server URL and model ID.`);
        }
    }

    // Start MCP HTTP server
    try {
        await mcpServer.start();
        console.log(`🔧 MCP server started - Letta can now use Discord tools!`);
    } catch (error) {
        console.error(`❌ Failed to start MCP server:`, error);
    }
});

// Message event handler
client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check for "is this true" pattern (with or without @gorp)
    const messageContent = message.content.toLowerCase();
    const isThisTruePattern = /(?:@?gorp\s+)?is\s+this\s+true/i;

    if (isThisTruePattern.test(messageContent)) {
        await message.reply('yeh');
        return;
    }

    // If not @ing gorp, forward the message to Letta
    if (!isGorpMentioned(message)) { 
        handleMessageForwarding(message);
        return;
    }

    // Parse command and arguments after the mention
    // Remove the prefix used in the startsWith check above (either bot mention or '@gorp')
    let content = message.content;
    if (client.user && message.content.startsWith(`<@${client.user.id}>`)) {
        content = message.content.replace(new RegExp(`^<@${client.user.id}>\\s*`), '');
    } else if (client.user && message.content.startsWith(`<@!${client.user.id}>`)) {
        content = message.content.replace(new RegExp(`^<@!${client.user.id}>\\s*`), '');
    } else if (message.content.startsWith('@gorp')) {
        content = message.content.replace(/^@gorp\s*/, '');
    }
    content = content.trim();
    const args = content.split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (!command) return;

    try {
        switch (command) {
            case 'ping':
                await message.reply('🏓 Pong!');
                break;

            case 'help':
                await showHelp(message);
                break;

            case 'toggle-forward':
                await toggleAutoForward(message);
                break;

            case 'toggle-smart-forward':
                await toggleSmartForward(message);
                break;

            case 'activity-status':
                await showActivityStatus(message);
                break;

            case 'rate-limit-status':
                await showRateLimitStatus(message);
                break;

            case 'test-letta':
                await testLettaConnection(message);
                break;

            case 'letta-status':
                await showLettaStatus(message);
                break;

            case 'mcp-status':
                await showMCPStatus(message);
                break;

            default:
                handleMessageForwarding(message);
                return;
        }
    } catch (error) {
        console.error('Error handling command:', error);
        await message.reply('❌ An error occurred while processing your command.');
    }
});

function isGorpMentioned(message: Message) {
    return(client.user && message.content === `<@!${client.user.id}>`)
}

async function handleMessageForwarding(message: Message) {
    // Handle message forwarding with smart logic
    if (config.letta.enabled && config.letta.autoForward) {
        if (config.letta.smartForward) {
            // Use smart forwarding logic
            const shouldForwardImmediately = await activityTracker.shouldForwardImmediately(message);
            if (shouldForwardImmediately) {
                await sendMessageToLetta(message);
            }
        }
    }
}

// Show MCP server status
async function showMCPStatus(message: Message) {
    const statusEmbed = {
        color: 0x00ff00,
        title: '🔧 MCP Server Status',
        fields: [
            {
                name: 'Server URL',
                value: `http://localhost:${config.mcp.port}`,
                inline: true
            },
            {
                name: 'Status',
                value: '✅ Running',
                inline: true
            },
            {
                name: 'Available Tools',
                value: '7 tools available',
                inline: true
            },
            {
                name: 'Tool List',
                value: '• send_message\n• send_dm\n• react_to_message\n• get_channel_info\n• list_channels\n• get_user_info\n• fetch_recent_messages',
                inline: false
            },
            {
                name: 'Endpoints',
                value: '• GET /health\n• GET /tools\n• POST /tools/:toolName\n• POST /call-tool',
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Gorp Bot - MCP Integration'
        }
    };

    await message.reply({ embeds: [statusEmbed] });
}

// Show Letta status
async function showLettaStatus(message: Message) {
    if (!config.letta.enabled) {
        await message.reply('❌ Letta integration is not configured.');
        return;
    }

    const status = lettaService.getStatus();

    const statusEmbed = {
        color: 0x0099ff,
        title: '🤖 Letta Integration Status',
        fields: [
            {
                name: 'Server URL',
                value: status.serverUrl,
                inline: true
            },
            {
                name: 'Model ID',
                value: status.modelId,
                inline: true
            },
            {
                name: 'Auto-Forward',
                value: config.letta.autoForward ? '✅ Enabled' : '❌ Disabled',
                inline: true
            },
            {
                name: 'Smart Forward',
                value: config.letta.smartForward ? '✅ Enabled' : '❌ Disabled',
                inline: true
            },
            {
                name: 'Service Status',
                value: status.configured ? '✅ Configured' : '❌ Not Configured',
                inline: true
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Gorp Bot - Letta Integration'
        }
    };

    await message.reply({ embeds: [statusEmbed] });
}

// Test Letta connection
async function testLettaConnection(message: Message) {
    if (!config.letta.enabled) {
        await message.reply('❌ Letta integration is not configured.');
        return;
    }

    await message.reply('🔍 Testing Letta connection...');

    try {
        const connectionSuccess = await lettaService.testConnection();
        if (connectionSuccess) {
            await message.reply('✅ Letta connection test passed!');
        } else {
            await message.reply('❌ Letta connection test failed! Check your server URL and model ID.');
        }
    } catch (error) {
        console.error('Connection test error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await message.reply(`❌ Connection test error: ${errorMessage}`);
    }
}

// Toggle auto-forward feature
async function toggleAutoForward(message: Message) {
    // Check if user is admin
    if (message.author.id !== config.bot.adminUserId) {
        await message.reply('❌ Only the bot administrator can toggle auto-forward settings.');
        return;
    }

    if (!config.letta.enabled) {
        await message.reply('❌ Letta integration is not configured.');
        return;
    }

    // Toggle the auto-forward setting
    config.letta.autoForward = !config.letta.autoForward;

    const status = config.letta.autoForward ? 'enabled' : 'disabled';
    await message.reply(`📤 Auto-forward messages to Letta: **${status}**`);

    console.log(`Auto-forward toggled to: ${status} by ${message.author.username} (${message.author.id})`);
}

// Toggle smart forwarding feature
async function toggleSmartForward(message: Message) {
    // Check if user is admin
    if (message.author.id !== config.bot.adminUserId) {
        await message.reply('❌ Only the bot administrator can toggle smart forwarding settings.');
        return;
    }

    if (!config.letta.enabled) {
        await message.reply('❌ Letta integration is not configured.');
        return;
    }

    if (!config.letta.autoForward) {
        await message.reply('❌ Auto-forward must be enabled to use smart forwarding.');
        return;
    }

    // Toggle the smart-forward setting
    config.letta.smartForward = !config.letta.smartForward;

    const status = config.letta.smartForward ? 'enabled' : 'disabled';
    const description = config.letta.smartForward
        ? 'Messages will be batched unless Gorp is mentioned or recently active'
        : 'All messages will be forwarded immediately';

    await message.reply(`🧠 Smart forwarding: **${status}**\n${description}`);

    console.log(`Smart forwarding toggled to: ${status} by ${message.author.username} (${message.author.id})`);
}

// Show activity status for channels
async function showActivityStatus(message: Message) {
    if (!config.letta.enabled || !config.letta.smartForward) {
        await message.reply('❌ Smart forwarding is not enabled.');
        return;
    }

    const activities = activityTracker.getAllActivities();
    const timingConfig = activityTracker.getTimingConfig();
    const now = Date.now();

    if (activities.size === 0) {
        const configEmbed = {
            color: 0x00ff00,
            title: '📊 Smart Forwarding Configuration',
            description: 'No channel activity tracked yet.',
            fields: [
                {
                    name: '⏱️ Timing Configuration',
                    value: `Gorp Interaction Timeout: ${timingConfig.gorpTimeoutMinutes} minutes\nBatch Interval: ${timingConfig.batchIntervalMinutes} minutes`,
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Gorp Bot - Activity Tracker'
            }
        };
        await message.reply({ embeds: [configEmbed] });
        return;
    }

    const fields = [];
    for (const [channelId, activity] of activities.entries()) {
        const channel = message.client.channels.cache.get(channelId);
        const channelName = channel && 'name' in channel ? `#${channel.name}` : 'Unknown';

        const timeSinceActivity = Math.floor((now - activity.lastActivity) / (1000 * 60));
        const pendingCount = activity.pendingMessages.length;
        const imageCount = activity.pendingMessages.reduce((total, msg) => total + (msg.images?.length || 0), 0);
        const status = activity.isActive ? '🟢 Active' : '🔴 Inactive';

        const imageInfo = imageCount > 0 ? ` | Images: ${imageCount}` : '';
        fields.push({
            name: `${channelName} ${status}`,
            value: `Pending: ${pendingCount}${imageInfo} | Last activity: ${timeSinceActivity}m ago`,
            inline: true
        });
    }

    // Add timing configuration to the embed
    fields.push({
        name: '⏱️ Timing Configuration',
        value: `Gorp Interaction Timeout: ${timingConfig.gorpTimeoutMinutes} minutes\nBatch Interval: ${timingConfig.batchIntervalMinutes} minutes`,
        inline: false
    });

    const statusEmbed = {
        color: 0x00ff00,
        title: '📊 Channel Activity Status',
        description: 'Smart forwarding status for all tracked channels',
        fields,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Gorp Bot - Activity Tracker'
        }
    };

    await message.reply({ embeds: [statusEmbed] });
}

// Show rate limit status
async function showRateLimitStatus(message: Message) {
    const status = rateLimiter.getStatus();
    const timeUntilReset = rateLimiter.getTimeUntilReset();

    const statusEmbed = {
        color: status.remainingMessages > 10 ? 0x00ff00 : status.remainingMessages > 0 ? 0xffaa00 : 0xff0000,
        title: '🚦 Rate Limit Status',
        description: 'Current rate limiting status for Gorp message forwarding',
        fields: [
            {
                name: 'Messages This Hour',
                value: `${status.messagesInWindow}/${status.maxMessagesPerHour}`,
                inline: true
            },
            {
                name: 'Remaining Messages',
                value: status.remainingMessages.toString(),
                inline: true
            },
            {
                name: 'Reset Time',
                value: timeUntilReset > 0 ? `${timeUntilReset} minutes` : 'Available now',
                inline: true
            },
            {
                name: 'Status',
                value: status.remainingMessages > 10 ? '🟢 Healthy' : status.remainingMessages > 0 ? '🟡 Warning' : '🔴 Rate Limited',
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Gorp Bot - Rate Limiter'
        }
    };

    await message.reply({ embeds: [statusEmbed] });
}

// Format a message with text and image information
function formatMessageWithImages(message: Message, channelName: string): string {
    let formattedMessage = `[messageId: ${message.id}] ${message.author.username} in ${channelName}:`;

    // Add text content if present
    if (message.content.trim()) {
        formattedMessage += ` ${message.content}`;
    }

    // Add image information if present
    if (message.attachments.size > 0) {
        const imageAttachments = message.attachments.filter(attachment =>
            attachment.contentType?.startsWith('image/')
        );

        if (imageAttachments.size > 0) {
            formattedMessage += `\n[Images attached:`;
            imageAttachments.forEach((attachment, index) => {
                const sizeMB = (attachment.size / (1024 * 1024)).toFixed(1);
                formattedMessage += `\n  ${index + 1}. ${attachment.name} (${attachment.contentType}, ${sizeMB}MB) - ${attachment.url}`;
            });
            formattedMessage += `]`;
        }
    }

    return formattedMessage;
}

// Send message to Letta agent with context from last 5 messages
async function sendMessageToLetta(message: Message) {
    try {
        // Skip empty messages (but allow messages with only images)
        if (!message.content.trim() && message.attachments.size === 0) return;

        // Check rate limit
        if (!rateLimiter.canSendMessage()) {
            const status = rateLimiter.getStatus();
            const timeUntilReset = rateLimiter.getTimeUntilReset();
            console.log(`🚫 Rate limit exceeded! ${status.messagesInWindow}/${status.maxMessagesPerHour} messages sent in the last hour. Reset in ${timeUntilReset} minutes.`);
            return;
        }

        // Create a formatted message for the agent
        const channelName = message.channel.isTextBased() && 'name' in message.channel
            ? `#${message.channel.name}`
            : 'DM';

        // Get the last N messages from the channel for context
        let messageHistory = '';
        try {
            if (message.channel.isTextBased()) {
                const historyLimit = config.letta.messageHistoryLimit;
                const messages = await message.channel.messages.fetch({ limit: historyLimit + 1 }); // Get one extra to exclude the current message
                const recentMessages = Array.from(messages.values())
                    .filter(msg => msg.id !== message.id) // Exclude the current message
                    .slice(0, historyLimit) // Take the configured number of messages
                    .reverse(); // Reverse to show chronological order

                if (recentMessages.length > 0) {
                    messageHistory = '\n\n[Recent message history:';
                    for (const recentMsg of recentMessages) {
                        // Include all messages (both bot and non-bot messages)
                        messageHistory += `\n${formatMessageWithImages(recentMsg, channelName)}`;
                    }
                    messageHistory += ']';
                }
            }
        } catch (error) {
            console.warn('Failed to fetch message history:', error);
            // Continue without history if fetching fails
        }

        const formattedMessage = `[Discord] ${formatMessageWithImages(message, channelName)}${messageHistory}`;

        // Process images if present
        let imageData: ImageData[] = [];
        if (message.attachments.size > 0) {
            console.log(`🖼️ Processing ${message.attachments.size} attachment(s) for images...`);
            imageData = await processImageAttachments(Array.from(message.attachments.values()));
        }

        // Send to Letta agent with images
        await lettaService.processQuery(formattedMessage, imageData);

        // Record the message as sent
        rateLimiter.recordMessageSent();

        // Log the message being sent (optional, for debugging)
        const status = rateLimiter.getStatus();
        const imageInfo = imageData.length > 0 ? ` + ${imageData.length} image(s)` : '';
        const historyInfo = messageHistory ? ' + message history' : '';
        console.log(`📤 Sent to Letta: ${formattedMessage.substring(0, 100)}${formattedMessage.length > 100 ? '...' : ''}${imageInfo}${historyInfo} (${status.messagesInWindow}/${status.maxMessagesPerHour} this hour)`);

    } catch (error) {
        console.error('Error sending message to Letta:', error);
        // Don't reply to the user to avoid spam, just log the error
    }
}

// Handle Letta-specific commands
async function handleLettaCommand(message: Message, args: string[]) {
    if (args.length === 0) {
        await message.reply('Please provide a query for Letta. Usage: `!letta <your question>`');
        return;
    }

    if (!config.letta.enabled) {
        await message.reply('❌ Letta integration is not configured. Please set LETTA_API_KEY in your environment variables.');
        return;
    }

    const query = args.join(' ');

    try {
        // Send typing indicator (only for text channels)
        if (message.channel.isTextBased() && 'sendTyping' in message.channel) {
            await (message.channel as any).sendTyping();
        }

        // Process query with Letta service
        const response = await lettaService.processQuery(query);
        await message.reply(response);

    } catch (error) {
        console.error('Letta command error:', error);
        await message.reply('❌ Error processing Letta query.');
    }
}

// Show help information
async function showHelp(message: Message) {
    const helpEmbed = {
        color: 0x0099ff,
        title: '🤖 Gorp Bot Commands',
        description: 'Here are the available commands (mention me to use them):',
        fields: [
            {
                name: `@gorp ping`,
                value: 'Check if the bot is responsive',
                inline: true
            },
            {
                name: `@gorp help`,
                value: 'Show this help message',
                inline: true
            },
            {
                name: `@gorp toggle-forward`,
                value: 'Toggle auto-forwarding messages to Letta (Admin only)',
                inline: true
            },
            {
                name: `@gorp toggle-smart-forward`,
                value: 'Toggle smart forwarding (Admin only)',
                inline: true
            },
            {
                name: `@gorp activity-status`,
                value: 'Show activity status and timing configuration',
                inline: true
            },
            {
                name: `@gorp rate-limit-status`,
                value: 'Show current rate limiting status',
                inline: true
            },
            {
                name: `@gorp test-letta`,
                value: 'Test connection to Letta server',
                inline: true
            },
            {
                name: `@gorp letta-status`,
                value: 'Show Letta integration status',
                inline: true
            },
            {
                name: `@gorp mcp-status`,
                value: 'Show MCP server status and available tools',
                inline: true
            },
            {
                name: `Configuration`,
                value: `Message history limit: ${config.letta.messageHistoryLimit} messages (set via LETTA_MESSAGE_HISTORY_LIMIT)`,
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Gorp Bot - Powered by Letta'
        }
    };

    await message.reply({ embeds: [helpEmbed] });
}

// Error handling
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
const token = config.discord.token;

if (!token) {
    console.error('❌ DISCORD_TOKEN is not set in environment variables');
    process.exit(1);
}

if (!config.letta.enabled) {
    console.warn('⚠️  LETTA_API_KEY is not set. Letta features will be limited.');
} else {
    console.log('✅ Letta integration is configured and ready!');
    console.log(`🔗 Letta Server: ${config.letta.serverUrl}`);
    console.log(`🤖 Letta Model: ${config.letta.modelId}`);
    console.log(`📤 Auto-forward messages: ${config.letta.autoForward ? 'enabled' : 'disabled'}`);
    console.log(`🧠 Smart forwarding: ${config.letta.smartForward ? 'enabled' : 'disabled'}`);
    console.log(`🚦 Rate limit: ${config.letta.rateLimitPerHour} messages per hour`);
    console.log(`📜 Message history limit: ${config.letta.messageHistoryLimit} messages`);
    if (config.letta.smartForward) {
        console.log(`⏱️ Gorp interaction timeout: ${config.letta.gorpInteractionTimeout} minutes`);
        console.log(`📦 Batch interval: ${config.letta.batchInterval} minutes`);
    }
}

client.login(token).catch((error) => {
    console.error('Failed to login to Discord:', error);
    process.exit(1);
});
