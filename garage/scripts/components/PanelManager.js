// PanelManager.js - Handles panel switching and state management

class PanelManager {
    constructor() {
        this.panels = [];
        this.currentPanel = null;
        this.init();
    }

    init() {
        this.panels = Array.from(document.querySelectorAll('.panel'));
        this.bindEvents();
        this.initializeFromHash();
    }

    bindEvents() {
        this.panels.forEach(panel => {
            const tab = panel.querySelector('.panel-tab');
            if (tab) {
                tab.onclick = () => this.expandPanel(panel);
            }
        });
    }

    expandPanel(target) {
        this.panels.forEach(panel => panel.classList.remove('expanded'));
        target.classList.add('expanded');
        this.currentPanel = target;
        
        // Handle special panel logic
        if (target.getAttribute('data-panel') === 'leaderboard') {
            this.tryInitLeaderboard();
        }
    }

    initializeFromHash() {
        const initial = window.location.hash?.replace('#', '');
        if (initial) {
            const found = document.querySelector(`.panel[data-panel="${initial}"]`);
            if (found) this.expandPanel(found);
        }
    }

    tryInitLeaderboard() {
        // This will be handled by LeaderboardManager
        if (window.leaderboardManager) {
            window.leaderboardManager.init();
        }
    }

    getCurrentPanel() {
        return this.currentPanel;
    }

    getPanelByName(name) {
        return this.panels.find(panel => panel.getAttribute('data-panel') === name);
    }
}

// Export for use in other modules
window.PanelManager = PanelManager;

