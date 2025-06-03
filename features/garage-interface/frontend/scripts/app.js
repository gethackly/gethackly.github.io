// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    try {
        // Check authentication state
        window.auth.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in
                setupAuthenticatedUI(user);
            } else {
                // User is signed out
                setupUnauthenticatedUI();
            }
        });

        // Initialize UI components
        initializeUI();
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

function setupAuthenticatedUI(user) {
    // Update UI for authenticated user
    const userElements = document.querySelectorAll('.user-info');
    userElements.forEach(element => {
        element.textContent = user.displayName || user.email;
    });
}

function setupUnauthenticatedUI() {
    // Disable document creation
    const createForms = document.querySelectorAll('#idea_form_desktop, #idea_form_mobile');
    createForms.forEach(form => {
        form.style.display = 'none';
    });

    // Update UI for unauthenticated user
    const userElements = document.querySelectorAll('.user-info');
    userElements.forEach(element => {
        element.textContent = 'Guest';
    });
}

function initializeUI() {
    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });

    // Initialize keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function showTooltip(event) {
    const tooltip = event.target.getAttribute('data-tooltip');
    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'tooltip';
    tooltipElement.textContent = tooltip;
    
    const rect = event.target.getBoundingClientRect();
    tooltipElement.style.top = `${rect.bottom + 5}px`;
    tooltipElement.style.left = `${rect.left + (rect.width / 2)}px`;
    
    document.body.appendChild(tooltipElement);
}

function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + K for search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('.search_input');
        if (searchInput) {
            searchInput.focus();
        }
    }

    // Esc to close modal
    if (event.key === 'Escape') {
        const modal = document.getElementById('doc_modal');
        if (modal && modal.style.display === 'flex') {
            modal.style.display = 'none';
            document.body.classList.remove('no-scroll');
        }
    }
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
}

// Export functions for use in other modules (if needed, attach to window)
window.initializeApp = initializeApp;
window.setupAuthenticatedUI = setupAuthenticatedUI;
window.setupUnauthenticatedUI = setupUnauthenticatedUI;
window.showError = showError; 