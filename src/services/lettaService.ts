import { LettaClient } from '@letta-ai/letta-client';
import { ImageData } from '../utils/imageUtils';

export class LettaService {
    private client: LettaClient;
    private serverUrl: string;
    private modelId: string;
    private apiKey: string;
    private project: string;
    constructor(serverUrl?: string, modelId?: string, apiKey?: string, project?: string) {
        this.serverUrl = serverUrl || '';
        this.modelId = modelId || '';
        this.apiKey = apiKey || '';
        this.project = project || '';
        this.client = new LettaClient({
            baseUrl: this.serverUrl,
            project: this.project,
            token: this.apiKey
        });
    }

    /**
     * Process a query using Letta AI
     * @param query The user's query
     * @param images Optional array of image data to include
     * @returns Promise<string> The AI response
     */
    async processQuery(query: string, images?: ImageData[]): Promise<string> {
        try {
            console.log(`🔄 Sending to Letta server: ${this.serverUrl}`);
            console.log(`📝 Message: ${query}`);
            console.log(`🤖 Model ID: ${this.modelId}`);
            if (images && images.length > 0) {
                console.log(`🖼️ Images: ${images.length} image(s) included`);
            }
            
            // Build message content
            const messageContent: any = {
                role: 'system',
                content: query
            };

            // Add images if provided
            if (images && images.length > 0) {
                const validImages = images.filter(img => img.base64Data && !img.error);
                if (validImages.length > 0) {
                    messageContent.images = validImages.map(img => ({
                        name: img.name,
                        contentType: img.contentType,
                        data: img.base64Data
                    }));
                }
            }

            console.log(`📡 Request payload:`, {
                agentId: this.modelId,
                messages: [messageContent]
            });
            
            // Try to send the message to Letta
            const response = await this.client.agents.messages.create(this.modelId, {
                messages: [messageContent]
            });
            
            console.log(`✅ Letta response received:`, response);
            for (const m of response.messages ?? []) {
                if (m.messageType === "assistant_message") {
                    // Handle different content types
                    if (typeof m.content === 'string') {
                        return m.content;
                    } else if (Array.isArray(m.content)) {
                        // Join text content from array
                        return m.content.map(c => c.text || '').join('');
                    }
                }
            }
            return 'Response received from Letta';
            
        } catch (error) {
            console.error('❌ Letta service error:', error);
            console.error('Error details:', {
                serverUrl: this.serverUrl,
                modelId: this.modelId,
                query: query.substring(0, 100) + '...',
                imageCount: images?.length || 0
            });
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to process query with Letta AI: ${errorMessage}`);
        }
    }

    /**
     * Check if the Letta service is properly configured
     * @returns boolean
     */
    isConfigured(): boolean {
        return !!this.client;
    }

    /**
     * Test connection to Letta server without sending a message
     * @returns Promise<boolean> True if connection successful
     */
    async testConnection(): Promise<boolean> {
        try {
            console.log(`🔍 Testing connection to Letta server: ${this.serverUrl}`);
            
            // Test connection by making a simple HTTP request to check if server is reachable
            const response = await fetch(`${this.serverUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Add a timeout to prevent hanging
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                console.log(`✅ Connection test successful!`);
                console.log(`📡 Server status: ${response.status} ${response.statusText}`);
                return true;
            } else {
                console.error(`❌ Server returned error status: ${response.status} ${response.statusText}`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ Connection test failed:`, error);
            console.error(`🔗 Server URL: ${this.serverUrl}`);
            console.error(`🤖 Model ID: ${this.modelId}`);
            return false;
        }
    }

    /**
     * Get service status
     * @returns object with status information
     */
    getStatus(): { configured: boolean; ready: boolean; serverUrl: string; modelId: string } {
        return {
            configured: this.isConfigured(),
            ready: this.isConfigured(),
            serverUrl: this.serverUrl,
            modelId: this.modelId
        };
    }
}
