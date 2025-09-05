// DataService.js - Handles Firebase operations and data fetching

class DataService {
    constructor() {
        this.currentBranchesCollection = 'prompts';
        this.cachedPrompts = [];
        this.rawPrompts = [];
    }

    // Safe data extraction utilities
    getCreatedAtSafe(p) {
        return p && (p.created_at || p.updated_at || (p.latest_evaluation && p.latest_evaluation.created_at) || '') || '';
    }

    getScoreSafe(p) {
        try {
            const s1 = (p && p.latest_evaluation && p.latest_evaluation.score_total);
            const s2 = (p && p.score_total);
            const v = Number(s1 != null ? s1 : (s2 != null ? s2 : 0));
            return isFinite(v) ? v : 0;
        } catch { return 0; }
    }

    getVotesSafe(p) {
        try {
            const rc = (((p || {}).discord || {}).reaction_counts) || {};
            let sum = 0;
            for (const k of Object.keys(rc)) {
                const v = Number(rc[k] || 0);
                if (isFinite(v)) sum += v;
            }
            return sum;
        } catch { return 0; }
    }

    parseIso(dateStr) {
        try { return new Date(dateStr).getTime() || 0; } catch { return 0; }
    }

    // Collection fetching
    async fetchFromCollection(name) {
        try {
            if (!window.db || !window.db.collection) {
                console.warn(`❌ DataService: Firebase not initialized, cannot fetch ${name}`);
                return [];
            }

            const snapshot = await window.db.collection(name).get();
            const items = [];
            
            snapshot.forEach(doc => {
                const data = doc.data() || {};
                items.push({ id: doc.id, ...data });
            });

            return items;
        } catch (err) {
            console.error(`❌ DataService: Failed to fetch collection ${name}:`, err);
            return [];
        }
    }

    async fetchBranchContent(branchId) {
        if (!window.db || !window.db.collection) {
            console.warn(`❌ DataService: Firebase not initialized, cannot fetch content for ${branchId}`);
            return '';
        }
        
        try {

            const docRef = await window.db.collection(this.currentBranchesCollection).doc(branchId).get();
            
            if (!docRef.exists) {
                console.warn(`⚠️ DataService: Branch ${branchId} not found`);
                return '';
            }
            
            const data = docRef.data() || {};
            
            // Heuristic: prefer 'content'/'body'/'text'; fallback to pretty JSON
            const candidate = data.content || data.body || data.text || '';
            if (typeof candidate === 'string') {

                return candidate;
            }

            return JSON.stringify(data, null, 2);
        } catch (err) {
            console.error(`❌ DataService: Failed to fetch branch content for ${branchId}:`, err);
            return '';
        }
    }

    // Fetch a prompt document by id
    async fetchPromptById(promptId) {
        try {
            if (!window.db || !promptId) return null;
            const docRef = await window.db.collection(this.currentBranchesCollection).doc(promptId).get();
            if (!docRef.exists) return null;
            return { id: docRef.id, ...(docRef.data() || {}) };
        } catch (err) {
            console.error(`❌ DataService: Failed to fetch prompt by id ${promptId}:`, err);
            return null;
        }
    }

        // Evaluation data loading
    async loadFromEvaluationRequestsPreferDetailed(promptId) {
        if (!window.db || !promptId) return null;

        try {
            // Try primary prompt_id first
            const primaryResult = await this._loadEvaluationsFromField('prompt_id', promptId);
            if (primaryResult) return primaryResult;
            
            // Try source_prompt_id as fallback

            const fallbackResult = await this._loadEvaluationsFromField('source_prompt_id', promptId);
            if (fallbackResult) return fallbackResult;

            return null;
        } catch (err) {
            console.error('❌ DataService: Error loading evaluations:', err);
            return null;
        }
    }

    // Helper method to load evaluations from a specific field
    async _loadEvaluationsFromField(fieldName, value) {
        try {
            const reqs = window.db.collection('evaluation_requests')
                .where(fieldName, '==', value)
                .limit(20);
            
            const snap = await reqs.get();

            const candidates = [];
            snap.forEach((d) => {
                const data = d.data() || {};
                if ((data.status || '') === 'done' && data.result) {
                    candidates.push({ created_at: data.created_at, result: data.result });
                }
            });

            if (candidates.length > 0) {
                candidates.sort((a, b) => this.parseIso(b.created_at) - this.parseIso(a.created_at));
                const results = candidates.map(c => c.result);
                const rich = results.find((r) => this.hasRationales(r)) || results[0] || null;

                return rich;
            }
            
            return null;
        } catch (err) {
            console.error(`❌ DataService: Error in ${fieldName} query:`, err);
            return null;
        }
    }

    hasRationales(obj) {
        if (!obj) return false;
        const rA = this.safe(obj, ['rationales','accuracy'], this.safe(obj, ['rationale_accuracy'], ''));
        const rR = this.safe(obj, ['rationales','reliability'], this.safe(obj, ['rationale_reliability'], ''));
        const rC = this.safe(obj, ['rationales','complexity'], this.safe(obj, ['rationale_complexity'], ''));
        const weak = this.safe(obj, ['weaknesses'], '');
        const sugg = this.safe(obj, ['suggestions'], '');
        return Boolean((rA && typeof rA === 'string' && rA.trim()) || 
                      (rR && typeof rR === 'string' && rR.trim()) || 
                      (rC && typeof rC === 'string' && rC.trim()) || 
                      (weak && typeof weak === 'string' && weak.trim()) || 
                      (sugg && typeof sugg === 'string' && sugg.trim()));
    }

    safe(obj, path, fallback) {
        try { return path.reduce((o, k) => (o || {})[k], obj) ?? fallback; } catch { return fallback; }
    }

    // Collection initialization
    async initBranches() {
        try {
            let items = [];
            // Prefer 'prompts', fallback to 'branches'
            items = await this.fetchFromCollection('prompts');
            if (items.length) {
                this.currentBranchesCollection = 'prompts';

            } else {
                items = await this.fetchFromCollection('branches');
                this.currentBranchesCollection = 'branches';

            }
            this.rawPrompts = items.slice();
            this.cachedPrompts = this.consolidateToCurrentBest(this.rawPrompts);

            return items;
        } catch (err) {
            console.error('❌ DataService: Error initializing branches:', err);
            return [];
        }
    }

    getCachedPrompts() {
        return (this.cachedPrompts || []).slice();
    }

    setCachedPrompts(prompts) {
        this.rawPrompts = prompts ? prompts.slice() : [];
        this.cachedPrompts = this.consolidateToCurrentBest(this.rawPrompts);
    }

    // Keep only the current best prompt per branch_root_id.
    // Fallback: if no is_current_best flag exists for a branch, pick highest score.
    consolidateToCurrentBest(prompts) {
        try {
            const byRoot = new Map();
            for (const p of (prompts || [])) {
                const root = p.branch_root_id || p.id || 'unknown';
                const arr = byRoot.get(root) || [];
                arr.push(p);
                byRoot.set(root, arr);
            }

            const pickForRoot = (arr) => {
                if (!Array.isArray(arr) || arr.length === 0) return null;
                // Prefer explicit current best
                const flagged = arr.find(x => x.is_current_best === true);
                if (flagged) return flagged;
                // Else, pick highest score
                let best = arr[0];
                let bestScore = this.getScoreSafe(best);
                for (let i = 1; i < arr.length; i++) {
                    const s = this.getScoreSafe(arr[i]);
                    if (s > bestScore) {
                        best = arr[i];
                        bestScore = s;
                    }
                }
                return best;
            };

            const result = [];
            for (const [, arr] of byRoot.entries()) {
                const chosen = pickForRoot(arr);
                if (chosen) result.push(chosen);
            }
            // Preserve 'blank' if present (UI creation row)
            const hasBlank = (prompts || []).some(p => p && p.id === 'blank');
            if (hasBlank && !result.some(p => p && p.id === 'blank')) {
                const blank = (prompts || []).find(p => p && p.id === 'blank');
                if (blank) result.unshift(blank);
            }
            return result;
        } catch (err) {
            console.warn('⚠️ DataService: consolidation failed, returning original prompts:', err);
            return prompts ? prompts.slice() : [];
        }
    }

    clearProjectsUI() {
        try { 
            this.cachedPrompts = []; 
            const el = document.getElementById('branchesContainer'); 
            if (el) el.innerHTML = ''; 
        } catch {} 
    }

    pickBestPrompt() {
        try {
            const items = (this.cachedPrompts || []).slice();
            if (!items.length) return null;
            
            let best = null, bestScore = -Infinity;
            for (const p of items) {
                const s = this.getScoreSafe(p);
                if (s > bestScore) { 
                    bestScore = s; 
                    best = p; 
                }
            }

            return best;
        } catch (err) {
            console.error('❌ DataService: Error picking best prompt:', err);
            return null;
        }
    }

    // Utility methods for data validation
    isValidPrompt(prompt) {
        return prompt && 
               prompt.id && 
               (prompt.title || prompt.name || prompt.content || prompt.body);
    }

    // Get collection statistics
    getCollectionStats() {
        const prompts = this.getCachedPrompts();
        const totalPrompts = prompts.length;
        const scoredPrompts = prompts.filter(p => this.getScoreSafe(p) > 0).length;
        const averageScore = totalPrompts > 0 
            ? prompts.reduce((sum, p) => sum + this.getScoreSafe(p), 0) / totalPrompts 
            : 0;
        
        return {
            total: totalPrompts,
            scored: scoredPrompts,
            averageScore: Math.round(averageScore * 100) / 100,
            collection: this.currentBranchesCollection
        };
    }
}

// Export for use in other modules
window.DataService = DataService;
