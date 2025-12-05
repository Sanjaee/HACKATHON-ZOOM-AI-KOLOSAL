import type { NextApiRequest, NextApiResponse } from "next";
import { request, FormData } from "undici";

const KOLOSAL_API_BASE = "https://api.kolosal.ai";

function getKolosalApiKey(): string {
  // In Next.js standalone mode, process.env is available at runtime
  const apiKey = process.env.KOLOSAL_API_KEY;
  
  if (!apiKey) {
    // Log available env vars for debugging
    const envKeys = Object.keys(process.env || {}).filter(key => 
      key.includes('KOLOSAL') || key.includes('API')
    );
    console.error("OCR: KOLOSAL_API_KEY not found. Available env keys:", envKeys);
    throw new Error("KOLOSAL_API_KEY environment variable is not set");
  }
  
  return `Bearer ${apiKey}`;
}

// Cloudinary config (optional fallback)
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET;

// Increase body size limit for image uploads
// Important: bodyParser must be enabled for JSON requests in production
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
      // Ensure body parser works correctly in production standalone mode
      parse: true,
    },
    responseLimit: false,
  },
};

type OcrRequest = {
  image_data: string; // base64 image
  language?: string;
  auto_fix?: boolean;
  invoice?: boolean;
  custom_schema?: string;
  gcs_access_token?: string;
  gcs_url?: string;
};

// Helper function to safely parse JSON response
async function safeJsonParse(body: { text: () => Promise<string> }) {
  const text = await body.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || "Unknown error" };
  }
}

// Convert base64 to Buffer
function base64ToBuffer(base64: string): { buffer: Buffer; mimeType: string } | null {
  if (!base64 || typeof base64 !== "string") {
    return null;
  }

  // Handle data URL format: data:image/png;base64,xxxxx
  let cleanBase64 = base64;
  let mimeType = "image/png";

  if (base64.includes(",")) {
    const parts = base64.split(",");
    if (parts.length < 2 || !parts[1]) {
      return null;
    }
    const header = parts[0];
    cleanBase64 = parts[1];

    // Extract mime type from header
    const mimeMatch = header.match(/data:([^;]+);/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
  }

  if (!cleanBase64 || cleanBase64.trim().length === 0) {
    return null;
  }

  try {
    const buffer = Buffer.from(cleanBase64, "base64");
    if (!buffer || buffer.length === 0) {
      return null;
    }
    return { buffer, mimeType };
  } catch (error) {
    console.error("Error converting base64 to buffer:", error);
    return null;
  }
}

// Upload image to Cloudinary and return URL (fallback if base64 fails)
async function uploadToCloudinary(base64: string): Promise<string | null> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.log("OCR: Cloudinary not configured, skipping upload");
    return null;
  }

  try {
    const bufferData = base64ToBuffer(base64);
    if (!bufferData || !bufferData.buffer) {
      console.error("OCR: Failed to convert base64 to buffer for Cloudinary");
      return null;
    }

    // Create form data for Cloudinary upload
    const formData = new FormData();
    formData.append("file", bufferData.buffer);
    formData.append("upload_preset", "ml_default"); // You may need to adjust this
    formData.append("folder", "ocr-temp");

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    const { statusCode, body } = await request(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });

    if (statusCode === 200) {
      const result = await safeJsonParse(body);
      if (result.secure_url) {
        console.log("OCR: Successfully uploaded to Cloudinary:", result.secure_url);
        return result.secure_url;
      }
    }
    
    console.error("OCR: Cloudinary upload failed:", statusCode);
    return null;
  } catch (error) {
    console.error("OCR: Cloudinary upload error:", error);
    return null;
  }
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
      case "extract":
        return handleOcrExtract(req, res, apiKey);
      case "form":
        return handleOcrForm(req, res, apiKey);
      default:
        // Default to extract action
        return handleOcrExtract(req, res, apiKey);
    }
  } catch (error) {
    console.error("OCR API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST /ocr - Extract text from image using JSON body
async function handleOcrExtract(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Log request info for debugging
  console.log("OCR Extract - Content-Type:", req.headers["content-type"]);
  console.log("OCR Extract - Body type:", typeof req.body);
  console.log("OCR Extract - Has image_data:", !!req.body?.image_data);
  console.log("OCR Extract - image_data type:", typeof req.body?.image_data);
  console.log("OCR Extract - image_data length:", req.body?.image_data?.length || 0);

  const {
    image_data,
    language = "auto",
    auto_fix = true,
    invoice = false,
    custom_schema,
    gcs_access_token,
    gcs_url,
  }: OcrRequest = req.body || {};

  if (!image_data && !gcs_url) {
    console.error("OCR: Missing image_data and gcs_url");
    return res.status(400).json({ error: "Image data or GCS URL is required" });
  }

  try {
    // Build request body
    const requestBody: Record<string, unknown> = {
      language,
      auto_fix,
      invoice,
    };

    // If GCS URL is provided, use that
    if (gcs_url) {
      requestBody.image_data = gcs_url;
      if (gcs_access_token) {
        requestBody.gcs_access_token = gcs_access_token;
      }
    } else if (image_data) {
      // Process base64 image data
      let cleanBase64 = image_data;
      
      // Check if it's already a data URL
      if (image_data.startsWith("data:")) {
        // Extract mime type and base64
        const dataUrlMatch = image_data.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUrlMatch) {
          cleanBase64 = dataUrlMatch[2];
        } else if (image_data.includes(",")) {
          // Fallback: simple split
          const parts = image_data.split(",");
          if (parts.length > 1) {
            cleanBase64 = parts[1];
          }
        }
      } else if (image_data.includes(",")) {
        // Has comma but no data: prefix - might be partial data URL
        const parts = image_data.split(",");
        if (parts.length > 1) {
          cleanBase64 = parts[1];
        }
      }
      
      // Remove ALL whitespace including newlines, spaces, tabs
      cleanBase64 = cleanBase64.replace(/\s/g, "");
      
      // Validate base64 string is not empty
      if (!cleanBase64 || cleanBase64.length === 0) {
        console.error("OCR: Base64 is empty after processing");
        return res.status(400).json({
          error: "Invalid image data",
          message: "Base64 image data is empty after processing",
        });
      }
      
      // Validate minimum length (base64 should be at least a few characters)
      if (cleanBase64.length < 100) {
        console.error("OCR: Base64 too short:", cleanBase64.length);
        return res.status(400).json({
          error: "Invalid image data",
          message: "Image data is too short. Please upload a valid image file.",
        });
      }
      
      // Basic base64 validation (should only contain base64 characters)
      // Base64 can contain: A-Z, a-z, 0-9, +, /, = (padding)
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      if (!base64Regex.test(cleanBase64)) {
        console.error("OCR: Invalid base64 format, length:", cleanBase64.length);
        // Log first 50 chars for debugging (without exposing full data)
        console.error("OCR: Base64 preview:", cleanBase64.substring(0, 50));
        return res.status(400).json({
          error: "Invalid image format",
          message: "Invalid base64 format. Please upload a valid image file.",
        });
      }
      
      // Validate base64 can be decoded and detect mime type
      let detectedMimeType = "image/png"; // default
      try {
        const testBuffer = Buffer.from(cleanBase64, "base64");
        if (!testBuffer || testBuffer.length === 0) {
          console.error("OCR: Base64 decode test failed - empty buffer");
          return res.status(400).json({
            error: "Invalid image format",
            message: "Base64 data cannot be decoded. Please upload a valid image file.",
          });
        }
        
        // Check if it's a valid image by checking magic bytes and detect mime type
        const magicBytes = testBuffer.slice(0, 4);
        if (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF) {
          detectedMimeType = "image/jpeg";
        } else if (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47) {
          detectedMimeType = "image/png";
        } else if (magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46) {
          detectedMimeType = "image/gif";
        } else if (magicBytes[0] === 0x42 && magicBytes[1] === 0x4D) {
          detectedMimeType = "image/bmp";
        } else if (magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46) {
          detectedMimeType = "image/webp";
        }
        
        console.log("OCR: Base64 validation passed, buffer size:", testBuffer.length, "mimeType:", detectedMimeType);
      } catch (error) {
        console.error("OCR: Base64 decode validation failed:", error);
        return res.status(400).json({
          error: "Invalid image format",
          message: "Base64 data cannot be decoded. Please upload a valid image file.",
        });
      }
      
      // Try sending as data URL format first (some APIs prefer this)
      // Format: data:image/jpeg;base64,{base64}
      const dataUrlFormat = `data:${detectedMimeType};base64,${cleanBase64}`;
      requestBody.image_data = dataUrlFormat;
      console.log("OCR: Using data URL format with mimeType:", detectedMimeType, "length:", cleanBase64.length);
    }

    if (custom_schema) {
      requestBody.custom_schema = custom_schema;
    }

    // Log request info (without full base64)
    console.log("OCR: Sending to Kolosal API");
    console.log("OCR: Request body keys:", Object.keys(requestBody));
    const imageDataStr = typeof requestBody.image_data === "string" ? requestBody.image_data : "";
    console.log("OCR: image_data length:", imageDataStr.length || 0);
    console.log("OCR: image_data preview:", imageDataStr.substring(0, 50) || "N/A");

    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/ocr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await safeJsonParse(body);

    console.log("OCR: Kolosal API response status:", statusCode);
    console.log("OCR: Kolosal API response:", JSON.stringify(responseData).substring(0, 200));

    if (statusCode !== 200) {
      console.error("OCR: Kolosal API error:", responseData);
      
      // If data URL format failed, try pure base64 format
      if (
        responseData?.error === "invalid_image_format" &&
        requestBody.image_data &&
        typeof requestBody.image_data === "string" &&
        requestBody.image_data.startsWith("data:")
      ) {
        console.log("OCR: Data URL format failed, trying pure base64 format...");
        
        // Extract base64 from data URL
        const base64Match = requestBody.image_data.match(/^data:[^;]+;base64,(.+)$/);
        if (base64Match && base64Match[1]) {
          const pureBase64 = base64Match[1];
          const retryRequestBody = {
            ...requestBody,
            image_data: pureBase64, // Use pure base64 instead of data URL
          };
          
          console.log("OCR: Retrying with pure base64 format, length:", pureBase64.length);
          
          const { statusCode: retryStatus, body: retryBody } = await request(`${KOLOSAL_API_BASE}/ocr`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: apiKey,
            },
            body: JSON.stringify(retryRequestBody),
          });
          
          const retryResponseData = await safeJsonParse(retryBody);
          
          if (retryStatus === 200) {
            console.log("OCR: Success with pure base64 format");
            return res.status(200).json(retryResponseData);
          } else {
            console.error("OCR: Pure base64 format also failed:", retryResponseData);
          }
        }
      }
      
      // If base64 failed and we have image_data, try Cloudinary fallback
      if (
        responseData?.error === "invalid_image_format" &&
        requestBody.image_data &&
        typeof requestBody.image_data === "string" &&
        !requestBody.image_data.startsWith("http")
      ) {
        console.log("OCR: Base64 failed, trying Cloudinary fallback...");
        
        // Extract base64
        let base64ForCloudinary = requestBody.image_data;
        
        if (base64ForCloudinary.startsWith("data:")) {
          const dataUrlMatch = base64ForCloudinary.match(/^data:([^;]+);base64,(.+)$/);
          if (dataUrlMatch) {
            base64ForCloudinary = dataUrlMatch[2];
          }
        }
        
        const cloudinaryUrl = await uploadToCloudinary(base64ForCloudinary);
        
        if (cloudinaryUrl) {
          console.log("OCR: Retrying with Cloudinary URL...");
          // Retry with Cloudinary URL
          const retryRequestBody = {
            ...requestBody,
            image_data: cloudinaryUrl, // Use Cloudinary URL instead of base64
          };
          
          const { statusCode: retryStatus, body: retryBody } = await request(`${KOLOSAL_API_BASE}/ocr`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: apiKey,
            },
            body: JSON.stringify(retryRequestBody),
          });
          
          const retryResponseData = await safeJsonParse(retryBody);
          
          if (retryStatus === 200) {
            console.log("OCR: Success with Cloudinary URL");
            return res.status(200).json(retryResponseData);
          } else {
            console.error("OCR: Cloudinary URL also failed:", retryResponseData);
          }
        }
      }
      
      return res.status(statusCode).json({
        error: "Failed to extract text",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("OCR extract error:", error);
    return res.status(500).json({
      error: "Failed to extract text",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST /ocr/form - Extract text using multipart/form-data
async function handleOcrForm(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("OCR Form - Content-Type:", req.headers["content-type"]);
  console.log("OCR Form - Body type:", typeof req.body);
  console.log("OCR Form - Body keys:", req.body ? Object.keys(req.body) : "no body");
  console.log("OCR Form - Has image_data:", !!req.body?.image_data);
  console.log("OCR Form - image_data type:", typeof req.body?.image_data);
  console.log("OCR Form - image_data length:", req.body?.image_data?.length || 0);

  // Handle body parsing - in production, body might not be parsed correctly
  let bodyData: OcrRequest;
  try {
    if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
      bodyData = req.body as OcrRequest;
    } else {
      // Try to parse body manually if body parser failed
      console.log("OCR Form: Body parser may have failed, body is empty or invalid");
      return res.status(400).json({
        error: "Invalid request body",
        message: "Request body is empty or could not be parsed. Please ensure Content-Type is application/json.",
      });
    }
  } catch (error) {
    console.error("OCR Form: Error parsing body:", error);
    return res.status(400).json({
      error: "Invalid request body",
      message: "Failed to parse request body.",
    });
  }

  const {
    image_data,
    language = "auto",
    invoice = false,
    custom_schema,
    gcs_access_token,
    gcs_url,
  } = bodyData;

  if (!image_data && !gcs_url) {
    console.error("OCR Form: Missing image_data and gcs_url");
    return res.status(400).json({ error: "Image data or GCS URL is required" });
  }

  try {
    const formData = new FormData();

    // Add image file from base64
    if (image_data) {
      console.log("OCR Form: Processing image_data, length:", image_data.length);
      const bufferData = base64ToBuffer(image_data);
      if (!bufferData || !bufferData.buffer) {
        console.error("OCR Form: Failed to convert base64 to buffer");
        return res.status(400).json({
          error: "Invalid image data",
          message: "Failed to decode base64 image data",
        });
      }

      const { buffer, mimeType } = bufferData;
      console.log("OCR Form: Buffer created, size:", buffer.length, "mimeType:", mimeType);
      
      // Validate buffer is not null/empty
      if (!buffer || buffer.length === 0) {
        console.error("OCR Form: Buffer is empty");
        return res.status(400).json({
          error: "Invalid image data",
          message: "Image buffer is empty",
        });
      }
      
      // Get file extension from mime type
      const getExtension = (mime: string): string => {
        const mimeMap: Record<string, string> = {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/webp": "webp",
          "image/bmp": "bmp",
          "image/gif": "gif",
        };
        return mimeMap[mime] || "png";
      };
      
      const ext = getExtension(mimeType);
      const filename = `image.${ext}`;
      
      // For undici FormData in Node.js, we can use Buffer directly
      // Convert Buffer to Uint8Array for better compatibility
      try {
        const uint8Array = new Uint8Array(buffer);
        
        // Try using Blob if available (Node.js 18+)
        if (typeof Blob !== "undefined" && Blob) {
          try {
            const blob = new Blob([uint8Array], { type: mimeType });
            // undici FormData.append accepts (name, value, filename?)
            formData.append("image", blob, filename);
            console.log("OCR Form: Image appended to FormData as Blob, filename:", filename);
          } catch (blobError) {
            // Fallback to Buffer if Blob fails
            console.log("OCR Form: Blob failed, using Buffer:", blobError);
            // undici FormData.append accepts (name, value, filename?)
            formData.append("image", buffer, filename);
            console.log("OCR Form: Image appended to FormData as Buffer, filename:", filename);
          }
        } else {
          // Use Buffer directly
          // undici FormData.append accepts (name, value, filename?)
          formData.append("image", buffer, filename);
          console.log("OCR Form: Image appended to FormData as Buffer, filename:", filename);
        }
      } catch (formDataError) {
        console.error("OCR Form: FormData append error:", formDataError);
        // Fallback to JSON endpoint
        console.log("OCR Form: Falling back to JSON endpoint due to FormData error");
        return handleOcrExtract(req, res, apiKey);
      }
    }

    // Add other fields
    formData.append("language", language);
    formData.append("invoice", String(invoice));

    if (custom_schema) {
      formData.append("custom_schema", custom_schema);
    }

    if (gcs_access_token) {
      formData.append("gcs_access_token", gcs_access_token);
    }

    if (gcs_url) {
      formData.append("gcs_url", gcs_url);
    }

    console.log("OCR Form: Sending to Kolosal API /ocr/form");
    console.log("OCR Form: FormData fields:", {
      hasImage: !!image_data,
      language,
      invoice,
    });

    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/ocr/form`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        // Don't set Content-Type - let undici set it with boundary for multipart/form-data
      },
      body: formData,
    });
    
    console.log("OCR Form: Kolosal API response status:", statusCode);

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      // If form endpoint fails with image validation error, fallback to JSON endpoint
      if (
        responseData?.error === "image_validation_failed" ||
        responseData?.details?.error === "image_validation_failed"
      ) {
        console.log("Form endpoint failed, falling back to JSON endpoint");
        try {
          return handleOcrExtract(req, res, apiKey);
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }
      }
      
      return res.status(statusCode).json({
        error: "Failed to process form",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("OCR form error:", error);
    
    // If multipart/form-data fails, try falling back to JSON endpoint
    if (image_data) {
      console.log("Falling back to JSON endpoint due to FormData error");
      try {
        // Fallback to extract endpoint with JSON
        return handleOcrExtract(req, res, apiKey);
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    }
    
    return res.status(500).json({
      error: "Failed to process form",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
