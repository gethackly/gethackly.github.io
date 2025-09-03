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
    
    // Expose managers globally for theme management and other utilities
    window.editorManager = editorManager;
    window.branchManager = branchManager;
    window.dataService = dataService;
});
