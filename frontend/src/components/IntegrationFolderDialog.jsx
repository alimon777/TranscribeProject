import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFolderOperations } from '../lib/useFolderOperations';
import { getFolderTreeData } from '../mockData';
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
  const { handleAdd, handleRename, handleDelete } = useFolderOperations(
    treeData,
    setTreeData,
    selectedFolderId,
    setSelectedFolderId
  );

  useEffect(() => {
    if (isOpen) {
      setTreeData(getFolderTreeData());
      setSelectedFolderId(null);
    }
  }, [isOpen]);

  const handleOk = () => {
    if (!selectedFolderId) return;
    const pathArray =
      getNodePath(treeData, selectedFolderId)?.map((n) => n.name) || [];
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
            Click a folder or create a new one, then confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="h-64 overflow-auto border rounded p-2 mb-4">
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
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleOk} disabled={!selectedFolderId}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}