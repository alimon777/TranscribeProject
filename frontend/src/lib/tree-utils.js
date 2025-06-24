// lib/tree-utils.js
export const isFolder = (item) => item && typeof item === 'object' && item.hasOwnProperty('children');

export const countFilesRecursive = (folderItem) => {
  if (!isFolder(folderItem) || !folderItem.children) {
    return 0;
  }
  let count = 0;
  for (const child of folderItem.children) {
    if (!isFolder(child)) { // It's a file
      count++;
    } else { // It's a sub-folder
      count += countFilesRecursive(child);
    }
  }
  return count;
};

export const deleteNodeRecursiveById = (nodes, targetId) => {
  const newNodes = [];
  for (const node of nodes) {
    if (node.id === targetId) {
      continue;
    }
    const newNode = { ...node };
    if (isFolder(node) && node.children) {
      newNode.children = deleteNodeRecursiveById(node.children, targetId);
      // If after deleting, children array is empty, ensure it's still there for isFolder check
      if (!newNode.children) newNode.children = [];
    }
    newNodes.push(newNode);
  }
  return newNodes;
};

export const renameNodeRecursiveById = (nodes, targetId, newName) => {
  return nodes.map(node => {
    if (node.id === targetId) {
      return { ...node, name: newName };
    }
    if (isFolder(node) && node.children) {
      return { ...node, children: renameNodeRecursiveById(node.children, targetId, newName) };
    }
    return node;
  });
};

export const addNodeRecursive = (nodes, parentId, newNodeData) => {
  if (parentId === null) { // Add to root
    return [...nodes, newNodeData];
  }
  return nodes.map(node => {
    if (node.id === parentId) {
      if (!isFolder(node)) {
        console.error("Cannot add child to a non-folder item:", node);
        return node;
      }
      const newChildren = node.children ? [...node.children, newNodeData] : [newNodeData];
      return { ...node, children: newChildren };
    }
    if (isFolder(node) && node.children) {
      return { ...node, children: addNodeRecursive(node.children, parentId, newNodeData) };
    }
    return node;
  });
};

export const findNodeByIdRecursive = (nodes, targetId) => {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (isFolder(node) && node.children) {
      const found = findNodeByIdRecursive(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
};

export const getNodePath = (nodes, targetId, currentPath = []) => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return [...currentPath, node.name];
    }
    if (isFolder(node) && node.children) {
      const foundPath = getNodePath(node.children, targetId, [...currentPath, node.name]);
      if (foundPath) {
        return foundPath;
      }
    }
  }
  return null; // Target not found
};

export const hasSubFolders = (folderItem) => {
    if (!isFolder(folderItem) || !folderItem.children || folderItem.children.length === 0) {
      return false;
    }
    return folderItem.children.some(child => isFolder(child));
  };