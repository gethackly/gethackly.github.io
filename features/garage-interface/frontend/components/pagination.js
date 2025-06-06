class Pagination {
    constructor(totalItems, itemsPerPage = 10) {
        this.totalItems = totalItems;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        this.totalPages = Math.ceil(totalItems / itemsPerPage);
        this.init();
    }

    init() {
        this.createPagination();
        this.setupEventListeners();
    }

    createPagination() {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        this.updatePaginationUI(paginationContainer);
        document.body.appendChild(paginationContainer);
    }

    updatePaginationUI(container) {
        container.innerHTML = `
            <button class="pagination-button prev" ${this.currentPage === 1 ? 'disabled' : ''}>
                Previous
            </button>
            <div class="page-numbers">
                ${this.generatePageNumbers()}
            </div>
            <button class="pagination-button next" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                Next
            </button>
        `;
    }

    generatePageNumbers() {
        let pages = [];
        const maxVisiblePages = 5;
        
        if (this.totalPages <= maxVisiblePages) {
            pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        } else {
            if (this.currentPage <= 3) {
                pages = [1, 2, 3, '...', this.totalPages];
            } else if (this.currentPage >= this.totalPages - 2) {
                pages = [1, '...', this.totalPages - 2, this.totalPages - 1, this.totalPages];
            } else {
                pages = [1, '...', this.currentPage, '...', this.totalPages];
            }
        }

        return pages.map(page => {
            if (page === '...') {
                return '<span class="pagination-ellipsis">...</span>';
            }
            return `
                <button class="pagination-number ${page === this.currentPage ? 'active' : ''}"
                        data-page="${page}">
                    ${page}
                </button>
            `;
        }).join('');
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-button.prev')) {
                this.previousPage();
            } else if (e.target.matches('.pagination-button.next')) {
                this.nextPage();
            } else if (e.target.matches('.pagination-number')) {
                this.goToPage(parseInt(e.target.dataset.page));
            }
        });
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePaginationUI(document.querySelector('.pagination'));
            
            const event = new CustomEvent('pageChange', {
                detail: {
                    page: this.currentPage,
                    startIndex: (this.currentPage - 1) * this.itemsPerPage,
                    endIndex: this.currentPage * this.itemsPerPage
                }
            });
            document.dispatchEvent(event);
        }
    }

    updateTotalItems(totalItems) {
        this.totalItems = totalItems;
        this.totalPages = Math.ceil(totalItems / this.itemsPerPage);
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }
        this.updatePaginationUI(document.querySelector('.pagination'));
    }
}

export default Pagination; 