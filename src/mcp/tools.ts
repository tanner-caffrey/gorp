import { DiscordTools } from './discordTools';

// Shared tool definitions with comprehensive schemas
export const TOOL_DEFINITIONS = [
  {
    name: 'send_discord_message',
    description: 'Send a message to a Discord channel. This tool allows you to send text messages to any Discord channel that the bot has access to.',
    docstring: 'Send a message to a Discord channel. This tool allows you to send text messages to any Discord channel that the bot has access to.',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { 
          type: 'string', 
          description: 'The Discord channel ID where the message should be sent. You can find this by right-clicking on a channel and selecting "Copy Channel ID".',
          examples: ['123456789012345678']
        },
        content: { 
          type: 'string', 
          description: 'The message content to send. This can include text, mentions, and basic Discord formatting.',
          examples: ['Hello everyone!', 'This is a test message with **bold** text.']
        },
      },
      required: ['channelId', 'content'],
      additionalProperties: false
    },
  },
  {
    name: 'send_dm',
    description: 'Send a direct message to a Discord user. This tool allows you to send private messages to any user that shares a server with the bot.',
    docstring: 'Send a direct message to a Discord user. This tool allows you to send private messages to any user that shares a server with the bot.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { 
          type: 'string', 
          description: 'The Discord user ID to send a direct message to. You can find this by right-clicking on a user and selecting "Copy User ID".',
          examples: ['123456789012345678']
        },
        content: { 
          type: 'string', 
          description: 'The message content to send in the direct message.',
          examples: ['Hello! This is a private message.', 'Thanks for your help!']
        },
      },
      required: ['userId', 'content'],
      additionalProperties: false
    },
  },
  {
    name: 'react_to_message',
    description: 'Add a reaction emoji to a Discord message. This tool allows you to react to any message in channels the bot can see.',
    docstring: 'Add a reaction emoji to a Discord message. This tool allows you to react to any message in channels the bot can see.',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { 
          type: 'string', 
          description: 'The Discord channel ID where the message is located.',
          examples: ['123456789012345678']
        },
        messageId: { 
          type: 'string', 
          description: 'The Discord message ID to react to. You can find this by right-clicking on a message and selecting "Copy Message ID".',
          examples: ['123456789012345678']
        },
        emoji: { 
          type: 'string', 
          description: 'The emoji to react with. Can be a Unicode emoji (👍, ❤️) or a custom Discord emoji reactionId.',
          examples: ['👍', '❤️', 'a:custom_animated_emoji:123456789012345678', ':custom_static_emoji:123456789012345678']
        },
      },
      required: ['channelId', 'messageId', 'emoji'],
      additionalProperties: false
    },
  },
  {
    name: 'get_channel_info',
    description: 'Get detailed information about a Discord channel including its name, type, topic, and other metadata.',
    docstring: 'Get detailed information about a Discord channel including its name, type, topic, and other metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { 
          type: 'string', 
          description: 'The Discord channel ID to get information about.',
          examples: ['123456789012345678']
        },
      },
      required: ['channelId'],
      additionalProperties: false
    },
  },
  {
    name: 'list_channels',
    description: 'List all channels in a Discord guild (server). Returns information about text channels, voice channels, and categories.',
    docstring: 'List all channels in a Discord guild (server). Returns information about text channels, voice channels, and categories.',
    inputSchema: {
      type: 'object',
      properties: {
        guildId: { 
          type: 'string', 
          description: 'The Discord guild (server) ID to list channels from. If not provided, will use the first available guild.',
          examples: ['123456789012345678']
        },
      },
      additionalProperties: false
    },
  },
  {
    name: 'get_user_info',
    description: 'Get detailed information about a Discord user including their username, display name, avatar, and other profile details.',
    docstring: 'Get detailed information about a Discord user including their username, display name, avatar, and other profile details.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { 
          type: 'string', 
          description: 'The Discord user ID to get information about.',
          examples: ['123456789012345678']
        },
      },
      required: ['userId'],
      additionalProperties: false
    },
  },
  {
    name: 'show_typing',
    description: 'Show a typing indicator in a Discord channel. This makes the bot appear as if it is typing a message.',
    docstring: 'Show a typing indicator in a Discord channel. This makes the bot appear as if it is typing a message.',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { 
          type: 'string', 
          description: 'The Discord channel ID to show the typing indicator in.',
          examples: ['123456789012345678']
        },
      },
      required: ['channelId'],
      additionalProperties: false
    },
  },
  {
    name: 'get_server_emojis',
    description: 'Get all emojis in a Discord server.',
    docstring: 'Get all emojis in a Discord server.',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { 
          type: 'string', 
          description: 'The Discord server ID to get emojis from.',
          examples: ['123456789012345678']
        },
      },
      required: ['serverId'],
      additionalProperties: false
    },
  },
  {
    name: 'fetch_recent_messages',
    description: 'Fetch recent messages from a Discord channel. This tool allows you to retrieve the last N messages from any Discord channel that the bot has access to.',
    docstring: 'Fetch recent messages from a Discord channel. This tool allows you to retrieve the last N messages from any Discord channel that the bot has access to.',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { 
          type: 'string', 
          description: 'The Discord channel ID to fetch messages from.',
          examples: ['123456789012345678']
        },
        limit: { 
          type: 'number', 
          description: 'The number of recent messages to fetch (1-100). Discord API limits this to a maximum of 100 messages.',
          minimum: 1,
          maximum: 100,
          examples: [5, 10, 20, 50]
        },
      },
      required: ['channelId', 'limit'],
      additionalProperties: false
    },
  },
];

/**
 * Execute a tool by name with the given arguments
 */
export async function executeTool(toolName: string, args: any, discordTools: DiscordTools): Promise<any> {
  switch (toolName) {
    case 'send_discord_message':
      return await discordTools.sendMessage(args);
    case 'send_dm':
      return await discordTools.sendDM(args);
    case 'react_to_message':
      return await discordTools.reactToMessage(args);
    case 'get_channel_info':
      return await discordTools.getChannelInfo(args);
    case 'list_channels':
      return await discordTools.listChannels(args);
    case 'get_user_info':
      return await discordTools.getUserInfo(args);
    case 'show_typing':
      return await discordTools.showTyping(args);
    case 'get_server_emojis':
      return await discordTools.getServerEmojis(args);
    case 'fetch_recent_messages':
      return await discordTools.fetchRecentMessages(args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
