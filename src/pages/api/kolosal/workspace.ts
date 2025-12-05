import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "undici";

const KOLOSAL_API_BASE = "https://api.kolosal.ai/v1/workspaces";

function getKolosalApiKey(): string {
  // In Next.js standalone mode, process.env is available at runtime
  const apiKey = process.env.KOLOSAL_API_KEY;
  
  if (!apiKey) {
    throw new Error("KOLOSAL_API_KEY environment variable is not set");
  }
  
  return `Bearer ${apiKey}`;
}

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

  const { action, workspace_id, category_id, feature_id } = req.query;

  try {
    switch (action) {
      // Workspace actions
      case "list":
        return handleList(req, res, apiKey);
      case "create":
        return handleCreate(req, res, apiKey);
      case "get":
        return handleGet(req, res, workspace_id as string, apiKey);
      case "delete":
        return handleDelete(req, res, workspace_id as string, apiKey);
      case "update":
        return handleUpdate(req, res, workspace_id as string, apiKey);
      case "stats":
        return handleStats(req, res, apiKey);
      case "status":
        return handleStatus(req, res, workspace_id as string, apiKey);
      
      // Order actions
      case "order":
        return handleOrder(req, res, apiKey);
      case "order-update":
        return handleOrderUpdate(req, res, apiKey);
      case "order-stats":
        return handleOrderStats(req, res, apiKey);
      
      // Category actions
      case "categories":
        return handleCategories(req, res, workspace_id as string, apiKey);
      case "category-create":
        return handleCategoryCreate(req, res, workspace_id as string, apiKey);
      case "category-get":
        return handleCategoryGet(req, res, workspace_id as string, category_id as string, apiKey);
      case "category-delete":
        return handleCategoryDelete(req, res, workspace_id as string, category_id as string, apiKey);
      case "category-update":
        return handleCategoryUpdate(req, res, workspace_id as string, category_id as string, apiKey);
      case "category-order":
        return handleCategoryOrder(req, res, workspace_id as string, apiKey);
      case "category-order-update":
        return handleCategoryOrderUpdate(req, res, workspace_id as string, apiKey);
      
      // Feature actions
      case "features":
        return handleFeatures(req, res, workspace_id as string, category_id as string, apiKey);
      case "feature-create":
        return handleFeatureCreate(req, res, workspace_id as string, category_id as string, apiKey);
      case "feature-get":
        return handleFeatureGet(req, res, workspace_id as string, category_id as string, feature_id as string, apiKey);
      case "feature-delete":
        return handleFeatureDelete(req, res, workspace_id as string, category_id as string, feature_id as string, apiKey);
      case "feature-update":
        return handleFeatureUpdate(req, res, workspace_id as string, category_id as string, feature_id as string, apiKey);
      case "feature-order":
        return handleFeatureOrder(req, res, workspace_id as string, category_id as string, apiKey);
      case "feature-order-update":
        return handleFeatureOrderUpdate(req, res, workspace_id as string, category_id as string, apiKey);
      
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

// ==================== WORKSPACE HANDLERS ====================

async function handleList(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { statusCode, body } = await request(KOLOSAL_API_BASE, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { statusCode, body } = await request(KOLOSAL_API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify(req.body),
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 || statusCode === 201 ? 200 : statusCode).json(data);
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, workspaceId: string, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId) return res.status(400).json({ error: "Workspace ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, workspaceId: string, apiKey: string) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId) return res.status(400).json({ error: "Workspace ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}`, {
    method: "DELETE",
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleUpdate(req: NextApiRequest, res: NextApiResponse, workspaceId: string, apiKey: string) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId) return res.status(400).json({ error: "Workspace ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify(req.body),
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleStats(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/stats`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleStatus(req: NextApiRequest, res: NextApiResponse, workspaceId: string, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId) return res.status(400).json({ error: "Workspace ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/status`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

// ==================== ORDER HANDLERS ====================

async function handleOrder(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/order`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleOrderUpdate(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify(req.body),
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleOrderStats(req: NextApiRequest, res: NextApiResponse, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/order/stats`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

// ==================== CATEGORY HANDLERS ====================

async function handleCategories(req: NextApiRequest, res: NextApiResponse, workspaceId: string, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId) return res.status(400).json({ error: "Workspace ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleCategoryCreate(req: NextApiRequest, res: NextApiResponse, workspaceId: string, apiKey: string) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId) return res.status(400).json({ error: "Workspace ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ ...req.body, workspace_id: workspaceId }),
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 || statusCode === 201 ? 200 : statusCode).json(data);
}

async function handleCategoryGet(req: NextApiRequest, res: NextApiResponse, workspaceId: string, categoryId: string, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId || !categoryId) return res.status(400).json({ error: "Workspace ID and Category ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/${categoryId}`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleCategoryDelete(req: NextApiRequest, res: NextApiResponse, workspaceId: string, categoryId: string, apiKey: string) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId || !categoryId) return res.status(400).json({ error: "Workspace ID and Category ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/${categoryId}`, {
    method: "DELETE",
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleCategoryUpdate(req: NextApiRequest, res: NextApiResponse, workspaceId: string, categoryId: string, apiKey: string) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId || !categoryId) return res.status(400).json({ error: "Workspace ID and Category ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/${categoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify(req.body),
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleCategoryOrder(req: NextApiRequest, res: NextApiResponse, workspaceId: string, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId) return res.status(400).json({ error: "Workspace ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/order`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleCategoryOrderUpdate(req: NextApiRequest, res: NextApiResponse, workspaceId: string, apiKey: string) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId) return res.status(400).json({ error: "Workspace ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ ...req.body, workspace_id: workspaceId }),
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

// ==================== FEATURE HANDLERS ====================

async function handleFeatures(req: NextApiRequest, res: NextApiResponse, workspaceId: string, categoryId: string, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId || !categoryId) return res.status(400).json({ error: "Workspace ID and Category ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/${categoryId}/features`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleFeatureCreate(req: NextApiRequest, res: NextApiResponse, workspaceId: string, categoryId: string, apiKey: string) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId || !categoryId) return res.status(400).json({ error: "Workspace ID and Category ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/${categoryId}/features`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ ...req.body, category_id: categoryId }),
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 || statusCode === 201 ? 200 : statusCode).json(data);
}

async function handleFeatureGet(req: NextApiRequest, res: NextApiResponse, workspaceId: string, categoryId: string, featureId: string, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId || !categoryId || !featureId) return res.status(400).json({ error: "All IDs required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/${categoryId}/features/${featureId}`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleFeatureDelete(req: NextApiRequest, res: NextApiResponse, workspaceId: string, categoryId: string, featureId: string, apiKey: string) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId || !categoryId || !featureId) return res.status(400).json({ error: "All IDs required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/${categoryId}/features/${featureId}`, {
    method: "DELETE",
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleFeatureUpdate(req: NextApiRequest, res: NextApiResponse, workspaceId: string, categoryId: string, featureId: string, apiKey: string) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId || !categoryId || !featureId) return res.status(400).json({ error: "All IDs required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/${categoryId}/features/${featureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify(req.body),
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleFeatureOrder(req: NextApiRequest, res: NextApiResponse, workspaceId: string, categoryId: string, apiKey: string) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId || !categoryId) return res.status(400).json({ error: "Workspace ID and Category ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/${categoryId}/features/order`, {
    headers: { Authorization: apiKey },
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}

async function handleFeatureOrderUpdate(req: NextApiRequest, res: NextApiResponse, workspaceId: string, categoryId: string, apiKey: string) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });
  if (!workspaceId || !categoryId) return res.status(400).json({ error: "Workspace ID and Category ID required" });

  const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/${workspaceId}/categories/${categoryId}/features/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ ...req.body, category_id: categoryId }),
  });
  const data = await safeJsonParse(body);
  return res.status(statusCode === 200 ? 200 : statusCode).json(data);
}
