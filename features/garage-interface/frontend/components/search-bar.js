class SearchManager {
    constructor() {
        this.searchInput = null;
        this.sortButtons = null;
        this.currentSort = 'date';
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.createSearchBar();
        this.setupEventListeners();
    }

    createSearchBar() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <div class="search-wrapper">
                <input type="text" class="search-input" placeholder="Search documents...">
                <div class="sort-buttons">
                    <button class="sort-button" data-sort="date">Date</button>
                    <button class="sort-button" data-sort="title">Title</button>
                    <button class="sort-button" data-sort="views">Views</button>
                </div>
            </div>
        `;
        document.body.appendChild(searchContainer);
        
        this.searchInput = searchContainer.querySelector('.search-input');
        this.sortButtons = searchContainer.querySelectorAll('.sort-button');
    }

    setupEventListeners() {
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 300);
        });

        this.sortButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const sortBy = e.target.dataset.sort;
                this.handleSort(sortBy);
            });
        });
    }

    handleSearch(query) {
        const event = new CustomEvent('search', {
            detail: { query }
        });
        document.dispatchEvent(event);
    }

    handleSort(sortBy) {
        this.currentSort = sortBy;
        this.sortButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.sort === sortBy);
        });

        const event = new CustomEvent('sort', {
            detail: { sortBy }
        });
        document.dispatchEvent(event);
    }
}

export default SearchManager; 