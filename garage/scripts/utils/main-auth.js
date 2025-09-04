// Main authentication logic and UI management
// Integrates with the main garage application

class MainAuth {
    constructor() {
        this.authModal = null;
        this.init();
    }

    init() {
        // Wait for Firebase to be ready
        if (window.firebase && window.firebase.auth) {
            this.setupAuth();
        } else {
            window.addEventListener('firebase-ready', () => this.setupAuth());
        }
    }

    setupAuth() {
        this.bindPersistentAuthButton(); // Use a single, persistent event listener
        this.attachAuthStateListener();
        this.updateAuthButton();
    }

    // NEW: A single persistent listener that handles clicks based on auth state.
    bindPersistentAuthButton() {
        const btn = document.getElementById('authButton');
        if (!btn) return;

        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            if (window.authService && window.authService.isAuthenticated()) {
                // If authenticated, toggle the user dropdown
                const dropdown = document.querySelector('.user-dropdown');
                if (dropdown) {
                    this.positionDropdown(btn, dropdown); // Ensure it's positioned correctly
                    this.toggleDropdown(dropdown);
                }
            } else {
                // If not authenticated, show the login modal
                this.showAuthModal();
            }
        });
    }

    attachAuthStateListener() {
        if (window.authService) {
            window.authService.addAuthStateListener((user) => {
                this.updateAuthButton(user);
                // Broadcast for components to react
                try { 
                    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user } })); 
                } catch (_) {}
            });
        }
    }

    // UPDATED: Now only manages the button's visual state and dropdown cleanup.
    updateAuthButton(user = null) {
        const btn = document.getElementById('authButton');
        if (!btn) return;
        
        // Clean up any existing dropdown and its listeners
        const existingDropdown = document.querySelector('.user-dropdown');
        if (existingDropdown) {
            if (btn.userDropdownCleanup) {
                btn.userDropdownCleanup();
                btn.userDropdownCleanup = null; // Clear the cleanup function
            }
            existingDropdown.remove();
        }
        
        if (user) {
            // Check if username is still being loaded (undefined or loading)
            if (!user.username || user.username === 'user') {
                // Show loading state while username is being determined
                btn.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="auth-spinner"></div>
                        <span>Loading...</span>
                    </div>
                `;
                return;
            }
            
            // Username is ready - show the user dropdown
            const username = user.username || user.displayName || user.email || 'account';
            this.createUserDropdown(btn, username, user);
        } else {
            // Reset button to its simple "Sign In" state
            btn.innerHTML = 'Sign In';
        }
    }

    // NEW: Extracted positioning logic into its own method.
    positionDropdown(btn, dropdown) {
        const r = btn.getBoundingClientRect();
        // Anchor to the right edge of the button, clamped to viewport with 8px margin
        const rightPx = Math.max(8, window.innerWidth - r.right - 8);
        dropdown.style.right = `${rightPx}px`;
        dropdown.style.top = `${Math.min(window.innerHeight - 8, r.bottom + 8)}px`;

        // After attaching, if it overflows bottom, flip above
        const rect = dropdown.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 8) {
            const newTop = r.top - rect.height - 8;
            dropdown.style.top = `${Math.max(8, newTop)}px`;
        }
    }

    // UPDATED: No longer adds any 'onclick' handlers to the main auth button.
    createUserDropdown(btn, username, user) {
        // Update button text to show username with profile picture
        const hasPhoto = user.photoURL || user.avatar_url;
        btn.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                ${hasPhoto ? 
                    `<img src="${hasPhoto}" alt="${username}" style="
                        width: 20px; 
                        height: 20px; 
                        border-radius: 50%; 
                        border: 1px solid var(--color-text);
                        object-fit: cover;
                    ">` : 
                    `<div style="
                        width: 20px; 
                        height: 20px; 
                        background: var(--color-text); 
                        color: var(--color-bg); 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-weight: bold; 
                        font-size: 12px; 
                        text-transform: uppercase;
                    ">${username.charAt(0).toUpperCase()}</div>`
                }
                <span>${username}</span>
            </div>
        `;

        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown';
        Object.assign(dropdown.style, {
            position: 'fixed',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-text)',
            borderRadius: '0',
            boxShadow: 'none',
            minWidth: '200px',
            maxWidth: 'min(260px, calc(100vw - 16px))',
            maxHeight: '60vh',
            overflowY: 'auto',
            zIndex: '1000',
            opacity: '0',
            transform: 'translateY(-10px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            pointerEvents: 'none'
        });

        // Create dropdown content - simplified like sort dropdown
        dropdown.innerHTML = `
            <button class="dropdown-item" onclick="window.mainAuth.signOut()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16,17 21,12 16,7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign Out
            </button>
        `;
        
        // Add dropdown to body and position it
        document.body.appendChild(dropdown);
        this.positionDropdown(btn, dropdown);

        // Close dropdown when clicking outside
        const closeOnClickOutside = (ev) => {
            if (!btn.contains(ev.target) && !dropdown.contains(ev.target)) {
                this.hideDropdown(dropdown);
            }
        };
        document.addEventListener('click', closeOnClickOutside);
        
        // Reposition on scroll/resize while visible
        const onReposition = () => {
            if (dropdown.style.opacity === '1') this.positionDropdown(btn, dropdown);
        };
        window.addEventListener('resize', onReposition);
        window.addEventListener('scroll', onReposition, true);

        // Store a cleanup function on the button to remove these specific listeners later
        btn.userDropdownCleanup = () => {
            window.removeEventListener('resize', onReposition);
            window.removeEventListener('scroll', onReposition, true);
            document.removeEventListener('click', closeOnClickOutside);
        };
    }

    toggleDropdown(dropdown) {
        if (dropdown.style.opacity === '1') {
            this.hideDropdown(dropdown);
        } else {
            this.showDropdown(dropdown);
        }
    }

    showDropdown(dropdown) {
        dropdown.style.opacity = '1';
        dropdown.style.transform = 'translateY(0)';
        dropdown.style.pointerEvents = 'auto';
    }

    hideDropdown(dropdown) {
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.pointerEvents = 'none';
    }

    async signOut() {
        if (window.authService) {
            // Hide any open dropdowns immediately for a better UX
            const dropdown = document.querySelector('.user-dropdown');
            if (dropdown) this.hideDropdown(dropdown);
            
            await window.authService.signOut();
        }
        // The onAuthStateChanged listener will automatically call updateAuthButton
    }

    showAuthModal() {
        if (this.authModal) {
            this.authModal.style.display = 'flex';
            // Trigger the animation again
            setTimeout(() => {
                this.authModal.style.opacity = '1';
                const content = this.authModal.querySelector('.auth-modal-content');
                if (content) content.style.transform = 'scale(1)';
            }, 10);
            return;
        }

        this.createAuthModal();
    }

    createAuthModal() {
        // Create modal container
        this.authModal = document.createElement('div');
        this.authModal.className = 'auth-modal';
        Object.assign(this.authModal.style, {
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

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'auth-modal-content';
        Object.assign(modalContent.style, {
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            borderRadius: '0',
            width: '90%',
            maxWidth: '400px',
            transform: 'scale(0.9)',
            transition: 'transform 0.3s ease',
            border: '1px solid var(--color-text)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
        });

        // Create header with close button
        const modalHeader = document.createElement('div');
        modalHeader.className = 'auth-modal-header';
        Object.assign(modalHeader.style, {
            position: 'relative',
            width: '100%',
            height: '40px',
            borderBottom: '2px solid var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 12px'
        });
        modalHeader.innerHTML = '<button class="auth-close-btn" onclick="window.mainAuth.hideAuthModal()">×</button>';
        
        // Create content section
        const modalBody = document.createElement('div');
        modalBody.className = 'auth-modal-body';
        Object.assign(modalBody.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        });
        modalBody.innerHTML = this.getAuthHTML();
        
        // Assemble modal
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        this.authModal.appendChild(modalContent);
        document.body.appendChild(this.authModal);

        // Animate in
        setTimeout(() => {
            this.authModal.style.opacity = '1';
            modalContent.style.transform = 'scale(1)';
        }, 10);

        // Bind events
        this.bindModalEvents();
    }

    getAuthHTML() {
        return `
            <!-- GitHub Authentication -->
            <div id="githubAuthForm">
                <div id="errorMessage" class="auth-error" style="display: none;"></div>
                <div id="successMessage" class="auth-success" style="display: none;"></div>
                
                <button onclick="window.mainAuth.continueWithGitHub()" class="auth-btn auth-btn-github">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>Continue with GitHub</span>
                </button>
            </div>

        `;
    }

    bindModalEvents() {
        // Close modal on outside click
        this.authModal.addEventListener('click', (e) => {
            if (e.target === this.authModal) {
                this.hideAuthModal();
            }
        });
    }

    async continueWithGitHub() {
        try {
            const result = await window.authService.signInWithGitHub();
            if (result.success) {
                this.showMessage('success', 'Signed in with GitHub. Welcome!');
                setTimeout(() => this.hideAuthModal(), 800);
            } else {
                this.showMessage('error', result.error || 'GitHub sign-in failed');
            }
        } catch (error) {
            this.showMessage('error', 'An error occurred during GitHub authentication.');
        }
    }

    // All sign-in/sign-up handled via the single GitHub flow above

    showMessage(type, message) {
        const messageDiv = document.getElementById(`${type === 'error' ? 'error' : 'success'}Message`);
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.style.display = 'block';
        }
    }

    hideMessages() {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';
    }

    hideAuthModal() {
        if (this.authModal) {
            this.authModal.style.opacity = '0';
            const content = this.authModal.querySelector('.auth-modal-content');
            if (content) content.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                this.authModal.style.display = 'none';
            }, 300);
        }
    }
}

// Create global instance
window.mainAuth = new MainAuth();

// Debug helper - expose auth status to console
window.debugAuth = () => {

};
