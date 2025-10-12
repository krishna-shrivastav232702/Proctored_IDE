"use client";

import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import AntiCheatProvider from "../components/ui/AntiCheatProvider";
import {
  languageTemplates,
  type LanguageTemplate,
  type FileTemplate,
} from "@/lib/language-templates";
import { Button } from "../components/ui/button_ide";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Save, Send, FileCode, Folder } from "lucide-react";
import { toast } from "sonner";

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
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [languageStarted, setLanguageStarted] = useState(false);
  const [currentTemplate, setCurrentTemplate] =
    useState<LanguageTemplate | null>(null);
  const [activeFile, setActiveFile] = useState<string>("");
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    const template = languageTemplates[language];
    setCurrentTemplate(template);

    const initialContents: Record<string, string> = {};
    template.files.forEach((file) => {
      initialContents[file.path] = file.content;
    });
    setFileContents(initialContents);
    setActiveFile(template.files[0].path);
    setLanguageStarted(true);
    setHasUnsavedChanges(false);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && activeFile) {
      setFileContents((prev) => ({
        ...prev,
        [activeFile]: value,
      }));
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = () => {
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

  const getCurrentFile = (): FileTemplate | undefined => {
    return currentTemplate?.files.find((f) => f.path === activeFile);
  };

  if (!languageStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-purple-500/10" />
        <div className="absolute inset-0 backdrop-blur-3xl" />

        <div className="relative w-full max-w-2xl mx-4">
          <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl blur-xl opacity-40" />
                  <div className="relative p-5 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-2xl backdrop-blur-sm border border-emerald-400/30">
                    <FileCode className="w-14 h-14 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent mb-3">
                  Choose Your Environment
                </h1>
                <p className="text-slate-400 text-base">
                  Select a programming language to start coding
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <Select
                  onValueChange={handleLanguageSelect}
                  value={selectedLanguage}
                >
                  <SelectTrigger className="w-full h-16 text-lg bg-slate-800/50 border-slate-700/50 hover:border-emerald-400/50 transition-all duration-300 focus:ring-emerald-400/20 focus:ring-2 text-slate-300">
                    <SelectValue placeholder="Select a language..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.values(languageTemplates).map((template) => (
                      <SelectItem
                        key={template.name}
                        value={template.name}
                        className="text-lg py-4 text-slate-300 hover:bg-slate-700 focus:bg-slate-700 focus:text-emerald-400"
                      >
                        {template.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* <div className="pt-8 grid grid-cols-2 gap-6 text-sm">
                <div className="text-left space-y-3 p-6 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <p className="font-semibold text-cyan-400 text-base">
                    Web Development
                  </p>
                  <ul className="space-y-2 text-slate-400">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      HTML/CSS/JS
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      Next.js
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      React.js
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      Vue.js
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      Angular
                    </li>
                  </ul>
                </div>
                <div className="text-left space-y-3 p-6 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <p className="font-semibold text-cyan-400 text-base">
                    Backend
                  </p>
                  <ul className="space-y-2 text-slate-400">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      Python
                    </li>
                  </ul>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AntiCheatProvider participantId={participantId}>
      <div className="h-screen flex flex-col bg-[#0f172a]">
        <header className="bg-[#1e293b] border-b border-slate-700/50 px-6 py-4 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-lg border border-emerald-400/30">
                <Folder className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="font-semibold text-slate-300 text-lg">
                  {currentTemplate?.displayName}
                </span>
                <span className="text-cyan-400 ml-2">IDE</span>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-600/50" />
            <span className="text-sm text-slate-400">
              ID: <span className="text-slate-300">{participantId}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-xs text-pink-400 flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 rounded-lg border border-pink-500/20">
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
                Unsaved changes
              </span>
            )}
            <Button
              onClick={handleSave}
              variant="outline"
              size="sm"
              className="gap-2 border-slate-600 hover:border-emerald-400/50 hover:bg-emerald-400/10 text-slate-300 hover:text-emerald-400 transition-all duration-300"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button
              onClick={handleSubmit}
              size="sm"
              className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300"
            >
              <Send className="w-4 h-4" />
              Submit
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-72 bg-[#1e293b] border-r border-slate-700/50 flex flex-col">
            <div className="p-4 border-b border-slate-700/50">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                Project Files
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-1.5">
                {currentTemplate?.files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setActiveFile(file.path)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                      activeFile === file.path
                        ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-400/30 shadow-lg shadow-emerald-500/10"
                        : "text-slate-300 hover:bg-slate-800/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileCode
                        className={`w-4 h-4 flex-shrink-0 ${
                          activeFile === file.path
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      />
                      <span className="truncate font-medium">{file.path}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
              <div className="text-xs text-slate-400 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Files</span>
                  <span className="text-cyan-400 font-semibold">
                    {currentTemplate?.files.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Language</span>
                  <span className="text-emerald-400 font-semibold">
                    {currentTemplate?.displayName}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1 flex flex-col">
            <div className="bg-[#1e293b] border-b border-slate-700/50">
              <Tabs
                value={activeFile}
                onValueChange={setActiveFile}
                className="w-full"
              >
                <TabsList className="w-full justify-start rounded-none bg-transparent h-auto p-0 border-0">
                  {currentTemplate?.files.map((file) => (
                    <TabsTrigger
                      key={file.path}
                      value={file.path}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:bg-[#0f172a] bg-transparent px-6 py-3.5 text-slate-400 data-[state=active]:text-emerald-400 hover:text-slate-300 transition-colors duration-200"
                    >
                      <span className="text-sm font-medium">{file.name}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-hidden bg-[#0f172a]">
              <Editor
                height="100%"
                language={getCurrentFile()?.language || "javascript"}
                value={fileContents[activeFile] || ""}
                onChange={handleEditorChange}
                theme="vs-dark"
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
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  smoothScrolling: true,
                }}
              />
            </div>
          </main>
        </div>
      </div>
    </AntiCheatProvider>
  );
}
