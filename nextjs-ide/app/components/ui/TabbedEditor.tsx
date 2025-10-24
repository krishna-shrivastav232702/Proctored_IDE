"use client";

import React, { useState, useCallback, useEffect } from "react";
import { X, File, Code, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Editor, { useMonaco } from "@monaco-editor/react";

export interface EditorTab {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirty?: boolean;
}

interface TabbedEditorProps {
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

export const TabbedEditor: React.FC<TabbedEditorProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onContentChange,
  className,
}) => {
  const [editorContent, setEditorContent] = useState<Record<string, string>>(
    {}
  );
  const monaco = useMonaco();
  useEffect(() => {
    if(monaco){
      monaco.editor.defineTheme('custom-dark',{
        base:'vs-dark',
        inherit:true,
        rules:[],
        colors:{
          "editor.background":"#0f172a"
        }
      })
      monaco.editor.setTheme("custom-dark");
    }
  },[monaco]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const handleEditorChange = useCallback(
    (value: string | undefined, tabId: string) => {
      if (value !== undefined) {
        setEditorContent((prev) => ({ ...prev, [tabId]: value }));
        onContentChange(tabId, value);
      }
    },
    [onContentChange]
  );

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

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
            height="100%"
            language={activeTab.language}
            value={editorContent[activeTab.id] ?? activeTab.content}
            onChange={(value) => handleEditorChange(value || "", activeTab.id)}
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
              // Disable all hover features and tooltips
              hover: {
                enabled: false,
                delay: 0,
                sticky: false,
              },
              // Disable links and go-to-definition on hover
              links: false,
              // Disable color decorators
              colorDecorators: false,
              // Keep autocomplete and suggestions enabled
              suggest: { preview: true },
              quickSuggestions: true,
              parameterHints: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
              // Disable additional tooltip-like features
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

export default TabbedEditor;
