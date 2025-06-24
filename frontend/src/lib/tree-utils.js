// Is this item a “folder”?
export const isFolder = (item) =>
  item && typeof item === 'object' && Array.isArray(item.children);

// Count files under a folder (recursive)
export const countFilesRecursive = (folderItem) => {
  if (!isFolder(folderItem) || !folderItem.children) return 0;
  let count = 0;
  for (const child of folderItem.children) {
    if (isFolder(child)) count += countFilesRecursive(child);
    else count++;
  }
  return count;
};

// Delete a node by id (recursive)
export const deleteNodeRecursiveById = (nodes, targetId) => {
  const out = [];
  for (const node of nodes) {
    if (node.id === targetId) continue;
    const clone = { ...node };
    if (isFolder(node)) {
      clone.children = deleteNodeRecursiveById(node.children, targetId);
    }
    out.push(clone);
  }
  return out;
};

// Rename a node by id (recursive)
export const renameNodeRecursiveById = (nodes, targetId, newName) => {
  return nodes.map(node => {
    if (node.id === targetId) return { ...node, name: newName };
    if (isFolder(node)) {
      return { ...node, children: renameNodeRecursiveById(node.children, targetId, newName) };
    }
    return node;
  });
};

// Add a new node under parentId (null → root)
export const addNodeRecursive = (nodes, parentId, newNodeData) => {
  if (parentId === null) {
    return [...nodes, newNodeData];
  }
  return nodes.map(node => {
    if (node.id === parentId && isFolder(node)) {
      return { ...node, children: [...node.children, newNodeData] };
    }
    if (isFolder(node)) {
      return { ...node, children: addNodeRecursive(node.children, parentId, newNodeData) };
    }
    return node;
  });
};

// Find a node by id (recursive)
export const findNodeByIdRecursive = (nodes, targetId) => {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (isFolder(node)) {
      const found = findNodeByIdRecursive(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
};

// Get the path (array of names) to a node
export const getNodePath = (nodes, targetId, currentPath = []) => {
  for (const node of nodes) {
    const path = [...currentPath, node.name];
    if (node.id === targetId) return path;
    if (isFolder(node)) {
      const childPath = getNodePath(node.children, targetId, path);
      if (childPath) return childPath;
    }
  }
  return null;
};

// Does this folder contain any sub‐folders?
export const hasSubFolders = (folderItem) =>
  isFolder(folderItem) && folderItem.children.some(child => isFolder(child));

// Convert a flat mockFolders[] → nested [{id,name,children},…]
export const flatToNested = (folders) => {
  const map = new Map();
  folders.forEach(f => map.set(f.id, { id: f.id, name: f.name, children: [] }));
  const roots = [];
  folders.forEach(f => {
    const node = map.get(f.id);
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};