/**
 * Reusable Pagination Component for School System
 * 
 * Usage:
 *   // Initialize pagination
 *   const pagination = new Pagination({
 *     container: '#paginationContainer',
 *     onPageChange: (page) => loadData(page),
 *     itemsPerPageOptions: [10, 20, 50]
 *   });
 *   
 *   // Update pagination after data load
 *   pagination.update(paginationData);
 */

class Pagination {
    constructor(containerOrOptions = {}, options = {}) {
        // Support both: new Pagination('containerId', {options}) and new Pagination({container: '#id', ...})
        let opts = options;
        let containerId = null;
        
        if (typeof containerOrOptions === 'string') {
            containerId = containerOrOptions.startsWith('#') ? containerOrOptions : `#${containerOrOptions}`;
            opts = options;
        } else {
            opts = containerOrOptions;
            containerId = opts.container || '#pagination';
        }
        
        this.container = containerId;
        this.onPageChange = opts.onPageChange || (() => {});
        this.itemsPerPageOptions = opts.itemsPerPageOptions || [10, 20, 50, 100];
        this.showItemsPerPage = opts.showItemsPerPage !== false;
        this.showInfo = opts.showInfo !== false;
        this.maxVisiblePages = opts.maxVisiblePages || 5;
        
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.itemsPerPage = opts.defaultItemsPerPage || this.itemsPerPageOptions[0];
        
        this.init();
    }
    
    init() {
        const containerEl = document.querySelector(this.container);
        if (!containerEl) {
            console.warn(`Pagination container ${this.container} not found`);
            return;
        }
        
        containerEl.innerHTML = this.render();
        this.attachEventListeners();
    }
    
    render() {
        return `
            <div class="pagination-wrapper">
                ${this.showInfo ? `
                    <div class="pagination-info">
                        Showing <span id="paginationStart">0</span> - <span id="paginationEnd">0</span> 
                        of <span id="paginationTotal">0</span> items
                    </div>
                ` : ''}
                
                <div class="pagination-controls">
                    <button class="pagination-btn pagination-first" id="paginationFirst" title="First page">
                        <i class="fas fa-angle-double-left"></i>
                    </button>
                    <button class="pagination-btn pagination-prev" id="paginationPrev" title="Previous page">
                        <i class="fas fa-angle-left"></i>
                    </button>
                    
                    <div class="pagination-pages" id="paginationPages"></div>
                    
                    <button class="pagination-btn pagination-next" id="paginationNext" title="Next page">
                        <i class="fas fa-angle-right"></i>
                    </button>
                    <button class="pagination-btn pagination-last" id="paginationLast" title="Last page">
                        <i class="fas fa-angle-double-right"></i>
                    </button>
                </div>
                
                ${this.showItemsPerPage ? `
                    <div class="pagination-per-page">
                        <label>Items per page:</label>
                        <select id="paginationPerPage">
                            ${this.itemsPerPageOptions.map(n => 
                                `<option value="${n}" ${n === this.itemsPerPage ? 'selected' : ''}>${n}</option>`
                            ).join('')}
                        </select>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    attachEventListeners() {
        const container = document.querySelector(this.container);
        if (!container) return;
        
        // First page
        const firstBtn = container.querySelector('#paginationFirst');
        if (firstBtn) {
            firstBtn.addEventListener('click', () => this.goToPage(1));
        }
        
        // Previous page
        const prevBtn = container.querySelector('#paginationPrev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        }
        
        // Next page
        const nextBtn = container.querySelector('#paginationNext');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        }
        
        // Last page
        const lastBtn = container.querySelector('#paginationLast');
        if (lastBtn) {
            lastBtn.addEventListener('click', () => this.goToPage(this.totalPages));
        }
        
        // Items per page
        const perPageSelect = container.querySelector('#paginationPerPage');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.goToPage(1);
            });
        }
    }
    
    update(paginationData) {
        if (!paginationData) return;
        
        this.currentPage = paginationData.currentPage || 1;
        this.totalPages = paginationData.totalPages || 1;
        this.totalItems = paginationData.totalItems || 0;
        this.itemsPerPage = paginationData.itemsPerPage || this.itemsPerPage;
        
        this.updateUI();
    }
    
    updateUI() {
        const container = document.querySelector(this.container);
        if (!container) return;
        
        // Update info
        if (this.showInfo) {
            const start = this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
            
            const startEl = container.querySelector('#paginationStart');
            const endEl = container.querySelector('#paginationEnd');
            const totalEl = container.querySelector('#paginationTotal');
            
            if (startEl) startEl.textContent = start;
            if (endEl) endEl.textContent = end;
            if (totalEl) totalEl.textContent = this.totalItems;
        }
        
        // Update buttons state
        const firstBtn = container.querySelector('#paginationFirst');
        const prevBtn = container.querySelector('#paginationPrev');
        const nextBtn = container.querySelector('#paginationNext');
        const lastBtn = container.querySelector('#paginationLast');
        
        if (firstBtn) firstBtn.disabled = this.currentPage <= 1;
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
        if (lastBtn) lastBtn.disabled = this.currentPage >= this.totalPages;
        
        // Render page numbers
        this.renderPageNumbers();
        
        // Update items per page select
        const perPageSelect = container.querySelector('#paginationPerPage');
        if (perPageSelect) {
            perPageSelect.value = this.itemsPerPage;
        }
    }
    
    renderPageNumbers() {
        const container = document.querySelector(this.container);
        const pagesContainer = container?.querySelector('#paginationPages');
        if (!pagesContainer) return;
        
        let pages = [];
        const half = Math.floor(this.maxVisiblePages / 2);
        
        let startPage = Math.max(1, this.currentPage - half);
        let endPage = Math.min(this.totalPages, startPage + this.maxVisiblePages - 1);
        
        // Adjust start if we're near the end
        if (endPage - startPage + 1 < this.maxVisiblePages) {
            startPage = Math.max(1, endPage - this.maxVisiblePages + 1);
        }
        
        // First page and ellipsis
        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) {
                pages.push('...');
            }
        }
        
        // Middle pages
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        
        // Last page and ellipsis
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                pages.push('...');
            }
            pages.push(this.totalPages);
        }
        
        pagesContainer.innerHTML = pages.map(page => {
            if (page === '...') {
                return `<span class="pagination-ellipsis">...</span>`;
            }
            return `
                <button class="pagination-btn pagination-page ${page === this.currentPage ? 'active' : ''}" 
                        data-page="${page}">
                    ${page}
                </button>
            `;
        }).join('');
        
        // Add click handlers to page buttons
        pagesContainer.querySelectorAll('.pagination-page').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                this.goToPage(page);
            });
        });
    }
    
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.onPageChange(page, this.itemsPerPage);
    }
    
    getParams() {
        return {
            page: this.currentPage,
            limit: this.itemsPerPage
        };
    }
    
    reset() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.updateUI();
    }
}

// CSS Styles for Pagination (inject into page)
const paginationStyles = `
<style id="pagination-styles">
.pagination-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding: 16px 0;
    margin-top: 20px;
    border-top: 1px solid #e5e7eb;
}

.pagination-info {
    color: #6b7280;
    font-size: 14px;
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;
}

.pagination-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
    border: 1px solid #d1d5db;
    background: white;
    color: #374151;
    font-size: 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
}

.pagination-btn.active:hover {
    background: #2563eb;
}

.pagination-pages {
    display: flex;
    align-items: center;
    gap: 4px;
}

.pagination-ellipsis {
    padding: 0 8px;
    color: #6b7280;
}

.pagination-per-page {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #6b7280;
}

.pagination-per-page select {
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    font-size: 14px;
    cursor: pointer;
}

.pagination-per-page select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
    .pagination-wrapper {
        flex-direction: column;
        align-items: center;
    }
    
    .pagination-btn {
        min-width: 32px;
        height: 32px;
        font-size: 13px;
    }
    
    .pagination-first,
    .pagination-last {
        display: none;
    }
}
</style>
`;

// Inject styles if not already present
if (!document.getElementById('pagination-styles')) {
    document.head.insertAdjacentHTML('beforeend', paginationStyles);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Pagination;
}
