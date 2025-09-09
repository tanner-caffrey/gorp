import { config } from '../config/config';

export class RateLimiter {
    private messageTimestamps: number[] = [];
    private readonly maxMessagesPerHour: number;
    private readonly windowMs: number = 60 * 60 * 1000; // 1 hour in milliseconds

    constructor() {
        this.maxMessagesPerHour = config.letta.rateLimitPerHour;
    }

    /**
     * Check if a message can be sent (rate limit not exceeded)
     * @returns true if message can be sent, false if rate limited
     */
    canSendMessage(): boolean {
        const now = Date.now();
        
        // Remove timestamps older than 1 hour
        this.messageTimestamps = this.messageTimestamps.filter(
            timestamp => now - timestamp < this.windowMs
        );
        
        // Check if we're under the limit
        return this.messageTimestamps.length < this.maxMessagesPerHour;
    }

    /**
     * Record that a message was sent
     */
    recordMessageSent(): void {
        this.messageTimestamps.push(Date.now());
    }

    /**
     * Get current rate limit status
     */
    getStatus(): {
        messagesInWindow: number;
        maxMessagesPerHour: number;
        remainingMessages: number;
        resetTime: Date;
    } {
        const now = Date.now();
        
        // Remove old timestamps
        this.messageTimestamps = this.messageTimestamps.filter(
            timestamp => now - timestamp < this.windowMs
        );
        
        const messagesInWindow = this.messageTimestamps.length;
        const remainingMessages = Math.max(0, this.maxMessagesPerHour - messagesInWindow);
        
        // Calculate reset time (when the oldest message in window will expire)
        const resetTime = this.messageTimestamps.length > 0 
            ? new Date(this.messageTimestamps[0] + this.windowMs)
            : new Date(now);
        
        return {
            messagesInWindow,
            maxMessagesPerHour: this.maxMessagesPerHour,
            remainingMessages,
            resetTime
        };
    }

    /**
     * Get time until rate limit resets (in minutes)
     */
    getTimeUntilReset(): number {
        const status = this.getStatus();
        const now = Date.now();
        const timeUntilReset = status.resetTime.getTime() - now;
        return Math.max(0, Math.ceil(timeUntilReset / (1000 * 60))); // Convert to minutes
    }
}
