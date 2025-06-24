import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const getAllDescendantFolderIds = (nodes, targetId) => {
  const resultIds = new Set();
  if (!Array.isArray(nodes) || nodes.length === 0 || !targetId) {
    return Array.from(resultIds);
  }

  const findStartNode = (currentNodes, id) => {
    for (const node of currentNodes) {
      if (node.id === id) return node;
      if (node.children && Array.isArray(node.children)) {
        const found = findStartNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const startNode = findStartNode(nodes, targetId);
  const q = []; 

  if (startNode) {
    q.push(startNode);
  }

  while (q.length > 0) {
    const current = q.shift();
    resultIds.add(current.id); 

    if (current.children && Array.isArray(current.children)) {
      current.children.forEach(childNode => q.push(childNode));
    }
  }
  return Array.from(resultIds);
};
