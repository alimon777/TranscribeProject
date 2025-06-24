// src/lib/tree-utils.js

export const isFolder = (item) => {
  return item.type !== 'file' && (item.children !== undefined || item.parent_id !== undefined);
};

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

export const renameNodeRecursiveById = (nodes, targetId, newName) => {
  return nodes.map(node => {
    if (node.id === targetId) return { ...node, name: newName };
    if (isFolder(node)) {
      return { ...node, children: renameNodeRecursiveById(node.children, targetId, newName) };
    }
    return node;
  });
};

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

export const hasSubFolders = (folderItem) =>
  isFolder(folderItem) && folderItem.children.some(child => isFolder(child));

export const flatToNested = (folders) => {
  const map = new Map();
  folders.forEach(f => map.set(f.id, { id: f.id, name: f.name, parent_id: f.parent_id, count: f.count, children: [] }));
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