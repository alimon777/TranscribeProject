// App.jsx
import React, { useState, useCallback } from 'react';
import { TreeView } from './components/ui/tree-view'; // Adjust path
import { Folder as FolderIcon, Image as ImageIcon, Music, Video, Archive, FileText as FileIcon, Star } from 'lucide-react'; // Example custom icons
import {
  isFolder,
  addNodeRecursive as utilAddNode, 
  deleteNodeRecursiveById as utilDeleteNode,
  renameNodeRecursiveById as utilRenameNode,
} from './lib/tree-utils'; // Adjust path
import './index.css'; // Or your global styles


const initialTreeDataStructure = [
  {
    id: 'docs', name: 'Documents', icon: <FolderIcon className="h-4 w-4 text-blue-500" />, children: [ // Example custom icon styling
      { id: 'work', name: 'Work', children: [ // Default folder icon will be used
          { id: 'report', name: 'report.docx', icon: <FileIcon className="h-4 w-4 text-green-500" /> }, // Custom file icon
          { id: 'pres', name: 'presentation.pptx' }, // Default file icon
      ]},
      { id: 'research', name: 'Research Papers', children: [
          {id: 'paper1', name: 'AI_ethics.pdf'},
          {id: 'paper2', name: 'quantum_computing_intro.pdf'}
      ]},
      { id: 'projX', name: 'Project X (Empty, No Chevron)', children: []}, // Will use default folder icon
      { id: 'projY', name: 'Project Y (Files only, No Chevron if files hidden)', children: [
        {id: 'notesY', name: 'notes.txt'}
      ]},
    ],
  },
  { id: 'pics', name: 'Pictures (Custom Icon)', icon: <Star className="h-4 w-4 text-yellow-500" />, children: [ /* No files here means 0 files */ ] },
  { id: 'vids', name: 'Videos', children: [
      {id: 'vid1', name: 'tutorial.mp4'},
  ]},
  { id: 'misc', name: 'Miscellaneous (Empty)', children: [] },
];



// MOCK ASYNC API CALLS (replace with your actual logic)
const mockApi = {
  renameFolder: async (id, newName) => {
    console.log(`API: Renaming folder ${id} to ${newName}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    if (newName.toLowerCase().includes("fail")) return false; // Simulate failure
    return true;
  },
  deleteFolder: async (id) => {
    console.log(`API: Deleting folder ${id}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    // if (id === 'some_protected_id') return false; // Simulate failure
    return true;
  },
  addFolder: async (parentId, name, proposedId) => {
    console.log(`API: Adding folder "${name}" to parent ${parentId} (proposed ID: ${proposedId})`);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (name.toLowerCase().includes("fail")) return { success: false };
    const backendGeneratedId = `server-${Date.now()}`; // Simulate backend generating an ID
    return { success: true, finalId: backendGeneratedId }; 
    // return { success: true }; // If backend doesn't return an ID, proposedId from App.jsx will be used
  }
};


function App() {
  const [treeData, setTreeData] = useState(initialTreeDataStructure);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [lastAction, setLastAction] = useState('');
  const [configShowFiles, setConfigShowFiles] = useState(true);
  const [configEnableEditing, setConfigEnableEditing] = useState(true);

  const handleNodeSelect = useCallback((id, node) => { /* ... as before ... */
    setSelectedItemId(id); 
    if (id && node && isFolder(node)) setLastAction(`Selected folder: ${node.name} (ID: ${id})`);
    else if (id && node && !isFolder(node)) setLastAction(`Selected file: ${node.name} (ID: ${id})`);
    else if (!id) setLastAction('Item deselected.');
  }, []);

  const handleEditCommit = useCallback(async (id, newName, oldName) => {
    setLastAction(`Attempting to rename "${oldName}" to "${newName}"...`);
    const success = await mockApi.renameFolder(id, newName); // Call your external function
    if (success) {
      setTreeData(currentData => utilRenameNode(currentData, id, newName));
      setLastAction(`Renamed: "${oldName}" to "${newName}" (ID: ${id})`);
      return true;
    } else {
      setLastAction(`Failed to rename "${oldName}".`);
      alert(`Failed to rename folder "${oldName}". Name might be invalid or an error occurred.`);
      return false;
    }
  }, []);

  const handleDeleteCommit = useCallback(async (id, name) => {
    setLastAction(`Attempting to delete "${name}"...`);
    const success = await mockApi.deleteFolder(id); // Call your external function
    if (success) {
      setTreeData(currentData => utilDeleteNode(currentData, id));
      setLastAction(`Deleted: "${name}" (ID: ${id})`);
      if (selectedItemId === id) setSelectedItemId(null);
      return true;
    } else {
      setLastAction(`Failed to delete "${name}".`);
      alert(`Failed to delete folder "${name}".`);
      return false;
    }
  }, [selectedItemId]);

  const handleAddCommit = useCallback(async (parentId, newName, proposedIdByTreeView, pathArray) => {
    setLastAction(`Attempting to add folder "${newName}"...`);
    // Pass proposedIdByTreeView to your API if it can use it, or it might ignore it
    const result = await mockApi.addFolder(parentId, newName, proposedIdByTreeView); 

    if (result && result.success) {
      const finalId = result.finalId || proposedIdByTreeView; // Use backend ID if provided, else fallback
      const newNodeData = {
        id: finalId,
        name: newName,
        children: [], 
        // icon: <FolderIcon className="h-4 w-4" /> // Default icon handled by TreeItem
      };
      setTreeData(currentData => utilAddNode(currentData, parentId, newNodeData));
      const pathString = pathArray.join(' / ');
      setLastAction(`Added: "${newName}" (ID: ${finalId}) at path: "${pathString}"`);
      return { success: true, finalId: finalId }; // Inform TreeView of success and final ID
    } else {
      setLastAction(`Failed to add folder "${newName}".`);
      alert(`Failed to add folder "${newName}". Name might be invalid or an error occurred.`);
      return { success: false };
    }
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto font-sans">
      <h1 className="text-2xl font-semibold mb-6 text-center text-primary">
        Externally Validated Tree View
      </h1>
      {/* ... Configuration and Last Action Log JSX as before ... */}
      <div className="mb-6 p-4 border rounded-md bg-card space-y-3">
        <h2 className="text-lg font-medium">Configuration</h2>
        <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="form-checkbox" checked={configEnableEditing} onChange={(e) => setConfigEnableEditing(e.target.checked)} />
                <span>Enable Editing</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="form-checkbox" checked={configShowFiles} onChange={(e) => setConfigShowFiles(e.target.checked)} />
                <span>Show Files in Tree</span>
            </label>
        </div>
      </div>
      
      <div className="bg-background p-1 sm:p-2 rounded-lg border shadow-sm">
        <TreeView 
          data={treeData} 
          initialSelectedId={selectedItemId}
          onNodeSelect={handleNodeSelect}
          onNodeEditCommit={handleEditCommit}
          onNodeDeleteCommit={handleDeleteCommit}
          onNodeAddCommit={handleAddCommit}
          className="text-sm"
          enableEditing={configEnableEditing}
          showFiles={configShowFiles}
          allowRootFolderAdd={true}
        />
      </div>

      <div className="mt-6 p-4 bg-secondary rounded-md text-secondary-foreground text-sm min-h-[80px]">
        <h3 className="font-semibold text-base mb-1">Last Action Log:</h3>
        {lastAction ? <p>{lastAction}</p> : <p>Perform an action in the tree.</p>}
        {selectedItemId && <p className="mt-1">Currently selected item ID: <strong>{selectedItemId}</strong></p>}
      </div>
    </div>
  );
}

export default App;