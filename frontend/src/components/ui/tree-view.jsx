// src/components/ui/tree-view.jsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ChevronRight,
  Folder as FolderIconDefault,
  FolderOpen,
  MoreHorizontal,
  Edit2,
  FolderPlus,
  Trash2,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isFolder,
  countFilesRecursive,
  findNodeByIdRecursive,
  getNodePath,
  hasSubFolders
} from '@/lib/tree-utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const TreeItem = React.memo(({
  item, level, allExpandedIds, currentSelectedId,
  currentRenamingId, currentRenamingValue,
  currentAddingUnderParentId, currentNewFolderNameValue,
  enableEditing, showFiles,
  onToggleExpand, onSelectNode, onStartRename,
  onCommitRename, onCancelAllEdits, onTriggerAddSubfolder,
  onDeleteNode, onNewFolderNameChange,
  onCommitAddSubfolder, renderRecursiveTreeFn
}) => {
  const isFolderItem = isFolder(item);
  const fileCount = useMemo(() =>
    isFolderItem ? countFilesRecursive(item) : 0, [item]
  );
  const renameRef = useRef(null), addRef = useRef(null);
  const isExpanded = allExpandedIds.has(item.id);
  const isSelected = currentSelectedId === item.id;
  const isRenaming = currentRenamingId === item.id;
  const isAdding  = currentAddingUnderParentId === item.id;

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);
  useEffect(() => {
    if (isAdding && addRef.current) addRef.current.focus();
  }, [isAdding]);

  const canToggle = isFolderItem &&
    ((showFiles && item.children.length > 0) || hasSubFolders(item));

  const handleMainClick = e => {
    e.stopPropagation();
    if (isRenaming) return;
    onSelectNode?.(item.id, item);
    if (canToggle) onToggleExpand?.(item.id);
  };
  const handleChevronClick = e => {
    e.stopPropagation();
    if (canToggle) onToggleExpand?.(item.id);
  };

  // pick icon
  let IconNode = null;
  if (item.icon) IconNode = item.icon;
  else if (isFolderItem) {
    IconNode = isExpanded
      ? <FolderOpen className="h-3 w-3" />
      : <FolderIconDefault className="h-3 w-3" />;
  } else if (showFiles) {
    IconNode = <FileText className="h-3 w-3" />;
  }

  return (
    <li role="treeitem" aria-expanded={canToggle ? isExpanded : undefined}
      aria-selected={isSelected} className="list-none">
      <div
        className={cn("flex items-center gap-1 py-1 pr-1 rounded group", {
          "hover:bg-accent": !isRenaming,
          "bg-accent": isSelected
        })}
        style={{ paddingLeft: `${level*1.0 + 0.5}rem`}}
        onClick={handleMainClick}
      >
        {canToggle
          ? <ChevronRight
              className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")}
              onClick={handleChevronClick}
            />
          : <span className="inline-block w-3 h-3" />
        }

        {IconNode && (
          <span className="flex-shrink-0 text-muted-foreground">
            {IconNode}
          </span>
        )}

        {isRenaming
          ? <Input
              ref={renameRef}
              className="flex-grow text-sm py-0 px-1"
              value={currentRenamingValue}
              onChange={e => onCommitRename(item.id, e.target.value, item.name, true)}
              onKeyDown={e => {
                if (e.key === 'Enter') onCommitRename(item.id, e.target.value, item.name);
                if (e.key === 'Escape') onCancelAllEdits();
              }}
              onBlur={() => onCommitRename(item.id, currentRenamingValue, item.name)}
            />
          : <span className="truncate text-sm flex-grow">
              {item.name}
              {isFolderItem && <span className="ml-1 text-[10px] text-muted-foreground">({fileCount})</span>}
            </span>
        }

        {enableEditing && isFolderItem && !isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStartRename(item.id, item.name)}>
                <Edit2 className="h-3 w-3 mr-1" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTriggerAddSubfolder(item.id)}>
                <FolderPlus className="h-3 w-3 mr-1" /> Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteNode(item.id)}
                disabled={fileCount > 0}
                className={cn(fileCount > 0 ? "text-muted-foreground" : "text-destructive")}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isAdding && enableEditing && (
        <div
          className="flex items-center gap-1 py-1 pr-1"
          style={{ paddingLeft: `${(level+1)*1.0 + 0.5}rem` }}
        >
          <span className="inline-block w-3 h-3" />
          <FolderIconDefault className="h-3 w-3 text-muted-foreground" />
          <Input
            ref={addRef}
            className="flex-grow text-sm py-0 px-1"
            value={currentNewFolderNameValue}
            placeholder="New folder…"
            onChange={e => onNewFolderNameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onCommitAddSubfolder();
              if (e.key === 'Escape') onCancelAllEdits();
            }}
            onBlur={() => onCommitAddSubfolder()}
          />
        </div>
      )}

      {isFolderItem && isExpanded && item.children.length > 0 && (
        <ul role="group">
          {renderRecursiveTreeFn(item.children, level + 1)}
        </ul>
      )}
    </li>
  );
});
TreeItem.displayName = "TreeItem";

export const TreeView = ({
  data,
  initialExpandedIds = [],
  initialSelectedId,
  onNodeSelect,
  onNodeEditCommit,
  onNodeDeleteCommit,
  onNodeAddCommit,
  enableEditing = true,
  showFiles = true,
  allowRootFolderAdd = false,
  className
}) => {
  const [expandedIds, setExpandedIds] = useState(new Set(initialExpandedIds));
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [renamingId, setRenamingId] = useState(null);
  const [renamingVal, setRenamingVal] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [newNameVal, setNewNameVal] = useState('');

  const cancelAll = useCallback(() => {
    setRenamingId(null);
    setRenamingVal('');
    setAddingId(null);
    setNewNameVal('');
  }, []);

  const toggle = useCallback(id => {
    setExpandedIds(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const startRename = (id, name) => {
    cancelAll();
    setRenamingId(id);
    setRenamingVal(name);
  };
  const commitRename = async (id, val, oldName, intermediate = false) => {
    if (intermediate) {
      setRenamingVal(val);
      return;
    }
    cancelAll();
    const trimmed = val.trim();
    if (trimmed && trimmed !== oldName) {
      await onNodeEditCommit?.(id, trimmed, oldName);
    }
  };

  const triggerAdd = parentId => {
    cancelAll();
    setAddingId(parentId);
    setNewNameVal('New Folder');
    if (parentId !== null) {
      setExpandedIds(s => new Set(s).add(parentId));
    }
  };
  const commitAdd = async () => {
    const name = newNameVal.trim();
    const pid = addingId;
    cancelAll();
    if (!name) return;
    const propId = `${pid||'root'}-${Date.now()}`;
    const path = pid ? getNodePath(data, pid) : [];
    await onNodeAddCommit?.(pid, name, propId, [...(path||[]), name]);
  };

  const deleteNode = async id => {
    cancelAll();
    const node = findNodeByIdRecursive(data, id);
    if (!node) return;
    if (window.confirm(`Delete "${node.name}"?`)) {
      await onNodeDeleteCommit?.(id, node.name);
    }
  };

  const onNewNameChange = v => setNewNameVal(v);

  const renderTree = useCallback((nodes, lvl) => nodes
    .filter(n => showFiles || isFolder(n))
    .map(n => (
      <TreeItem
        key={n.id}
        item={n}
        level={lvl}
        allExpandedIds={expandedIds}
        currentSelectedId={selectedId}
        currentRenamingId={renamingId}
        currentRenamingValue={renamingVal}
        currentAddingUnderParentId={addingId}
        currentNewFolderNameValue={newNameVal}
        enableEditing={enableEditing}
        showFiles={showFiles}
        onToggleExpand={toggle}
        onSelectNode={(id, it) => { setSelectedId(id); onNodeSelect?.(id, it); }}
        onStartRename={startRename}
        onCommitRename={commitRename}
        onCancelAllEdits={cancelAll}
        onTriggerAddSubfolder={triggerAdd}
        onDeleteNode={deleteNode}
        onNewFolderNameChange={onNewNameChange}
        onCommitAddSubfolder={commitAdd}
        renderRecursiveTreeFn={renderTree}
      />
    )), [
      data, expandedIds, selectedId,
      renamingId, renamingVal,
      addingId, newNameVal,
      enableEditing, showFiles,
      toggle, cancelAll,
      onNodeSelect, onNodeEditCommit,
      onNodeDeleteCommit, onNodeAddCommit
    ]);

  return (
    <div className={className}>
      {/* NEW: Add-root-input at top */}
      {allowRootFolderAdd && enableEditing && (
        <div className="flex items-center gap-1 py-1 pr-1 bg-accent/50 rounded mb-1"
             style={{ paddingLeft:'0.5rem' }}>
          <FolderPlus className="h-3 w-3 text-muted-foreground" />
          <Input
            value={newNameVal}
            placeholder="New root folder…"
            className="text-sm py-0 px-1 flex-grow"
            onChange={e => onNewNameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') cancelAll();
            }}
            onBlur={() => commitAdd()}
          />
        </div>
      )}

      <ul role="tree">
        {renderTree(data, 0)}
      </ul>
    </div>
  );
};
TreeView.displayName = "TreeView";