// Authentication Gate - Controls access to authenticated features
class AuthGate {
    constructor() {
        this.requireAuthCallbacks = new Map();
        this.init();
    }

    init() {
        // Wait for auth service to be ready
        if (window.authService) {
            this.setupAuthGate();
        } else {
            window.addEventListener('auth-ready', () => this.setupAuthGate());
        }
    }

    setupAuthGate() {
        // Listen for auth state changes
        window.authService.addAuthStateListener((user) => {
            this.updateAuthGates(user);
        });
    }

    /**
     * Require authentication for a specific action
     * @param {string} actionName - Name of the action (e.g., 'create-branch', 'comment')
     * @param {Function} callback - Function to execute if authenticated
     * @param {string} message - Custom message to show in auth prompt
     */
    requireAuth(actionName, callback, message = null) {
        this.requireAuthCallbacks.set(actionName, { callback, message });
        
        return (...args) => {
            if (window.authService && window.authService.isAuthenticated()) {
                // User is authenticated, execute callback
                return callback(...args);
            } else {
                // User not authenticated, show auth prompt
                this.showAuthPrompt(actionName, message);
                return false;
            }
        };
    }

    /**
     * Show authentication prompt for a specific action
     */
    showAuthPrompt(actionName, customMessage = null) {
        const actionMessages = {
            'create-branch': 'Sign in to create a new branch',
            'comment': 'Sign in to leave a comment',
            'like': 'Sign in to like this content',
            'save': 'Sign in to save this content',
            'share': 'Sign in to share this content',
            'edit': 'Sign in to edit this content',
            'delete': 'Sign in to delete this content',
            'upload': 'Sign in to upload files',
            'download': 'Sign in to download files',
            'evaluate': 'Sign in to evaluate prompts',
            'vote': 'Sign in to vote on content'
        };

        const message = customMessage || actionMessages[actionName] || 'Sign in with GitHub to continue';
        
        // Create auth prompt modal
        const promptModal = document.createElement('div');
        promptModal.className = 'auth-prompt-modal';
        Object.assign(promptModal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10000',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        const promptContent = document.createElement('div');
        promptContent.className = 'auth-prompt-content';
        Object.assign(promptContent.style, {
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            borderRadius: '0',
            padding: '40px',
            width: '90%',
            maxWidth: '400px',
            textAlign: 'center',
            transform: 'scale(0.9)',
            transition: 'transform 0.3s ease',
            border: '1px solid var(--color-text)'
        });

        promptContent.innerHTML = `
            <h2>Sign In Required</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 30px;">${message}</p>
            
            <button onclick="window.authGate.signIn()" class="auth-btn auth-btn-github">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>Sign In</span>
            </button>
        `;

        promptModal.appendChild(promptContent);
        document.body.appendChild(promptModal);

        // Animate in
        setTimeout(() => {
            promptModal.style.opacity = '1';
            promptContent.style.transform = 'scale(1)';
        }, 10);

        // Add click-outside-to-close functionality
        promptModal.addEventListener('click', (e) => {
            if (e.target === promptModal) {
                this.closePrompt();
            }
        });

        // Store reference
        this.currentPromptModal = promptModal;
    }

    /**
     * Close the current auth prompt
     */
    closePrompt() {
        if (this.currentPromptModal) {
            this.currentPromptModal.style.opacity = '0';
            const content = this.currentPromptModal.querySelector('.auth-prompt-content');
            if (content) content.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                this.currentPromptModal.remove();
                this.currentPromptModal = null;
            }, 300);
        }
    }

    /**
     * Show sign in modal
     */
    signIn() {
        this.closePrompt();
        if (window.mainAuth) {
            window.mainAuth.showAuthModal();
        }
    }

    /**
     * Update all auth gates based on authentication state
     */
    updateAuthGates(user) {
        // You can add logic here to update UI elements based on auth state
        // For example, show/hide certain buttons or change their behavior
        if (user) {
            // User is authenticated

        } else {
            // User is not authenticated

        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return window.authService && window.authService.isAuthenticated();
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return window.authService && window.authService.getCurrentUser();
    }
}

// Create global instance
window.authGate = new AuthGate();
