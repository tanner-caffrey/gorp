import { Attachment } from 'discord.js';

export interface ImageData {
    name: string;
    contentType: string;
    url: string;
    base64Data?: string;
    size?: number;
    error?: string;
}

/**
 * Download and encode an image attachment as base64
 */
export async function downloadAndEncodeImage(attachment: Attachment): Promise<ImageData> {
    try {
        // Check if it's an image (strict filtering)
        if (!attachment.contentType?.startsWith('image/')) {
            throw new Error(`Not an image: ${attachment.contentType}`);
        }

        // Additional check to exclude videos and other media types
        const allowedImageTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
            'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'
        ];
        
        if (!allowedImageTypes.includes(attachment.contentType.toLowerCase())) {
            throw new Error(`Unsupported image type: ${attachment.contentType}`);
        }

        // Check file size (limit to 5MB to prevent memory issues)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (attachment.size > maxSize) {
            throw new Error(`Image too large: ${(attachment.size / (1024 * 1024)).toFixed(1)}MB (max: 5MB)`);
        }

        console.log(`📥 Downloading image: ${attachment.name} (${attachment.size} bytes)`);
        
        // Download the image
        const response = await fetch(attachment.url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Gorp-Discord-Bot/1.0.0'
            },
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
        }

        // Convert to buffer
        const buffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        // Convert to base64
        const base64Data = Buffer.from(uint8Array).toString('base64');
        
        console.log(`✅ Image encoded: ${attachment.name} (${base64Data.length} base64 chars)`);

        return {
            name: attachment.name,
            contentType: attachment.contentType,
            url: attachment.url,
            base64Data,
            size: attachment.size
        };

    } catch (error) {
        console.error(`❌ Failed to process image ${attachment.name}:`, error);
        return {
            name: attachment.name,
            contentType: attachment.contentType || 'unknown',
            url: attachment.url,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Process multiple image attachments
 */
export async function processImageAttachments(attachments: Attachment[]): Promise<ImageData[]> {
    // Strict filtering for images only
    const allowedImageTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'
    ];
    
    const imageAttachments = attachments.filter(attachment => {
        const contentType = attachment.contentType?.toLowerCase();
        return contentType && allowedImageTypes.includes(contentType);
    });

    // Log filtered out attachments for debugging
    const filteredOut = attachments.filter(attachment => {
        const contentType = attachment.contentType?.toLowerCase();
        return !contentType || !allowedImageTypes.includes(contentType);
    });
    
    if (filteredOut.length > 0) {
        console.log(`🚫 Filtered out ${filteredOut.length} non-image attachment(s):`, 
            filteredOut.map(a => `${a.name} (${a.contentType})`).join(', '));
    }

    if (imageAttachments.length === 0) {
        return [];
    }

    console.log(`🖼️ Processing ${imageAttachments.length} image(s) (filtered from ${attachments.length} attachments)...`);
    
    // Process images in parallel (but limit concurrency to prevent overwhelming the system)
    const results: ImageData[] = [];
    const batchSize = 3; // Process 3 images at a time
    
    for (let i = 0; i < imageAttachments.length; i += batchSize) {
        const batch = imageAttachments.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(attachment => downloadAndEncodeImage(attachment))
        );
        results.push(...batchResults);
    }

    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    
    console.log(`📊 Image processing complete: ${successful} successful, ${failed} failed`);
    
    return results;
}
