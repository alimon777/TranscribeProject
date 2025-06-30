import { useCallback, useContext } from 'react';
import {
  createFolder,
  renameFolder,
  deleteFolder,
} from '../services/apiClient';
import {
  addNodeRecursive,
  renameNodeRecursiveById,
  deleteNodeRecursiveById,
} from './tree-utils'; 
import { usePopup } from '@/components/PopupProvider';
import { ContextData } from '@/lib/contextData';

export const useFolderOperations = (
  selectedFolder, 
  setSelectedFolder
) => {
  const {treeData,updateFolderTree} = useContext(ContextData);
  const { alert, confirm } = usePopup();

  const handleAdd = useCallback(
    async (parentId, name) => {
      try {
        const effectiveParentId = parentId === 'root' || parentId === 'all' ? null : parentId;
        const newFolderData = await createFolder({
          name,
          parent_id: parentId,
        });
        updateFolderTree((t) =>
          addNodeRecursive(t, effectiveParentId, { ...newFolderData, children: [], count: 0 }) 
        );
        return { success: true, finalId: newFolderData.id };
      } catch (error) {
        console.error('Failed to add folder:', error);
        alert(`Failed to add folder: ${error.detail || error.message || 'Server error'}`);
        return { success: false };
      }
    },
    [updateFolderTree, alert]
  );

  const handleRename = useCallback(
    async (id, newName, oldName) => {
      try {
        await renameFolder(id, newName); // API expects { name: newName } in body, which renameFolder should handle
        updateFolderTree((t) => renameNodeRecursiveById(t, id, newName));
        return true;
      } catch (error) {
        console.error('Failed to rename folder:', error);
        alert(`Failed to rename "${oldName}": ${error.detail || error.message || 'Server error'}`);
        return false;
      }
    },
    [updateFolderTree, alert]
  );

  const handleDelete = useCallback(
    async (id, name) => {
      const confirmed = await confirm(`Are you sure you want to delete folder "${name}"? This action cannot be undone.`);
      if (!confirmed) return false;

      try {
        await deleteFolder(id);
        updateFolderTree((t) => deleteNodeRecursiveById(t, id));
        if (selectedFolder === id) {
          setSelectedFolder('all'); // Or null, depending on desired behavior. 'all' is safer.
        }
        alert(`Folder "${name}" deleted successfully.`);
        return true;
      } catch (error) {
        console.error('Failed to delete folder:', error);
        // Backend error for non-empty folder: "Cannot delete folder: it has subfolders." or "Cannot delete folder: it contains transcriptions."
        alert(`Cannot delete "${name}": ${error.detail || error.message || 'Server error'}`);
        return false;
      }
    },
    [updateFolderTree, selectedFolder, setSelectedFolder, alert, confirm]
  );

  return { handleAdd, handleRename, handleDelete };
};