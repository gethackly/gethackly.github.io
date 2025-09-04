// PerformanceOptimizer.js - Handles performance optimizations

class PerformanceOptimizer {
    constructor() {
        this.debounceTimers = new Map();
        this.intersectionObserver = null;
        this.visibleBranches = new Set();
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
    }

    // Debouncing utility
    debounce(key, callback, delay = 300) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            callback();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    // Cancel debounced operation
    cancelDebounce(key) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
            this.debounceTimers.delete(key);
        }
    }

    // Setup intersection observer for lazy loading
    setupIntersectionObserver() {
        if (!window.IntersectionObserver) return;

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const branchId = entry.target.getAttribute('data-branch-id');
                    if (entry.isIntersecting) {
                        this.visibleBranches.add(branchId);
                        this.onBranchVisible(branchId);
                    } else {
                        this.visibleBranches.delete(branchId);
                        this.onBranchHidden(branchId);
                    }
                });
            },
            {
                root: null,
                rootMargin: '100px', // Start loading 100px before visible
                threshold: 0.1
            }
        );
    }

    // Observe a branch element for lazy loading
    observeBranch(branchElement) {
        if (this.intersectionObserver && branchElement) {
            this.intersectionObserver.observe(branchElement);
        }
    }

    // Called when a branch becomes visible
    onBranchVisible(branchId) {
        // Dispatch event for other modules to handle
        window.dispatchEvent(new CustomEvent('branch-visible', { 
            detail: { branchId } 
        }));
    }

    // Called when a branch is hidden
    onBranchHidden(branchId) {
        // Dispatch event for other modules to handle
        window.dispatchEvent(new CustomEvent('branch-hidden', { 
            detail: { branchId } 
        }));
    }

    // Get currently visible branches
    getVisibleBranches() {
        return Array.from(this.visibleBranches);
    }

    // Check if a branch is currently visible
    isBranchVisible(branchId) {
        return this.visibleBranches.has(branchId);
    }

    // Cleanup
    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        this.visibleBranches.clear();
    }
}

// Export for use in other modules
window.PerformanceOptimizer = PerformanceOptimizer;


