// layout-new.js - Main orchestrator for the modular Hackly system

document.addEventListener('DOMContentLoaded', () => {

    // Initialize all managers
    const panelManager = new PanelManager();

    const dataService = new DataService();

    const sortManager = new SortManager();

    const modalManager = new ModalManager();

    const fileManager = new FileManager();

    const editorManager = new EditorManager();

    const evaluationManager = new EvaluationManager();

    const sidebarManager = new SidebarManager();

    // Initialize performance optimizers
    const performanceOptimizer = new PerformanceOptimizer();

    const domOptimizer = new DOMOptimizer();

    const branchManager = new BranchManager();

    // Set up dependencies between managers

    branchManager.setDependencies(
        dataService, 
        sortManager, 
        fileManager, 
        editorManager, 
        evaluationManager, 
        sidebarManager, 
        modalManager,
        performanceOptimizer,
        domOptimizer
    );

    // Initialize branches when Firebase is ready
    window.addEventListener('firebase-ready', () => { 
        // Re-initialize branches when Firebase is ready
        branchManager.initBranches().catch(console.warn); 
    });

    // Expose minimal API for round handling (maintaining compatibility)
    window.hackly = window.hackly || {};
    window.hackly.getCachedPrompts = () => branchManager.getCachedPrompts();
    window.hackly.fetchBranchContent = (branchId) => dataService.fetchBranchContent(branchId);
    window.hackly.clearProjectsUI = () => branchManager.clearProjectsUI();
    window.hackly.pickBestPrompt = () => branchManager.pickBestPrompt();
    
    // Initialize tour system
    const tourManager = new TourManager();
    
    // Bind tour button
    const tourButton = document.getElementById('tourButton');
    if (tourButton) {
        tourButton.addEventListener('click', () => {
            tourManager.startTour();
        });
    }
    
    // Add notification dot for first-time visitors
    if (!tourManager.hasCompletedTour()) {
        tourManager.addNotificationDot();
    }
    
    // Expose managers globally for theme management and other utilities
    window.editorManager = editorManager;
    window.branchManager = branchManager;
    window.dataService = dataService;
    window.tourManager = tourManager;

    // Reduce Firestore reads: gate listeners by visibility and active panel
    const handleVisibility = () => {
        const hidden = document.hidden;
        if (hidden) {
            // Pause heavy listeners when tab is hidden
            if (window.branchManager && typeof window.branchManager.stopRealTimeUpdates === 'function') {
                window.branchManager.stopRealTimeUpdates();
            }
            if (window.leaderboardManager && typeof window.leaderboardManager.stopListening === 'function') {
                window.leaderboardManager.stopListening();
            }
        } else {
            // Resume only for currently visible panel(s)
            const currentPanel = panelManager.getCurrentPanel();
            const name = currentPanel ? currentPanel.getAttribute('data-panel') : 'projects';
            if (name === 'projects') {
                if (window.branchManager && typeof window.branchManager.startRealTimeUpdates === 'function') {
                    window.branchManager.startRealTimeUpdates();
                }
            }
            if (name === 'leaderboard') {
                if (window.leaderboardManager && typeof window.leaderboardManager.startListening === 'function' && !window.leaderboardManager.isActive) {
                    window.leaderboardManager.startListening();
                }
            }
        }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Panel-based listener gating
    window.addEventListener('panel-expanded', (evt) => {
        const name = (evt && evt.detail && evt.detail.name) || '';
        // Projects panel controls prompts listener
        if (name === 'projects') {
            if (window.branchManager && typeof window.branchManager.startRealTimeUpdates === 'function') {
                window.branchManager.startRealTimeUpdates();
            }
            if (window.leaderboardManager && typeof window.leaderboardManager.stopListening === 'function') {
                window.leaderboardManager.stopListening();
            }
        }
        // Leaderboard panel controls leaderboard listener
        if (name === 'leaderboard') {
            if (window.leaderboardManager && typeof window.leaderboardManager.startListening === 'function' && !window.leaderboardManager.isActive) {
                window.leaderboardManager.startListening();
            }
            if (window.branchManager && typeof window.branchManager.stopRealTimeUpdates === 'function') {
                window.branchManager.stopRealTimeUpdates();
            }
        }
        // Archive or others: pause both heavy listeners
        if (name !== 'projects' && name !== 'leaderboard') {
            if (window.branchManager && typeof window.branchManager.stopRealTimeUpdates === 'function') {
                window.branchManager.stopRealTimeUpdates();
            }
            if (window.leaderboardManager && typeof window.leaderboardManager.stopListening === 'function') {
                window.leaderboardManager.stopListening();
            }
        }
    });

    // Initial gating on load
    setTimeout(handleVisibility, 0);
});
