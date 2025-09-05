// EvaluationManager.js - Handles AI evaluation operations and sidebar display

class EvaluationManager {
    constructor() {
        this.dataService = null;
        this.sidebarManager = null;
        this.pendingEvaluation = null;
    }

    setDataService(dataService) {
        this.dataService = dataService;
    }

    setSidebarManager(sidebarManager) {
        this.sidebarManager = sidebarManager;
    }

    setFileManager(fileManager) {
        this.fileManager = fileManager;
    }

    // Evaluation request creation
    async createEvaluationRequest(prompt, modelEl, branchId, branchName) {
        
        try {
            if (this.sidebarManager) {
                this.sidebarManager.setSidebarSummary('Creating request...');
            }
            
            const fileData = this.fileManager ? this.fileManager.getFileDataForEvaluation(branchId) : { exclude: [], newFiles: [] };
            
            // Get current user information for the prompt
            const currentUser = window.authService?.getCurrentUser();
            
            const userInfo = currentUser ? {
                uid: currentUser.uid,
                username: currentUser.username || currentUser.displayName || currentUser.email,
                email: currentUser.email
            } : null;
            
            // Ensure all required fields are properly set
            const payload = {
                prompt: prompt || '',
                status: 'pending',
                created_at: new Date().toISOString(),
                selected_model: modelEl ? (modelEl.value || 'Auto Model') : 'Auto Model',
                prompt_id: branchId || '',
                source_prompt_id: branchId || '',
                new_files: fileData.newFiles || [],
                exclude_file_ids: fileData.exclude || [],
                branch_name: branchName || '(untitled)',
                user: userInfo || null
            };
            
            // Validate payload before sending to Firebase
            const requiredFields = ['prompt', 'status', 'created_at', 'selected_model', 'prompt_id', 'source_prompt_id', 'branch_name'];
            const missingFields = requiredFields.filter(field => !payload[field]);
            if (missingFields.length > 0) {
                console.error('❌ EvaluationManager: Missing required fields:', missingFields);
                if (this.sidebarManager) {
                    this.sidebarManager.setSidebarSummary('Missing required fields: ' + missingFields.join(', '));
                }
                return;
            }
            
            if (!window.db || !window.db.collection) { 
                console.error('❌ EvaluationManager: Database not available');
                if (this.sidebarManager) {
                    this.sidebarManager.setSidebarSummary('Database not available.');
                }
                return; 
            }
            
            const ref = await window.db.collection('evaluation_requests').add(payload);
            
            if (this.sidebarManager) {
                this.sidebarManager.setSidebarSummary('Queued. Processing...');
            }
            
            const docRef = window.db.collection('evaluation_requests').doc(ref.id);
            docRef.onSnapshot((snap) => {
                if (!snap.exists) return;
                const data = snap.data() || {};
                const st = data.status || 'unknown';
                const promptIdForEvent = data.prompt_id || data.source_prompt_id || null;
                
                if (st === 'processing') {
                    if (this.sidebarManager) {
                        this.sidebarManager.setSidebarSummary('Processing...');
                    }
                    try {
                        window.dispatchEvent(new CustomEvent('evaluation-status', {
                            detail: { status: 'processing', promptId: promptIdForEvent, requestId: ref.id }
                        }));
                    } catch (_) {}
                } else if (st === 'done') {
                    const result = data.result || {};
                    this.displayEvaluationInSidebar(result);
                    
                    // For improvements, use the new prompt_id; for new prompts, use source_prompt_id
                    const newPromptId = data.prompt_id || promptIdForEvent;
                    const originalPromptId = data.source_prompt_id || promptIdForEvent;
                    
                    try {
                        window.dispatchEvent(new CustomEvent('evaluation-status', {
                            detail: { status: 'done', promptId: newPromptId, requestId: ref.id, result }
                        }));
                        window.dispatchEvent(new CustomEvent('evaluation-done', {
                            detail: { 
                                promptId: newPromptId, 
                                originalPromptId: originalPromptId,
                                requestId: ref.id, 
                                result,
                                isImprovement: Boolean(data.source_prompt_id && data.prompt_id !== data.source_prompt_id)
                            }
                        }));
                    } catch (_) {}
                } else if (st === 'error') {
                    const errorMessage = data.error || '(unknown error)';
                    
                    // Check if this is a validation error (improvement blocked or new prompt blocked)
                    if (errorMessage.includes('unrelated') || errorMessage.includes('validation') || errorMessage.includes('blocked') || errorMessage.includes('low-quality') || errorMessage.includes('nonsensical')) {
                        const isImprovement = errorMessage.includes('unrelated') || errorMessage.includes('parent');
                        const reason = errorMessage.replace(/^.*?(failed basic validation|appears to be).*?$/i, '').trim() || 'it seems to contain low-quality content';
                        
                        if (this.sidebarManager) {
                            this.sidebarManager.showValidationError(
                                isImprovement ? 'Improvement Blocked' : 'Prompt Blocked',
                                `Your ${isImprovement ? 'improvement' : 'prompt'} was not evaluated because ${reason}.`
                            );
                        }
                    } else {
                        if (this.sidebarManager) {
                            this.sidebarManager.showError(errorMessage);
                        }
                    }
                    
                    try {
                        window.dispatchEvent(new CustomEvent('evaluation-status', {
                            detail: { status: 'error', promptId: promptIdForEvent, requestId: ref.id, error: errorMessage }
                        }));
                    } catch (_) {}
                }
            });
        } catch (e) {
            console.error('❌ EvaluationManager: Error creating evaluation request:', e);
            console.error('❌ EvaluationManager: Error details:', {
                message: e.message,
                code: e.code,
                stack: e.stack
            });
            if (this.sidebarManager) {
                this.sidebarManager.setSidebarSummary(`Error: ${e.message || 'Unknown error'}`);
            }
        }
    }

    // Continue evaluation with name
    continueEvaluationWithName(name) {
        if (!this.pendingEvaluation) return;
        
        const { prompt, model, branchId } = this.pendingEvaluation;
        this.pendingEvaluation = null;
        
        // Create a mock modelEl for the createEvaluationRequest function
        const mockModelEl = { value: model };
        
        // Continue with evaluation using the provided name
        this.createEvaluationRequest(prompt, mockModelEl, branchId, name);
    }

    // Set pending evaluation
    setPendingEvaluation(prompt, model, branchId) {
        this.pendingEvaluation = { prompt, model, branchId };
    }

    // Sidebar evaluation display
    displayEvaluationInSidebar(evaluationLike) {
        if (!evaluationLike) { 
            if (this.sidebarManager) {
                this.sidebarManager.setSidebarSummary('');
            }
            return; 
        }
        
        const summary = this.formatSummary(evaluationLike);
        
        if (this.sidebarManager) {
            this.sidebarManager.setSidebarSummary(summary.html);
        }
    }

    formatSummary(result) {
        const total = this.safe(result, ['score_total'], 'N/A');
        const acc = this.safe(result, ['accuracy'], 'N/A');
        const rel = this.safe(result, ['reliability'], 'N/A');
        const cmp = this.safe(result, ['complexity'], 'N/A');
        const rationaleAcc = this.safe(result, ['rationales','accuracy'], this.safe(result, ['rationale_accuracy'], ''));
        const rationaleRel = this.safe(result, ['rationales','reliability'], this.safe(result, ['rationale_reliability'], ''));
        const rationaleCmp = this.safe(result, ['rationales','complexity'], this.safe(result, ['rationale_complexity'], ''));
        const weaknesses = this.safe(result, ['weaknesses'], '');
        const suggestions = this.safe(result, ['suggestions'], '');
        
        let html = '';
        html += `<div class="headline">Total: ${this.escapeHtml(total)}</div>`;
        html += `<div class="metric">Accuracy — (${this.escapeHtml(acc)})</div>`;
        if (rationaleAcc) html += `<div class="block">${this.escapeHtml(rationaleAcc)}</div>`;
        html += `<div class="metric">Complexity — (${this.escapeHtml(cmp)})</div>`;
        if (rationaleCmp) html += `<div class="block">${this.escapeHtml(rationaleCmp)}</div>`;
        html += `<div class="metric">Reliability — (${this.escapeHtml(rel)})</div>`;
        if (rationaleRel) html += `<div class="block">${this.escapeHtml(rationaleRel)}</div>`;
        if (weaknesses) html += `<div class="metric">Weaknesses</div><div class="block">${this.escapeHtml(weaknesses)}</div>`;
        if (suggestions) html += `<div class="metric">Suggestions</div><div class="block">${this.escapeHtml(suggestions)}</div>`;
        
        return { html };
    }

    // Utility methods
    escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    safe(obj, path, fallback) {
        try { return path.reduce((o, k) => (o || {})[k], obj) ?? fallback; } catch { return fallback; }
    }

    hasRationales(obj) {
        if (!obj) return false;
        const rA = this.safe(obj, ['rationales','accuracy'], this.safe(obj, ['rationale_accuracy'], ''));
        const rR = this.safe(obj, ['rationales','reliability'], this.safe(obj, ['rationale_reliability'], ''));
        const rC = this.safe(obj, ['rationales','complexity'], this.safe(obj, ['rationale_complexity'], ''));
        const weak = this.safe(obj, ['weaknesses'], '');
        const sugg = this.safe(obj, ['suggestions'], '');
        return Boolean((rA && rA.trim()) || (rR && rR.trim()) || (rC && rC.trim()) || (weak && weak.trim()) || (sugg && sugg.trim()));
    }

    // Load latest evaluation for prompt
    async tryLoadLatestEvaluationForPrompt(prompt) {
        if (!prompt || !prompt.id) { 
            if (this.sidebarManager) {
                this.sidebarManager.setSidebarSummary('');
            }
            return; 
        }
        
        try {
            // First try to load from evaluation requests
            const res = await this.dataService.loadFromEvaluationRequestsPreferDetailed(prompt.id);
            
            if (res) {
                this.displayEvaluationInSidebar(res);
                return;
            }
            
            // Fallback to prompt's latest_evaluation
            if (prompt.latest_evaluation && Object.keys(prompt.latest_evaluation).length > 0) {
                this.displayEvaluationInSidebar(prompt.latest_evaluation);
                return;
            }
            
            // Final fallback to evaluations collection
            if (window.db) {
                window.db.collection('evaluations')
                    .where('prompt_id', '==', prompt.id)
                    .limit(20)
                    .get()
                    .then((snap) => {
                        if (!snap.empty) {
                            const docs = [];
                            snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
                            docs.sort((a, b) => this.dataService.parseIso(b.created_at) - this.dataService.parseIso(a.created_at));
                            const latest = docs[0];
                            this.displayEvaluationInSidebar(latest);
                        } else {
                            if (this.sidebarManager) {
                                this.sidebarManager.setSidebarSummary('');
                            }
                        }
                    })
                    .catch((err) => {
                        console.error('❌ Error fetching from evaluations collection:', err);
                        if (this.sidebarManager) {
                            this.sidebarManager.setSidebarSummary('');
                        }
                    });
            } else {
                if (this.sidebarManager) {
                    this.sidebarManager.setSidebarSummary('');
                }
            }
        } catch (e) {
            console.error('❌ Error in tryLoadLatestEvaluationForPrompt:', e);
            if (this.sidebarManager) {
                this.sidebarManager.setSidebarSummary('');
            }
        }
    }
}

// Export for use in other modules
window.EvaluationManager = EvaluationManager;
