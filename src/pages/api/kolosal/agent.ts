import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "undici";

const KOLOSAL_API_BASE = "https://api.kolosal.ai/v1/agent";

function getKolosalApiKey(): string {
  // In Next.js standalone mode, process.env is available at runtime
  const apiKey = process.env.KOLOSAL_API_KEY;
  
  if (!apiKey) {
    throw new Error("KOLOSAL_API_KEY environment variable is not set");
  }
  
  return `Bearer ${apiKey}`;
}

type HistoryItem = {
  type: string;
  content: string | null;
  name: string | null;
  arguments: string | null;
};

type GenerateRequest = {
  input: string;
  model: string;
  workspace_id: string;
  tools?: string[];
  history?: HistoryItem[];
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
      case "generate":
        return handleGenerate(req, res, apiKey);
      case "stats":
        return handleStats(req, res, apiKey);
      case "tools":
        return handleTools(req, res, apiKey);
      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleGenerate(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    input,
    model,
    workspace_id,
    tools = [],
    history = [],
  }: GenerateRequest = req.body;

  if (!input) {
    return res.status(400).json({ error: "Input is required" });
  }

  try {
    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        input,
        model,
        workspace_id,
        tools,
        history,
      }),
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to generate",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to generate",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleStats(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/stats`, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to get stats",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to get stats",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleTools(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/tools`, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      // Return empty tools array if API fails
      return res.status(200).json({ tools: [] });
    }

    // Ensure tools is always an array
    return res.status(200).json({
      tools: responseData.tools || [],
    });
  } catch (error) {
    // Return empty tools array on error
    return res.status(200).json({ tools: [] });
  }
}
