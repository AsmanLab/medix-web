import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  GripVertical,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  fetchAdminCategories,
  updateAdminCategory,
  type CategoryOut,
} from "@/api/catalog";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import {
  buildAdminCategoryTree,
  type CatalogCategoryNode,
} from "@/features/catalog/map-category";
import { requireStaffPanel } from "@/session/guards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/catalog/categories/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.catalog.adminCategories(),
    queryFn: ({ signal }) => fetchAdminCategories(signal),
  });

  const flat = listQuery.data ?? [];
  const tree = useMemo(() => buildAdminCategoryTree(flat), [flat]);
  const byId = useMemo(() => {
    const map = new Map<string, CategoryOut>();
    for (const c of flat) map.set(c.id, c);
    return map;
  }, [flat]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateAdminCategory(id, { is_active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.catalog.all,
      });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось обновить статус");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort: number }[]) => {
      await Promise.all(
        updates.map((u) => updateAdminCategory(u.id, { sort: u.sort })),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.catalog.all,
      });
      toast.success("Порядок обновлён");
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось изменить порядок");
    },
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function siblingsOf(nodeId: string): CategoryOut[] {
    const node = byId.get(nodeId);
    if (!node) return [];
    return flat
      .filter((c) => c.parent_id === node.parent_id)
      .slice()
      .sort((a, b) => a.sort - b.sort || a.name_ru.localeCompare(b.name_ru, "ru"));
  }

  function onDropOn(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const drag = byId.get(dragId);
    const target = byId.get(targetId);
    if (!drag || !target || drag.parent_id !== target.parent_id) {
      toast.message("Перемещайте только в пределах одного уровня");
      setDragId(null);
      return;
    }
    const siblings = siblingsOf(dragId).filter((c) => c.id !== dragId);
    const targetIndex = siblings.findIndex((c) => c.id === targetId);
    if (targetIndex < 0) {
      setDragId(null);
      return;
    }
    siblings.splice(targetIndex, 0, drag);
    const updates = siblings.map((c, i) => ({ id: c.id, sort: i }));
    setDragId(null);
    reorderMutation.mutate(updates);
  }

  function renderNode(node: CatalogCategoryNode, depth: number) {
    const hasChildren = node.children.length > 0;
    const open = expanded.has(node.id);
    const raw = byId.get(node.id);

    return (
      <div key={node.id}>
        <div
          className={cn(
            "grid grid-cols-[1fr_auto] items-center gap-2 border-b border-border px-3 py-2.5 sm:grid-cols-[1fr_140px_100px_auto]",
            !node.isActive && "bg-muted/30 opacity-80",
          )}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          draggable
          onDragStart={() => setDragId(node.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDropOn(node.id)}
        >
          <div className="flex min-w-0 items-center gap-2">
            <GripVertical
              className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block"
              aria-hidden
            />
            {hasChildren ? (
              <button
                type="button"
                aria-expanded={open}
                aria-label={open ? "Свернуть" : "Развернуть"}
                onClick={() => toggleExpand(node.id)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted"
              >
                {open ? (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                )}
              </button>
            ) : (
              <span className="inline-block h-7 w-7 shrink-0" />
            )}
            <Link
              to="/admin/catalog/categories/$categoryId"
              params={{ categoryId: node.id }}
              className="truncate text-sm font-semibold hover:text-primary"
            >
              {node.name}
            </Link>
          </div>
          <span className="hidden truncate font-mono text-xs text-muted-foreground sm:block">
            {node.slug}
          </span>
          <label className="hidden items-center gap-2 text-xs sm:flex">
            <input
              type="checkbox"
              checked={raw?.is_active ?? node.isActive}
              disabled={toggleMutation.isPending}
              onChange={(e) =>
                toggleMutation.mutate({
                  id: node.id,
                  is_active: e.target.checked,
                })
              }
            />
            {raw?.is_active ?? node.isActive ? "Активна" : "Скрыта"}
          </label>
          <Link
            to="/admin/catalog/categories/$categoryId"
            params={{ categoryId: node.id }}
            className="text-xs font-semibold text-primary"
          >
            Изменить
          </Link>
        </div>
        {hasChildren && open
          ? node.children.map((child) => renderNode(child, depth + 1))
          : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
            <FolderTree className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Категории</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {flat.length
                ? `${flat.length} в дереве · drag-and-drop для порядка`
                : "Дерево каталога"}
            </p>
          </div>
        </div>
        <Link
          to="/admin/catalog/categories/new"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Создать
        </Link>
      </header>

      <StateBlock
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => void listQuery.refetch()}
        isEmpty={!listQuery.isLoading && tree.length === 0}
        loadingVariant="list"
        emptyIcon={FolderTree}
        emptyTitle="Категорий пока нет"
        emptyDescription="Создайте первую корневую категорию."
        emptyAction={
          <Link
            to="/admin/catalog/categories/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Создать категорию
          </Link>
        }
      >
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_auto] border-b border-border bg-muted/40 px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid-cols-[1fr_140px_100px_auto]">
            <span>Название</span>
            <span className="hidden sm:block">Slug</span>
            <span className="hidden sm:block">Статус</span>
            <span className="sr-only">Действия</span>
          </div>
          {tree.map((node) => renderNode(node, 0))}
        </div>
      </StateBlock>
    </div>
  );
}
