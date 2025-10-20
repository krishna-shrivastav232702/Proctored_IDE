"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Code,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileNode[];
  isExpanded?: boolean;
  content?: string;
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  onFileCreate: (
    parentPath: string,
    name: string,
    type: "file" | "folder"
  ) => void;
  onFileRename: (file: FileNode, newName: string) => void;
  onFileDelete: (file: FileNode) => void;
  selectedFile?: string;
  className?: string;
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return <Code className="w-4 h-4 text-yellow-400" />;
    case "html":
      return <FileText className="w-4 h-4 text-orange-400" />;
    case "css":
    case "scss":
    case "sass":
      return <FileText className="w-4 h-4 text-blue-400" />;
    case "json":
      return <Settings className="w-4 h-4 text-green-400" />;
    case "md":
      return <FileText className="w-4 h-4 text-gray-400" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return <FileText className="w-4 h-4 text-purple-400" />;
    default:
      return <File className="w-4 h-4 text-slate-400" />;
  }
};

const FileTreeItem: React.FC<{
  node: FileNode;
  level: number;
  onSelect: (file: FileNode) => void;
  onToggle: (nodeId: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  selectedFile?: string;
}> = ({ node, level, onSelect, onToggle, onContextMenu, selectedFile }) => {
  const isSelected = selectedFile === node.path;

  const handleClick = () => {
    if (node.type === "folder") {
      onToggle(node.id);
    } else {
      onSelect(node);
    }
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center py-1 px-2 cursor-pointer group transition-colors duration-150",
          "hover:bg-[#2a2d2e]",
          isSelected && "bg-[#37373d] border-l-2 border-l-blue-500"
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {node.type === "folder" ? (
          <>
            {node.isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-400 mr-2 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-blue-400 mr-2 flex-shrink-0" />
            )}
          </>
        ) : (
          <div className="mr-2 flex-shrink-0">{getFileIcon(node.name)}</div>
        )}

        <span
          className={cn(
            "text-sm truncate",
            isSelected ? "text-white font-medium" : "text-slate-300",
            "group-hover:text-white"
          )}
        >
          {node.name}
        </span>
      </div>

      {node.type === "folder" && node.isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ContextMenu: React.FC<{
  isOpen: boolean;
  position: { x: number; y: number };
  node: FileNode | null;
  onClose: () => void;
  onAction: (action: string, node: FileNode) => void;
}> = ({ isOpen, position, node, onClose, onAction }) => {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !node) return null;

  return (
    <div
      className="fixed z-50 bg-[#383838] border border-[#454545] rounded-md shadow-lg py-1 min-w-[160px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {node.type === "folder" && (
        <>
          <button
            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-[#2a2d2e] hover:text-white flex items-center gap-2"
            onClick={() => onAction("newFile", node)}
          >
            <File className="w-4 h-4" />
            New File
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-[#2a2d2e] hover:text-white flex items-center gap-2"
            onClick={() => onAction("newFolder", node)}
          >
            <Folder className="w-4 h-4" />
            New Folder
          </button>
          <div className="h-px bg-[#454545] my-1" />
        </>
      )}
      <button
        className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-[#2a2d2e] hover:text-white flex items-center gap-2"
        onClick={() => onAction("rename", node)}
      >
        <Edit3 className="w-4 h-4" />
        Rename
      </button>
      <button
        className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-[#2a2d2e] hover:text-red-400 flex items-center gap-2"
        onClick={() => onAction("delete", node)}
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  onFileCreate,
  onFileRename,
  onFileDelete,
  selectedFile,
  className,
}) => {
  const [fileTree, setFileTree] = useState<FileNode[]>(files);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    node: FileNode | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    node: null,
  });

  useEffect(() => {
    setFileTree(files);
  }, [files]);

  const toggleFolder = useCallback((nodeId: string) => {
    setFileTree((prev) => {
      const toggleNodeInTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((node) => {
          if (node.id === nodeId && node.type === "folder") {
            return { ...node, isExpanded: !node.isExpanded };
          }
          if (node.children) {
            return { ...node, children: toggleNodeInTree(node.children) };
          }
          return node;
        });
      };
      return toggleNodeInTree(prev);
    });
  }, []);

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      node,
    });
  };

  const handleContextAction = (action: string, node: FileNode) => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, node: null });

    switch (action) {
      case "newFile":
        onFileCreate(node.path, "newFile.txt", "file");
        break;
      case "newFolder":
        onFileCreate(node.path, "New Folder", "folder");
        break;
      case "rename":
        // For now, just trigger the onFileRename with a prompt
        const newName = prompt("Enter new name:", node.name);
        if (newName && newName.trim() && newName !== node.name) {
          onFileRename(node, newName.trim());
        }
        break;
      case "delete":
        onFileDelete(node);
        break;
    }
  };

  return (
    <div
      className={cn("h-full bg-[#252526] border-r border-[#3e3e42]", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#3e3e42]">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Explorer
        </span>
        <button
          className="p-1 rounded hover:bg-[#2a2d2e] text-slate-400 hover:text-white transition-colors"
          onClick={() => onFileCreate("", "newFile.txt", "file")}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-2">
          {fileTree.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
              level={0}
              onSelect={onFileSelect}
              onToggle={toggleFolder}
              onContextMenu={handleContextMenu}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        node={contextMenu.node}
        onClose={() =>
          setContextMenu({
            isOpen: false,
            position: { x: 0, y: 0 },
            node: null,
          })
        }
        onAction={handleContextAction}
      />
    </div>
  );
};

export default FileExplorer;
