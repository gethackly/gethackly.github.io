// ModalManager.js - Handles modal creation and management

class ModalManager {
    constructor() {
        this.modal = null;
        this.nameModal = null;
        this.modalFilenameInput = null;
        this.currentBranchForModal = null;
        this.editingIndex = -1;
        this.nameInput = null;
        this.onSaveCallback = null;
        this.onNameSaveCallback = null;
        this.LOG_PREFIX = 'ModalManager';
    }

    // File editing modal
    ensureModal() {
        if (this.modal) return;
        
        this.modal = document.createElement('div');
        this.modal.style.position = 'fixed';
        this.modal.style.inset = '0';
        this.modal.style.background = 'rgba(0,0,0,0.35)';
        this.modal.style.display = 'none';
        this.modal.style.alignItems = 'center';
        this.modal.style.justifyContent = 'center';
        this.modal.style.zIndex = '10000';
        
        this.modal.innerHTML = `
            <div style="background:var(--color-bg); color:var(--color-text); width:min(900px,92vw); height:min(70vh,560px); border:1px solid var(--color-text); padding:12px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <strong id="modalTitle">Edit file</strong>
                    <input id="modalFilename" placeholder="filename.ext" style="flex:1; padding:6px; border:1px solid var(--color-text); background:var(--color-bg); color:var(--color-text);"/>
                    <div><button id="modalClose" class="login-btn">Close</button></div>
                </div>
                <div id="modalEditor" style="flex:1; border:1px solid var(--color-text);"></div>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button id="modalSave" class="login-btn">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        this.modalFilenameInput = this.modal.querySelector('#modalFilename');
        
        this.modal.querySelector('#modalClose').addEventListener('click', () => this.closeFileModal());
        this.modal.querySelector('#modalSave').addEventListener('click', () => this.saveFileModal());
    }

    openFileModal(branchId, idx, onSave) {
        this.ensureModal();
        this.currentBranchForModal = branchId;
        this.editingIndex = (typeof idx === 'number') ? idx : -1;
        this.onSaveCallback = onSave;
        
        const files = window.fileManager ? window.fileManager.getFilesForBranch(branchId) : [];
        const f = this.editingIndex >= 0 ? files[this.editingIndex] : { filename: '', content: '' };
        
        this.modal.querySelector('#modalTitle').textContent = this.editingIndex >= 0 ? `Edit: ${f.filename || 'untitled.txt'}` : 'Add file';
        this.modalFilenameInput.value = f.filename || '';
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Load Monaco editor
        this.loadModalEditor(f.content || '');
    }

    closeFileModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    saveFileModal() {
        const value = window.modalEditor ? window.modalEditor.getValue() : '';
        const fname = (this.modalFilenameInput.value || '').trim() || 'untitled.txt';
        
        if (this.onSaveCallback) {
            this.onSaveCallback(fname, value, this.editingIndex);
        }
        
        this.closeFileModal();
    }

    loadModalEditor(content) {
        if (window.monaco) {
            this.createModalEditor(content);
        } else {
            // Load Monaco if not available
            this.loadMonaco().then(() => this.createModalEditor(content));
        }
    }

    createModalEditor(content) {
        if (window.modalEditor) { 
            try { window.modalEditor.dispose(); } catch (err) { 
                console.warn(`⚠️ ${this.LOG_PREFIX}: Failed to dispose modal editor`, err);
            } 
            window.modalEditor = null; 
        }
        
        window.modalEditor = window.monaco.editor.create(this.modal.querySelector('#modalEditor'), {
            value: content || '',
            language: 'markdown',
            automaticLayout: true,
            wordWrap: 'on',
            theme: this.getCurrentTheme(),
            fontFamily: 'OffBit, monospace',
            fontWeight: 'bold',
            fontSize: 21,
            minimap: { enabled: false }
        });
    }

    loadMonaco() {
        if (window.monaco) return Promise.resolve(window.monaco);
        
        return new Promise(resolve => {
            function configureAndLoad() {
                window.require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
                window.require(['vs/editor/editor.main'], () => resolve(window.monaco));
            }
            
            if (typeof window.require === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
                script.onload = configureAndLoad;
                document.head.appendChild(script);
            } else {
                configureAndLoad();
            }
        });
    }

    // Prompt naming modal
    ensureNameModal() {
        if (this.nameModal) return;
        
        this.nameModal = document.createElement('div');
        this.nameModal.className = 'name-modal-overlay';
        this.nameModal.style.position = 'fixed';
        this.nameModal.style.inset = '0';
        this.nameModal.style.background = 'rgba(0, 0, 0, 0.35)';
        this.nameModal.style.display = 'none';
        this.nameModal.style.alignItems = 'center';
        this.nameModal.style.justifyContent = 'center';
        this.nameModal.style.zIndex = '10001';
        
        this.nameModal.innerHTML = `
            <div class="name-modal-content">
                <div class="name-modal-header">
                    <h3>Name Your New Prompt</h3>
                </div>
                <div class="name-modal-body">
                    <input type="text" id="promptNameInput" placeholder="Enter prompt name..." class="name-modal-input" />
                </div>
                <div class="name-modal-footer">
                    <button id="nameModalCancel" class="login-btn">Cancel</button>
                    <button id="nameModalSave" class="btn-evaluate">Submit</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.nameModal);
        this.nameInput = this.nameModal.querySelector('#promptNameInput');
        
        // Close on outside click
        this.nameModal.addEventListener('click', (e) => {
            if (e.target === this.nameModal) {
                this.closeNameModal();
            }
        });
        
        // Keyboard shortcuts
        this.nameInput.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.key === 'Enter') {
                e.preventDefault();
                this.savePromptName();
            } else if (e.key === 'Escape') {
                this.closeNameModal();
            }
        });
        
        // Button handlers
        this.nameModal.querySelector('#nameModalSave').onclick = () => this.savePromptName();
        this.nameModal.querySelector('#nameModalCancel').onclick = () => this.closeNameModal();
    }

    showNameModal(onSave) {
        this.ensureNameModal();
        this.onNameSaveCallback = onSave;
        this.nameModal.style.display = 'flex';
        this.nameInput.value = '';
        this.nameInput.focus();
        document.body.style.overflow = 'hidden';
    }

    closeNameModal() {
        if (this.nameModal) {
            this.nameModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    savePromptName() {
        const name = this.nameInput.value.trim();
        if (!name) {
            this.nameInput.focus();
            return;
        }
        
        if (this.onNameSaveCallback) {
            this.onNameSaveCallback(name);
        }
        
        this.closeNameModal();
    }

    // Utility methods
    getCurrentBranchForModal() {
        return this.currentBranchForModal;
    }

    getEditingIndex() {
        return this.editingIndex;
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
window.ModalManager = ModalManager;

