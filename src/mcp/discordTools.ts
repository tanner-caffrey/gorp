import { Client, TextChannel, DMChannel, EmbedBuilder } from 'discord.js';
import { url } from 'inspector';

export class DiscordTools {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Send a message to a Discord channel
   * @param args - The arguments object containing channelId, content, and optional embed
   * @param args.channelId - The Discord channel ID where the message should be sent
   * @param args.content - The message content to send
   * @returns Promise with the result of the message send operation
   */
  async sendMessage(args: any) {
    const { channelId, content, embed } = args;
    
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or not a text channel`);
      }

      const messageOptions: any = { content };
      
      if (embed) {
        const embedBuilder = new EmbedBuilder();
        
        if (embed.title) embedBuilder.setTitle(embed.title);
        if (embed.description) embedBuilder.setDescription(embed.description);
        if (embed.color) embedBuilder.setColor(embed.color);
        
        if (embed.fields && Array.isArray(embed.fields)) {
          embedBuilder.addFields(embed.fields);
        }
        
        messageOptions.embeds = [embedBuilder];
      }

      const message = await (channel as any).send(messageOptions);
      
      const channelName = 'name' in channel ? channel.name : 'DM';
      
      return {
        content: [
          {
            type: 'text',
            text: `Message sent successfully to channel ${channelName}. Message ID: ${message.id}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send message: ${errorMessage}`);
    }
  }

  /**
   * Send a direct message to a Discord user
   * @param args - The arguments object containing userId and content
   * @param args.userId - The Discord user ID to send a direct message to
   * @param args.content - The message content to send in the direct message
   * @returns Promise with the result of the DM send operation
   */
  async sendDM(args: any) {
    const { userId, content } = args;
    
    try {
      const user = await this.client.users.fetch(userId);
      const dmChannel = await user.createDM();
      
      const message = await dmChannel.send(content);
      
      return {
        content: [
          {
            type: 'text',
            text: `DM sent successfully to ${user.username}. Message ID: ${message.id}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send DM: ${errorMessage}`);
    }
  }

  /**
   * Add a reaction emoji to a Discord message
   * @param args - The arguments object containing channelId, messageId, and emoji
   * @param args.channelId - The Discord channel ID where the message is located
   * @param args.messageId - The Discord message ID to react to
   * @param args.emoji - The emoji to react with (Unicode or custom emoji name)
   * @returns Promise with the result of the reaction operation
   */
  async reactToMessage(args: any) {
    const { channelId, messageId, emoji } = args;
    
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or not a text channel`);
      }

      const message = await channel.messages.fetch(messageId);
      await message.react(emoji);
      
      const channelName = 'name' in channel ? channel.name : 'DM';
      
      return {
        content: [
          {
            type: 'text',
            text: `Reaction ${emoji} added to message ${messageId} in channel ${channelName}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to add reaction: ${errorMessage}`);
    }
  }

  /**
   * Get detailed information about a Discord channel
   * @param args - The arguments object containing channelId
   * @param args.channelId - The Discord channel ID to get information about
   * @returns Promise with the channel information
   */
  async getChannelInfo(args: any) {
    const { channelId } = args;
    
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel) {
        throw new Error(`Channel ${channelId} not found`);
      }

      const channelInfo = {
        id: channel.id,
        name: 'name' in channel ? channel.name : 'DM',
        type: channel.type,
        guild: 'guild' in channel && channel.guild ? {
          id: channel.guild.id,
          name: channel.guild.name,
        } : null,
        topic: 'topic' in channel ? channel.topic : null,
        nsfw: 'nsfw' in channel ? channel.nsfw : null,
        createdTimestamp: channel.createdTimestamp,
      };
      
      return {
        content: [
          {
            type: 'text',
            text: `Channel Information:\n\`\`\`json\n${JSON.stringify(channelInfo, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get channel info: ${errorMessage}`);
    }
  }

  /**
   * List all channels in a Discord guild (server)
   * @param args - The arguments object containing optional guildId
   * @param args.guildId - The Discord guild ID to list channels from (optional)
   * @returns Promise with the list of channels
   */
  async listChannels(args: any) {
    const { guildId } = args;
    
    try {
      let guild;
      
      if (guildId) {
        guild = await this.client.guilds.fetch(guildId);
      } else {
        // Use the first available guild
        guild = this.client.guilds.cache.first();
      }
      
      if (!guild) {
        throw new Error('No guild found');
      }

      const channels = guild.channels.cache
        .filter(channel => channel.isTextBased())
        .map(channel => ({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          topic: 'topic' in channel ? channel.topic : null,
        }));
      
      return {
        content: [
          {
            type: 'text',
            text: `Channels in ${guild.name}:\n\`\`\`json\n${JSON.stringify(channels, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list channels: ${errorMessage}`);
    }
  }

  /**
   * Show typing indicator in a Discord channel
   * @param args - The arguments object containing channelId
   * @param args.channelId - The Discord channel ID to show typing in
   * @returns Promise with the result of the typing operation
   */
  async showTyping(args: any) {
    const { channelId } = args;
    
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or not a text channel`);
      }

      await (channel as any).sendTyping();
      
      return {
        content: [
          {
            type: 'text',
            text: `Typing indicator sent to channel ${'name' in channel ? channel.name : 'DM'}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to show typing: ${errorMessage}`);
    }
  }

  /**
   * Get detailed information about a Discord user
   * @param args - The arguments object containing userId
   * @param args.userId - The Discord user ID to get information about
   * @returns Promise with the user information
   */
  async getUserInfo(args: any) {
    const { userId } = args;
    
    try {
      const user = await this.client.users.fetch(userId);
      
      const userInfo = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        discriminator: user.discriminator,
        bot: user.bot,
        avatar: user.avatar,
        createdTimestamp: user.createdTimestamp,
      };
      
      return {
        content: [
          {
            type: 'text',
            text: `User Information:\n\`\`\`json\n${JSON.stringify(userInfo, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get user info: ${errorMessage}`);
    }
  }
  /**
   * Get all emojis in a Discord server
   * @param args - The arguments object containing serverId
   * @param args.serverId - The Discord server ID to get emojis from
   * @returns Promise with the list of emojis
   */

  async getServerEmojis(args: any) {
    const { serverId } = args;
    try {
      const server = await this.client.guilds.fetch(serverId);
      const emojis = server.emojis.cache.map(emoji => ({
        id: emoji.id,
        name: emoji.name,
        url: emoji.url,
        reactionId: `${emoji.url.endsWith('.gif') ? 'a' : ''}:${emoji.name}:${emoji.id}`
      }));
      return {
        content: [
          {
            type: 'text',
            text: `Emojis in ${server.name}:\n\`\`\`json\n${JSON.stringify(emojis, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get server emojis: ${errorMessage}`);
    }
  }

  /**
   * Fetch recent messages from a Discord channel
   * @param args - The arguments object containing channelId and limit
   * @param args.channelId - The Discord channel ID to fetch messages from
   * @param args.limit - The number of recent messages to fetch (1-100)
   * @returns Promise with the recent messages
   */
  async fetchRecentMessages(args: any) {
    const { channelId, limit } = args;
    
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or not a text channel`);
      }

      // Validate limit
      const messageLimit = Math.min(Math.max(1, limit), 100);
      
      // Fetch messages from the channel
      const messages = await channel.messages.fetch({ limit: messageLimit });
      
      const channelName = 'name' in channel ? channel.name : 'DM';
      
      // Format messages for output (include all messages, both bot and non-bot)
      const formattedMessages = Array.from(messages.values())
        .reverse() // Show in chronological order (oldest first)
        .map(message => ({
          id: message.id,
          author: {
            id: message.author.id,
            username: message.author.username,
            displayName: message.author.displayName,
            bot: message.author.bot
          },
          content: message.content,
          timestamp: message.createdTimestamp,
          attachments: message.attachments.size > 0 ? Array.from(message.attachments.values()).map(attachment => ({
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            contentType: attachment.contentType,
            size: attachment.size
          })) : [],
          embeds: message.embeds.length > 0 ? message.embeds.map(embed => ({
            title: embed.title,
            description: embed.description,
            color: embed.color,
            fields: embed.fields
          })) : []
        }));

      const result = {
        channel: {
          id: channel.id,
          name: channelName,
          type: channel.type
        },
        messageCount: formattedMessages.length,
        messages: formattedMessages
      };
      
      return {
        content: [
          {
            type: 'text',
            text: `Recent messages from ${channelName}:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch recent messages: ${errorMessage}`);
    }
  }
}
