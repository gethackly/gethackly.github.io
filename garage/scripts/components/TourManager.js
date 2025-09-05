// TourManager.js - Minimal guided tour for the Garage app (square-cornered, no radius)

class TourManager {
    constructor() {
        this.steps = [
            { selector: '.branch-counter', title: 'Project Counter', content: 'Once we reach 50 projects, the highest-rated prompt will be selected and we\'ll start the 8-hour cycle to build it.', placement: 'bottom' },
            { selector: '.branch-row:first-child', title: 'Project List', content: 'Each row is a prompt. Click on it to edit, see its content, and view its evaluation results.', placement: 'right' },
            { selector: '.branch-details-inner', title: 'Prompt Editor', content: 'Edit prompts here, and use other common AI coding features like adding files and selecting models.', placement: 'left' },
            { selector: '.sidebar', title: 'Evaluation Results', content: 'When you evaluate a prompt, see the breakdown of scores by accuracy, reliability, and complexity, plus overall weaknesses and improvement areas.', placement: 'right' },
            { selector: '#leaderboardTab', title: 'Global Leaderboard', content: 'Participants earn points for their contributions. The global leaderboard shows everyone\'s ranking here.', placement: 'left' }
        ];
        this.currentIndex = -1;
        this.overlayEl = null;
        this.tooltipEl = null;
        this.highlightedEl = null;
        this.boundReposition = null;
    }

    startTour() {
        if (!this.ensureElements()) {
            return;
        }
        
        // Mark that user has clicked the help button
        this.markHelpButtonClicked();
        this.removeNotificationDot();
        
        // Ensure we're on the projects panel before starting tour
        this.switchToProjectsPanel();
        
        this.createOverlay();
        this.createTooltip();
        this.goTo(0);
    }
    
    switchToProjectsPanel() {
        // Find the projects panel and make sure it's expanded
        const projectsPanel = document.querySelector('[data-panel="projects"]');
        if (projectsPanel) {
            // Remove expanded class from all panels
            document.querySelectorAll('.panel').forEach(panel => {
                panel.classList.remove('expanded');
            });
            // Add expanded class to projects panel
            projectsPanel.classList.add('expanded');
        }
    }

    endTour(markCompleted = true) {
        this.removeHighlight();
        if (this.overlayEl && this.overlayEl.parentNode) this.overlayEl.parentNode.removeChild(this.overlayEl);
        if (this.tooltipEl && this.tooltipEl.parentNode) this.tooltipEl.parentNode.removeChild(this.tooltipEl);
        this.overlayEl = null;
        this.tooltipEl = null;
        if (this.boundReposition) {
            window.removeEventListener('resize', this.boundReposition);
            window.removeEventListener('scroll', this.boundReposition, true);
            this.boundReposition = null;
        }
        if (markCompleted) {
            try { localStorage.setItem('hackly_tour_completed', '1'); } catch (_) {}
            this.removeNotificationDot(); // Remove the red dot when tour is completed
        }
    }

    resetTour() {
        try { localStorage.removeItem('hackly_tour_completed'); } catch (_) {}
    }

    hasCompletedTour() {
        try { return localStorage.getItem('hackly_tour_completed') === '1'; } catch (_) { return false; }
    }

    hasClickedHelpButton() {
        try { return localStorage.getItem('hackly_help_clicked') === '1'; } catch (_) { return false; }
    }

    markHelpButtonClicked() {
        try { localStorage.setItem('hackly_help_clicked', '1'); } catch (_) {}
    }

    addNotificationDot() {
        // Check if user has already clicked the help button before
        if (this.hasClickedHelpButton()) {
            return; // Don't show dot if they've clicked before
        }
        
        const tourButton = document.getElementById('tourButton');
        if (tourButton && !tourButton.querySelector('.notification-dot')) {
            const dot = document.createElement('div');
            dot.className = 'notification-dot';
            dot.style.cssText = `
                position: absolute;
                top: 0.5px;
                right: 2px;
                width: 12px;
                height: 12px;
                background:rgba(255, 68, 68, 0.83);
                border-radius: 50%;
                border: 2px solid var(--color-bg-primary, #ffffff);
                z-index: 1000;
            `;
            tourButton.style.position = 'relative';
            tourButton.appendChild(dot);
        }
    }

    removeNotificationDot() {
        const tourButton = document.getElementById('tourButton');
        if (tourButton) {
            const dot = tourButton.querySelector('.notification-dot');
            if (dot) {
                dot.remove();
            }
        }
    }

    ensureElements() {
        // Do not mutate steps; allow steps to appear later (e.g., async render)
        return Array.isArray(this.steps) && this.steps.length > 0;
    }

    goTo(index) {
        if (index < 0 || index >= this.steps.length) {
            this.endTour();
            return;
        }
        this.currentIndex = index;
        const step = this.steps[this.currentIndex];
        
        let target = document.querySelector(step.selector);
        
        if (!target) {
            // Wait for target to appear (e.g., when branches render)
            this.waitForStepTarget(step, this.currentIndex);
            return;
        }

        this.applyHighlight(target);
        this.renderTooltip(step, target);

        // Add click handler for step 1 (branch row) to advance tour
        if (this.currentIndex === 1) {
            this.addBranchClickHandler(target);
        }

        if (!this.boundReposition) {
            this.boundReposition = () => {
                const s = this.steps[this.currentIndex];
                const el = s ? document.querySelector(s.selector) : null;
                if (s && el) {
                    this.positionTooltip(s, el);
                    this.updateOverlaySpotlight(el);
                }
            };
            window.addEventListener('resize', this.boundReposition);
            window.addEventListener('scroll', this.boundReposition, true);
        }
    }

        next() {

        // Auto-expand first branch between step 1 and 2 (after explaining the row, before explaining branch content)
        if (this.currentIndex === 1) {
            const firstBranch = document.querySelector('.branch-row:first-child');
            if (firstBranch && !firstBranch.classList.contains('active')) {
                // Remove the click handler temporarily to prevent double-trigger
                this.removeBranchClickHandler(firstBranch);
                firstBranch.click();
                // Re-add the click handler after a short delay
                setTimeout(() => {
                    this.addBranchClickHandler(firstBranch);
                }, 100);
            }
        }

        this.goTo(this.currentIndex + 1);
    }
    prev() { this.goTo(this.currentIndex - 1); }

    addBranchClickHandler(target) {
        // Remove any existing click handler
        if (target._tourClickHandler) {
            target.removeEventListener('click', target._tourClickHandler);
        }
        
        // Add new click handler that advances to next step
        target._tourClickHandler = (event) => {
            event.stopPropagation();
            this.next();
        };
        target.addEventListener('click', target._tourClickHandler);
    }

    removeBranchClickHandler(target) {
        if (target && target._tourClickHandler) {
            target.removeEventListener('click', target._tourClickHandler);
            target._tourClickHandler = null;
        }
    }

    waitForStepTarget(step, index) {
        let attempts = 0;
        const maxAttempts = 40; // ~2s at 50ms interval
        const interval = setInterval(() => {
            // If tour moved to another step, stop waiting
            if (this.currentIndex !== index) {
                clearInterval(interval);
                return;
            }
            const el = document.querySelector(step.selector);
            attempts++;
            if (el) {
                clearInterval(interval);
                // Re-run goTo for this index now that target exists
                this.goTo(index);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                // If still missing, advance but do NOT skip two steps inadvertently
                this.goTo(index + 1);
            }
        }, 50);
    }

    applyHighlight(el) {
        this.removeHighlight();
        this.highlightedEl = el;
        el.classList.add('tour-highlight');
        
        // Check if this step has multiple highlights
        const currentStep = this.steps[this.currentIndex];
        if (currentStep && currentStep.multiHighlight) {
            currentStep.multiHighlight.forEach(selector => {
                const element = document.querySelector(selector);
                if (element && element !== el) {
                    element.classList.add('tour-highlight');
                }
            });
        }
        
        // Ensure the target is visible
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch (_) {}
        // Update overlay spotlight to cut out this element
        this.updateOverlaySpotlight(el);
    }

    removeHighlight() {
        if (this.highlightedEl) {
            this.highlightedEl.classList.remove('tour-highlight', 'tour-flicker');
            this.removeBranchClickHandler(this.highlightedEl);
            
            // Remove highlights from any multi-highlight elements
            const currentStep = this.steps[this.currentIndex];
            if (currentStep && currentStep.multiHighlight) {
                currentStep.multiHighlight.forEach(selector => {
                    const element = document.querySelector(selector);
                    if (element && element !== this.highlightedEl) {
                        element.classList.remove('tour-highlight', 'tour-flicker');
                    }
                });
            }
            
            this.highlightedEl = null;
        }
    }

    createOverlay() {
        if (this.overlayEl) return;
        const overlay = document.createElement('div');
        overlay.className = 'tour-overlay';
        overlay.addEventListener('click', () => this.endTour(false));
        document.body.appendChild(overlay);
        this.overlayEl = overlay;
    }

    updateOverlaySpotlight(target) {
        if (!this.overlayEl || !target) return;
        
        const rect = target.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Create spotlight effect using CSS clip-path
        const spotlight = `
            polygon(
                0% 0%, 
                0% 100%, 
                ${rect.left + scrollX}px 100%, 
                ${rect.left + scrollX}px ${rect.top + scrollY}px, 
                ${rect.right + scrollX}px ${rect.top + scrollY}px, 
                ${rect.right + scrollX}px ${rect.bottom + scrollY}px, 
                ${rect.left + scrollX}px ${rect.bottom + scrollY}px, 
                ${rect.left + scrollX}px 100%, 
                100% 100%, 
                100% 0%
            )
        `;
        
        this.overlayEl.style.clipPath = spotlight;
    }

    createTooltip() {
        if (this.tooltipEl) {
            return;
        }
        const tip = document.createElement('div');
        tip.className = 'tour-tooltip';
        tip.innerHTML = `
            <div class="tour-tooltip-header">
                <div class="tour-title"></div>
                <button class="tour-close" type="button" aria-label="Close">×</button>
            </div>
            <div class="tour-content"></div>
            <div class="tour-actions">
                <span class="tour-progress"></span>
                <div class="tour-buttons">
                    <button class="tour-prev" type="button">Back</button>
                    <button class="tour-next" type="button">Next</button>
                </div>
            </div>
        `;
        document.body.appendChild(tip);
        tip.querySelector('.tour-close').addEventListener('click', () => this.endTour(false));
        tip.querySelector('.tour-prev').addEventListener('click', () => this.prev());
        tip.querySelector('.tour-next').addEventListener('click', () => this.next());
        this.tooltipEl = tip;
    }

    renderTooltip(step, target) {
        if (!this.tooltipEl) return;
        const titleEl = this.tooltipEl.querySelector('.tour-title');
        const contentEl = this.tooltipEl.querySelector('.tour-content');
        const progressEl = this.tooltipEl.querySelector('.tour-progress');
        const prevBtn = this.tooltipEl.querySelector('.tour-prev');
        const nextBtn = this.tooltipEl.querySelector('.tour-next');

        titleEl.textContent = step.title || '';
        contentEl.textContent = step.content || '';
        progressEl.textContent = `Step ${this.currentIndex + 1} of ${this.steps.length}`;

        prevBtn.disabled = this.currentIndex === 0;
        nextBtn.textContent = this.currentIndex === this.steps.length - 1 ? 'Finish' : 'Next';
        // Remove any existing onclick to prevent double handlers
        nextBtn.onclick = null;
        nextBtn.onclick = () => {
            if (this.currentIndex === this.steps.length - 1) {
                this.endTour();
            } else {
                this.next();
            }
        };

        this.positionTooltip(step, target);
    }

    positionTooltip(step, target) {
        if (!this.tooltipEl || !target) return;
        const rect = target.getBoundingClientRect();
        const tip = this.tooltipEl;
        const margin = 8; // space between tooltip and target
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        let top = rect.top;
        let left = rect.left;

        const desired = (step.placement || 'bottom').toLowerCase();

        // Special positioning for specific elements
        if (target.id === 'leaderboardTab') {
            // Position leaderboard tab tooltip to the left and centered vertically
            top = rect.top + (rect.height - tip.offsetHeight) / 2;
            left = rect.left - tip.offsetWidth - margin;
        } else if (target.classList.contains('sidebar')) {
            // Position sidebar tooltip to the right and centered vertically
            top = rect.top + (rect.height - tip.offsetHeight) / 2;
            left = rect.right + margin;
        } else if (desired === 'top') {
            top = rect.top - tip.offsetHeight - margin;
            left = rect.left + (rect.width - tip.offsetWidth) / 2;
        } else if (desired === 'right') {
            top = rect.top + (rect.height - tip.offsetHeight) / 2;
            left = rect.right + margin;
        } else if (desired === 'left') {
            top = rect.top + (rect.height - tip.offsetHeight) / 2;
            left = rect.left - tip.offsetWidth - margin;
        } else { // bottom (default)
            top = rect.bottom + margin;
            left = rect.left + (rect.width - tip.offsetWidth) / 2;
        }

        // Clamp inside viewport with simple adjustments
        if (left + tip.offsetWidth > viewportW - 8) left = viewportW - tip.offsetWidth - 8;
        if (left < 8) left = 8;
        if (top + tip.offsetHeight > viewportH - 8) top = viewportH - tip.offsetHeight - 8;
        if (top < 8) top = 8;

        tip.style.top = `${top}px`;
        tip.style.left = `${left}px`;
    }
}

// Export globally
window.TourManager = TourManager;


