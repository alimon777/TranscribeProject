// components/ui/tree-view.jsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ChevronRight, Folder as FolderIconDefault, MoreHorizontal,
  FolderOpen, Edit2, FolderPlus, Trash2, FileText, PlusCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isFolder,
  countFilesRecursive as countFilesUtil,
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
  item,
  level,
  allExpandedIds,
  currentSelectedId,
  currentRenamingId,
  currentRenamingValue,
  currentAddingUnderParentId, // From TreeView state
  currentNewFolderNameValue,  // From TreeView state
  enableEditing,
  showFiles,
  onToggleExpand,
  onSelectNode,
  onStartRename,
  onCommitRename,
  onCancelAllEdits, // Changed from onCancelEdit
  onTriggerAddSubfolder,
  onDeleteNode,
  onNewFolderNameChange,
  onCommitAddSubfolder,
  renderRecursiveTreeFn,
}) => {
  const itemIsActuallyFolder = isFolder(item);
  const fileCount = useMemo(() => itemIsActuallyFolder ? countFilesUtil(item) : 0, [item, itemIsActuallyFolder]);
  const renameInputRef = useRef(null);
  const addInputRef = useRef(null);

  const isExpanded = allExpandedIds.has(item.id);
  const isSelected = currentSelectedId === item.id;
  const isRenamingThisItem = currentRenamingId === item.id;
  // This TreeItem should show the "add input" if TreeView's addingUnderParentId matches this item's ID
  const isAddingSubfolderToThisItem = currentAddingUnderParentId === item.id;

  useEffect(() => {
    if (isRenamingThisItem && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenamingThisItem]);

  useEffect(() => {
    if (isAddingSubfolderToThisItem && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAddingSubfolderToThisItem]);

  const hasVisibleChildrenToToggle = useMemo(() => {
    if (!itemIsActuallyFolder || !item.children || item.children.length === 0) return false;
    if (showFiles) return true;
    return hasSubFolders(item);
  }, [item, itemIsActuallyFolder, showFiles]);

  const handleMainClick = (e) => {
    e.stopPropagation(); if (item.disabled) return; if (isRenamingThisItem) return;
    if (onSelectNode) onSelectNode(item.id, item);
    if (itemIsActuallyFolder && hasVisibleChildrenToToggle && onToggleExpand) {
        onToggleExpand(item.id);
    }
  };

  const handleExpandIconClick = (e) => {
    e.stopPropagation(); if (item.disabled || !itemIsActuallyFolder || !hasVisibleChildrenToToggle) return;
    if (!isSelected && onSelectNode) onSelectNode(item.id, item);
    if (onToggleExpand) onToggleExpand(item.id);
  };
  
  let ItemIconNode;
  if (item.icon) ItemIconNode = item.icon;
  else if (itemIsActuallyFolder) ItemIconNode = isExpanded ? <FolderOpen className="h-4 w-4" /> : <FolderIconDefault className="h-4 w-4" />;
  else if (showFiles) ItemIconNode = <FileText className="h-4 w-4" />;
  else ItemIconNode = null;

  const handleRenameInputChange = (e) => { if (onCommitRename) onCommitRename(item.id, e.target.value, item.name, true); };
  const handleRenameInputKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (onCommitRename) onCommitRename(item.id, e.target.value, item.name); }
    else if (e.key === 'Escape') { e.preventDefault(); if (onCancelAllEdits) onCancelAllEdits(); }
  };
  const handleRenameInputBlur = (e) => {
    if (e.relatedTarget && e.relatedTarget.closest('[role="menu"]')) return;
    // Use currentRenamingValue for comparison as it's the live input value
    if (onCommitRename && currentRenamingValue.trim() !== "" && currentRenamingValue.trim() !== item.name) {
      onCommitRename(item.id, currentRenamingValue, item.name);
    } else { 
      if (onCancelAllEdits) onCancelAllEdits();
    }
  };

  const handleAddInputChange = (e) => { if (onNewFolderNameChange) onNewFolderNameChange(e.target.value); };
  const handleAddInputKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (onCommitAddSubfolder) onCommitAddSubfolder(); }
    else if (e.key === 'Escape') { e.preventDefault(); if (onCancelAllEdits) onCancelAllEdits(); }
  };
  const handleAddInputBlur = (e) => {
    if (e.relatedTarget && e.relatedTarget.closest('[role="menu"]')) return; 
    // Use currentNewFolderNameValue passed from TreeView for the current add operation
    if (currentNewFolderNameValue && currentNewFolderNameValue.trim() !== "") {
        if (onCommitAddSubfolder) onCommitAddSubfolder();
    } else {
        if (onCancelAllEdits) onCancelAllEdits();
    }
  };

  return (
    <li role="treeitem" aria-expanded={itemIsActuallyFolder && hasVisibleChildrenToToggle ? isExpanded : undefined} aria-selected={isSelected} aria-disabled={item.disabled} className="list-none">
      <div
        className={cn( "flex items-center py-1.5 pr-1 rounded-md group relative", { 
            "hover:bg-accent hover:text-accent-foreground": !item.disabled && !isRenamingThisItem,
            "bg-accent text-accent-foreground": isSelected && !isRenamingThisItem,
            "opacity-50 cursor-not-allowed": item.disabled,
            "cursor-pointer": !item.disabled && !isRenamingThisItem,
        })}
        style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}
        onClick={handleMainClick}
        onDoubleClick={isRenamingThisItem || item.disabled || !itemIsActuallyFolder || !hasVisibleChildrenToToggle ? undefined : (e) => { e.stopPropagation(); if (onToggleExpand) onToggleExpand(item.id);}}
      >
        {itemIsActuallyFolder && hasVisibleChildrenToToggle ? ( <ChevronRight className={cn("h-4 w-4 mr-1.5 shrink-0 transition-transform duration-150 text-muted-foreground group-hover:text-accent-foreground", isExpanded && "rotate-90")} onClick={handleExpandIconClick} /> ) : ( <span className="w-4 h-4 mr-1.5 shrink-0"></span> )}
        {ItemIconNode && ( <span className="mr-1.5 shrink-0 text-muted-foreground group-hover:text-accent-foreground">{ItemIconNode}</span> )}

        {isRenamingThisItem ? (
          <Input ref={renameInputRef} type="text" value={currentRenamingValue}
            onChange={handleRenameInputChange} onKeyDown={handleRenameInputKeyDown} onBlur={handleRenameInputBlur}
            className="h-7 py-0 px-1 text-sm flex-grow mr-1 bg-background" onClick={(e) => e.stopPropagation()} />
        ) : (
          <span className="truncate flex-grow">{item.name}{itemIsActuallyFolder && <span className="ml-1.5 text-xs text-muted-foreground">({fileCount} files)</span>}</span>
        )}
        {enableEditing && itemIsActuallyFolder && !item.disabled && !isRenamingThisItem && (
          <DropdownMenu onOpenChange={(open) => { if (open && !isSelected && onSelectNode) { onSelectNode(item.id, item); }}}>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="ml-auto h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onStartRename(item.id, item.name)}><Edit2 className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTriggerAddSubfolder(item.id)}><FolderPlus className="mr-2 h-4 w-4" /> Add Subfolder</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDeleteNode(item.id)} disabled={fileCount > 0} className={cn(fileCount > 0 ? "text-muted-foreground focus:text-muted-foreground" : "text-destructive focus:text-destructive", "focus:bg-destructive/10")}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isAddingSubfolderToThisItem && enableEditing && (
        <div className="list-none"> 
          <div
            className="flex items-center py-1.5 pr-1"
            style={{ paddingLeft: `${(level + 1) * 1.25 + 0.5}rem` }}
          >
            <span className="w-4 h-4 mr-1.5 shrink-0"></span> 
            <span className="mr-1.5 shrink-0 text-muted-foreground">
              <FolderIconDefault className="h-4 w-4" />
            </span>
            <Input
              ref={addInputRef} type="text" value={currentNewFolderNameValue} // Use value from TreeView state
              placeholder="New folder name..."
              onChange={handleAddInputChange} onKeyDown={handleAddInputKeyDown} onBlur={handleAddInputBlur}
              className="h-7 py-0 px-1 text-sm flex-grow mr-1 bg-background"
            />
          </div>
        </div>
      )}

      {itemIsActuallyFolder && isExpanded && item.children && (
        <ul role="group" className="pl-0">
          {renderRecursiveTreeFn(item.children, level + 1)}
        </ul>
      )}
    </li>
  );
});
TreeItem.displayName = "TreeItem";

export const TreeView = ({
  data: initialData,
  initialExpandedIds = [],
  initialSelectedId,
  onNodeSelect,
  onNodeEditCommit,
  onNodeDeleteCommit,
  onNodeAddCommit,
  className,
  enableEditing = true,
  showFiles = true,
  allowRootFolderAdd = false, 
}) => {
  const [expandedIds, setExpandedIds] = useState(new Set(initialExpandedIds));
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [renamingId, setRenamingId] = useState(null);
  const [renamingValue, setRenamingValue] = useState('');
  const originalRenameRef = useRef('');
  const [addingUnderParentId, setAddingUnderParentId] = useState(null); 
  const [newFolderNameValue, setNewFolderNameValue] = useState('');
  const rootAddInputRef = useRef(null);
  const [isFocusRootAdd, setIsFocusRootAdd] = useState(false); // New state for Option 1

  const handleCancelAllEdits = useCallback(() => {
    setRenamingId(null); setRenamingValue(''); originalRenameRef.current = '';
    setAddingUnderParentId(null); setNewFolderNameValue('');
    setIsFocusRootAdd(false); // Reset focus intent flag
  }, []); 

  useEffect(() => {
    if (renamingId || addingUnderParentId !== null) {
      handleCancelAllEdits();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const handleToggleExpand = useCallback((itemId) => {
    setExpandedIds(prev => { const n = new Set(prev); if (n.has(itemId)) n.delete(itemId); else n.add(itemId); return n; });
  }, []);

  const handleSelectNode = useCallback((itemId, item) => {
    let cancel = true;
    if (renamingId && renamingId === itemId) cancel = false;
    if (addingUnderParentId !== null && addingUnderParentId === itemId) cancel = false;

    if (cancel && (renamingId || addingUnderParentId !== null)) {
        handleCancelAllEdits();
    }
    
    const newSelectedId = itemId; 
    if (selectedId !== newSelectedId) {
        if (onNodeSelect) {
            if (newSelectedId && isFolder(item)) onNodeSelect(newSelectedId, item);
            else if (newSelectedId && !isFolder(item) && showFiles) onNodeSelect(newSelectedId, item);
            else if (!newSelectedId && selectedId !== null) onNodeSelect(null, null);
        }
    }
    setSelectedId(newSelectedId);
  }, [onNodeSelect, renamingId, addingUnderParentId, handleCancelAllEdits, selectedId, showFiles]);

  const handleStartRename = useCallback((itemId, currentName) => {
    if (!enableEditing) return;
    if (addingUnderParentId !== null) handleCancelAllEdits();
    setRenamingId(itemId);
    setRenamingValue(currentName);
    originalRenameRef.current = currentName;
    setIsFocusRootAdd(false); // Ensure root add focus is off
    if (selectedId !== itemId) {
        setSelectedId(itemId);
        if (onNodeSelect) { const node = findNodeByIdRecursive(initialData, itemId); if (node && (isFolder(node) || showFiles)) onNodeSelect(itemId, node);}
    }
  }, [enableEditing, addingUnderParentId, handleCancelAllEdits, selectedId, onNodeSelect, initialData, showFiles]);

  const handleCommitRename = useCallback(async (commitId, newValue, oldName, isIntermediateUpdate = false) => {
    if (isIntermediateUpdate) { setRenamingValue(newValue); return; }
    const trimmedValue = newValue.trim();
    const currentRenamingId = renamingId; 
    const currentOldName = originalRenameRef.current; 
    handleCancelAllEdits(); 
    if (trimmedValue && trimmedValue !== currentOldName) {
      if (onNodeEditCommit) {
        const success = await onNodeEditCommit(currentRenamingId, trimmedValue, currentOldName);
        if (!success) { console.warn("Rename failed externally for:", currentRenamingId); }
      }
    }
  }, [onNodeEditCommit, handleCancelAllEdits, renamingId]);

  const handleTriggerAddSubfolder = useCallback((parentId) => {
    if (!enableEditing) return;
    if (renamingId) handleCancelAllEdits(); 

    setAddingUnderParentId(parentId); 
    setNewFolderNameValue("New Folder"); 
    
    if (parentId !== null) {
        setIsFocusRootAdd(false); // Not adding to root
        if (selectedId !== parentId) {
            setSelectedId(parentId);
            if (onNodeSelect) { const node = findNodeByIdRecursive(initialData, parentId); if (node && isFolder(node)) onNodeSelect(parentId, node); }
        }
        if (!expandedIds.has(parentId)) {
            setExpandedIds(prev => new Set(prev).add(parentId));
        }
    } else { // parentId is null, means adding to root
        setSelectedId(null); 
        if(onNodeSelect) onNodeSelect(null,null);
        setIsFocusRootAdd(true); // Signal to focus root add input
    }
  }, [enableEditing, renamingId, handleCancelAllEdits, selectedId, onNodeSelect, initialData, expandedIds]);

  const handleNewFolderNameChange = useCallback((name) => {
    setNewFolderNameValue(name);
  }, []);

  const handleCommitAddSubfolder = useCallback(async () => {
    const trimmedName = newFolderNameValue.trim();
    const parentForCommit = addingUnderParentId; 
    
    handleCancelAllEdits(); // This will also set isFocusRootAdd to false

    if (trimmedName && onNodeAddCommit) {
      const proposedId = `${parentForCommit || 'new_root'}-${Date.now()}`;
      const pathArray = parentForCommit ? getNodePath(initialData, parentForCommit) : [];
      const finalPath = pathArray ? [...pathArray, trimmedName] : [trimmedName];
      
      const result = await onNodeAddCommit(parentForCommit, trimmedName, proposedId, finalPath);
      if (!result || !result.success) {
        console.warn("Add folder failed externally for parent:", parentForCommit);
      }
    }
  }, [newFolderNameValue, addingUnderParentId, onNodeAddCommit, initialData, handleCancelAllEdits]);

  const handleDeleteNode = useCallback(async (nodeId) => {
    if (!enableEditing) return;
    if (renamingId === nodeId || addingUnderParentId === nodeId) { handleCancelAllEdits(); }
    const nodeToDelete = findNodeByIdRecursive(initialData, nodeId);
    if (!nodeToDelete) return;
    if (window.confirm(`Are you sure you want to delete "${nodeToDelete.name}"?`)) {
      if (onNodeDeleteCommit) {
        const success = await onNodeDeleteCommit(nodeId, nodeToDelete.name);
        if (success) { if (selectedId === nodeId) setSelectedId(null); }
        else { console.warn("Delete failed externally for:", nodeId); }
      }
    }
  }, [enableEditing, renamingId, addingUnderParentId, onNodeDeleteCommit, initialData, selectedId, handleCancelAllEdits]);

  const renderRecursiveTreeFn = useCallback((nodesToRender, currentLevel) => {
    return nodesToRender
      .filter(item => showFiles || isFolder(item))
      .map(item => (
        <TreeItem
          key={item.id}
          item={item}
          level={currentLevel}
          allExpandedIds={expandedIds}
          currentSelectedId={selectedId}
          currentRenamingId={renamingId}
          currentRenamingValue={renamingValue}
          currentAddingUnderParentId={addingUnderParentId} // Pass this down
          currentNewFolderNameValue={newFolderNameValue} // Pass this down
          enableEditing={enableEditing}
          showFiles={showFiles}
          onToggleExpand={handleToggleExpand}
          onSelectNode={handleSelectNode}
          onStartRename={handleStartRename}
          onCommitRename={handleCommitRename}
          onCancelAllEdits={handleCancelAllEdits}
          onTriggerAddSubfolder={handleTriggerAddSubfolder}
          onDeleteNode={handleDeleteNode}
          onNewFolderNameChange={handleNewFolderNameChange}
          onCommitAddSubfolder={handleCommitAddSubfolder}
          renderRecursiveTreeFn={renderRecursiveTreeFn}
        />
      ));
  }, [
      expandedIds, selectedId, renamingId, renamingValue, addingUnderParentId, newFolderNameValue,
      enableEditing, showFiles,
      handleToggleExpand, handleSelectNode, handleStartRename, handleCommitRename,
      handleCancelAllEdits, handleTriggerAddSubfolder, handleDeleteNode,
      handleNewFolderNameChange, handleCommitAddSubfolder
  ]);

  useEffect(() => {
    if (isFocusRootAdd && addingUnderParentId === null && enableEditing && rootAddInputRef.current) {
      rootAddInputRef.current.focus();
      setIsFocusRootAdd(false); // Reset the flag immediately after focusing
    }
  }, [isFocusRootAdd, addingUnderParentId, enableEditing]);

  return (
    <div className={className}>

        <ul role="tree" aria-label="File tree" className="py-1">
            {renderRecursiveTreeFn(initialData, 0)}
        </ul>

        {addingUnderParentId === null && enableEditing && (
            <div className="list-none mt-1">
                <div className="flex items-center py-1.5 pr-1 rounded-md bg-accent/50"
                     style={{ paddingLeft: `0.5rem` }}>
                    <span className="mr-1.5 shrink-0 text-muted-foreground"> <FolderPlus className="h-4 w-4" /> </span>
                    <Input
                        ref={rootAddInputRef} type="text" value={newFolderNameValue}
                        placeholder="New root folder name..."
                        onChange={(e) => handleNewFolderNameChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCommitAddSubfolder(); } else if (e.key === 'Escape') { e.preventDefault(); handleCancelAllEdits(); }}}
                        onBlur={(e) => { if (e.relatedTarget && e.relatedTarget.closest('[role="menu"]')) return; if (newFolderNameValue && newFolderNameValue.trim() !== "") handleCommitAddSubfolder(); else handleCancelAllEdits();}}
                        className="h-7 py-0 px-1 text-sm flex-grow mr-1 bg-background"
                    />
                </div>
            </div>
        )}
    </div>
  );
};
TreeView.displayName = "TreeView";