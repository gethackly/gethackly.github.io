class TabSystem {
    constructor() {
        this.tabContainer = document.querySelector('.main_content_left_tabs');
        this.contentContainer = document.querySelector('.main_content_left_box_container');
        this.tabs = [];
        this.contents = [];
        this.activeTab = null;
        
        this.init();
    }

    init() {
        // Get all tab buttons and their corresponding content
        const tabButtons = this.tabContainer.querySelectorAll('.tab_link');
        const tabContents = this.contentContainer.querySelectorAll('.tab_content');

        // Store references and set up event listeners
        tabButtons.forEach((button) => {
            const tabId = button.getAttribute('data-tab');
            const content = this.contentContainer.querySelector(`#${tabId}`);
            
            if (content) {
                this.tabs.push({
                    button,
                    content,
                    id: tabId
                });

                // Set up click handler
                button.addEventListener('click', () => {
                    this.activateTab(tabId);
                });
            }
        });

        // Activate the default tab
        const defaultTab = this.tabContainer.querySelector('.tab_link.active');
        if (defaultTab) {
            this.activateTab(defaultTab.getAttribute('data-tab'));
        } else if (this.tabs.length > 0) {
            this.activateTab(this.tabs[0].id);
        }
    }

    activateTab(tabId) {
        // Find the tab to activate
        const tabToActivate = this.tabs.find(tab => tab.id === tabId);
        if (!tabToActivate) return;

        // Deactivate current tab if exists
        if (this.activeTab) {
            this.activeTab.button.classList.remove('active');
            this.activeTab.content.classList.remove('active');
            this.activeTab.content.style.display = 'none';
        }

        // Activate new tab
        tabToActivate.button.classList.add('active');
        tabToActivate.content.classList.add('active');
        tabToActivate.content.style.display = 'block';
        this.activeTab = tabToActivate;

        // Dispatch custom event for any external listeners
        const event = new CustomEvent('tabChanged', {
            detail: { tabId }
        });
        document.dispatchEvent(event);
    }
}

// Initialize the tab system when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tabSystem = new TabSystem();
}); 