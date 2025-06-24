import { useCallback } from 'react';
import { treeApi } from '../mockData';
import {
  addNodeRecursive,
  renameNodeRecursiveById,
  deleteNodeRecursiveById,
} from './tree-utils';
import { usePopup } from '@/components/PopupProvider';

export const useFolderOperations = (
  treeData,
  setTreeData,
  selectedFolder,
  setSelectedFolder
) => {
  const { alert } = usePopup();
  const handleAdd = useCallback(
    async (parentId, name, proposedId) => {
      const res = await treeApi.addFolder(parentId, name, proposedId);
      if (res.success) {
        setTreeData((t) =>
          addNodeRecursive(t, parentId, { id: res.finalId, name, children: [] })
        );
        return { success: true, finalId: res.finalId };
      }
      return { success: false };
    },
    [setTreeData]
  );

  const handleRename = useCallback(
    async (id, newName, oldName) => {
      if (await treeApi.renameFolder(id, newName)) {
        setTreeData((t) => renameNodeRecursiveById(t, id, newName));
        return true;
      }
      alert(`Failed to rename "${oldName}"`);
      return false;
    },
    [setTreeData]
  );

  const handleDelete = useCallback(
    async (id, name) => {
      if (await treeApi.deleteFolder(id)) {
        setTreeData((t) => deleteNodeRecursiveById(t, id));
        if (selectedFolder === id) setSelectedFolder(null);
        return true;
      }
      alert(`Cannot delete "${name}" — it has subfolders or items.`);
      return false;
    },
    [setTreeData, selectedFolder, setSelectedFolder]
  );

  return { handleAdd, handleRename, handleDelete };
};