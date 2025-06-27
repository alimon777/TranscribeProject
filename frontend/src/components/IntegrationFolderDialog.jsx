// src/components/IntegrationFolderDialog.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFolderOperations } from '../lib/useFolderOperations';
import { getFolderTree } from '../apiClient'; // Import the API function
import { TreeView } from '../components/ui/tree-view';
import { getNodePath } from '../lib/tree-utils';

export default function IntegrationFolderDialog({
  isOpen,
  onClose,
  suggestedPath = [],
  onConfirm,
}) {
  const [treeData, setTreeData] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // The hook now only needs the state setter
  const { handleAdd, handleRename, handleDelete } =
    useFolderOperations(setTreeData);

  useEffect(() => {
    if (isOpen) {
      const fetchTree = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await getFolderTree();
          setTreeData(data);
        } catch (err) {
          console.error('Failed to fetch folder tree:', err);
          setError('Could not load folders. Please try again.');
          setTreeData([]); // Clear data on error
        } finally {
          setIsLoading(false);
        }
      };

      fetchTree();
      setSelectedFolderId(null); // Reset selection when dialog opens
    }
  }, [isOpen]);

  const handleOk = () => {
    if (!selectedFolderId) return;
    // The path is now available directly on the node object from the API
    const selectedNode = treeData.flatMap(f => getNodePath([f], selectedFolderId)).pop();
    const pathArray = selectedNode?.path?.split(' / ') || [];

    onConfirm(selectedFolderId, pathArray);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Folder</DialogTitle>
          <DialogDescription>
            {suggestedPath.length
              ? `Suggested path: ${suggestedPath.join(' / ')}`
              : 'No specific path suggested.'}
            <br />
            Select a destination folder or create a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="h-64 overflow-auto border rounded p-2 mb-4">
          {isLoading && <p className="p-4 text-center">Loading folders...</p>}
          {error && <p className="p-4 text-center text-red-600">{error}</p>}
          {!isLoading && !error && (
            <TreeView
              data={treeData}
              initialSelectedId={selectedFolderId}
              onNodeSelect={setSelectedFolderId}
              onNodeAddCommit={handleAdd}
              onNodeEditCommit={handleRename}
              onNodeDeleteCommit={handleDelete}
              enableEditing
              allowRootFolderAdd
            />
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleOk} disabled={!selectedFolderId || isLoading}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}