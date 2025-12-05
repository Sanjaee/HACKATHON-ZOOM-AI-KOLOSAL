"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Folder,
  Plus,
  Trash2,
  Edit,
  FolderOpen,
  Layers,
  BarChart3,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Settings2,
  Tag,
  Sparkles,
} from "lucide-react";

// Types
type WorkspaceSettings = {
  agent_timeout_seconds?: number;
  allowed_file_types?: string[];
  auto_save?: boolean;
  max_file_size_mb?: number;
  python_environment?: string | null;
  shared_resources?: boolean;
};

type Workspace = {
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

type Category = {
  category_id: string;
  category_name: string;
  category_description?: string | null;
  category_type?: string;
  category_score?: number | null;
  workspace_id: string;
};

type Feature = {
  feature_id: string;
  feature_name: string;
  feature_description?: string | null;
  feature_score?: number | null;
  category_id?: string | null;
};

type WorkspaceStats = {
  total_workspaces: number;
  max_workspaces: number;
  remaining_slots: number;
  allowed_types: string[];
};

type WorkspaceManagerProps = {
  onWorkspaceSelect?: (workspaceId: string) => void;
  selectedWorkspace?: string | null;
};

export function WorkspaceManager({
  onWorkspaceSelect,
  selectedWorkspace,
}: WorkspaceManagerProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [stats, setStats] = React.useState<WorkspaceStats | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Expanded states
  const [expandedWorkspace, setExpandedWorkspace] = React.useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  // Categories and Features
  const [categories, setCategories] = React.useState<Record<string, Category[]>>({});
  const [features, setFeatures] = React.useState<Record<string, Feature[]>>({});

  // Create/Edit dialogs
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = React.useState(false);
  const [editWorkspaceOpen, setEditWorkspaceOpen] = React.useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = React.useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = React.useState(false);
  const [createFeatureOpen, setCreateFeatureOpen] = React.useState(false);
  const [editFeatureOpen, setEditFeatureOpen] = React.useState(false);

  // Delete confirmations
  const [deleteWorkspaceId, setDeleteWorkspaceId] = React.useState<string | null>(null);
  const [deleteCategoryInfo, setDeleteCategoryInfo] = React.useState<{
    workspaceId: string;
    categoryId: string;
  } | null>(null);
  const [deleteFeatureInfo, setDeleteFeatureInfo] = React.useState<{
    workspaceId: string;
    categoryId: string;
    featureId: string;
  } | null>(null);

  // Form states
  const [workspaceForm, setWorkspaceForm] = React.useState({
    name: "",
    description: "",
    workspace_type: "personal",
  });
  const [editingWorkspace, setEditingWorkspace] = React.useState<Workspace | null>(null);

  const [categoryForm, setCategoryForm] = React.useState({
    category_name: "",
    category_description: "",
    category_type: "Business",
    workspace_id: "",
  });
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  const [featureForm, setFeatureForm] = React.useState({
    feature_name: "",
    feature_description: "",
    workspace_id: "",
    category_id: "",
  });
  const [editingFeature, setEditingFeature] = React.useState<{
    feature: Feature;
    workspaceId: string;
    categoryId: string;
  } | null>(null);

  // Fetch workspaces
  const fetchWorkspaces = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace?action=list");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWorkspaces(data.workspaces || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch workspaces");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stats
  const fetchStats = React.useCallback(async () => {
    try {
      const res = await fetch("/api/workspace?action=stats");
      const data = await res.json();
      if (!data.error) setStats(data);
    } catch {
      console.error("Failed to fetch stats");
    }
  }, []);

  // Fetch categories for a workspace
  const fetchCategories = React.useCallback(async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/workspace?action=categories&workspace_id=${workspaceId}`);
      const data = await res.json();
      if (!data.error) {
        setCategories((prev) => ({ ...prev, [workspaceId]: data.categories || [] }));
      }
    } catch {
      console.error("Failed to fetch categories");
    }
  }, []);

  // Fetch features for a category
  const fetchFeatures = React.useCallback(async (workspaceId: string, categoryId: string) => {
    try {
      const res = await fetch(
        `/api/workspace?action=features&workspace_id=${workspaceId}&category_id=${categoryId}`
      );
      const data = await res.json();
      if (!data.error) {
        setFeatures((prev) => ({ ...prev, [`${workspaceId}-${categoryId}`]: data.features || [] }));
      }
    } catch {
      console.error("Failed to fetch features");
    }
  }, []);

  // Load data when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchWorkspaces();
      fetchStats();
    }
  }, [open, fetchWorkspaces, fetchStats]);

  // Create workspace
  const handleCreateWorkspace = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace?action=create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceForm.name,
          description: workspaceForm.description || null,
          workspace_type: workspaceForm.workspace_type,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCreateWorkspaceOpen(false);
      setWorkspaceForm({ name: "", description: "", workspace_type: "personal" });
      fetchWorkspaces();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  // Update workspace
  const handleUpdateWorkspace = async () => {
    if (!editingWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace?action=update&workspace_id=${editingWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceForm.name,
          description: workspaceForm.description || null,
          workspace_type: workspaceForm.workspace_type,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEditWorkspaceOpen(false);
      setEditingWorkspace(null);
      fetchWorkspaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace");
    } finally {
      setLoading(false);
    }
  };

  // Delete workspace
  const handleDeleteWorkspace = async () => {
    if (!deleteWorkspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace?action=delete&workspace_id=${deleteWorkspaceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeleteWorkspaceId(null);
      fetchWorkspaces();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workspace");
    } finally {
      setLoading(false);
    }
  };

  // Create category
  const handleCreateCategory = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace?action=category-create&workspace_id=${categoryForm.workspace_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_name: categoryForm.category_name,
            category_description: categoryForm.category_description || null,
            category_type: categoryForm.category_type,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCreateCategoryOpen(false);
      setCategoryForm({ category_name: "", category_description: "", category_type: "Business", workspace_id: "" });
      fetchCategories(categoryForm.workspace_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  // Update category
  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace?action=category-update&workspace_id=${editingCategory.workspace_id}&category_id=${editingCategory.category_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_name: categoryForm.category_name,
            category_description: categoryForm.category_description || null,
            category_type: categoryForm.category_type,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEditCategoryOpen(false);
      setEditingCategory(null);
      fetchCategories(editingCategory.workspace_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async () => {
    if (!deleteCategoryInfo) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace?action=category-delete&workspace_id=${deleteCategoryInfo.workspaceId}&category_id=${deleteCategoryInfo.categoryId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeleteCategoryInfo(null);
      fetchCategories(deleteCategoryInfo.workspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  // Create feature
  const handleCreateFeature = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace?action=feature-create&workspace_id=${featureForm.workspace_id}&category_id=${featureForm.category_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feature_name: featureForm.feature_name,
            feature_description: featureForm.feature_description || null,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCreateFeatureOpen(false);
      setFeatureForm({ feature_name: "", feature_description: "", workspace_id: "", category_id: "" });
      fetchFeatures(featureForm.workspace_id, featureForm.category_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create feature");
    } finally {
      setLoading(false);
    }
  };

  // Update feature
  const handleUpdateFeature = async () => {
    if (!editingFeature) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace?action=feature-update&workspace_id=${editingFeature.workspaceId}&category_id=${editingFeature.categoryId}&feature_id=${editingFeature.feature.feature_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feature_name: featureForm.feature_name,
            feature_description: featureForm.feature_description || null,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEditFeatureOpen(false);
      setEditingFeature(null);
      fetchFeatures(editingFeature.workspaceId, editingFeature.categoryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update feature");
    } finally {
      setLoading(false);
    }
  };

  // Delete feature
  const handleDeleteFeature = async () => {
    if (!deleteFeatureInfo) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace?action=feature-delete&workspace_id=${deleteFeatureInfo.workspaceId}&category_id=${deleteFeatureInfo.categoryId}&feature_id=${deleteFeatureInfo.featureId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeleteFeatureInfo(null);
      fetchFeatures(deleteFeatureInfo.workspaceId, deleteFeatureInfo.categoryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete feature");
    } finally {
      setLoading(false);
    }
  };

  // Toggle workspace expand
  const toggleWorkspace = (workspaceId: string) => {
    if (expandedWorkspace === workspaceId) {
      setExpandedWorkspace(null);
    } else {
      setExpandedWorkspace(workspaceId);
      if (!categories[workspaceId]) {
        fetchCategories(workspaceId);
      }
    }
  };

  // Toggle category expand
  const toggleCategory = (workspaceId: string, categoryId: string) => {
    const key = `${workspaceId}-${categoryId}`;
    if (expandedCategory === key) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(key);
      if (!features[key]) {
        fetchFeatures(workspaceId, categoryId);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Folder className="h-4 w-4" />
            Workspaces
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Workspace Manager
            </DialogTitle>
            <DialogDescription>
              Manage your workspaces, categories, and features
            </DialogDescription>
          </DialogHeader>

          {/* Stats Bar */}
          {stats && (
            <div className="flex gap-4 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span>{stats.total_workspaces} / {stats.max_workspaces} Workspaces</span>
              </div>
              <div className="text-muted-foreground">
                {stats.remaining_slots} slots remaining
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-6"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setCreateWorkspaceOpen(true)}
              disabled={loading || (stats !== null && stats.remaining_slots <= 0)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Workspace
            </Button>
            <Button variant="outline" size="sm" onClick={fetchWorkspaces} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Workspace List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading && workspaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading workspaces...
              </div>
            ) : workspaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No workspaces found. Create one to get started.
              </div>
            ) : (
              workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className={`border rounded-lg ${
                    selectedWorkspace === workspace.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  {/* Workspace Header */}
                  <div className="flex items-center gap-2 p-3">
                    <button
                      onClick={() => toggleWorkspace(workspace.id)}
                      className="hover:bg-muted p-1 rounded"
                    >
                      {expandedWorkspace === workspace.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <Folder className="h-4 w-4 text-primary" />
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onWorkspaceSelect?.(workspace.id)}
                    >
                      <div className="font-medium">{workspace.name}</div>
                      {workspace.description && (
                        <div className="text-xs text-muted-foreground">
                          {workspace.description}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        workspace.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {workspace.workspace_type || "personal"}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingWorkspace(workspace);
                          setWorkspaceForm({
                            name: workspace.name,
                            description: workspace.description || "",
                            workspace_type: workspace.workspace_type || "personal",
                          });
                          setEditWorkspaceOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteWorkspaceId(workspace.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded: Categories */}
                  {expandedWorkspace === workspace.id && (
                    <div className="border-t px-3 pb-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          Categories
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            setCategoryForm({
                              ...categoryForm,
                              workspace_id: workspace.id,
                            });
                            setCreateCategoryOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      <div className="space-y-1 ml-4">
                        {(categories[workspace.id] || []).length === 0 ? (
                          <div className="text-xs text-muted-foreground py-2">
                            No categories
                          </div>
                        ) : (
                          (categories[workspace.id] || []).map((category) => (
                            <div key={category.category_id} className="border rounded">
                              {/* Category Header */}
                              <div className="flex items-center gap-2 p-2">
                                <button
                                  onClick={() =>
                                    toggleCategory(workspace.id, category.category_id)
                                  }
                                  className="hover:bg-muted p-0.5 rounded"
                                >
                                  {expandedCategory ===
                                  `${workspace.id}-${category.category_id}` ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </button>
                                <Tag className="h-3 w-3 text-blue-500" />
                                <span className="flex-1 text-sm">
                                  {category.category_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {category.category_type}
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      setEditingCategory(category);
                                      setCategoryForm({
                                        category_name: category.category_name,
                                        category_description:
                                          category.category_description || "",
                                        category_type: category.category_type || "Business",
                                        workspace_id: workspace.id,
                                      });
                                      setEditCategoryOpen(true);
                                    }}
                                  >
                                    <Edit className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() =>
                                      setDeleteCategoryInfo({
                                        workspaceId: workspace.id,
                                        categoryId: category.category_id,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Expanded: Features */}
                              {expandedCategory ===
                                `${workspace.id}-${category.category_id}` && (
                                <div className="border-t px-2 pb-2">
                                  <div className="flex items-center justify-between py-1.5">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Sparkles className="h-2.5 w-2.5" />
                                      Features
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 text-xs"
                                      onClick={() => {
                                        setFeatureForm({
                                          feature_name: "",
                                          feature_description: "",
                                          workspace_id: workspace.id,
                                          category_id: category.category_id,
                                        });
                                        setCreateFeatureOpen(true);
                                      }}
                                    >
                                      <Plus className="h-2.5 w-2.5 mr-0.5" />
                                      Add
                                    </Button>
                                  </div>
                                  <div className="space-y-1 ml-3">
                                    {(
                                      features[
                                        `${workspace.id}-${category.category_id}`
                                      ] || []
                                    ).length === 0 ? (
                                      <div className="text-xs text-muted-foreground py-1">
                                        No features
                                      </div>
                                    ) : (
                                      (
                                        features[
                                          `${workspace.id}-${category.category_id}`
                                        ] || []
                                      ).map((feature) => (
                                        <div
                                          key={feature.feature_id}
                                          className="flex items-center gap-2 p-1.5 bg-muted/50 rounded text-xs"
                                        >
                                          <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                                          <span className="flex-1">
                                            {feature.feature_name}
                                          </span>
                                          <div className="flex gap-0.5">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={() => {
                                                setEditingFeature({
                                                  feature,
                                                  workspaceId: workspace.id,
                                                  categoryId: category.category_id,
                                                });
                                                setFeatureForm({
                                                  feature_name: feature.feature_name,
                                                  feature_description:
                                                    feature.feature_description || "",
                                                  workspace_id: workspace.id,
                                                  category_id: category.category_id,
                                                });
                                                setEditFeatureOpen(true);
                                              }}
                                            >
                                              <Edit className="h-2 w-2" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 text-destructive hover:text-destructive"
                                              onClick={() =>
                                                setDeleteFeatureInfo({
                                                  workspaceId: workspace.id,
                                                  categoryId: category.category_id,
                                                  featureId: feature.feature_id,
                                                })
                                              }
                                            >
                                              <Trash2 className="h-2 w-2" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Workspace Dialog */}
      <Dialog open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>Create a new workspace to organize your projects</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={workspaceForm.name}
                onChange={(e) =>
                  setWorkspaceForm({ ...workspaceForm, name: e.target.value })
                }
                placeholder="My Workspace"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={workspaceForm.description}
                onChange={(e) =>
                  setWorkspaceForm({ ...workspaceForm, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={workspaceForm.workspace_type}
                onValueChange={(v) =>
                  setWorkspaceForm({ ...workspaceForm, workspace_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateWorkspaceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkspace} disabled={!workspaceForm.name || loading}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Workspace Dialog */}
      <Dialog open={editWorkspaceOpen} onOpenChange={setEditWorkspaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>Update workspace details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={workspaceForm.name}
                onChange={(e) =>
                  setWorkspaceForm({ ...workspaceForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={workspaceForm.description}
                onChange={(e) =>
                  setWorkspaceForm({ ...workspaceForm, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={workspaceForm.workspace_type}
                onValueChange={(v) =>
                  setWorkspaceForm({ ...workspaceForm, workspace_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditWorkspaceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateWorkspace} disabled={!workspaceForm.name || loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a new category to organize features</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={categoryForm.category_name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, category_name: e.target.value })
                }
                placeholder="Category Name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={categoryForm.category_description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, category_description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={categoryForm.category_type}
                onValueChange={(v) =>
                  setCategoryForm({ ...categoryForm, category_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateCategoryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory} disabled={!categoryForm.category_name || loading}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={categoryForm.category_name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, category_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={categoryForm.category_description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, category_description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={categoryForm.category_type}
                onValueChange={(v) =>
                  setCategoryForm({ ...categoryForm, category_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditCategoryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCategory} disabled={!categoryForm.category_name || loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Feature Dialog */}
      <Dialog open={createFeatureOpen} onOpenChange={setCreateFeatureOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature</DialogTitle>
            <DialogDescription>Add a new feature to this category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={featureForm.feature_name}
                onChange={(e) =>
                  setFeatureForm({ ...featureForm, feature_name: e.target.value })
                }
                placeholder="Feature Name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={featureForm.feature_description}
                onChange={(e) =>
                  setFeatureForm({ ...featureForm, feature_description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateFeatureOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFeature} disabled={!featureForm.feature_name || loading}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Feature Dialog */}
      <Dialog open={editFeatureOpen} onOpenChange={setEditFeatureOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
            <DialogDescription>Update feature details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={featureForm.feature_name}
                onChange={(e) =>
                  setFeatureForm({ ...featureForm, feature_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={featureForm.feature_description}
                onChange={(e) =>
                  setFeatureForm({ ...featureForm, feature_description: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditFeatureOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateFeature} disabled={!featureForm.feature_name || loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation */}
      <AlertDialog open={!!deleteWorkspaceId} onOpenChange={() => setDeleteWorkspaceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workspace and all its categories and features.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCategoryInfo} onOpenChange={() => setDeleteCategoryInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category and all its features.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Feature Confirmation */}
      <AlertDialog open={!!deleteFeatureInfo} onOpenChange={() => setDeleteFeatureInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this feature. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFeature}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

