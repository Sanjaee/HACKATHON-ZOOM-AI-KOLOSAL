// Workspace API utilities

export async function fetchWorkspaces(): Promise<any> {
  const res = await fetch("/api/workspace?action=list");
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
}

export async function fetchWorkspaceStats(): Promise<any> {
  const res = await fetch("/api/workspace?action=stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function createWorkspace(data: {
  name: string;
  description?: string | null;
  workspace_type?: string;
}): Promise<any> {
  const res = await fetch("/api/workspace?action=create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create workspace");
  return res.json();
}

export async function updateWorkspace(
  workspaceId: string,
  data: {
    name?: string;
    description?: string | null;
    workspace_type?: string;
  }
): Promise<any> {
  const res = await fetch(`/api/workspace?action=update&workspace_id=${workspaceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update workspace");
  return res.json();
}

export async function deleteWorkspace(workspaceId: string): Promise<any> {
  const res = await fetch(`/api/workspace?action=delete&workspace_id=${workspaceId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete workspace");
  return res.json();
}

export async function fetchCategories(workspaceId: string): Promise<any> {
  const res = await fetch(`/api/workspace?action=categories&workspace_id=${workspaceId}`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function createCategory(
  workspaceId: string,
  data: {
    category_name: string;
    category_description?: string | null;
    category_type?: string;
  }
): Promise<any> {
  const res = await fetch(`/api/workspace?action=category-create&workspace_id=${workspaceId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function updateCategory(
  workspaceId: string,
  categoryId: string,
  data: {
    category_name?: string;
    category_description?: string | null;
    category_type?: string;
  }
): Promise<any> {
  const res = await fetch(
    `/api/workspace?action=category-update&workspace_id=${workspaceId}&category_id=${categoryId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error("Failed to update category");
  return res.json();
}

export async function deleteCategory(workspaceId: string, categoryId: string): Promise<any> {
  const res = await fetch(
    `/api/workspace?action=category-delete&workspace_id=${workspaceId}&category_id=${categoryId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete category");
  return res.json();
}

export async function fetchFeatures(workspaceId: string, categoryId: string): Promise<any> {
  const res = await fetch(
    `/api/workspace?action=features&workspace_id=${workspaceId}&category_id=${categoryId}`
  );
  if (!res.ok) throw new Error("Failed to fetch features");
  return res.json();
}

export async function createFeature(
  workspaceId: string,
  categoryId: string,
  data: {
    feature_name: string;
    feature_description?: string | null;
  }
): Promise<any> {
  const res = await fetch(
    `/api/workspace?action=feature-create&workspace_id=${workspaceId}&category_id=${categoryId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error("Failed to create feature");
  return res.json();
}

export async function updateFeature(
  workspaceId: string,
  categoryId: string,
  featureId: string,
  data: {
    feature_name?: string;
    feature_description?: string | null;
  }
): Promise<any> {
  const res = await fetch(
    `/api/workspace?action=feature-update&workspace_id=${workspaceId}&category_id=${categoryId}&feature_id=${featureId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error("Failed to update feature");
  return res.json();
}

export async function deleteFeature(
  workspaceId: string,
  categoryId: string,
  featureId: string
): Promise<any> {
  const res = await fetch(
    `/api/workspace?action=feature-delete&workspace_id=${workspaceId}&category_id=${categoryId}&feature_id=${featureId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete feature");
  return res.json();
}

