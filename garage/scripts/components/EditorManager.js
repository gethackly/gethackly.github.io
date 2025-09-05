// EditorManager.js - Handles Monaco editor operations and management

class EditorManager {
    constructor() {
        this.monacoReadyPromise = null;
        this.editorByBranchId = new Map();
        this.dataService = null;
    }

    setDataService(dataService) {
        this.dataService = dataService;
    }

    // Monaco loading
    loadMonaco() {

        if (window.monaco) {

            return Promise.resolve(window.monaco);
        }
        
        if (this.monacoReadyPromise) {

            return this.monacoReadyPromise;
        }

        this.monacoReadyPromise = new Promise((resolve, reject) => {
            function configureAndLoad() {

                try {
                    window.require.config({ 
                        paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } 
                    });
                    window.require(['vs/editor/editor.main'], () => {

                        resolve(window.monaco);
                    });
                } catch (err) {
                    console.error('❌ EditorManager: Error configuring Monaco:', err);
                    reject(err);
                }
            }
            
            if (typeof window.require === 'undefined') {

                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
                script.onload = configureAndLoad;
                script.onerror = (err) => {
                    console.error('❌ EditorManager: Failed to load Monaco loader script:', err);
                    reject(err);
                };
                document.head.appendChild(script);
            } else {
                configureAndLoad();
            }
        });
        
        return this.monacoReadyPromise;
    }

    // Editor management
    async ensureEditorForBranch(branchId, promptData) {

        const existing = this.editorByBranchId.get(branchId);
        const host = document.getElementById(`editor-${branchId}`);
        
        if (!host) {
            console.warn(`❌ EditorManager: No host element found for branch ${branchId}`);
            return;
        }
        
        if (existing) {
            // Verify the existing editor is still attached to the current host; if not, recreate
            try {
                const ed = existing.isDiffEditor && existing.editor ? existing.editor : existing;
                const node = ed && ed.getDomNode ? ed.getDomNode() : null;
                const isAttached = Boolean(node && node.isConnected && node.parentElement === host);
                if (!isAttached) {
                    // Old DOM was re-rendered; dispose stale editor and recreate below
                    this.disposeEditor(branchId);
                } else {
                    if (existing.layout) {
                        existing.layout();
                    }
                    return;
                }
            } catch (_) {
                // On any error determining attachment, dispose and recreate
                this.disposeEditor(branchId);
            }
        }

        let monaco, content = '';

        // Ensure we have prompt data if possible
        try {
            if (!promptData) {
                // Try to get from cache first
                if (this.dataService && typeof this.dataService.getCachedPrompts === 'function') {
                    const cached = (this.dataService.getCachedPrompts() || []).find(p => p && p.id === branchId);
                    if (cached) {
                        promptData = cached;
                    }
                }
            }
        } catch (_) {}
        
        // For blank prompts, don't fetch content from database
        if (branchId === 'blank') {

            try {
                monaco = await this.loadMonaco();

            } catch (err) {
                console.error(`❌ EditorManager: Failed to load Monaco for blank prompt:`, err);
                return;
            }
        } else {
            // For existing branches, fetch content
            try {
                [monaco, content] = await Promise.all([
                    this.loadMonaco(),
                    this.fetchBranchContent(branchId)
                ]);

            } catch (err) {
                console.error(`❌ EditorManager: Failed to load Monaco or content for branch ${branchId}:`, err);
                return;
            }
        }
        
        // Decide editor type:
        // - While writing (blank or no parent): regular editor
        // - After approval (improvement with parent_id): show diff against parent content
        const isWritingState = branchId === 'blank' || !promptData || !promptData.parent_id;
        
        if (isWritingState) {
            // Single editor for writing/editing

            const editor = monaco.editor.create(host, {
                value: content || '',
                language: 'markdown',
                automaticLayout: true,
                minimap: { enabled: false },
                readOnly: false,
                theme: window.themeManager && window.themeManager.isDark ? 'vs-dark' : 'vs',
                wordWrap: 'on'
            });
            this.editorByBranchId.set(branchId, editor);

        } else {
            // Diff editor for approved improvements (compare with parent)
            try {
                const parentId = (promptData && promptData.parent_id) || null;
                if (!parentId) {
                    // Fallback to regular editor if no parent is available
                    const editor = monaco.editor.create(host, {
                        value: content || '',
                        language: 'markdown',
                        automaticLayout: true,
                        minimap: { enabled: false },
                        readOnly: false,
                        theme: window.themeManager && window.themeManager.isDark ? 'vs-dark' : 'vs',
                        wordWrap: 'on'
                    });
                    this.editorByBranchId.set(branchId, editor);
                    return;
                }

                const [parentContent] = await Promise.all([
                    this.fetchBranchContent(parentId)
                ]);

                const diffEditor = monaco.editor.createDiffEditor(host, {
                    automaticLayout: true,
                    minimap: { enabled: false },
                    readOnly: false,
                    theme: window.themeManager && window.themeManager.isDark ? 'vs-dark' : 'vs',
                    wordWrap: 'on',
                    renderSideBySide: false,
                    ignoreTrimWhitespace: false
                });

                const originalModel = monaco.editor.createModel(parentContent || '', 'markdown');
                const modifiedModel = monaco.editor.createModel(content || '', 'markdown');

                diffEditor.setModel({
                    original: originalModel,
                    modified: modifiedModel
                });

                // Store both the diff editor and a reference to get the modified content
                this.editorByBranchId.set(branchId, {
                    isDiffEditor: true,
                    editor: diffEditor,
                    getValue: () => modifiedModel.getValue(),
                    layout: () => diffEditor.layout()
                });
            } catch (e) {
                console.warn(`⚠️ EditorManager: Failed to create diff editor for ${branchId}:`, e);
                // Graceful fallback to regular editor
                const editor = monaco.editor.create(host, {
                    value: content || '',
                    language: 'markdown',
                    automaticLayout: true,
                    minimap: { enabled: false },
                    readOnly: false,
                    theme: window.themeManager && window.themeManager.isDark ? 'vs-dark' : 'vs',
                    wordWrap: 'on'
                });
                this.editorByBranchId.set(branchId, editor);
            }

        }
    }

    // Content fetching
    async fetchBranchContent(branchId) {
        // Never fetch content for blank prompts
        if (branchId === 'blank') {

            return '';
        }
        
        if (!this.dataService) return '';
        return await this.dataService.fetchBranchContent(branchId);
    }

    // Editor value extraction
    getEditorValue(branchId) {
        const ed = this.editorByBranchId.get(branchId);
        try { 
            if (!ed) return '';
            // Handle diff editor wrapper
            if (ed.isDiffEditor && ed.getValue) {
                return ed.getValue() || '';
            }
            // Handle regular editor
            return ed.getValue ? (ed.getValue() || '') : '';
        } catch { 
            return ''; 
        }
    }

    // Editor disposal
    disposeEditor(branchId) {
        const editor = this.editorByBranchId.get(branchId);
        if (editor) {
            try {
                if (editor.isDiffEditor && editor.editor) {
                    editor.editor.dispose();
                } else if (editor.dispose) {
                    editor.dispose();
                }
            } catch (e) {
                console.warn('Error disposing editor:', e);
            }
            this.editorByBranchId.delete(branchId);
        }
    }

    // Editor layout updates
    layoutEditor(branchId) {
        const editor = this.editorByBranchId.get(branchId);
        if (editor && editor.layout) {
            editor.layout();
        }
    }

    // Theme updates
    updateEditorTheme(isDark) {
        const theme = isDark ? 'vs-dark' : 'vs';
        this.editorByBranchId.forEach(editor => {
            try {
                if (editor.isDiffEditor && editor.editor) {
                    editor.editor.updateOptions({ theme });
                } else if (editor.updateOptions) {
                    editor.updateOptions({ theme });
                }
            } catch (e) {
                console.warn('Error updating editor theme:', e);
            }
        });
    }

    // Utility methods
    hasEditor(branchId) {
        return this.editorByBranchId.has(branchId);
    }

    getEditor(branchId) {
        return this.editorByBranchId.get(branchId);
    }

    getAllEditorIds() {
        return Array.from(this.editorByBranchId.keys());
    }

    // Cleanup
    disposeAllEditors() {
        this.editorByBranchId.forEach((editor, branchId) => {
            this.disposeEditor(branchId);
        });
    }
    
    // Force update all editor themes (called by theme manager)
    forceUpdateAllThemes() {
        const theme = this.getCurrentTheme();

        this.editorByBranchId.forEach((editor, branchId) => {
            try {
                if (editor.isDiffEditor && editor.editor) {

                    editor.editor.updateOptions({ theme });
                } else if (editor.updateOptions) {

                    editor.updateOptions({ theme });
                }
            } catch (e) {
                console.warn(`⚠️ EditorManager: Error force updating editor theme for branch ${branchId}:`, e);
            }
        });
    }
    
    // Get current theme
    getCurrentTheme() {
        if (window.themeManager) {
            return window.themeManager.isDark ? 'vs-dark' : 'vs';
        }
        // Fallback: check if dark theme is applied to document
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return isDark ? 'vs-dark' : 'vs';
    }
}

// Export for use in other modules
window.EditorManager = EditorManager;
