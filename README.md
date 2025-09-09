# Gorp Discord Bot

A Discord bot named "Gorp" that integrates with Letta's TypeScript API for AI-powered interactions.

## Features

- 🤖 Discord.js v14 integration with TypeScript
- 🔗 Letta AI integration for intelligent responses
- ⚙️ Configurable bot prefix and settings
- 🛡️ Error handling and validation
- 📝 Clean, modular code structure
- 🧠 **Smart Forwarding System** - Intelligent message batching based on activity
- 🚦 **Rate Limiting** - Configurable message rate limiting to prevent API abuse
- 🖼️ **Image Processing** - Automatic image attachment processing and encoding
- 📊 **Activity Tracking** - Per-channel activity monitoring and smart batching
- 🔄 **Message History** - Context-aware message forwarding with recent history
- 🎯 **Mention Detection** - Smart detection of bot mentions and interactions

## Setup

### Prerequisites

- Node.js (v16 or higher)
- A Discord bot token
- A Letta API key

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your credentials:
   ```env
   # Required Configuration
   DISCORD_TOKEN=your_discord_bot_token_here
   LETTA_SERVER_URL=your_letta_server_url_here
   LETTA_MODEL_ID=your_letta_model_id_here
   BOT_ADMIN_USER_ID=your_discord_user_id_here
   
   # Optional Configuration
   BOT_PREFIX=!
   NODE_ENV=development
   LETTA_API_KEY=your_letta_api_key_here
   LETTA_PROJECT=default
   LETTA_AUTO_FORWARD=true
   LETTA_SMART_FORWARD=true
   LETTA_GORP_TIMEOUT=5
   LETTA_BATCH_INTERVAL=30
   LETTA_RATE_LIMIT_PER_HOUR=100
   LETTA_MESSAGE_HISTORY_LIMIT=10
   MCP_PORT=3001
   MCP_ENABLED=true
   ```

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section
4. Create a bot and copy the token
5. Enable the following intents:
   - Server Members Intent
   - Message Content Intent
6. Invite the bot to your server with appropriate permissions

## Usage

### Development

Run the bot in development mode with hot reload:
```bash
npm run dev
```

### Production

Build and run the bot:
```bash
npm run build
npm start
```

### Available Commands

**Basic Commands:**
- `@gorp ping` - Check if the bot is responsive
- `@gorp help` - Show available commands

**Letta Integration:**
- `@gorp letta-status` - Show Letta integration status
- `@gorp test-letta` - Test connection to Letta server

**Smart Forwarding & Activity:**
- `@gorp toggle-forward` - Toggle auto-forwarding messages to Letta (Admin only)
- `@gorp toggle-smart-forward` - Toggle smart forwarding system (Admin only)
- `@gorp activity-status` - Show activity status and timing configuration
- `@gorp rate-limit-status` - Show current rate limiting status

**MCP Server:**
- `@gorp mcp-status` - Show MCP server status and available tools

**Legacy Commands (still supported):**
- `!ping`, `!hello`, `!letta <query>`, `!toggle-forward`, `!test-letta`, `!letta-status`, `!mcp-status`, `!help`

## Project Structure

```
src/
├── index.ts              # Main bot file with command handling
├── config/
│   └── config.ts         # Configuration management and validation
├── services/
│   ├── lettaService.ts   # Letta AI integration
│   ├── activityTracker.ts # Smart forwarding and activity tracking
│   └── rateLimiter.ts    # Rate limiting for API calls
├── utils/
│   └── imageUtils.ts     # Image processing and encoding utilities
└── mcp/
    ├── server.ts         # MCP server implementation
    ├── httpServer.ts     # HTTP-based MCP server
    ├── discordTools.ts   # Discord tools for Letta
    └── tools.ts          # Tool definitions and execution
```

## Configuration

The bot uses environment variables for configuration:

### Required Settings
- `DISCORD_TOKEN` - Your Discord bot token (required)
- `LETTA_SERVER_URL` - Your Letta server URL (required)
- `LETTA_MODEL_ID` - Your Letta model ID (required)
- `BOT_ADMIN_USER_ID` - Admin user ID for restricted commands (required)

### Optional Core Settings
- `BOT_PREFIX` - Command prefix (default: `!`)
- `NODE_ENV` - Environment (default: development)

### Letta AI Integration
- `LETTA_API_KEY` - Your Letta API key (optional - bot works without it)
- `LETTA_PROJECT` - Your Letta project name (default: 'default')
- `LETTA_AUTO_FORWARD` - Auto-forward all messages to Letta (default: true)
- `LETTA_SMART_FORWARD` - Enable smart forwarding system (default: true)

### Smart Forwarding Configuration
- `LETTA_GORP_TIMEOUT` - Minutes to continue immediate forwarding after Gorp interaction (default: 5)
- `LETTA_BATCH_INTERVAL` - Minutes between batch updates for inactive channels (default: 30)
- `LETTA_RATE_LIMIT_PER_HOUR` - Maximum messages to send per hour (default: 100)
- `LETTA_MESSAGE_HISTORY_LIMIT` - Number of recent messages to include as context (default: 10)

### MCP Server
- `MCP_PORT` - MCP server port (default: 3001)
- `MCP_ENABLED` - Enable MCP server (default: true)

## Development

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled bot
- `npm run dev` - Run with ts-node for development
- `npm run watch` - Watch for changes and recompile

### Adding New Commands

1. Add your command logic in the `Events.MessageCreate` handler in `src/index.ts`
2. Update the help command with your new command
3. Test thoroughly before deploying

## Letta Integration

The bot includes a `LettaService` class for handling AI interactions. Currently, it's set up with placeholder functionality. To implement the actual Letta API calls:

1. Review the Letta API documentation
2. Update the `processQuery` method in `src/services/lettaService.ts`
3. Implement proper error handling and response formatting

### Auto-Forward Feature

The bot can automatically forward all Discord messages to your Letta agent:

- **Enabled by default** when Letta is configured
- **Formatted messages** include username, channel, and content
- **Toggle command** `@gorp toggle-forward` to enable/disable (Admin only)
- **Environment variable** `LETTA_AUTO_FORWARD=false` to disable by default
- **Logging** shows when messages are sent to Letta (for debugging)

## Smart Forwarding System

The Smart Forwarding system intelligently manages when messages are sent to Letta based on channel activity and bot interactions.

### How It Works

**Immediate Forwarding** - Messages are sent to Letta immediately when:
- Gorp is mentioned (with or without @)
- Gorp sends a message in the channel
- Within `LETTA_GORP_TIMEOUT` minutes of Gorp's last interaction

**Batch Updates** - Messages are collected and sent every `LETTA_BATCH_INTERVAL` minutes when:
- No Gorp mention in the channel
- No Gorp message in the channel  
- More than `LETTA_GORP_TIMEOUT` minutes since Gorp's last interaction

### Configuration Examples

**Quick Response Mode:**
```bash
LETTA_GORP_TIMEOUT=2
LETTA_BATCH_INTERVAL=10
```

**Balanced Mode (Default):**
```bash
LETTA_GORP_TIMEOUT=5
LETTA_BATCH_INTERVAL=30
```

**Conservative Mode:**
```bash
LETTA_GORP_TIMEOUT=10
LETTA_BATCH_INTERVAL=60
```

### Commands

- `@gorp activity-status` - View current timing configuration and channel status
- `@gorp toggle-smart-forward` - Enable/disable smart forwarding (Admin only)
- `@gorp rate-limit-status` - Show current rate limiting status

### Rate Limiting

The bot includes configurable rate limiting to prevent API abuse:
- **Default limit**: 100 messages per hour
- **Configurable**: Set via `LETTA_RATE_LIMIT_PER_HOUR`
- **Automatic handling**: Messages are queued when limit is reached
- **Status tracking**: Monitor usage with `@gorp rate-limit-status`

## Image Processing

The bot automatically processes image attachments and sends them to Letta:

### Supported Formats
- JPEG/JPG, PNG, GIF, WebP, BMP, TIFF, SVG

### Features
- **Automatic detection** of image attachments
- **Base64 encoding** for Letta compatibility
- **Size validation** and error handling
- **Batch processing** for multiple images
- **Context preservation** with message content

### Processing Flow
1. Message with image attachment is received
2. Images are downloaded and validated
3. Images are encoded as base64
4. Both text and image data are sent to Letta
5. Processing status is logged for debugging

## MCP Server Integration

The bot includes an MCP (Model Context Protocol) server that exposes Discord functionality to your Letta agent:

### Available Discord Tools

- **`send_message`** - Send messages to Discord channels with optional embeds
- **`send_dm`** - Send direct messages to users
- **`react_to_message`** - Add reactions to messages
- **`get_channel_info`** - Get detailed channel information
- **`list_channels`** - List all channels in a guild
- **`get_user_info`** - Get user information

### MCP Server Endpoints

- **GET** `/health` - Health check
- **GET** `/tools` - List available tools
- **POST** `/tools/:toolName` - Execute specific tool
- **POST** `/call-tool` - MCP-style tool call

### Configuration

- **Port**: Configurable via `MCP_PORT` (default: 3001)
- **Enable/Disable**: Set `MCP_ENABLED=false` to disable
- **Access**: Available at `http://localhost:3001` when running

### Testing

Use the included test script to verify MCP server functionality:
```bash
node test-mcp.js
```

## License

MIT License - feel free to modify and use as needed.

## Support

For issues or questions, please check the Discord.js and Letta documentation, or create an issue in this repository.
