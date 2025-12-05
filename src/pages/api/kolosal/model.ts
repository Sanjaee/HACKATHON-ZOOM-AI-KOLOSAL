import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "undici";

const KOLOSAL_API_URL = "https://api.kolosal.ai/v1/models";

function getKolosalApiKey(): string {
  // In Next.js standalone mode, process.env is available at runtime
  const apiKey = process.env.KOLOSAL_API_KEY;
  
  if (!apiKey) {
    // Log available env vars for debugging
    const envKeys = Object.keys(process.env || {}).filter(key => 
      key.includes('KOLOSAL') || key.includes('API')
    );
    console.error("Model: KOLOSAL_API_KEY not found. Available env keys:", envKeys);
    throw new Error("KOLOSAL_API_KEY environment variable is not set");
  }
  
  return `Bearer ${apiKey}`;
}

type Model = {
  id: string;
  name: string;
  pricing: {
    input: number;
    output: number;
    currency: string;
    unit: string;
  };
  contextSize: number;
  lastUpdated: string;
};

type ModelsResponse = {
  models: Model[];
  count: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let apiKey: string;
  try {
    apiKey = getKolosalApiKey();
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "NEXT_PUBLIC_KOLOSAL_API_KEY environment variable is not set",
    });
  }

  try {
    const { statusCode, body } = await request(KOLOSAL_API_URL, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });

    const responseData = (await body.json()) as ModelsResponse;

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to get models",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Models API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

