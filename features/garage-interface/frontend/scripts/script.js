// Theme management
document.addEventListener("DOMContentLoaded", function () {
    const themes = ["dark_mode", "green", "red", "blue"];
    
    // Check if a theme is already saved in localStorage
    let savedTheme = localStorage.getItem("selectedTheme");

    if (!savedTheme || !themes.includes(savedTheme)) {
        // Use light theme as default if no valid theme is saved
        savedTheme = "light";
        localStorage.setItem("selectedTheme", savedTheme);
    }

    // Remove all themes before applying the correct one
    themes.forEach(theme => document.body.classList.remove(theme));
    if (savedTheme !== "light") {
        document.body.classList.add(savedTheme);
    }

    // Add click event listener to the theme button
    const themeButton = document.querySelector('.theme');
    if (themeButton) {
        themeButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = document.getElementById("themeDropdown");
            dropdown.classList.toggle("show");
        });
    }

    // Add click event listener to document for closing dropdown
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.theme_dropdown')) {
            const dropdown = document.getElementById("themeDropdown");
            if (dropdown && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        }
    });

    // Handle external links
    const externalLinks = document.querySelectorAll('a[href^="http"]');
    externalLinks.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
});

// Set theme function
function setTheme(theme) {
    const themes = ["dark_mode", "green", "red", "blue"];
    const colorThemes = ["green", "red", "blue"]; // Themes for random selection
    
    // Remove all themes first
    themes.forEach(t => document.body.classList.remove(t));
    document.documentElement.removeAttribute('data-theme');
    
    if (theme === "light") {
        localStorage.setItem("selectedTheme", "light");
    } else if (theme === "dark") {
        document.body.classList.add("dark_mode");
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem("selectedTheme", "dark_mode");
    } else if (theme === "random") {
        // Get current theme
        const currentTheme = localStorage.getItem("selectedTheme");
        
        // Filter out the current theme from available color themes
        const availableThemes = colorThemes.filter(t => t !== currentTheme);
        
        // Select random theme from remaining options
        const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
        document.body.classList.add(randomTheme);
        document.documentElement.setAttribute('data-theme', 'color');
        localStorage.setItem("selectedTheme", randomTheme);
    }
    
    // Close the dropdown
    const dropdown = document.getElementById("themeDropdown");
    if (dropdown) {
        dropdown.classList.remove("show");
    }
}

// Navigation
document.addEventListener('DOMContentLoaded', () => {
    // Handle external links
    const externalLinks = document.querySelectorAll('a[href^="http"]');
    externalLinks.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });

    // Initialize theme
    setTheme(localStorage.getItem("selectedTheme"));
}); 
