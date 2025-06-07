import { NextApiRequest, NextApiResponse } from "next";
import { JSDOM } from "jsdom";

interface LinkPreview {
  title: string;
  description: string;
  image?: string;
  favicon?: string;
  url: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LinkPreview>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      title: '', 
      description: '', 
      url: '', 
      favicon: undefined,
      error: 'Method not allowed' 
    });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ 
      title: '', 
      description: '', 
      url: '', 
      favicon: undefined,
      error: 'URL parameter is required' 
    });
  }

  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol');
    }

    // Fetch only the HTML head section for metadata
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      // Limit response size to prevent abuse
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get only first 50KB to avoid large downloads
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    const maxSize = 50 * 1024; // 50KB

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        totalSize += value.length;
        if (totalSize > maxSize) {
          reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }

    const htmlBuffer = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      htmlBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const html = new TextDecoder().decode(htmlBuffer);
    
    // Parse HTML to extract metadata
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract title
    let title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
                document.querySelector('title')?.textContent ||
                'No title available';

    // Extract description
    let description = document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                     document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
                     document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                     'No description available';

    // Extract image
    let image = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
               document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

    // Extract favicon
    let favicon = document.querySelector('link[rel="icon"]')?.getAttribute('href') ||
                 document.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
                 document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ||
                 '/favicon.ico'; // Default fallback

    // Clean and truncate
    title = title.trim().substring(0, 100);
    description = description.trim().substring(0, 300);

    // Resolve relative image URLs
    if (image && !image.startsWith('http')) {
      try {
        image = new URL(image, url).href;
      } catch {
        image = undefined;
      }
    }

    // Resolve relative favicon URLs
    if (favicon && !favicon.startsWith('http')) {
      try {
        favicon = new URL(favicon, url).href;
      } catch {
        favicon = new URL('/favicon.ico', url).href; // Fallback to default
      }
    }

    res.status(200).json({
      title,
      description,
      image: image || undefined, // Ensure proper typing
      favicon,
      url,
    });

  } catch (error) {
    console.error('Link preview error:', error);
    res.status(500).json({
      title: 'Error loading preview',
      description: 'Unable to load preview for this link',
      url,
      favicon: undefined,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 