import { useCallback } from 'react';
import {
  createFolder,
  renameFolder,
  deleteFolder,
} from '../apiClient'; // Assuming api.js is in a directory named 'api' at the same level as 'lib'
import {
  addNodeRecursive,
  renameNodeRecursiveById,
  deleteNodeRecursiveById,
} from './tree-utils'; // Assuming tree-utils.js is in the same 'lib' directory
import { usePopup } from '@/components/PopupProvider';

export const useFolderOperations = (
  treeData, // Current treeData state
  setTreeData, // Setter for treeData
  selectedFolder, // Current selected folder ID
  setSelectedFolder // Setter for selected folder ID
) => {
  const { alert, confirm } = usePopup(); // Assuming confirm is also available from usePopup

  const handleAdd = useCallback(
    async (parentId, name, proposedId) => {
      try {
        // For root folders, parentId might be null or a special value like 'root'.
        // The API expects null for parent_id of top-level folders.
        const effectiveParentId = parentId === 'root' || parentId === 'all' ? null : parentId;
        const newFolderData = await createFolder({
          name,
          parent_id: effectiveParentId,
          id: proposedId || undefined, // Send undefined if no proposedId, API will generate
        });
        // newFolderData should be FolderSchema from backend { id, name, parent_id, created_at, updated_at, count }
        setTreeData((t) =>
          addNodeRecursive(t, effectiveParentId, { ...newFolderData, children: [], count: 0 }) // Use count from response if available, else 0
        );
        return { success: true, finalId: newFolderData.id };
      } catch (error) {
        console.error('Failed to add folder:', error);
        alert(`Failed to add folder: ${error.detail || error.message || 'Server error'}`);
        return { success: false };
      }
    },
    [setTreeData, alert]
  );

  const handleRename = useCallback(
    async (id, newName, oldName) => {
      try {
        await renameFolder(id, newName); // API expects { name: newName } in body, which renameFolder should handle
        setTreeData((t) => renameNodeRecursiveById(t, id, newName));
        return true;
      } catch (error) {
        console.error('Failed to rename folder:', error);
        alert(`Failed to rename "${oldName}": ${error.detail || error.message || 'Server error'}`);
        return false;
      }
    },
    [setTreeData, alert]
  );

  const handleDelete = useCallback(
    async (id, name) => {
      const confirmed = await confirm(`Are you sure you want to delete folder "${name}"? This action cannot be undone.`);
      if (!confirmed) return false;

      try {
        await deleteFolder(id);
        setTreeData((t) => deleteNodeRecursiveById(t, id));
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
    [setTreeData, selectedFolder, setSelectedFolder, alert, confirm]
  );

  return { handleAdd, handleRename, handleDelete };
};