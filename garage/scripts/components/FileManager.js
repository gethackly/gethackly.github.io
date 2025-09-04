// FileManager.js - Handles file operations and UI for branches

class FileManager {
    constructor() {
        this.filesByBranch = new Map();
        this.originalFileIdsByBranch = new Map();
        this.modalManager = null;
        this.sidebarManager = null;
    }

    setModalManager(modalManager) {
        this.modalManager = modalManager;
    }

    setSidebarManager(sidebarManager) {
        this.sidebarManager = sidebarManager;
    }

    // File operations
    getFilesForBranch(branchId) {
        return this.filesByBranch.get(branchId) || [];
    }

    setFilesForBranch(branchId, files) {
        this.filesByBranch.set(branchId, files);
    }

    getOriginalFileIdsForBranch(branchId) {
        return this.originalFileIdsByBranch.get(branchId) || [];
    }

    setOriginalFileIdsForBranch(branchId, ids) {
        this.originalFileIdsByBranch.set(branchId, ids);
    }

    addFileToBranch(branchId, filename, content, fileType = 'text') {
        const files = this.getFilesForBranch(branchId);
        files.push({ filename, content, file_type: fileType });
        this.setFilesForBranch(branchId, files);
        this.renderFiles(branchId);
    }

    updateFileInBranch(branchId, index, filename, content) {
        const files = this.getFilesForBranch(branchId);
        if (files[index]) {
            files[index].filename = filename;
            files[index].content = content;
            this.setFilesForBranch(branchId, files);
            this.renderFiles(branchId);
        }
    }

    removeFileFromBranch(branchId, index) {
        const files = this.getFilesForBranch(branchId);
        files.splice(index, 1);
        this.setFilesForBranch(branchId, files);
        this.renderFiles(branchId);
    }

    // File rendering
    renderFiles(branchId) {
        const container = document.getElementById(`fileTabs-${branchId}`);
        if (!container) return;
        
        container.innerHTML = '';
        const files = this.getFilesForBranch(branchId);
        
        if (!files.length) {
            const empty = document.createElement('span');
            empty.textContent = 'No files';
            empty.style.color = 'var(--color-text-muted)';
            empty.style.fontStyle = 'italic';
            container.appendChild(empty);
            return;
        }
        
        files.forEach((file, fileIndex) => {
            const tab = document.createElement('div');
            tab.className = 'file-tab';
            tab.style.display = 'flex';
            tab.style.alignItems = 'center';
            tab.style.gap = '6px';
            
            const name = document.createElement('span');
            name.textContent = file.filename || 'untitled.txt';
            
            const del = document.createElement('span');
            del.textContent = '×';
            del.style.cursor = 'pointer';
            del.addEventListener('click', (event) => { 
                event.stopPropagation(); 
                this.removeFileFromBranch(branchId, fileIndex); 
            });
            
            tab.appendChild(name);
            tab.appendChild(del);
            tab.addEventListener('click', () => this.openFileModal(branchId, fileIndex));
            container.appendChild(tab);
        });
    }

    // File modal operations
    openFileModal(branchId, idx) {
        if (!this.modalManager) return;
        
        this.modalManager.openFileModal(branchId, idx, (filename, content, editingIndex) => {
            if (editingIndex >= 0) {
                this.updateFileInBranch(branchId, editingIndex, filename, content);
            } else {
                this.addFileToBranch(branchId, filename, content);
            }
        });
    }

    addFileToBranch(branchId) {
        if (!this.modalManager) return;
        
        const files = this.getFilesForBranch(branchId);
        if (files.length >= 3) { 
            if (this.sidebarManager) {
                this.sidebarManager.setSidebarSummary('Max 3 files per prompt.');
            }
            return; 
        }
        
        this.openFileModal(branchId, -1);
    }

    // File loading from Firebase
    async loadFilesForBranch(branchId) {
        try {
            if (!window.db || !window.db.collection) {
                this.setFilesForBranch(branchId, []);
                this.setOriginalFileIdsForBranch(branchId, []);
                this.renderFiles(branchId);
                return;
            }
            
            const snap = await window.db.collection('prompt_files').where('prompt_id', '==', branchId).get();
            const files = [];
            const originalIds = [];
            
            snap.forEach(doc => {
                const d = doc.data() || {};
                files.push({ 
                    _id: doc.id, 
                    filename: d.filename || 'untitled.txt', 
                    content: d.content || '', 
                    file_type: d.file_type || 'text' 
                });
                originalIds.push(doc.id);
            });
            
            this.setFilesForBranch(branchId, files);
            this.setOriginalFileIdsForBranch(branchId, originalIds);
            this.renderFiles(branchId);
        } catch (e) {
            this.setFilesForBranch(branchId, []);
            this.setOriginalFileIdsForBranch(branchId, []);
            this.renderFiles(branchId);
        }
    }

    // File data for evaluation requests
    getFileDataForEvaluation(branchId) {
        const files = this.getFilesForBranch(branchId);
        const originalIds = this.getOriginalFileIdsForBranch(branchId);
        const keptIds = files.map(f => f._id).filter(Boolean);
        const exclude = originalIds.filter(id => !keptIds.includes(id));
        const newFiles = files.filter(f => !f._id).map(f => ({ 
            filename: f.filename, 
            content: f.content, 
            file_type: f.file_type || 'text' 
        }));
        
        return { exclude, newFiles };
    }

    // Utility methods
    hasFiles(branchId) {
        const files = this.getFilesForBranch(branchId);
        return files && files.length > 0;
    }

    getFileCount(branchId) {
        const files = this.getFilesForBranch(branchId);
        return files ? files.length : 0;
    }

    canAddMoreFiles(branchId) {
        return this.getFileCount(branchId) < 3;
    }
}

// Export for use in other modules
window.FileManager = FileManager;
