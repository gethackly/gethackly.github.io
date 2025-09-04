// SidebarManager.js - Handles sidebar operations and evaluation display

class SidebarManager {
    constructor() {
        this.evalSummaryElement = null;
        this.LOG_PREFIX = 'SidebarManager';
        this.init();
    }

    init() {
        this.evalSummaryElement = document.getElementById('evalSummary');
    }

    // Sidebar summary management
    setSidebarSummary(html) {
        if (!this.evalSummaryElement) {
            console.error(`❌ ${this.LOG_PREFIX}: No evalSummary element found`);
            return;
        }
        
        // Get the title element
        const titleElement = document.querySelector('.sidebar-title');
        
        if (!html) {
            this.evalSummaryElement.innerHTML = '';
            // Hide title when no content
            if (titleElement) titleElement.style.display = 'none';
            // Remove expanded class when no content
            this.setSidebarExpanded(false);
            return;
        }
        
        this.evalSummaryElement.innerHTML = html;
        // Show title when there's content
        if (titleElement) titleElement.style.display = 'block';
        // Add expanded class when there's content
        this.setSidebarExpanded(true);
    }

    getSidebarSummary() {
        return this.evalSummaryElement ? this.evalSummaryElement.innerHTML : '';
    }

    clearSidebarSummary() {
        this.setSidebarSummary('');
    }

    // Set sidebar expanded state
    setSidebarExpanded(expanded) {
        const sidebarTop = document.querySelector('.sidebar-top');
        if (sidebarTop) {
            if (expanded) {
                sidebarTop.classList.add('expanded');
            } else {
                sidebarTop.classList.remove('expanded');
            }
        }
    }

    // Utility methods
    isSidebarVisible() {
        return this.evalSummaryElement && this.evalSummaryElement.innerHTML.trim() !== '';
    }

    // Update sidebar with loading state
    showLoading(message = 'Loading...') {
        this.setSidebarSummary(`<div class="loading">${message}</div>`);
    }

    // Update sidebar with error state
    showError(message = 'An error occurred') {
        this.setSidebarSummary(`<div class="error">${message}</div>`);
    }

    // Update sidebar with success state
    showSuccess(message = 'Operation completed successfully') {
        this.setSidebarSummary(`<div class="success">${message}</div>`);
    }
}

// Export for use in other modules
window.SidebarManager = SidebarManager;
