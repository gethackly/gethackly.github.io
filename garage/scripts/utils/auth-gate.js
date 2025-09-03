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

        const message = customMessage || actionMessages[actionName] || 'Sign in to continue';
        
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
            <h2>Authentication Required</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 30px;">${message}</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button onclick="window.authGate.signIn()" class="auth-btn" style="
                    width: 100%;
                    padding: 15px;
                    background: var(--color-text);
                    color: var(--color-bg);
                    border: none;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                ">
                    Sign In
                </button>
                
                <button onclick="window.authGate.signUp()" class="auth-btn" style="
                    width: 100%;
                    padding: 15px;
                    background: transparent;
                    color: var(--color-text);
                    border: 1px solid var(--color-text);
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                ">
                    Create Account
                </button>
                
                <button onclick="window.authGate.closePrompt()" class="auth-btn" style="
                    width: 100%;
                    padding: 15px;
                    background: transparent;
                    color: var(--color-text-secondary);
                    border: none;
                    font-size: 14px;
                    cursor: pointer;
                    text-decoration: underline;
                    transition: background-color 0.2s ease;
                ">
                    Maybe Later
                </button>
            </div>
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
     * Show sign up modal
     */
    signUp() {
        this.closePrompt();
        if (window.mainAuth) {
            window.mainAuth.showAuthModal();
            window.mainAuth.showSignUp();
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
