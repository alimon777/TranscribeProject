// src/components/ui/tree-view.jsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ChevronRight,
  Folder as FolderIconDefault,
  FolderOpen,
  MoreHorizontal,
  Edit2,
  FolderPlus,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isFolder, hasSubFolders } from '@/lib/tree-utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import NoFile from '@/svg_components/NoFile';

const TreeItem = React.memo(({
  item,
  level,
  allExpandedIds,
  currentSelectedId,
  currentRenamingId,
  currentRenamingValue,
  currentAddingUnderParentId,
  currentNewFolderNameValue,
  enableEditing,
  onToggleExpand,
  onSelectNode,
  onStartRename,
  onCommitRename,
  onCancelAllEdits,
  onTriggerAddSubfolder,
  onDeleteNode,
  onNewFolderNameChange,
  onCommitAddSubfolder,
  renderRecursiveTreeFn
}) => {
  const isFolderItem = isFolder(item);
  // Use the folder count provided in the mock data (or default to zero)
  const fileCount = typeof item.count === 'number' ? item.count : 0;
  const renameRef = useRef(null);
  const addRef = useRef(null);
  const isExpanded = allExpandedIds.has(item.id);
  const isSelected = currentSelectedId === item.id;
  const isRenaming = currentRenamingId === item.id;
  const isAdding = currentAddingUnderParentId === item.id;

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (isAdding && addRef.current) addRef.current.focus();
  }, [isAdding]);

  const canToggle = isFolderItem && hasSubFolders(item);

  const handleMainClick = (e) => {
    e.stopPropagation();
    if (isRenaming) return;
    onSelectNode?.(item.id);
    if (canToggle) onToggleExpand?.(item.id);
  };

  const handleChevronClick = e => {
    e.stopPropagation();
    if (canToggle) onToggleExpand?.(item.id);
  };

  // Icon picking now always shows folder icons if it is a folder.
  let IconNode = null;
  if (isFolderItem) {
    IconNode = isExpanded
      ? <FolderOpen className="h-3 w-3" />
      : <FolderIconDefault className="h-3 w-3" />;
  }

  return (
    <li role="treeitem" aria-expanded={canToggle ? isExpanded : undefined} aria-selected={isSelected} className="list-none">
      <div
        className={cn("flex items-center gap-1 py-1 pr-1 rounded group mb-0.5", {
          "hover:bg-accent": !isRenaming,
          "bg-accent": isSelected
        })}
        style={{ paddingLeft: `${level * 1.0 + 0.5}rem` }}
        onClick={handleMainClick}
      >
        {canToggle ? (
          <ChevronRight
            className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")}
            onClick={handleChevronClick}
          />
        ) : (
          <span className="inline-block w-3 h-3" />
        )}

        {IconNode && (
          <span className="flex-shrink-0 text-muted-foreground">
            {IconNode}
          </span>
        )}

        {isRenaming ? (
          <Input
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
        ) : (
          <span className="truncate text-sm flex-grow">
            {item.name}
            {isFolderItem && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({fileCount})
              </span>
            )}
          </span>
        )}

        {enableEditing && isFolderItem && !isRenaming && (
          <DropdownMenu onOpenChange={(open) => open && onSelectNode?.(item.id)}>
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
                onClick={() => onDeleteNode(item.id, item.name)}
                className="text-destructive"
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
          style={{ paddingLeft: `${(level + 1) * 1.0 + 0.5}rem` }}
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

      {isFolderItem && isExpanded && item.children && item.children.length > 0 && (
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
    const propId = `${pid || 'root'}-${Date.now()}`;
    const path = []; // if needed, you can implement a function to get the path
    await onNodeAddCommit?.(pid, name, propId, [...path, name]);
  };

  const deleteNode = async (id, name) => {
    cancelAll();
    await onNodeDeleteCommit?.(id, name);
  };

  const onNewNameChange = v => setNewNameVal(v);

  const renderTree = useCallback((nodes, lvl) => nodes.map(n => (
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
      onToggleExpand={toggle}
      onSelectNode={(id) => { setSelectedId(id); onNodeSelect?.(id); }}
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
    expandedIds, selectedId,
    renamingId, renamingVal,
    addingId, newNameVal,
    enableEditing, toggle, cancelAll,
    onNodeSelect, onNodeEditCommit, onNodeDeleteCommit, onNodeAddCommit
  ]);

  return (
    <div className={className}>
      {allowRootFolderAdd && enableEditing && (
        <div className="flex items-center gap-1 py-1 pr-1 rounded mb-1" style={{ paddingLeft: '0.5rem' }}>
          <FolderPlus className="h-3 w-3 text-muted-foreground mr-2" />
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

      {data && data.length > 0 ? (
        <ul role="tree">
          {renderTree(data, 0)}
        </ul>
      ) : (
        <div className='flex-row justify-items-center mt-22'>
          <NoFile className='h-20 w-20 mb-5' />
          <div className="text-muted-foreground text-sm">
            No folders available.
          </div>
        </div>
      )}
    </div>
  );
};
TreeView.displayName = "TreeView";