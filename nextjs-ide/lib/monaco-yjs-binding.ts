import * as Y from 'yjs';
import * as monaco from 'monaco-editor';
import { Awareness } from 'y-protocols/awareness';

/**
 * Monaco-Yjs Binding
 * Connects Monaco Editor to Yjs for collaborative editing
 */
export class MonacoYjsBinding {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private ytext: Y.Text;
  private awareness: Awareness;
  private currentUserId: string;
  
  private isApplyingRemoteUpdate = false;
  private disposables: monaco.IDisposable[] = [];

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor, 
    ytext: Y.Text,
    awareness: Awareness,
    userId: string
  ) {
    this.editor = editor;
    this.ytext = ytext;
    this.awareness = awareness;
    this.currentUserId = userId;

    // Initialize awareness data
    this.awareness.setLocalStateField('user', {
      id: userId,
      color: this.generateUserColor(userId),
    });

    // Listen for Yjs changes and apply to Monaco
    const ytextObserver = (event: Y.YTextEvent) => {
      if (!this.isApplyingRemoteUpdate) {
        this.applyYjsUpdateToMonaco(event);
      }
    };
    this.ytext.observe(ytextObserver);

    // Listen for Monaco changes and apply to Yjs
    const contentChangeDisposable = this.editor.onDidChangeModelContent((event) => {
      this.applyMonacoChangeToYjs(event);
    });
    this.disposables.push(contentChangeDisposable);

    // Sync cursor position
    const cursorChangeDisposable = this.editor.onDidChangeCursorPosition((e) => {
      this.updateCursorPosition(e.position);
    });
    this.disposables.push(cursorChangeDisposable);

    // Sync selection
    const selectionChangeDisposable = this.editor.onDidChangeCursorSelection((e) => {
      this.updateSelection(e.selection);
    });
    this.disposables.push(selectionChangeDisposable);

    // Initialize Monaco with current Yjs content
    this.syncToMonaco();
  }

  /**
   * Generate a consistent color for a user based on their ID
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', 
      '#98d8c8', '#f7dc6f', '#bb8fce', '#f1948a',
      '#85c1e2', '#f4d03f', '#52be80', '#eb984e'
    ];
    const hash = userId.split('').reduce((acc, char) => 
      char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Apply Yjs updates to Monaco Editor
   */
  private applyYjsUpdateToMonaco(event: Y.YTextEvent) {
    this.isApplyingRemoteUpdate = true;
    
    try {
      const model = this.editor.getModel();
      if (!model) return;

      // Get current content from Yjs
      const yjsContent = this.ytext.toString();
      const modelContent = model.getValue();
      
      // Simple sync - replace entire content if different
      // A more sophisticated implementation would track deltas
      if (yjsContent !== modelContent) {
        // Get current cursor position to restore it
        const position = this.editor.getPosition();
        
        // Update content
        model.setValue(yjsContent);
        
        // Try to restore cursor position
        if (position) {
          this.editor.setPosition(position);
        }
      }
    } finally {
      this.isApplyingRemoteUpdate = false;
    }
  }

  /**
   * Apply Monaco changes to Yjs
   */
  private applyMonacoChangeToYjs(event: monaco.editor.IModelContentChangedEvent) {
    if (this.isApplyingRemoteUpdate) return;

    // Get new content from Monaco
    const model = this.editor.getModel();
    if (!model) return;

    const newContent = model.getValue();
    const oldContent = this.ytext.toString();

    // Only update if content changed
    if (newContent !== oldContent) {
      // Delete all and insert new content
      // This is simple but works for most cases
      this.ytext.delete(0, this.ytext.length);
      this.ytext.insert(0, newContent);
    }
  }

  /**
   * Sync current Yjs content to Monaco
   */
  private syncToMonaco() {
    const content = this.ytext.toString();
    const model = this.editor.getModel();
    if (model && model.getValue() !== content) {
      model.setValue(content);
    }
  }

  /**
   * Update cursor position in awareness
   */
  private updateCursorPosition(position: monaco.Position) {
    const currentState = this.awareness.getLocalState();
    this.awareness.setLocalStateField('cursor', {
      line: position.lineNumber,
      column: position.column - 1, // Monaco is 1-based, Yjs is 0-based
    });
  }

  /**
   * Update selection in awareness
   */
  private updateSelection(selection: monaco.Selection) {
    const currentState = this.awareness.getLocalState();
    this.awareness.setLocalStateField('selection', {
      start: {
        line: selection.startLineNumber,
        column: selection.startColumn - 1,
      },
      end: {
        line: selection.endLineNumber,
        column: selection.endColumn - 1,
      },
    });
  }

  /**
   * Get awareness data for all users
   */
  getAwarenessData(): Map<number, any> {
    return this.awareness.getStates();
  }

  /**
   * Destroy the binding
   */
  destroy() {
    // Cleanup disposables
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    
    // Clear awareness state
    this.awareness.setLocalState(null);
  }
}