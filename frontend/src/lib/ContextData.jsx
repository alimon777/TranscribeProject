import React, { createContext, useState } from "react";

const ContextData = createContext();

export const ContextProvider = ({ children }) => {
    const [treeData, setTreeData] = useState([]);

    const updateFolderTree = async (data) =>{
        setTreeData(data)
        console.log("Tree data is updated!")
    }

    return (
      <ContextData.Provider
        value={{
            treeData,
            updateFolderTree,
        }}
      >
        {children}
      </ContextData.Provider>
    );
  };
  
export { ContextData };