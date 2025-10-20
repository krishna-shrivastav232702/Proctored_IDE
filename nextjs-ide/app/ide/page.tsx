"use client";

import React, { useState, useCallback, useEffect } from "react";
import { FileExplorer, type FileNode } from "../components/ui/FileExplorer";
import { TabbedEditor, type EditorTab } from "../components/ui/TabbedEditor";
import { Button } from "../components/ui/button_ide";
import AntiCheatProvider from "../components/ui/AntiCheatProvider";
import {
  languageTemplates,
  type LanguageTemplate,
} from "@/lib/language-templates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  HtmlLogo,
  ReactLogo,
  NextLogo,
  VueLogo,
  PythonLogo,
  AngularLogo,
} from "../components/ui/LanguageLogos";
import { Save, Send, Folder, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// Enhanced language templates with logos
const enhancedLanguageTemplates = {
  ...languageTemplates,
  htmlcssjs: { ...languageTemplates.htmlcssjs, logo: HtmlLogo },
  reactjs: { ...languageTemplates.reactjs, logo: ReactLogo },
  nextjs: { ...languageTemplates.nextjs, logo: NextLogo },
  vuejs: { ...languageTemplates.vuejs, logo: VueLogo },
  angular: { ...languageTemplates.angular, logo: AngularLogo },
  python: { ...languageTemplates.python, logo: PythonLogo },
};

interface MonacoIDEProps {
  participantId?: string;
  onSubmit?: (data: {
    participantId: string;
    language: string;
    files: Record<string, string>;
  }) => void;
}

export default function MonacoIDE({
  participantId = "123",
  onSubmit,
}: MonacoIDEProps) {
  type LanguageKey = keyof typeof enhancedLanguageTemplates;
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey | "">(
    ""
  );
  const [languageStarted, setLanguageStarted] = useState(false);

  const [currentTemplate, setCurrentTemplate] =
    useState<LanguageTemplate | null>(null);

  // File system state
  const [fileSystem, setFileSystem] = useState<FileNode[]>([]);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    const savedState = localStorage.getItem("vscode-ide-state");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setSelectedLanguage(state.selectedLanguage || "");
        setLanguageStarted(state.languageStarted || false);
        setFileSystem(state.fileSystem || []);
        setOpenTabs(state.openTabs || []);
        setActiveTabId(state.activeTabId || null);
        setFileContents(state.fileContents || {});
        if (state.selectedLanguage) {
          setCurrentTemplate(
            enhancedLanguageTemplates[
              state.selectedLanguage as keyof typeof enhancedLanguageTemplates
            ] || null
          );
        }
      } catch (error) {
        console.error("Failed to load saved state:", error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (languageStarted) {
      const state = {
        selectedLanguage,
        languageStarted,
        fileSystem,
        openTabs,
        activeTabId,
        fileContents,
      };
      localStorage.setItem("vscode-ide-state", JSON.stringify(state));
    }
  }, [
    selectedLanguage,
    languageStarted,
    fileSystem,
    openTabs,
    activeTabId,
    fileContents,
  ]);

  const convertTemplatesToFileSystem = (
    template: LanguageTemplate
  ): FileNode[] => {
    const nodes: FileNode[] = [];
    const pathMap = new Map<string, FileNode>();

    template.files.forEach((file) => {
      const pathParts = file.path.split("/");
      let currentPath = "";

      pathParts.forEach((part, partIndex) => {
        const isLast = partIndex === pathParts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!pathMap.has(currentPath)) {
          const node: FileNode = {
            id: `${template.name}-${currentPath}`,
            name: part,
            type: isLast ? "file" : "folder",
            path: currentPath,
            isExpanded: true,
            children: isLast ? undefined : [],
            content: isLast ? file.content : undefined,
          };

          pathMap.set(currentPath, node);

          if (partIndex === 0) {
            nodes.push(node);
          } else {
            const parentPath = pathParts.slice(0, partIndex).join("/");
            const parent = pathMap.get(parentPath);
            if (parent && parent.children) {
              parent.children.push(node);
            }
          }
        }
      });
    });

    return nodes;
  };

  const handleLanguageSelect = (language: string) => {
    const langKey = language as LanguageKey;
    setSelectedLanguage(langKey);
    const template = enhancedLanguageTemplates[langKey];
    setCurrentTemplate(template);

    const fileSystemNodes = convertTemplatesToFileSystem(template);
    setFileSystem(fileSystemNodes);

    const initialContents: Record<string, string> = {};
    template.files.forEach((file) => {
      initialContents[file.path] = file.content;
    });
    setFileContents(initialContents);

    // Open the first file by default
    if (template.files.length > 0) {
      const firstFile = template.files[0];
      const newTab: EditorTab = {
        id: firstFile.path,
        name: firstFile.name,
        path: firstFile.path,
        content: firstFile.content,
        language: firstFile.language,
      };
      setOpenTabs([newTab]);
      setActiveTabId(firstFile.path);
    }

    setLanguageStarted(true);
    setHasUnsavedChanges(false);
  };

  const handleFileSelect = useCallback(
    (file: FileNode) => {
      if (file.type === "folder") return;

      // Check if tab is already open
      const existingTab = openTabs.find((tab) => tab.path === file.path);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      // Get file language based on extension
      const extension = file.name.split(".").pop()?.toLowerCase();
      let language = "plaintext";
      switch (extension) {
        case "js":
        case "jsx":
          language = "javascript";
          break;
        case "ts":
        case "tsx":
          language = "typescript";
          break;
        case "html":
          language = "html";
          break;
        case "css":
          language = "css";
          break;
        case "json":
          language = "json";
          break;
        case "md":
          language = "markdown";
          break;
        case "py":
          language = "python";
          break;
        case "vue":
          language = "html";
          break;
      }

      // Create new tab
      const newTab: EditorTab = {
        id: file.path,
        name: file.name,
        path: file.path,
        content: fileContents[file.path] || file.content || "",
        language,
      };

      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    },
    [openTabs, fileContents]
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      setOpenTabs((prev) => {
        const newTabs = prev.filter((tab) => tab.id !== tabId);
        if (activeTabId === tabId && newTabs.length > 0) {
          setActiveTabId(newTabs[newTabs.length - 1].id);
        } else if (newTabs.length === 0) {
          setActiveTabId(null);
        }
        return newTabs;
      });
    },
    [activeTabId]
  );

  const handleContentChange = useCallback((tabId: string, content: string) => {
    setFileContents((prev) => ({
      ...prev,
      [tabId]: content,
    }));

    // Mark tab as dirty
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, isDirty: true, content } : tab
      )
    );

    setHasUnsavedChanges(true);
  }, []);

  const handleFileCreate = useCallback(
    (parentPath: string, name: string, type: "file" | "folder") => {
      const newPath = parentPath ? `${parentPath}/${name}` : name;
      const newNode: FileNode = {
        id: `new-${Date.now()}`,
        name,
        type,
        path: newPath,
        isExpanded: type === "folder",
        children: type === "folder" ? [] : undefined,
        content: type === "file" ? "" : undefined,
      };

      if (type === "file") {
        setFileContents((prev) => ({ ...prev, [newPath]: "" }));
      }

      // Add the new node to the file system tree
      setFileSystem((prev) => [...prev, newNode]);

      toast.success(`${type === "file" ? "File" : "Folder"} created: ${name}`);
    },
    []
  );

  const handleFileRename = useCallback((file: FileNode, newName: string) => {
    // TODO: Implement file rename
    toast.success(`Renamed to: ${newName}`);
  }, []);

  const handleFileDelete = useCallback((file: FileNode) => {
    // TODO: Implement file delete
    toast.success(`Deleted: ${file.name}`);
  }, []);

  const handleSave = () => {
    // Mark all tabs as saved
    setOpenTabs((prev) => prev.map((tab) => ({ ...tab, isDirty: false })));
    setHasUnsavedChanges(false);
    toast.success("All files saved successfully");
  };

  const handleSubmit = async () => {
    if (!currentTemplate) return;

    const submissionData = {
      participantId,
      language: currentTemplate.name,
      files: fileContents,
    };

    if (onSubmit) {
      onSubmit(submissionData);
    } else {
      console.log("Submission data:", submissionData);
      toast.success("Code submitted successfully");
    }
  };

  const handleResetIDE = () => {
    const hasContent =
      openTabs.length > 0 || Object.keys(fileContents).length > 0;
    const confirmMessage = hasContent
      ? "⚠️ Changing the language will reset your workspace and all unsaved changes will be lost. Are you sure you want to continue?"
      : "Are you sure you want to change the language/framework?";

    if (confirm(confirmMessage)) {
      // Clear all state
      setFileSystem([]);
      setOpenTabs([]);
      setActiveTabId(null);
      setFileContents({});
      setCurrentTemplate(null);
      setHasUnsavedChanges(false);
      setLanguageStarted(false);
      setSelectedLanguage("");

      // Remove saved state from localStorage
      localStorage.removeItem("vscode-ide-state");

      toast.success("Workspace reset successfully. Choose a new framework.");
    }
  };

  if (!languageStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5" />
        <div className="absolute inset-0 backdrop-blur-3xl" />

        <div className="relative w-full max-w-2xl mx-4">
          <div className="bg-[#252526]/90 backdrop-blur-xl border border-[#3e3e42] rounded-2xl p-8 shadow-2xl">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-2xl blur-xl opacity-40" />
                  <div className="relative p-5 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-2xl backdrop-blur-sm border border-blue-400/30">
                    <Folder className="w-14 h-14 text-blue-400" />
                  </div>
                </div>
              </div>

              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                  Choose Your Framework
                </h1>
                <p className="text-slate-400 text-base">
                  Select a programming language or framework to start coding
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <Select
                  onValueChange={handleLanguageSelect}
                  value={selectedLanguage}
                >
                  <SelectTrigger className="w-full h-16 text-lg bg-[#3c3c3c] border-[#3e3e42] hover:border-blue-400/50 transition-all duration-300 focus:ring-blue-400/20 focus:ring-2 text-slate-300">
                    <SelectValue placeholder="Select a language or framework..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#3c3c3c] border-[#3e3e42]">
                    {Object.values(enhancedLanguageTemplates).map(
                      (template) => {
                        const LogoComponent = template.logo;
                        return (
                          <SelectItem
                            key={template.name}
                            value={template.name}
                            className="text-lg py-4 text-slate-300 hover:bg-[#2a2d2e] focus:bg-[#2a2d2e] focus:text-blue-400 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              {LogoComponent && (
                                <LogoComponent className="w-5 h-5" />
                              )}
                              <span>{template.displayName}</span>
                            </div>
                          </SelectItem>
                        );
                      }
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AntiCheatProvider participantId={participantId}>
      <div className="h-screen flex flex-col bg-[#1e1e1e]">
        {/* Title Bar */}
        <header className="bg-[#3c3c3c] border-b border-[#3e3e42] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-lg border border-blue-400/30">
                {currentTemplate?.logo && (
                  <currentTemplate.logo className="w-5 h-5" />
                )}
              </div>
              <div>
                <span className="font-semibold text-slate-200 text-lg">
                  {currentTemplate?.displayName}
                </span>
                <span className="text-blue-400 ml-2">IDE</span>
              </div>
            </div>
            <div className="h-6 w-px bg-[#3e3e42]" />
            <span className="text-sm text-slate-400">
              ID: <span className="text-slate-300">{participantId}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-400 flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                Unsaved changes
              </span>
            )}
            <Button
              onClick={handleResetIDE}
              variant="outline"
              size="sm"
              className="gap-2 border-[#3e3e42] hover:border-red-400/50 hover:bg-red-400/10 text-slate-300 hover:text-red-400 transition-all duration-300"
              title="Change Language/Framework"
            >
              <RotateCcw className="w-4 h-4" />
              Reset IDE
            </Button>
            <Button
              onClick={handleSave}
              variant="outline"
              size="sm"
              className="gap-2 border-[#3e3e42] hover:border-blue-400/50 hover:bg-blue-400/10 text-slate-300 hover:text-blue-400 transition-all duration-300"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button
              onClick={handleSubmit}
              size="sm"
              className="gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/20 transition-all duration-300"
            >
              <Send className="w-4 h-4" />
              Submit
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer Sidebar */}
          <FileExplorer
            files={fileSystem}
            onFileSelect={handleFileSelect}
            onFileCreate={handleFileCreate}
            onFileRename={handleFileRename}
            onFileDelete={handleFileDelete}
            selectedFile={activeTabId || undefined}
            className="w-80 flex-shrink-0"
          />

          {/* Editor Area */}
          <TabbedEditor
            tabs={openTabs}
            activeTabId={activeTabId}
            onTabSelect={setActiveTabId}
            onTabClose={handleTabClose}
            onContentChange={handleContentChange}
            className="flex-1"
          />
        </div>
      </div>
    </AntiCheatProvider>
  );
}
