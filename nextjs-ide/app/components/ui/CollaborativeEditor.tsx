"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { X, File, Code, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Editor, { useMonaco } from "@monaco-editor/react";
import { MonacoYjsBinding } from "@/lib/monaco-yjs-binding";
import { useCollaborativeEditor } from "@/hooks/useCollaborativeEditor";
import { useIdeStore } from "@/store/store";
import * as Y from "yjs";

export interface EditorTab {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirty?: boolean;
}

interface CollaborativeEditorProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onContentChange: (tabId: string, content: string) => void;
  className?: string;
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return <Code className="w-3 h-3 text-yellow-400" />;
    case "html":
      return <FileText className="w-3 h-3 text-orange-400" />;
    case "css":
    case "scss":
    case "sass":
      return <FileText className="w-3 h-3 text-blue-400" />;
    case "json":
      return <Settings className="w-3 h-3 text-green-400" />;
    case "md":
      return <FileText className="w-3 h-3 text-gray-400" />;
    default:
      return <File className="w-3 h-3 text-slate-400" />;
  }
};

const EditorTab: React.FC<{
  tab: EditorTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
}> = ({ tab, isActive, onSelect, onClose }) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 border-r border-[#3e3e42] cursor-pointer group relative",
        "hover:bg-[#2a2d2e] transition-colors duration-150",
        isActive
          ? "bg-[#1e1e1e] text-white border-t-2 border-t-blue-500"
          : "bg-[#2d2d30] text-slate-300"
      )}
      onClick={onSelect}
    >
      {getFileIcon(tab.name)}
      <span className="text-sm truncate max-w-[120px]">
        {tab.name}
        {tab.isDirty && <span className="ml-1 text-orange-400">•</span>}
      </span>
      <button
        className={cn(
          "ml-1 p-0.5 rounded hover:bg-[#404040] transition-colors",
          "opacity-0 group-hover:opacity-100",
          isActive && "opacity-100"
        )}
        onClick={onClose}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onContentChange,
  className,
}) => {
  const [editorContent, setEditorContent] = useState<Record<string, string>>({});
  const editorRefs = useRef<Record<string, any>>({});
  const bindingRefs = useRef<Record<string, MonacoYjsBinding | null>>({});
  const monaco = useMonaco();
  const { user } = useIdeStore();

  // Get Yjs document per file
  const { ydoc, awareness } = useCollaborativeEditor("main");
  const ytextsRef = useRef<Record<string, Y.Text>>({});

  // Initialize Yjs text for each tab
  useEffect(() => {
    if (!ydoc) return;

    tabs.forEach((tab) => {
      if (!ytextsRef.current[tab.id]) {
        const ytext = ydoc.getText(`file-${tab.id}`);
        ytextsRef.current[tab.id] = ytext;

        // Sync initial content from tab to Yjs (only if Yjs is empty)
        if (tab.content && ytext.toString().length === 0) {
          ytext.insert(0, tab.content);
        }
      }
    });
  }, [ydoc, tabs]);

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#0f172a"
        }
      });
      monaco.editor.setTheme("custom-dark");
    }
  }, [monaco]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Handle editor mounting - create MonacoYjsBinding
  const handleEditorDidMount = useCallback(
    (editor: any, monacoInstance: any) => {
      if (!activeTab || !user) return;

      editorRefs.current[activeTab.id] = editor;

      // Create or get Yjs text for this file
      if (ydoc && ytextsRef.current[activeTab.id] && awareness) {
        const ytext = ytextsRef.current[activeTab.id];
        const userId = user.id || "anonymous";
        
        // Destroy old binding if exists
        if (bindingRefs.current[activeTab.id]) {
          bindingRefs.current[activeTab.id]?.destroy();
        }
        
        const binding = new MonacoYjsBinding(editor, ytext, awareness, userId);
        bindingRefs.current[activeTab.id] = binding;

        // Update local state when Yjs changes
        ytext.observe(() => {
          const content = ytext.toString();
          setEditorContent(prev => ({ ...prev, [activeTab.id]: content }));
          onContentChange(activeTab.id, content);
        });
      }
    },
    [activeTab, ydoc, awareness, onContentChange, user]
  );

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    
    // Cleanup binding for this tab
    if (bindingRefs.current[tabId]) {
      bindingRefs.current[tabId]?.destroy();
      delete bindingRefs.current[tabId];
    }
    
    // Cleanup editor ref
    delete editorRefs.current[tabId];
    
    onTabClose(tabId);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(bindingRefs.current).forEach(binding => {
        binding?.destroy();
      });
      bindingRefs.current = {};
    };
  }, []);

  if (tabs.length === 0) {
    return (
      <div
        className={cn(
          "flex-1 flex items-center justify-center bg-[#1e1e1e]",
          className
        )}
      >
        <div className="text-center text-slate-400">
          <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No files open</p>
          <p className="text-sm">
            Open a file from the explorer to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex flex-col bg-[#1e1e1e]", className)}>
      {/* Tab Bar */}
      <div className="flex bg-[#2d2d30] border-b border-[#3e3e42] overflow-x-auto">
        {tabs.map((tab) => (
          <EditorTab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => onTabSelect(tab.id)}
            onClose={(e) => handleTabClose(e, tab.id)}
          />
        ))}
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative">
        {activeTab && (
          <Editor
            key={activeTab.id}
            height="100%"
            language={activeTab.language}
            defaultValue={activeTab.content}
            onMount={handleEditorDidMount}
            theme="custom-dark"
            options={{
              readOnly: false,
              contextmenu: false,
              copyWithSyntaxHighlighting: false,
              fontSize: 14,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              lineNumbers: "on",
              renderWhitespace: "selection",
              bracketPairColorization: { enabled: true },
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              smoothScrolling: true,
              scrollbar: {
                vertical: "auto",
                horizontal: "auto",
                verticalScrollbarSize: 14,
                horizontalScrollbarSize: 14,
              },
              padding: { top: 16 },
              hover: {
                enabled: false,
                delay: 0,
                sticky: false,
              },
              links: false,
              colorDecorators: false,
              suggest: { preview: true },
              quickSuggestions: true,
              parameterHints: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
              occurrencesHighlight: "off",
              renderLineHighlight: "line",
              renderLineHighlightOnlyWhenFocus: true,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CollaborativeEditor;