import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "undici";

const KOLOSAL_API_BASE = "https://api.kolosal.ai";

function getKolosalApiKey(): string {
  // In Next.js standalone mode, process.env is available at runtime
  const apiKey = process.env.KOLOSAL_API_KEY;
  
  if (!apiKey) {
    // Log available env vars for debugging
    const envKeys = Object.keys(process.env || {}).filter(key => 
      key.includes('KOLOSAL') || key.includes('API')
    );
    console.error("Detect: KOLOSAL_API_KEY not found. Available env keys:", envKeys);
    throw new Error("KOLOSAL_API_KEY environment variable is not set");
  }
  
  return `Bearer ${apiKey}`;
}

// Increase body size limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
      parse: true,
    },
    responseLimit: false,
  },
};

// Supported file types
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];
const SUPPORTED_EXTENSIONS = ["jpeg", "jpg", "png", "webp", "bmp"];

// Helper function to safely parse JSON response
async function safeJsonParse(body: { text: () => Promise<string> }) {
  const text = await body.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || "Unknown error" };
  }
}

// Validate file type from base64
function validateFileType(base64: string): boolean {
  // Check for data URL prefix
  if (base64.startsWith("data:")) {
    const mimeMatch = base64.match(/^data:([^;]+);/);
    if (mimeMatch) {
      return SUPPORTED_TYPES.includes(mimeMatch[1]);
    }
  }
  return true; // Assume valid if no prefix
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let apiKey: string;
  try {
    apiKey = getKolosalApiKey();
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "NEXT_PUBLIC_KOLOSAL_API_KEY environment variable is not set",
    });
  }

  const { action } = req.query;

  try {
    switch (action) {
      case "cache":
        return handleCache(req, res, apiKey);
      case "cache-delete":
        return handleCacheDelete(req, res, apiKey);
      case "health":
        return handleHealth(req, res, apiKey);
      case "stats":
        return handleStats(req, res, apiKey);
      case "segment":
        return handleSegmentBase64(req, res, apiKey);
      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("Detect API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// GET /v1/cache
async function handleCache(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/v1/cache`, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to get cache",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Cache error:", error);
    return res.status(500).json({
      error: "Failed to get cache",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// DELETE /v1/cache
async function handleCacheDelete(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/v1/cache`, {
      method: "DELETE",
      headers: {
        Authorization: apiKey,
      },
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to delete cache",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Cache delete error:", error);
    return res.status(500).json({
      error: "Failed to delete cache",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// GET /v1/detect/health
async function handleHealth(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(
      `${KOLOSAL_API_BASE}/v1/detect/health`,
      {
        method: "GET",
        headers: {
          Authorization: apiKey,
        },
      }
    );

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to get health",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Health error:", error);
    return res.status(500).json({
      error: "Failed to get health",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// GET /v1/detect/stats
async function handleStats(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(
      `${KOLOSAL_API_BASE}/v1/detect/stats`,
      {
        method: "GET",
        headers: {
          Authorization: apiKey,
        },
      }
    );

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to get stats",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Stats error:", error);
    return res.status(500).json({
      error: "Failed to get stats",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST /detect?action=segment
async function handleSegmentBase64(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("Detect Segment - Content-Type:", req.headers["content-type"]);
  console.log("Detect Segment - Body type:", typeof req.body);
  console.log("Detect Segment - Has image:", !!req.body?.image);

  // Handle body parsing - in production, body might not be parsed correctly
  let bodyData: {
    image?: string;
    prompts?: string[];
    return_annotated?: boolean;
    return_masks?: boolean;
    threshold?: number;
  };
  
  try {
    if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
      bodyData = req.body;
    } else {
      console.error("Detect Segment: Body parser may have failed, body is empty or invalid");
      return res.status(400).json({
        error: "Invalid request body",
        message: "Request body is empty or could not be parsed.",
      });
    }
  } catch (error) {
    console.error("Detect Segment: Error parsing body:", error);
    return res.status(400).json({
      error: "Invalid request body",
      message: "Failed to parse request body.",
    });
  }

  const {
    image,
    prompts = [],
    return_annotated = true,
    return_masks = true,
    threshold = 0.5,
  } = bodyData;

  if (!image) {
    return res.status(400).json({ error: "Image is required" });
  }

  // Process base64 image data similar to OCR
  let processedImage = image;
  let detectedMimeType = "image/png"; // default
  
  // If it's a data URL, extract base64 and mime type
  if (image.startsWith("data:")) {
    const dataUrlMatch = image.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUrlMatch) {
      detectedMimeType = dataUrlMatch[1];
      processedImage = dataUrlMatch[2];
    } else if (image.includes(",")) {
      const parts = image.split(",");
      if (parts.length > 1) {
        processedImage = parts[1];
        const header = parts[0];
        const mimeMatch = header.match(/data:([^;]+);/);
        if (mimeMatch) {
          detectedMimeType = mimeMatch[1];
        }
      }
    }
  } else if (image.includes(",")) {
    // Has comma but no data: prefix
    const parts = image.split(",");
    if (parts.length > 1) {
      processedImage = parts[1];
    }
  }
  
  // Remove ALL whitespace
  processedImage = processedImage.replace(/\s/g, "");
  
  // Validate and detect mime type from buffer
  try {
    const testBuffer = Buffer.from(processedImage, "base64");
    if (testBuffer && testBuffer.length > 0) {
      const magicBytes = testBuffer.slice(0, 4);
      if (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF) {
        detectedMimeType = "image/jpeg";
      } else if (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47) {
        detectedMimeType = "image/png";
      } else if (magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46) {
        detectedMimeType = "image/gif";
      } else if (magicBytes[0] === 0x42 && magicBytes[1] === 0x4D) {
        detectedMimeType = "image/bmp";
      }
    }
  } catch {
    // Ignore detection errors
  }
  
  // Validate base64
  if (!processedImage || processedImage.length === 0) {
    return res.status(400).json({
      error: "Invalid image data",
      message: "Base64 image data is empty after processing",
    });
  }
  
  // Validate minimum length
  if (processedImage.length < 100) {
    return res.status(400).json({
      error: "Invalid image data",
      message: "Image data is too short.",
    });
  }
  
  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(processedImage)) {
    return res.status(400).json({
      error: "Invalid image format",
      message: "Invalid base64 format.",
    });
  }

  // Validate file type
  if (!validateFileType(image)) {
    return res.status(400).json({
      error: "Invalid file type",
      detail: "Invalid file type. Supported: jpeg, png, webp, bmp",
    });
  }

  try {
    // Try different endpoints - Kolosal API might use different endpoint structure
    const endpoints = [
      `${KOLOSAL_API_BASE}/detect`,
      `${KOLOSAL_API_BASE}/v1/detect`,
      `${KOLOSAL_API_BASE}/v1/detect/segment`,
      `${KOLOSAL_API_BASE}/v1/segment/base64`,
    ];
    
    let lastError: any = null;
    let lastResponse: any = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log("Detect Segment: Trying endpoint:", endpoint, "image length:", processedImage.length);
        
        // Try both formats: pure base64 and data URL
        const requestBodies = [
          {
            image: processedImage, // Pure base64
            prompts,
            return_annotated,
            return_masks,
            threshold,
          },
          {
            image: `data:${detectedMimeType};base64,${processedImage}`, // Data URL format
            prompts,
            return_annotated,
            return_masks,
            threshold,
          },
        ];
        
        for (const requestBody of requestBodies) {
          try {
            console.log("Detect Segment: Trying format:", requestBody.image.startsWith("data:") ? "data URL" : "pure base64");
            
            const { statusCode, body } = await request(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: apiKey,
              },
              body: JSON.stringify(requestBody),
            });

            const responseData = await safeJsonParse(body);
            
            console.log("Detect Segment: Endpoint:", endpoint);
            console.log("Detect Segment: Response status:", statusCode);
            console.log("Detect Segment: Response data:", JSON.stringify(responseData).substring(0, 200));

            if (statusCode === 200) {
              console.log("Detect Segment: Success with endpoint:", endpoint);
              return res.status(200).json(responseData);
            }
            
            // If 403 or 404, try next format or endpoint
            if (statusCode === 403 || statusCode === 404) {
              console.log("Detect Segment: Format failed with", statusCode, "trying next...");
              lastError = responseData;
              lastResponse = { statusCode, responseData };
              continue;
            }
            
            // For other errors, return immediately
            console.error("Detect Segment: Kolosal API error:", responseData);
            return res.status(statusCode).json({
              error: "Failed to segment image",
              details: responseData,
            });
          } catch (formatError) {
            console.error("Detect Segment: Format error:", formatError);
            lastError = formatError;
            continue;
          }
        }
      } catch (endpointError) {
        console.error("Detect Segment: Endpoint error for", endpoint, ":", endpointError);
        lastError = endpointError;
        continue;
      }
    }
    
    // If all endpoints failed
    console.error("Detect Segment: All endpoints failed");
    return res.status(lastResponse?.statusCode || 500).json({
      error: "Failed to segment image",
      details: lastError || { error: "All endpoints failed" },
    });
  } catch (error) {
    console.error("Segment error:", error);
    return res.status(500).json({
      error: "Failed to segment image",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Export supported types for frontend validation
export const supportedTypes = SUPPORTED_TYPES;
export const supportedExtensions = SUPPORTED_EXTENSIONS;

