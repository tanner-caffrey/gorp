import { Message, Client } from 'discord.js';
import { LettaService } from './lettaService';
import { config } from '../config/config';
import { RateLimiter } from './rateLimiter';
import { processImageAttachments, ImageData } from '../utils/imageUtils';

export interface PendingMessage {
    text: string;
    images?: ImageData[];
}

export interface ChannelActivity {
    channelId: string;
    lastGorpMention: number; // timestamp
    lastGorpMessage: number; // timestamp
    lastActivity: number; // timestamp
    pendingMessages: PendingMessage[]; // messages waiting to be batched
    isActive: boolean; // true if Gorp was recently mentioned or sent a message
}

export class ActivityTracker {
    private channelActivities: Map<string, ChannelActivity> = new Map();
    private client: Client;
    private lettaService: LettaService;
    private rateLimiter: RateLimiter;
    private batchInterval: NodeJS.Timeout | null = null;
    private readonly GORP_INTERACTION_TIMEOUT: number;
    private readonly BATCH_INTERVAL: number;

    constructor(client: Client, lettaService: LettaService, rateLimiter: RateLimiter) {
        this.client = client;
        this.lettaService = lettaService;
        this.rateLimiter = rateLimiter;
        
        // Convert minutes to milliseconds
        this.GORP_INTERACTION_TIMEOUT = config.letta.gorpInteractionTimeout * 60 * 1000;
        this.BATCH_INTERVAL = config.letta.batchInterval * 60 * 1000;
        
        this.startBatchScheduler();
    }

    /**
     * Check if a message should be forwarded immediately or batched
     * Returns true if message should be forwarded immediately, false if batched
     */
    async shouldForwardImmediately(message: Message): Promise<boolean> {
        const channelId = message.channel.id;
        const now = Date.now();
        const activity = this.getOrCreateChannelActivity(channelId);
        
        // Update last activity timestamp
        activity.lastActivity = now;
        
        // Check if Gorp is mentioned (with or without @)
        const isGorpMentioned = this.isGorpMentioned(message);
        if (isGorpMentioned) {
            // If there are pending messages, send the batch first
            if (activity.pendingMessages.length > 0) {
                this.sendBatchUpdate(activity, message);
            }
            
            activity.lastGorpMention = now;
            activity.isActive = true;
            return true;
        }
        
        // Check if message is from Gorp
        if (message.author.id === this.client.user?.id) {
            activity.lastGorpMessage = now;
            activity.isActive = true;
            console.log(`🔄 Gorp message detected - resetting interaction timeout for channel ${channelId}`);
            return true;
        }
        
        // Check if we're still in the active period (timeout after Gorp interaction)
        // We're active if either Gorp was mentioned OR Gorp sent a message within the timeout period
        const timeSinceLastGorpMention = activity.lastGorpMention > 0 ? now - activity.lastGorpMention : Infinity;
        const timeSinceLastGorpMessage = activity.lastGorpMessage > 0 ? now - activity.lastGorpMessage : Infinity;
        
        const isWithinMentionTimeout = timeSinceLastGorpMention < this.GORP_INTERACTION_TIMEOUT;
        const isWithinMessageTimeout = timeSinceLastGorpMessage < this.GORP_INTERACTION_TIMEOUT;
        
        if (isWithinMentionTimeout || isWithinMessageTimeout) {
            activity.isActive = true;
            return true;
        }
        
        // Not in active period, add to pending messages
        activity.isActive = false;
        console.log(`⏰ Interaction timeout expired for channel ${channelId} - switching to batch mode`);
        await this.addPendingMessage(activity, message);
        return false;
    }

    /**
     * Check if Gorp is mentioned in the message (with or without @)
     */
    private isGorpMentioned(message: Message): boolean {
        const content = message.content.toLowerCase();
        const botMention = `<@${this.client.user?.id}>`;
        const botMentionNick = `<@!${this.client.user?.id}>`;
        
        // Check for @mentions
        if (content.includes(botMention) || content.includes(botMentionNick)) {
            return true;
        }
        
        // Check for "gorp" without @ (case insensitive)
        const gorpPattern = /\bgorp\b/i;
        return gorpPattern.test(content);
    }

    /**
     * Format a message with text and image information
     */
    private formatMessageWithImages(message: Message, channelName: string): string {
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

    /**
     * Add a message to the pending batch for a channel
     */
    private async addPendingMessage(activity: ChannelActivity, message: Message) {
        // Skip empty messages (but allow messages with only images)
        if (!message.content.trim() && message.attachments.size === 0) return;
        
        const channelName = message.channel.isTextBased() && 'name' in message.channel 
            ? `#${message.channel.name}` 
            : 'DM';
        
        const formattedText = this.formatMessageWithImages(message, channelName);
        
        // Process images if present
        let imageData: ImageData[] = [];
        if (message.attachments.size > 0) {
            console.log(`🖼️ Processing ${message.attachments.size} attachment(s) for batch...`);
            imageData = await processImageAttachments(Array.from(message.attachments.values()));
        }
        
        const pendingMessage: PendingMessage = {
            text: formattedText,
            images: imageData.length > 0 ? imageData : undefined
        };
        
        activity.pendingMessages.push(pendingMessage);
        
        // Limit pending messages to prevent memory issues
        if (activity.pendingMessages.length > 50) {
            activity.pendingMessages = activity.pendingMessages.slice(-50);
        }
    }

    /**
     * Send batch update immediately (when Gorp is mentioned)
     */
    private async sendBatchUpdate(activity: ChannelActivity, mentionMessage: Message) {
        try {
            const channel = this.client.channels.cache.get(activity.channelId);
            const channelName = channel && 'name' in channel ? `#${channel.name}` : 'Unknown Channel';
            
            const messageCount = activity.pendingMessages.length;
            const timeRange = this.formatTimeRange(activity.lastActivity);
            
            // Create batch summary with mention message at the end
            let summary = `[Discord Batch Update] ${messageCount} messages in ${channelName} over the past ${timeRange}:\n\n`;
            summary += activity.pendingMessages.map(msg => msg.text).join('\n');
            
            // Add the mention message at the end
            const mentionChannelName = mentionMessage.channel.isTextBased() && 'name' in mentionMessage.channel 
                ? `#${mentionMessage.channel.name}` 
                : 'DM';
            
            const mentionFormatted = `\n\n--- MENTION ---\n${this.formatMessageWithImages(mentionMessage, mentionChannelName)}`;
            summary += mentionFormatted;
            
            // Collect all images from pending messages and mention
            const allImages: ImageData[] = [];
            activity.pendingMessages.forEach(msg => {
                if (msg.images) {
                    allImages.push(...msg.images);
                }
            });
            
            // Process mention message images
            if (mentionMessage.attachments.size > 0) {
                const mentionImages = await processImageAttachments(Array.from(mentionMessage.attachments.values()));
                allImages.push(...mentionImages);
            }
            
            // Check rate limit before sending
            if (!this.rateLimiter.canSendMessage()) {
                const status = this.rateLimiter.getStatus();
                const timeUntilReset = this.rateLimiter.getTimeUntilReset();
                console.log(`🚫 Rate limit exceeded! Cannot send batch update for channel ${activity.channelId}. Reset in ${timeUntilReset} minutes.`);
                return;
            }
            
            // Send to Letta service with images
            await this.lettaService.processQuery(summary, allImages);
            this.rateLimiter.recordMessageSent();
            const imageInfo = allImages.length > 0 ? ` + ${allImages.length} image(s)` : '';
            console.log(`📦 Sent immediate batch update for channel ${activity.channelId} (${messageCount} messages + mention${imageInfo})`);
            
            // Clear pending messages after sending
            activity.pendingMessages = [];
            
        } catch (error) {
            console.error(`❌ Failed to send immediate batch update for channel ${activity.channelId}:`, error);
        }
    }

    /**
     * Get or create channel activity tracking
     */
    private getOrCreateChannelActivity(channelId: string): ChannelActivity {
        if (!this.channelActivities.has(channelId)) {
            this.channelActivities.set(channelId, {
                channelId,
                lastGorpMention: 0,
                lastGorpMessage: 0,
                lastActivity: 0,
                pendingMessages: [],
                isActive: false
            });
        }
        return this.channelActivities.get(channelId)!;
    }

    /**
     * Start the batch scheduler that sends summaries every 30 minutes
     */
    private startBatchScheduler() {
        this.batchInterval = setInterval(() => {
            this.processBatchUpdates();
        }, this.BATCH_INTERVAL);
    }

    /**
     * Process batch updates for all channels with pending messages
     */
    private async processBatchUpdates() {
        const now = Date.now();
        
        for (const [channelId, activity] of this.channelActivities.entries()) {
            // Skip if no pending messages
            if (activity.pendingMessages.length === 0) {
                continue;
            }
            
            // Skip if channel is currently active (Gorp was recently mentioned or sent a message)
            if (activity.isActive) {
                continue;
            }
            
            // Skip if no activity in the last batch interval
            if (now - activity.lastActivity > this.BATCH_INTERVAL) {
                continue;
            }
            
            // Create batch summary
            const summary = this.createBatchSummary(activity);
            if (summary) {
                try {
                    // Check rate limit before sending
                    if (!this.rateLimiter.canSendMessage()) {
                        const status = this.rateLimiter.getStatus();
                        const timeUntilReset = this.rateLimiter.getTimeUntilReset();
                        console.log(`🚫 Rate limit exceeded! Cannot send scheduled batch update for channel ${channelId}. Reset in ${timeUntilReset} minutes.`);
                        continue; // Skip this channel, try others
                    }
                    
                    // Collect all images from pending messages
                    const allImages: ImageData[] = [];
                    activity.pendingMessages.forEach(msg => {
                        if (msg.images) {
                            allImages.push(...msg.images);
                        }
                    });
                    
                    // Send to Letta service with images
                    await this.lettaService.processQuery(summary, allImages);
                    this.rateLimiter.recordMessageSent();
                    const imageInfo = allImages.length > 0 ? ` + ${allImages.length} image(s)` : '';
                    console.log(`📦 Sent scheduled batch update for channel ${channelId} (${activity.pendingMessages.length} messages${imageInfo})`);
                    
                    // Clear pending messages after sending
                    activity.pendingMessages = [];
                } catch (error) {
                    console.error(`❌ Failed to send batch update for channel ${channelId}:`, error);
                }
            }
        }
    }

    /**
     * Create a summary of pending messages for a channel
     */
    private createBatchSummary(activity: ChannelActivity): string | null {
        if (activity.pendingMessages.length === 0) {
            return null;
        }
        
        const channel = this.client.channels.cache.get(activity.channelId);
        const channelName = channel && 'name' in channel ? `#${channel.name}` : 'Unknown Channel';
        
        const messageCount = activity.pendingMessages.length;
        const timeRange = this.formatTimeRange(activity.lastActivity);
        
        let summary = `[Discord Batch Update] ${messageCount} messages in ${channelName} over the past ${timeRange}:\n\n`;
        summary += activity.pendingMessages.map(msg => msg.text).join('\n');
        
        return summary;
    }

    /**
     * Format time range for batch summary
     */
    private formatTimeRange(lastActivity: number): string {
        const now = Date.now();
        const diff = now - lastActivity;
        const minutes = Math.floor(diff / (1000 * 60));
        
        if (minutes < 1) {
            return 'few seconds';
        } else if (minutes === 1) {
            return '1 minute';
        } else {
            return `${minutes} minutes`;
        }
    }

    /**
     * Get activity status for a channel
     */
    getChannelActivity(channelId: string): ChannelActivity | null {
        return this.channelActivities.get(channelId) || null;
    }

    /**
     * Get all channel activities
     */
    getAllActivities(): Map<string, ChannelActivity> {
        return new Map(this.channelActivities);
    }

    /**
     * Get current timing configuration
     */
    getTimingConfig(): { gorpTimeoutMinutes: number; batchIntervalMinutes: number } {
        return {
            gorpTimeoutMinutes: config.letta.gorpInteractionTimeout,
            batchIntervalMinutes: config.letta.batchInterval
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
            this.batchInterval = null;
        }
    }
}
