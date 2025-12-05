// Workspace type definitions

export type WorkspaceSettings = {
  agent_timeout_seconds?: number;
  allowed_file_types?: string[];
  auto_save?: boolean;
  max_file_size_mb?: number;
  python_environment?: string | null;
  shared_resources?: boolean;
};

export type Workspace = {
  id: string;
  name: string;
  description?: string | null;
  workspace_type?: string;
  is_active?: boolean;
  status?: string | null;
  storage_used_mb?: number;
  created_at?: string | null;
  updated_at?: string | null;
  settings?: WorkspaceSettings;
};

export type Category = {
  category_id: string;
  category_name: string;
  category_description?: string | null;
  category_type?: string;
  category_score?: number | null;
  workspace_id: string;
};

export type Feature = {
  feature_id: string;
  feature_name: string;
  feature_description?: string | null;
  feature_score?: number | null;
  category_id?: string | null;
};

export type WorkspaceStats = {
  total_workspaces: number;
  max_workspaces: number;
  remaining_slots: number;
  allowed_types: string[];
};

