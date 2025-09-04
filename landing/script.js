//DARK MODE
function myFunction() {
    var element = document.body;
    element.classList.toggle("dark-mode");
    
    // Toggle icon between sun and moon
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        if (element.classList.contains("dark-mode")) {
            themeIcon.textContent = 'light_mode'; // Sun icon for dark mode
        } else {
            themeIcon.textContent = 'dark_mode'; // Moon icon for light mode
        }
    }
    
    // Save theme preference to localStorage
    const isDarkMode = element.classList.contains("dark-mode");
    localStorage.setItem("hackly_theme", isDarkMode ? "dark" : "light");
}

// Load theme from localStorage on page load
function loadTheme() {
    const savedTheme = localStorage.getItem("hackly_theme");
    const element = document.body;
    const themeIcon = document.querySelector('.theme-icon');
    
    if (savedTheme === "dark") {
        element.classList.add("dark-mode");
        if (themeIcon) {
            themeIcon.textContent = 'light_mode'; // Sun icon for dark mode
        }
    } else if (savedTheme === "light") {
        element.classList.remove("dark-mode");
        if (themeIcon) {
            themeIcon.textContent = 'dark_mode'; // Moon icon for light mode
        }
    } else {
        // If no saved theme, use system preference or default to light
        if (themeIcon) {
            themeIcon.textContent = 'dark_mode'; // Default to moon icon
        }
    }
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', loadTheme);

//accordion
var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
acc[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var panel = this.nextElementSibling;
    if (panel.style.maxHeight) {
    panel.style.maxHeight = null;
    } else {
    panel.style.maxHeight = panel.scrollHeight + "px";
    } 
});
}

//COUNTDOWN
var countDownDate = new Date("December 27, 2024 16:00:01").getTime();
var timeClear = setInterval(function() {
var now = new Date().getTime();
var timeLeft = countDownDate - now;

var days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
var hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
var minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
var seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

const timerElement = document.querySelector(".timer");
if (timerElement) {
    timerElement.innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s ";
}

if (timeLeft < 0) {
    clearInterval(timeClear);
    if (timerElement) {
        timerElement.innerHTML = "Timer Finished";
    }
}
}, 1000);

// Modal functionality
const modal = document.getElementById("collaborationModal");
const modalTrigger = document.querySelector(".modal-trigger");
const closeBtn = document.querySelector(".closeModalBtn");
const modalContent = document.querySelector(".modal-content");

// Only add event listeners if the elements exist
if (modalTrigger && modal) {
    modalTrigger.addEventListener("click", function(e) {
        e.preventDefault();
        modal.style.display = "block";
        document.body.classList.add("modal-open");
        // Reset scroll position
        if (modalContent) {
            modalContent.classList.remove("scrolled");
        }
    });
}

if (closeBtn && modal) {
    closeBtn.addEventListener("click", function() {
        modal.style.display = "none";
        document.body.classList.remove("modal-open");
    });
}

if (modal) {
    window.addEventListener("click", function(e) {
        if (e.target == modal) {
            modal.style.display = "none";
            document.body.classList.remove("modal-open");
        }
    });

    // Handle modal scroll animation
    modal.addEventListener("scroll", function() {
        if (modalContent && modal.scrollTop > 20) {
            modalContent.classList.add("scrolled");
        } else if (modalContent) {
            modalContent.classList.remove("scrolled");
        }
    });
}

// Tab functionality
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// Toggle functionality
const toggleButtons = document.querySelectorAll('.toggle-button');
const togglePanes = document.querySelectorAll('.toggle-pane');
const featureTexts = document.querySelectorAll('.feature-text');

toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        toggleButtons.forEach(btn => btn.classList.remove('active'));
        togglePanes.forEach(pane => pane.classList.remove('active'));
        featureTexts.forEach(text => text.classList.remove('active'));
        
        // Add active class to clicked button and corresponding panes
        button.classList.add('active');
        const toggleId = button.getAttribute('data-toggle');
        document.getElementById(toggleId).classList.add('active');
        
        // Show corresponding feature texts
        document.querySelectorAll(`.feature-text[data-toggle="${toggleId}"]`).forEach(text => {
            text.classList.add('active');
        });
    });
});

// Branch counter functionality for secondary navbar
class LandingBranchCounter {
    constructor() {
        this.branchCountElement = document.querySelector('.seconde_nav .branch-count');
        this.init();
    }

    init() {
        // Immediate fallback to show at least the default value
        if (this.branchCountElement) {
            this.branchCountElement.textContent = '0';
        }
        
        this.updateBranchCount();
        // Update every 30 seconds to keep the count relatively fresh
        setInterval(() => this.updateBranchCount(), 30000);
    }

    async updateBranchCount() {
        try {
            // Try to get count from localStorage first (if user has visited garage)
            let count = this.getCountFromStorage();
            
            if (count === null) {
                // If no cached data, try to fetch from the JSON file
                count = await this.fetchBranchCount();
            }
            
            // Update the display
            if (this.branchCountElement && count !== null) {
                this.branchCountElement.textContent = count;
            }
        } catch (error) {
            console.warn('Could not update branch count:', error);
            // Fallback to a default number if we can't get the real count
            if (this.branchCountElement) {
                this.branchCountElement.textContent = '0';
            }
        }
    }

    getCountFromStorage() {
        try {
            const cached = localStorage.getItem('hackly_branch_count');
            const timestamp = localStorage.getItem('hackly_branch_count_timestamp');
            
            if (cached && timestamp) {
                const age = Date.now() - parseInt(timestamp);
                // Use cached data if it's less than 5 minutes old
                if (age < 5 * 60 * 1000) {
                    return parseInt(cached);
                }
            }
        } catch (error) {
            console.warn('Could not read from localStorage:', error);
        }
        return null;
    }

    async fetchBranchCount() {
        try {
            // Try to get count from Firebase first
            if (window.getBranchCount) {
                const count = await window.getBranchCount();
                if (count !== null) {
                    this.cacheCount(count);
                    return count;
                }
            }
            
            // Fallback: try to fetch from the local JSON file
            const response = await fetch('./branch-count.json', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const count = data.count || 0;
                
                // Cache the result
                this.cacheCount(count);
                return count;
            }
        } catch (error) {
            console.warn('Could not fetch branch count:', error);
        }
        
        // Fallback: try to get from garage page if it's accessible
        return this.getCountFromGarage();
    }

    getCountFromGarage() {
        // This is a fallback method that tries to get data from the garage page
        // It's not ideal but provides a way to get the count without a dedicated API
        try {
            // Check if we can access garage data through localStorage or other means
            const garageData = localStorage.getItem('hackly_garage_data');
            if (garageData) {
                const data = JSON.parse(garageData);
                return data.branchCount || 0;
            }
        } catch (error) {
            console.warn('Could not get garage data:', error);
        }
        return null;
    }

    cacheCount(count) {
        try {
            localStorage.setItem('hackly_branch_count', count.toString());
            localStorage.setItem('hackly_branch_count_timestamp', Date.now().toString());
        } catch (error) {
            console.warn('Could not cache branch count:', error);
        }
    }
}

// Initialize branch counter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.landingBranchCounter = new LandingBranchCounter();
});
