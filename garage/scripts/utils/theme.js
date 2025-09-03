// Dynamic theme system with random color variations

class ThemeManager {
    constructor() {
        // Convert #82B1FD to HSL to maintain lightness/saturation
        this.baseHSL = this.rgbToHsl(130, 177, 253); // #82B1FD in HSL
        this.isDark = false;
        this.lastColorChange = 0;
        this.colorChangeDelay = 500; // 500ms between color changes
        this.currentHoverTarget = null;
        this.init();
    }

    init() {
        // Check for saved theme preference or default to light
        const savedTheme = localStorage.getItem('hackly-theme') || 'light';
        this.setTheme(savedTheme);
        
        // Bind theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Light theme now uses consistent colors - no more hover listeners

        // Trigger fade-in effect after theme is set
        setTimeout(() => {
            document.body.classList.add('fade-in');
        }, 100);
    }

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    // Generate random light colors for light theme (mix of colorful and neutral)
    generateRandomLightColor() {
        const useNeutral = Math.random() < 0.4; // 40% chance of neutral colors
        
        if (useNeutral) {
            // Generate neutral colors (whitesmoke, light gray, etc.)
            const h = Math.floor(Math.random() * 60) - 30; // Hue range: -30 to 30 (warm to cool grays)
            const s = Math.random() * 15 + 5;               // Saturation 5-20% (very muted)
            const l = 90 + Math.random() * 8;               // Lightness 90-98% (very light)
            return { h: h < 0 ? h + 360 : h, s, l };       // Ensure positive hue
        } else {
            // Generate colorful light colors
            const h = Math.floor(Math.random() * 360);      // Random hue
            const s = Math.random() * 30 + 10;             // Saturation 10-40% (soft, muted)
            const l = 85 + Math.random() * 10;             // Lightness 85-95% (light but not pure white)
            return { h, s, l };
        }
    }

    // Apply random light theme colors
    applyRandomLightTheme() {
        const lightColor = this.generateRandomLightColor();
        const { h, s, l } = lightColor;
        
        // Set main background (lighter)
        document.documentElement.style.setProperty('--color-bg', this.hslToCss(h, s, l));
        
        // Set secondary background (darker than main, opposite of dark theme)
        document.documentElement.style.setProperty('--color-bg-secondary', this.hslToCss(h, s, l - 8));
        
        // Set border color (even darker)
        document.documentElement.style.setProperty('--color-border', this.hslToCss(h, s, l - 12));
    }

    setTheme(theme) {
        this.isDark = theme === 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = this.isDark ? '☾' : '☼';
        }

        // Apply random colors for both themes
        if (this.isDark) {
            this.applyRandomDarkTheme();
        } else {
            // Apply random light theme colors
            this.applyRandomLightTheme();
        }

        // Update Monaco editor themes
        this.updateMonacoThemes();

        localStorage.setItem('hackly-theme', theme);
    }

    // Generate random dark colors like coolorsrandom project
    generateRandomDarkColor() {
        const h = Math.floor(Math.random() * 360);      // Random hue
        const s = Math.random() * 50;             // Saturation 20-60% (softer, less vibrant)
        const l = 4 + Math.random() * 6;              // Lightness 8-20% (darker but with more white, like #111111)
        return { h, s, l };
    }

    // Convert HSL to CSS string
    hslToCss(h, s, l) {
        return `hsl(${h} ${s}% ${l}%)`;
    }

    // Apply random dark theme colors
    applyRandomDarkTheme() {
        const darkColor = this.generateRandomDarkColor();
        const { h, s, l } = darkColor;
        
        // Set main background (less dark)
        document.documentElement.style.setProperty('--color-bg', this.hslToCss(h, s, l));
        
        // Set secondary background (slightly lighter)
        document.documentElement.style.setProperty('--color-bg-secondary', this.hslToCss(h, s, l + 3));
        
        // Set border color (even slightly lighter)
        document.documentElement.style.setProperty('--color-border', this.hslToCss(h, s, l + 6));
    }

    toggleTheme() {
        if (this.isDark) {
            // If switching to light theme, just switch
            this.setTheme('light');
        } else {
            // If switching to dark theme, generate new random colors
            this.setTheme('dark');
        }
    }

    // Generate new random colors for current theme (can be called manually)
    generateNewColors() {
        if (this.isDark) {
            this.applyRandomDarkTheme();
        } else {
            this.applyRandomLightTheme();
        }
    }

    // Update Monaco editor themes when theme changes
    updateMonacoThemes() {
        const theme = this.isDark ? 'vs-dark' : 'vs';

        
        // Update all existing editors from EditorManager
        if (window.editorManager && window.editorManager.forceUpdateAllThemes) {

            window.editorManager.forceUpdateAllThemes();
        } else if (window.editorManager && window.editorManager.editorByBranchId) {

            window.editorManager.editorByBranchId.forEach((editor, branchId) => {
                try {
                    if (editor.isDiffEditor && editor.editor) {
                        // Diff editor

                        editor.editor.updateOptions({ theme: theme });
                    } else if (editor.updateOptions) {
                        // Regular editor

                        editor.updateOptions({ theme: theme });
                    }
                } catch (e) {
                    console.warn(`⚠️ ThemeManager: Error updating editor for branch ${branchId}:`, e);
                }
            });
        } else {

            // Fallback to legacy method
            if (window.editorByBranchId) {
                window.editorByBranchId.forEach((editor, branchId) => {
                    try {
                        if (editor.isDiffEditor && editor.editor) {
                            // Diff editor
                            editor.editor.updateOptions({ theme: theme });
                        } else if (editor.updateOptions) {
                            // Regular editor
                            editor.updateOptions({ theme: theme });
                        }
                    } catch (e) {
                        // Editor might not be fully initialized yet
                    }
                });
            }
        }

        // Update modal editor if it exists
        if (window.modalEditor && window.modalEditor.updateOptions) {
            try {

                window.modalEditor.updateOptions({ theme: theme });
            } catch (e) {
                console.warn(`⚠️ ThemeManager: Error updating modal editor:`, e);
            }
        }
        

    }
}

// Initialize theme manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Timer functionality - commented out for future use
/*
class Timer {
    constructor() {
        this.timerElement = document.querySelector('.timer');
        this.init();
    }

    init() {
        if (this.timerElement) {
            this.updateTimer();
            // Update every second for countdown timer
            setInterval(() => this.updateTimer(), 1000);
        }
    }

    updateTimer() {
        const now = new Date();
        
        // TESTING: Use 1-hour countdown instead of 8-hour
        // Set end time to 1 hour from when the timer was first initialized
        if (!this.roundEndTime) {
            this.roundEndTime = new Date(now.getTime() + (60 * 60 * 1000));
        }
        
        const timeLeft = this.roundEndTime.getTime() - now.getTime();
        
        if (timeLeft <= 0) {
            // Round ended - trigger round transition
            this.timerElement.textContent = 'ROUND END';
            this.onRoundEnd();
            return;
        }
        
        const minutes = Math.floor(timeLeft / (60 * 1000));
        const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);

        // Format the timer display
        const mins = minutes.toString().padStart(2, '0');
        const secs = seconds.toString().padStart(2, '0');
        
        this.timerElement.textContent = `${mins}:${secs}`;
    }

    onRoundEnd() {
        console.log('🎯 ROUND ENDED - Time to transition!');
        
        // Show notification
        if (this.timerElement) {
            this.timerElement.style.color = '#ff6b6b';
            this.timerElement.style.fontWeight = 'bold';
        }
        
        // Trigger round transition event for other components
        window.dispatchEvent(new CustomEvent('round-ended', {
            detail: { timestamp: new Date().toISOString() }
        }));
        
        // Reset timer for next round after 5 seconds
        setTimeout(() => {
            if (this.timerElement) {
                this.timerElement.style.color = '';
                this.timerElement.style.fontWeight = '';
            }
            // Reset end time and restart the countdown
            this.roundEndTime = null;
            this.updateTimer();
        }, 5000);
    }
}
*/

// Branch counter functionality - shows current number of branches
class BranchCounter {
    constructor() {
        this.branchElement = document.querySelector('.branch-counter');
        this.branchCount = 0;
        this.init();
    }

    init() {
        if (this.branchElement) {
            this.updateBranchCount();
            // Update every 5 seconds to catch real-time changes
            setInterval(() => this.updateBranchCount(), 5000);
            
            // Listen for branch updates from other components
            window.addEventListener('leaderboard-updated', () => this.updateBranchCount());
            window.addEventListener('branches-updated', () => this.updateBranchCount());
        }
    }

    updateBranchCount() {
        // Get the current branch count from the data service or cached prompts
        let count = 0;
        
        if (window.dataService && window.dataService.getCachedPrompts) {
            const prompts = window.dataService.getCachedPrompts();
            count = Array.isArray(prompts) ? prompts.length : 0;
        }
        
        // Also check if branches are directly available
        if (count === 0 && window.branchManager) {
            const container = document.getElementById('branchesContainer');
            if (container) {
                const branchRows = container.querySelectorAll('.branch-row');
                count = branchRows.length;
            }
        }
        
        this.branchCount = count;
        
        if (this.branchElement) {
            const totalProjects = 50; // Total projects before start
            const projectsLeft = totalProjects - count;
            
            if (projectsLeft > 0) {
                this.branchElement.textContent = `${projectsLeft} projects left before start`;
            } else if (projectsLeft === 0) {
                this.branchElement.textContent = `All projects started!`;
            } else {
                // If somehow we have more than 50, show overflow
                this.branchElement.textContent = `${count} projects (overflow)`;
            }
        }
        
        // Update the landing page branch count JSON file
        this.updateLandingPageCount(count);
    }
    
    updateLandingPageCount(count) {
        try {
            // Create the JSON data
            const data = {
                count: count,
                lastUpdated: new Date().toISOString()
            };
            
            // Store in localStorage for the landing page to access
            localStorage.setItem('hackly_branch_count', count.toString());
            localStorage.setItem('hackly_branch_count_timestamp', Date.now().toString());
            localStorage.setItem('hackly_garage_data', JSON.stringify({ branchCount: count }));
            
            // Try to update the JSON file via a simple POST request
            // This would require a server endpoint, but for now we'll use localStorage
            console.log(`Updated branch count to ${count} for landing page`);
        } catch (error) {
            console.warn('Could not update landing page branch count:', error);
        }
    }

    getBranchCount() {
        return this.branchCount;
    }
}

// Initialize branch counter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // window.timer = new Timer(); // Commented out
    window.branchCounter = new BranchCounter(); // New branch counter
});

