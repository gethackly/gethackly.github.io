// BranchManager.js - Main coordinator for branch operations and rendering

class BranchManager {
    constructor() {
        this.dataService = null;
        this.sortManager = null;
        this.fileManager = null;
        this.editorManager = null;
        this.evaluationManager = null;
        this.sidebarManager = null;
        this.modalManager = null;
        this.performanceOptimizer = null;
        this.domOptimizer = null;
        this.searchTerm = '';
        this.promptsListener = null;
        // Timing constants
        this.SEARCH_DEBOUNCE_MS = 300;
        this.RANK_REFRESH_DELAY_MS = 100;
        this.AUTH_CHECK_INTERVAL_MS = 500;
        this.AUTH_CHECK_MAX_ATTEMPTS = 10;
        this.SCROLL_ADJUST_DELAY_MS = 100;
        this.FOCUS_DELAY_MS = 300;
        this.init();
    }

    /**
     * Set all dependencies and initialize cross-references
     * @param {Object} dependencies - All required service instances
     */
    setDependencies(dataService, sortManager, fileManager, editorManager, evaluationManager, sidebarManager, modalManager, performanceOptimizer, domOptimizer) {
        this.dataService = dataService;
        this.sortManager = sortManager;
        this.fileManager = fileManager;
        this.editorManager = editorManager;
        this.evaluationManager = evaluationManager;
        this.sidebarManager = sidebarManager;
        this.modalManager = modalManager;
        this.performanceOptimizer = performanceOptimizer;
        this.domOptimizer = domOptimizer;
        
        this.setupCrossReferences();
        
        // Initialize branches after dependencies are set
        this.initBranches().catch(console.warn);
        
        // Set up periodic button state updates for auth system initialization
        this.setupAuthStateMonitoring();
    }

    /**
     * Set up cross-references between services
     */
    setupCrossReferences() {
        if (this.fileManager) {
            this.fileManager.setModalManager(this.modalManager);
            this.fileManager.setSidebarManager(this.sidebarManager);
        }
        if (this.editorManager) this.editorManager.setDataService(this.dataService);
        if (this.evaluationManager) {
            this.evaluationManager.setDataService(this.dataService);
            this.evaluationManager.setSidebarManager(this.sidebarManager);
            this.evaluationManager.setFileManager(this.fileManager);
        }
    }

    init() {
        this.bindEvents();
        // Don't initialize branches here - wait for dependencies to be set
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        this.bindNewBranchButton();
        this.bindSearchInput();
        this.bindGlobalEvents();
        this.bindEvaluationEvents();
    }

    /**
     * Bind the new branch button with authentication state
     */
    bindNewBranchButton() {
        const newBranchBtn = document.querySelector('.btn-new-branch');
        if (newBranchBtn) {
            newBranchBtn.addEventListener('click', () => this.createNewPrompt());
            this.updateNewBranchButtonState();
        }
    }

    /**
     * Bind search input with debouncing
     */
    bindSearchInput() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase().trim();
                
                if (this.performanceOptimizer) {
                    this.performanceOptimizer.debounce('search', () => {
                        this.filterBranches();
                    }, this.SEARCH_DEBOUNCE_MS);
                } else {
                    this.filterBranches();
                }
            });
        }
    }

    /**
     * Bind global application events
     */
    bindGlobalEvents() {
        window.addEventListener('sort-changed', () => {
            this.applySortAndRender();
        });
        
        window.addEventListener('auth-changed', () => {
            this.updateNewBranchButtonState();
        });
        
        // Removed leaderboard rank updates - ranks now only shown in navbar
    }

    /**
     * Bind evaluation lifecycle events
     */
    bindEvaluationEvents() {
        window.addEventListener('evaluation-status', (evt) => {
            try {
                const detail = (evt && evt.detail) || {};
                const promptId = detail.promptId;
                if (!promptId) return;

                this.handleEvaluationStatusUpdate(promptId, detail);
            } catch (e) {
                console.warn('⚠️ BranchManager: failed to handle evaluation-status', e);
            }
        });

        // Listen for evaluation completion to refresh editor content
        window.addEventListener('evaluation-done', (evt) => {
            try {
                const detail = (evt && evt.detail) || {};
                const newPromptId = detail.promptId;
                const originalPromptId = detail.originalPromptId;
                const isImprovement = detail.isImprovement;
                
                if (!newPromptId) return;

                if (isImprovement) {
                    // For improvements, refresh the entire branch list to show the new prompt
                    this.refreshBranchListAfterImprovement(originalPromptId, newPromptId);
                } else {
                    // For new prompts, just refresh the editor content
                    this.refreshEditorContentAfterEvaluation(newPromptId);
                }
            } catch (e) {
                console.warn('⚠️ BranchManager: failed to handle evaluation-done', e);
            }
        });
    }

    /**
     * Handle evaluation status updates
     * @param {string} promptId - The prompt ID
     * @param {Object} detail - Event detail with status and result
     */
    handleEvaluationStatusUpdate(promptId, detail) {
        const row = document.querySelector(`.branch-row[data-branch-id="${promptId}"]`);
        if (!row) return;

        // Update processing state
        if (detail.status === 'processing') {
            row.classList.add('is-processing');
        } else {
            row.classList.remove('is-processing');
        }

        // Update evaluation result if completed
        if (detail.status === 'done' && detail.result) {
            this.updatePromptEvaluationResult(promptId, detail.result);
        }
    }

    /**
     * Update prompt evaluation result in cache and UI
     * @param {string} promptId - The prompt ID
     * @param {Object} result - The evaluation result
     */
    updatePromptEvaluationResult(promptId, result) {
        const currentPrompts = this.dataService.getCachedPrompts();
        const idx = currentPrompts.findIndex(p => p.id === promptId);
        if (idx !== -1) {
            const updated = { ...currentPrompts[idx], latest_evaluation: result };
            currentPrompts[idx] = updated;
            this.dataService.setCachedPrompts(currentPrompts);
            this.updatePromptRow(promptId, updated);
        }
    }

    /**
     * Refresh editor content after evaluation completion
     * @param {string} promptId - The prompt ID
     */
    async refreshEditorContentAfterEvaluation(promptId) {
        try {
            // Wait a bit for the data to be updated in Firebase
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Fetch the latest content from the database
            const latestContent = await this.dataService.fetchBranchContent(promptId);
            
            // Check if the branch is currently expanded
            const row = document.querySelector(`.branch-row[data-branch-id="${promptId}"]`);
            const isExpanded = row && row.classList.contains('active');
            
            if (isExpanded && this.editorManager) {
                // Dispose the existing editor to force recreation with new content
                this.editorManager.disposeEditor(promptId);
                
                // Wait a bit for disposal to complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Recreate the editor with the latest content
                await this.editorManager.ensureEditorForBranch(promptId);
                
                console.log(`✅ BranchManager: Refreshed editor content for ${promptId}`);
            }
        } catch (e) {
            console.warn(`⚠️ BranchManager: Failed to refresh editor content for ${promptId}:`, e);
        }
    }

    /**
     * Refresh branch list after improvement completion
     * @param {string} originalPromptId - The original prompt ID that was improved
     * @param {string} newPromptId - The new prompt ID that was created
     */
    async refreshBranchListAfterImprovement(originalPromptId, newPromptId) {
        try {
            // Wait a bit for Firebase to update
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Re-fetch all prompts to get the updated list
            const updatedPrompts = await this.dataService.initBranches();
            
            // Re-render the branch list with updated data
            this.applySortAndRender();
            
            // If the original branch was expanded, expand the new one instead
            const originalRow = document.querySelector(`.branch-row[data-branch-id="${originalPromptId}"]`);
            const wasExpanded = originalRow && originalRow.classList.contains('active');
            
            if (wasExpanded) {
                // Collapse the original and expand the new one
                this.collapseAllBranches();
                setTimeout(() => {
                    this.expandBranch(newPromptId);
                }, 100);
            }
            
            console.log(`✅ BranchManager: Refreshed branch list after improvement: ${originalPromptId} -> ${newPromptId}`);
        } catch (e) {
            console.warn(`⚠️ BranchManager: Failed to refresh branch list after improvement:`, e);
        }
    }

    /**
     * Render branches list with performance optimization
     * @param {Array} prompts - Array of prompt objects
     */
    renderBranchesList(prompts) {
        const container = document.getElementById('branchesContainer');
        if (!container) return;
        
        // Use DOM optimization for better performance with large lists
        if (this.domOptimizer && Array.isArray(prompts) && prompts.length > 10) {
            this.renderBranchesOptimized(container, prompts);
        } else {
            this.renderBranchesStandard(container, prompts);
        }
    }

    /**
     * Standard rendering for small lists
     * @param {HTMLElement} container - The container element
     * @param {Array} prompts - Array of prompt objects
     */
    renderBranchesStandard(container, prompts) {
        // Dispose any existing Monaco editors before re-rendering DOM to prevent stale references
        if (window.editorManager && typeof window.editorManager.disposeAllEditors === 'function') {
            try { window.editorManager.disposeAllEditors(); } catch (_) {}
        }
        container.innerHTML = '';

        if (Array.isArray(prompts)) {
            this.dataService.setCachedPrompts(prompts);
            let index = 0;
            
            for (const prompt of prompts) {
                const { row, details } = this.createBranchElements(prompt, ++index);
                container.appendChild(row);
                container.appendChild(details);
            }
            
            this.updateHeaderLabel();
            
            // Dispatch event for branch counter to update
            try {
                window.dispatchEvent(new CustomEvent('branches-updated', { 
                    detail: { count: prompts.length } 
                }));
            } catch (e) {
                console.warn('Could not dispatch branches-updated event:', e);
            }
        }
    }

    /**
     * Optimized rendering for large lists using document fragments
     * @param {HTMLElement} container - The container element
     * @param {Array} prompts - Array of prompt objects
     */
    renderBranchesOptimized(container, prompts) {
        this.dataService.setCachedPrompts(prompts);
        
        // Use document fragment for batch DOM operations
        const fragment = document.createDocumentFragment();
        let index = 0;
        
        for (const prompt of prompts) {
            const { row, details } = this.createBranchElements(prompt, ++index);
            fragment.appendChild(row);
            fragment.appendChild(details);
        }
        
        container.innerHTML = '';
        container.appendChild(fragment);
        this.updateHeaderLabel();
        
        // Dispatch event for branch counter to update
        try {
            window.dispatchEvent(new CustomEvent('branches-updated', { 
                detail: { count: prompts.length } 
            }));
        } catch (e) {
            console.warn('Could not dispatch branches-updated event:', e);
        }
    }

    /**
     * Create branch row and details elements
     * @param {Object} prompt - Prompt object
     * @param {number} index - Display index
     * @returns {Object} Object containing row and details elements
     */
    createBranchElements(prompt, index) {
        const row = this.createBranchRow(prompt, index);
        const details = this.createBranchDetails(prompt);
        
        return { row, details };
    }

    /**
     * Create a branch row element
     * @param {Object} prompt - Prompt object
     * @param {number} index - Display index
     * @returns {HTMLElement} The row element
     */
    createBranchRow(prompt, index) {
        const row = document.createElement('div');
        row.className = 'branch-row';
        row.setAttribute('data-branch-id', prompt.id ?? 'unknown');
        row.setAttribute('data-collection', this.dataService.currentBranchesCollection);

        const rankLabel = this.sortManager.getLeftCellText(prompt, index, this.dataService);
        const title = prompt.title || prompt.name || (prompt.is_main ? 'Main' : '(untitled)');
        const truncatedTitle = this.truncateTitle(title);
        const owner = this.getOwnerDisplayNameWithLink(prompt);

        const rowHTML = `
            <div class="branch-col branch-col-rank">${rankLabel}</div>
            <div class="branch-col branch-col-title">${truncatedTitle}</div>
            <div class="branch-col branch-col-owner">${owner}</div>
        `;

        row.innerHTML = rowHTML;
        
        row.addEventListener('click', (event) => {
            if (event.target.classList.contains('branch-col-rank')) return;
            this.expandBranch(prompt.id ?? 'unknown');
        });
        
        return row;
    }

    /**
     * Create branch details panel
     * @param {Object} prompt - Prompt object
     * @returns {HTMLElement} The details element
     */
    createBranchDetails(prompt) {
        const details = document.createElement('div');
        details.className = 'branch-details';
        details.setAttribute('data-branch-id', prompt.id ?? 'unknown');
        details.innerHTML = `
            <div class="branch-details-inner">
                <div class="editor-host" id="editor-${prompt.id}"></div>
                <div class="branch-toolbar">
                    <div class="branch-toolbar-left">
                        <div class="file-tabs" id="fileTabs-${prompt.id}"></div>
                        <button class="login-btn" id="addFile-${prompt.id}">Add file</button>
                    </div>
                    <div class="branch-toolbar-right">
                        <select id="modelSelect-${prompt.id}">
                            <option value="Auto" selected>Auto</option>
                            <option value="claude-4-sonnet">claude-4-sonnet</option>
                            <option value="gpt-5">gpt-5</option>
                            <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                            <option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
                            <option value="sonic">sonic</option>
                        </select>
                        <button class="btn-evaluate" id="runBtn-${prompt.id}">Evaluate</button>
                    </div>
                </div>
            </div>
        `;
        
        return details;
    }

    /**
     * Update header label with current sort information
     */
    updateHeaderLabel() {
        const headerBtn = document.querySelector('.sort-head-btn');
        if (headerBtn) {
            headerBtn.innerHTML = this.sortManager.getLeftHeaderLabel();
        }
    }

    /**
     * Expand or collapse a branch
     * @param {string} id - Branch ID to expand/collapse
     */
    expandBranch(id) {
        const clickedRow = document.querySelector(`.branch-row[data-branch-id="${id}"]`);
        const wasActive = clickedRow?.classList.contains('active');

        this.collapseAllBranches();

        // Toggle selected branch
        if (clickedRow && !wasActive) {
            this.expandSelectedBranch(id, clickedRow);
        } else {
            // Branch was closed, clear the sidebar evaluation
            this.sidebarManager.setSidebarSummary('');
        }
    }

    /**
     * Collapse all branches and panels
     */
    collapseAllBranches() {
        document.querySelectorAll('.branch-row').forEach(row => row.classList.remove('active'));
        document.querySelectorAll('.branch-details').forEach(panel => {
            panel.style.maxHeight = '0px';
        });
    }

    /**
     * Expand the selected branch
     * @param {string} id - Branch ID
     * @param {HTMLElement} clickedRow - The clicked row element
     */
    expandSelectedBranch(id, clickedRow) {
        clickedRow.classList.add('active');
        const details = document.querySelector(`.branch-details[data-branch-id="${id}"]`);
        if (details) {
            details.style.maxHeight = details.scrollHeight + 'px';
            
            this.initializeBranchComponents(id);
            this.loadBranchData(id);
            this.bindToolbarHandlers(id);
            
            // Start observing this branch for performance optimization
            if (this.performanceOptimizer) {
                this.performanceOptimizer.observeBranch(clickedRow);
            }
        }
    }

    /**
     * Initialize branch components after expansion
     * @param {string} id - Branch ID
     */
    async initializeBranchComponents(id) {
        try {
            // Lazy init editor after expand
            await this.editorManager.ensureEditorForBranch(id);
        } catch (err) {
            console.warn(`Failed to initialize editor for branch ${id}:`, err);
        }
    }

    /**
     * Load branch data and display in sidebar
     * @param {string} id - Branch ID
     */
    loadBranchData(id) {
        if (id === 'blank') {
            this.sidebarManager.setSidebarSummary('');
        } else {
            const prompt = this.dataService.getCachedPrompts().find(p => p.id === id);
            if (prompt) {
                this.evaluationManager.tryLoadLatestEvaluationForPrompt(prompt);
            } else {
                this.sidebarManager.setSidebarSummary('');
            }
        }
    }

    /**
     * Create a new prompt
     */
    createNewPrompt() {
        if (!this.isAuthSystemReady()) {
            setTimeout(() => this.createNewPrompt(), 500);
            return;
        }
        
        if (!this.isUserAuthenticated()) {
            this.showAuthModal();
            return;
        }
        
        const container = document.getElementById('branchesContainer');
        if (!container) {
            console.error('❌ BranchManager: No branches container found');
            return;
        }
        
        // Check if blank row already exists
        const existingBlank = container.querySelector('[data-branch-id="blank"]');
        if (existingBlank) {
            this.handleExistingBlankPrompt(existingBlank);
            return;
        }

        this.createBlankPrompt(container);
    }

    /**
     * Check if authentication system is ready
     * @returns {boolean} True if ready
     */
    isAuthSystemReady() {
        return !!window.authService;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    isUserAuthenticated() {
        return window.authService && window.authService.isAuthenticated();
    }

    /**
     * Show authentication modal
     */
    showAuthModal() {
        if (window.mainAuth) {
            window.mainAuth.showAuthModal();
        } else {
            console.error('❌ BranchManager: MainAuth not available');
        }
    }

    /**
     * Handle existing blank prompt
     * @param {HTMLElement} existingBlank - Existing blank prompt element
     */
    handleExistingBlankPrompt(existingBlank) {
        const isAlreadyOpen = existingBlank.classList.contains('active');
        if (!isAlreadyOpen) {
            this.expandBranch('blank');
        }
        this.scrollToBlankPrompt();
    }

    /**
     * Create a new blank prompt
     * @param {HTMLElement} container - Container to add the prompt to
     */
    createBlankPrompt(container) {
        const { blankRow, blankDetails } = this.createBlankPromptElements();
        
        // Insert at the beginning of the branches list
        container.insertBefore(blankDetails, container.firstChild);
        container.insertBefore(blankRow, container.firstChild);
        
        // Bind toolbar handlers for the blank prompt
        this.bindToolbarHandlers('blank');
        
        // Automatically expand the new blank prompt and scroll to it
        this.expandBranch('blank');
        this.scrollToBlankPrompt();
    }

    /**
     * Create blank prompt elements
     * @returns {Object} Object containing row and details elements
     */
    createBlankPromptElements() {
        const blankRow = document.createElement('div');
        blankRow.className = 'branch-row';
        blankRow.setAttribute('data-branch-id', 'blank');
        blankRow.setAttribute('data-collection', this.dataService.currentBranchesCollection);
        blankRow.innerHTML = `
            <div class="branch-col branch-col-rank">New</div>
            <div class="branch-col branch-col-title">${this.truncateTitle('New prompt — Blank')}</div>
            <div class="branch-col branch-col-owner">—</div>
        `;
        blankRow.addEventListener('click', (event) => {
            if (event.target.classList.contains('branch-col-rank')) {
                return;
            }
            this.expandBranch('blank');
        });
        
        const blankDetails = document.createElement('div');
        blankDetails.className = 'branch-details';
        blankDetails.setAttribute('data-branch-id', 'blank');
        blankDetails.innerHTML = `
            <div class="branch-details-inner">
                <div class="editor-host" id="editor-blank"></div>
                <div class="branch-toolbar">
                    <div class="branch-toolbar-left">
                        <div class="file-tabs" id="fileTabs-blank"></div>
                        <button class="login-btn" id="addFile-blank">Add file</button>
                    </div>
                    <div class="branch-toolbar-right">
                        <select id="modelSelect-blank">
                            <option value="Auto" selected>Auto</option>
                            <option value="claude-4-sonnet">claude-4-sonnet</option>
                            <option value="gpt-5">gpt-5</option>
                            <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                            <option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
                            <option value="sonic">sonic</option>
                        </select>
                        <button class="btn-evaluate" id="runBtn-blank">Evaluate</button>
                    </div>
                </div>
            </div>
        `;
        
        return { blankRow, blankDetails };
    }

    /**
     * Scroll to blank prompt with smooth animation
     */
    scrollToBlankPrompt() {
        const blankRow = document.querySelector('.branch-row[data-branch-id="blank"]');
        if (blankRow) {
            // Scroll to the blank prompt with smooth animation
            blankRow.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
            
            // Additional offset to make it appear higher
            setTimeout(() => {
                window.scrollBy({
                    top: -100,
                    behavior: 'smooth'
                });
            }, this.SCROLL_ADJUST_DELAY_MS);
            
            // Focus the editor after a short delay to ensure it's loaded
            setTimeout(() => {
                const editorHost = document.getElementById('editor-blank');
                if (editorHost) {
                    editorHost.focus();
                }
            }, this.FOCUS_DELAY_MS);
        }
    }

    /**
     * Filter branches based on search term
     */
    filterBranches() {
        const container = document.getElementById('branchesContainer');
        if (!container) return;
        
        const allRows = container.querySelectorAll('.branch-row');
        const allDetails = container.querySelectorAll('.branch-details');
        
        if (!this.searchTerm) {
            // Show all rows when search is empty
            this.showAllBranches(allRows, allDetails);
            return;
        }
        
        this.filterBranchesBySearchTerm(allRows, allDetails);
    }

    /**
     * Show all branches
     * @param {NodeList} rows - All branch rows
     * @param {NodeList} details - All branch details
     */
    showAllBranches(rows, details) {
        rows.forEach(row => row.style.display = 'flex');
        details.forEach(detail => detail.style.display = 'block');
    }

    /**
     * Filter branches by search term
     * @param {NodeList} rows - All branch rows
     * @param {NodeList} details - All branch details
     */
    filterBranchesBySearchTerm(rows, details) {
        rows.forEach((row, index) => {
            const title = row.querySelector('.branch-col-title')?.textContent?.toLowerCase() || '';
            const owner = row.querySelector('.branch-col-owner')?.textContent?.toLowerCase() || '';
            const rank = row.querySelector('.branch-col-rank')?.textContent?.toLowerCase() || '';
            
            const matches = title.includes(this.searchTerm) || 
                           owner.includes(this.searchTerm) || 
                           rank.includes(this.searchTerm);
            
            if (matches) {
                row.style.display = 'flex';
                if (details[index]) {
                    details[index].style.display = 'block';
                }
            } else {
                row.style.display = 'none';
                if (details[index]) {
                    details[index].style.display = 'none';
                }
            }
        });
    }

    /**
     * Bind toolbar handlers for a specific branch
     * @param {string} branchId - Branch ID
     */
    bindToolbarHandlers(branchId) {
        this.bindAddFileHandler(branchId);
        this.bindRunButtonHandler(branchId);
    }

    /**
     * Bind add file button handler
     * @param {string} branchId - Branch ID
     */
    bindAddFileHandler(branchId) {
        const addBtn = document.getElementById(`addFile-${branchId}`);
        if (addBtn) {
            addBtn.onclick = () => {
                if (!this.isAuthSystemReady()) {
                    setTimeout(() => addBtn.click(), 500);
                    return;
                }
                
                if (!this.isUserAuthenticated()) {
                    this.showAuthModal();
                    return;
                }
                this.fileManager.addFileToBranch(branchId);
            };
        }
    }

    /**
     * Bind run button handler
     * @param {string} branchId - Branch ID
     */
    bindRunButtonHandler(branchId) {
        const runBtn = document.getElementById(`runBtn-${branchId}`);
        if (runBtn) {
            runBtn.onclick = async () => {
                if (!this.isAuthSystemReady()) {
                    setTimeout(() => runBtn.click(), 500);
                    return;
                }
                
                if (!this.isUserAuthenticated()) {
                    this.showAuthModal();
                    return;
                }
                
                const prompt = (this.editorManager.getEditorValue(branchId) || '').trim();
                const modelEl = document.getElementById(`modelSelect-${branchId}`);
                
                if (!prompt) { 
                    this.sidebarManager.setSidebarSummary('Please enter a prompt.'); 
                    return; 
                }
                
                // For blank prompts, ask for a name first
                if (branchId === 'blank') {
                    this.modalManager.showNameModal((name) => {
                        this.evaluationManager.createEvaluationRequest(prompt, modelEl, branchId, name);
                    });
                    return;
                }
                
                // For existing branches, get the branch title and proceed
                const branchData = this.dataService.getCachedPrompts().find(p => p.id === branchId);
                const branchTitle = branchData ? (branchData.title || branchData.name || '(untitled)') : '(untitled)';

                await this.evaluationManager.createEvaluationRequest(prompt, modelEl, branchId, branchTitle);
            };
        }
    }

    /**
     * Apply sorting and re-render branches
     */
    applySortAndRender() {
        const sorted = this.sortManager.sortPrompts(this.dataService.getCachedPrompts(), this.dataService);
        this.renderBranchesList(sorted);
    }

    /**
     * Update New Branch button state based on authentication
     */
    updateNewBranchButtonState() {
        const newBranchBtn = document.querySelector('.btn-new-branch');
        if (!newBranchBtn) return;
        
        // Check if auth system is ready and user is authenticated
        if (window.authService && window.authService.isAuthenticated()) {
            // User is authenticated - normal state
            newBranchBtn.style.opacity = '1';
            newBranchBtn.style.cursor = 'pointer';
            newBranchBtn.title = 'Create a new branch';
        } else {
            // User is not authenticated - show subtle indication
            newBranchBtn.style.opacity = '0.7';
            newBranchBtn.style.cursor = 'pointer';
            newBranchBtn.title = 'Sign in to create a new branch';
        }
    }
    
    /**
     * Set up periodic monitoring of auth state for initialization
     */
    setupAuthStateMonitoring() {
        // Check auth state every 500ms for the first 5 seconds
        let attempts = 0;
        const maxAttempts = this.AUTH_CHECK_MAX_ATTEMPTS;
        const interval = setInterval(() => {
            attempts++;
            this.updateNewBranchButtonState();
            
            if (attempts >= maxAttempts || (window.authService && window.authService.isAuthenticated !== undefined)) {
                clearInterval(interval);
            }
        }, this.AUTH_CHECK_INTERVAL_MS);
    }
    
    // Removed user rank functionality - ranks now only shown in navbar
    
    /**
     * Utility methods
     */
    truncateTitle(title, maxLength = 45) {
        if (!title || title.length <= maxLength) return title;
        return title.substring(0, maxLength - 3) + '...';
    }

    getOwnerDisplayName(userData) {
        if (!userData) {
            return '—';
        }
        
        // Return username without rank formatting
        const username = userData.username || userData.displayName || userData.display_name;

        // If we have a username and it's not an email, use it
        if (username && !username.includes('@')) {
            return username;
        }
        
        // If username is an email, try to get proper username from users collection
        if (userData.owner_id && window.db) {
            // Try to get username from users collection
            window.db.collection('users').doc(userData.owner_id).get()
                .then((doc) => {
                    if (doc.exists) {
                        const userDoc = doc.data();
                        const properUsername = userDoc.username || userDoc.displayName || userDoc.display_name;

                        if (properUsername && !properUsername.includes('@')) {
                            // Update the display in the UI with GitHub link
                            const row = document.querySelector(`[data-branch-id="${userData.id}"] .branch-col-owner`);

                            if (row) {
                                const githubUsername = userDoc.githubUsername || properUsername;
                                row.innerHTML = `<a href="https://github.com/${githubUsername}" target="_blank" rel="noopener noreferrer" class="username-link">${properUsername}</a>`;
                            }
                        }
                    }
                })
                .catch((error) => {
                    console.error('❌ Error looking up user in users collection:', error);
                });
        }
        
        // No fallbacks - return dash if no proper username
        return '—';
    }

    getOwnerDisplayNameWithLink(userData) {
        if (!userData) {
            return '—';
        }
        
        // Get the display name
        const username = userData.username || userData.displayName || userData.display_name;
        
        // If we have a username and it's not an email, create link
        if (username && !username.includes('@')) {
            const githubUsername = userData.githubUsername || username;
            return `<a href="https://github.com/${githubUsername}" target="_blank" rel="noopener noreferrer" class="username-link">${username}</a>`;
        }
        
        // No fallbacks - return dash if no proper username
        return '—';
    }
    
    // Removed rank formatting methods - ranks now only shown in navbar

    /**
     * Initialize branches from data service
     */
    async initBranches() {
        let items = [];
        // Prefer 'prompts', fallback to 'branches'
        items = await this.dataService.fetchFromCollection('prompts');
        if (items.length) {
            this.dataService.currentBranchesCollection = 'prompts';
        } else {
            items = await this.dataService.fetchFromCollection('branches');
            this.dataService.currentBranchesCollection = 'branches';
        }
        this.dataService.setCachedPrompts(items);
        this.applySortAndRender();
    }
    
    /**
     * Set up real-time Firestore listeners for prompt updates
     */
    setupRealTimeUpdates() {
        if (!window.db || !window.db.collection) {
            return;
        }
        // Prevent duplicate listeners
        if (this.promptsListener) {
            try { this.promptsListener(); } catch (_) {}
            this.promptsListener = null;
        }

        // Listen for changes in the prompts collection
        this.promptsListener = window.db.collection('prompts').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const docData = change.doc.data();
                const docId = change.doc.id;
                
                if (change.type === 'added') {
                    // New prompt added - add it to the list
                    this.handlePromptAdded(docId, docData);
                } else if (change.type === 'modified') {
                    // Existing prompt modified - update it in the list
                    this.handlePromptModified(docId, docData);
                } else if (change.type === 'removed') {
                    // Prompt removed - remove it from the list
                    this.handlePromptRemoved(docId);
                }
            });

            // After applying changes, re-consolidate to only show current best per branch
            const consolidated = this.dataService.consolidateToCurrentBest(this.dataService.getCachedPrompts());
            this.dataService.setCachedPrompts(consolidated);
            this.applySortAndRender();
        }, (error) => {
            console.error('❌ BranchManager: Error in real-time updates:', error);
        });
    }

    /**
     * Public controls for real-time listener to reduce Firestore reads
     */
    startRealTimeUpdates() {
        // Only start if not already listening
        if (!this.promptsListener) {
            this.setupRealTimeUpdates();
        }
    }

    stopRealTimeUpdates() {
        if (this.promptsListener) {
            try { this.promptsListener(); } catch (_) {}
            this.promptsListener = null;
        }
    }
    
    /**
     * Handle new prompt added
     * @param {string} docId - Document ID
     * @param {Object} docData - Document data
     */
    handlePromptAdded(docId, docData) {
        // Check if this prompt is already in our list
        const existingPrompt = this.dataService.getCachedPrompts().find(p => p.id === docId);
        if (existingPrompt) {
            return;
        }
        
        // Check if this is a new prompt that should replace the blank prompt
        const blankPrompt = this.dataService.getCachedPrompts().find(p => p.id === 'blank');
        if (blankPrompt && docData.parent_id === 'blank') {
            this.handlePromptModified(docId, docData);
            return;
        }
        
        // Add the new prompt to our cached list
        const newPrompt = { id: docId, ...docData };
        const currentPrompts = this.dataService.getCachedPrompts();
        currentPrompts.unshift(newPrompt); // Add to beginning
        this.dataService.setCachedPrompts(currentPrompts);
        
        // Re-render the list
        this.applySortAndRender();
    }
    
    /**
     * Handle existing prompt modified
     * @param {string} docId - Document ID
     * @param {Object} docData - Document data
     */
    handlePromptModified(docId, docData) {
        // Find the existing prompt in our cached list
        const currentPrompts = this.dataService.getCachedPrompts();
        const promptIndex = currentPrompts.findIndex(p => p.id === docId);
        
        if (promptIndex === -1) {
            return;
        }
        
        // Check if this is a blank prompt being replaced with real data
        const isBlankReplacement = currentPrompts[promptIndex].id === 'blank' && docData.id !== 'blank';
        
        // Update the prompt data
        const updatedPrompt = { ...currentPrompts[promptIndex], ...docData };
        currentPrompts[promptIndex] = updatedPrompt;
        this.dataService.setCachedPrompts(currentPrompts);
        
        if (isBlankReplacement) {
            // If this is replacing a blank prompt, we need to update the DOM attributes
            this.updateBlankPromptToReal(docId, updatedPrompt);
        } else {
            // Update the specific row in the UI without full re-render
            this.updatePromptRow(docId, updatedPrompt);
        }
    }
    
    /**
     * Handle prompt removed
     * @param {string} docId - Document ID
     */
    handlePromptRemoved(docId) {
        // Remove the prompt from our cached list
        const currentPrompts = this.dataService.getCachedPrompts();
        const promptIndex = currentPrompts.findIndex(p => p.id === docId);
        
        if (promptIndex === -1) {
            return;
        }
        
        currentPrompts.splice(promptIndex, 1);
        this.dataService.setCachedPrompts(currentPrompts);
        
        // Remove the row from the UI
        this.removePromptRow(docId);
    }
    
    /**
     * Update blank prompt to real prompt (when backend creates the real document)
     * @param {string} docId - New document ID
     * @param {Object} promptData - Prompt data
     */
    updateBlankPromptToReal(docId, promptData) {
        const blankRow = document.querySelector(`[data-branch-id="blank"]`);
        const blankDetails = document.querySelector(`[data-branch-id="blank"].branch-details`);
        
        if (!blankRow || !blankDetails) {
            return;
        }
        
        // Check if the blank prompt is currently expanded
        const isCurrentlyExpanded = blankRow.classList.contains('active');
        
        // Update the data attributes to reflect the real prompt ID
        blankRow.setAttribute('data-branch-id', docId);
        blankDetails.setAttribute('data-branch-id', docId);
        
        // Update the title
        const titleCol = blankRow.querySelector('.branch-col-title');
        if (titleCol) {
            const title = promptData.title || promptData.name || (promptData.is_main ? 'Main' : '(untitled)');
            const truncatedTitle = this.truncateTitle(title);
            titleCol.textContent = truncatedTitle;
        }
        
        // Update the owner
        const ownerCol = blankRow.querySelector('.branch-col-owner');
        if (ownerCol) {
            const owner = this.getOwnerDisplayName(promptData);
            ownerCol.textContent = owner;
        }
        
        // Update the rank
        const rankCol = blankRow.querySelector('.branch-col-rank');
        if (rankCol) {
            const currentPrompts = this.dataService.getCachedPrompts();
            const promptIndex = currentPrompts.findIndex(p => p.id === docId);
            if (promptIndex !== -1) {
                const rankLabel = this.sortManager.getLeftCellText(promptData, promptIndex + 1, this.dataService);
                rankCol.textContent = rankLabel;
            }
        }
        
        // Update the rank label from "New" to actual rank
        if (rankCol) {
            rankCol.textContent = rankCol.textContent.replace('New', '');
        }
        
        // Preserve the expanded state - if it was open, keep it open
        if (isCurrentlyExpanded) {
            // The row should already have 'active' class, just ensure details are visible
            blankDetails.style.maxHeight = blankDetails.scrollHeight + 'px';
            
            // Re-bind toolbar handlers for the new prompt ID
            this.bindToolbarHandlers(docId);
            
            // Load files for the new prompt
            this.fileManager.loadFilesForBranch(docId).catch(() => {});
            
            // Try to load latest evaluation for the new prompt
            if (promptData) {
                this.evaluationManager.tryLoadLatestEvaluationForPrompt(promptData);
            }
            
            // Update the click handler to use the new prompt ID
            blankRow.onclick = (event) => {
                // Don't expand if clicking on the ranking column
                if (event.target.classList.contains('branch-col-rank')) {
                    return;
                }
                this.expandBranch(docId);
            };
        }
    }
    
    /**
     * Update a specific prompt row in the UI
     * @param {string} docId - Document ID
     * @param {Object} promptData - Prompt data
     */
    updatePromptRow(docId, promptData) {
        const row = document.querySelector(`[data-branch-id="${docId}"]`);
        if (!row) {
            return;
        }
        
        // Update the title
        const titleCol = row.querySelector('.branch-col-title');
        if (titleCol) {
            const title = promptData.title || promptData.name || (promptData.is_main ? 'Main' : '(untitled)');
            const truncatedTitle = this.truncateTitle(title);
            titleCol.textContent = truncatedTitle;
        }
        
        // Update the owner
        const ownerCol = row.querySelector('.branch-col-owner');
        if (ownerCol) {
            const owner = this.getOwnerDisplayName(promptData);
            ownerCol.textContent = owner;
        }
        
        // Update the rank if needed
        const rankCol = row.querySelector('.branch-col-rank');
        if (rankCol) {
            const currentPrompts = this.dataService.getCachedPrompts();
            const promptIndex = currentPrompts.findIndex(p => p.id === docId);
            if (promptIndex !== -1) {
                const rankLabel = this.sortManager.getLeftCellText(promptData, promptIndex + 1, this.dataService);
                rankCol.textContent = rankLabel;
            }
        }
    }
    
    /**
     * Remove a prompt row from the UI
     * @param {string} docId - Document ID
     */
    removePromptRow(docId) {
        const row = document.querySelector(`[data-branch-id="${docId}"]`);
        const details = document.querySelector(`[data-branch-id="${docId}"].branch-details`);
        
        if (row) row.remove();
        if (details) details.remove();
    }
    
    /**
     * Clean up real-time listeners
     */
    cleanup() {
        if (this.promptsListener) {
            this.promptsListener();
            this.promptsListener = null;
        }
    }

    // Public API for other modules
    getCachedPrompts() {
        return this.dataService.getCachedPrompts();
    }

    clearProjectsUI() {
        this.dataService.clearProjectsUI();
    }

    pickBestPrompt() {
        return this.dataService.pickBestPrompt();
    }
}

// Export for use in other modules
window.BranchManager = BranchManager;
