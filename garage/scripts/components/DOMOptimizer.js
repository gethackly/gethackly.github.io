// DOMOptimizer.js - Handles DOM optimization and batching

class DOMOptimizer {
    constructor() {
        this.pendingUpdates = new Map();
        this.updateQueue = [];
        this.isProcessing = false;
        this.batchSize = 10; // Process updates in batches
        this.init();
    }

    init() {
        // Use requestAnimationFrame for smooth updates
        this.processQueue = this.processQueue.bind(this);
    }

    // Queue a DOM update for batching
    queueUpdate(containerId, updateFn, priority = 'normal') {
        if (!this.pendingUpdates.has(containerId)) {
            this.pendingUpdates.set(containerId, []);
        }
        
        this.pendingUpdates.get(containerId).push({
            fn: updateFn,
            priority: priority,
            timestamp: Date.now()
        });
        
        this.scheduleProcessing();
    }

    // Schedule processing of the update queue
    scheduleProcessing() {
        if (!this.isProcessing) {
            this.isProcessing = true;
            requestAnimationFrame(this.processQueue);
        }
    }

    // Process the update queue in batches
    processQueue() {
        if (this.updateQueue.length === 0) {
            this.isProcessing = false;
            return;
        }

        const batch = this.updateQueue.splice(0, this.batchSize);
        
        // Process batch
        batch.forEach(update => {
            try {
                update.fn();
            } catch (err) {
                console.error('❌ DOMOptimizer: Error processing update:', err);
            }
        });
        
        // Continue processing if there are more updates
        if (this.updateQueue.length > 0) {
            requestAnimationFrame(this.processQueue);
        } else {
            this.isProcessing = false;
        }
    }

    // Batch multiple DOM operations
    batchDOMOperations(operations) {
        return new Promise((resolve) => {
            const fragment = document.createDocumentFragment();
            
            operations.forEach(op => {
                try {
                    if (op.type === 'append') {
                        fragment.appendChild(op.element);
                    } else if (op.type === 'insertBefore') {
                        fragment.insertBefore(op.element, op.referenceNode);
                    } else if (op.type === 'remove') {
                        op.element.remove();
                    }
                } catch (err) {
                    console.error('❌ DOMOptimizer: Error in batch operation:', err);
                }
            });
            
            // Apply all changes at once
            if (fragment.children.length > 0) {
                const container = operations[0]?.container || document.body;
                container.appendChild(fragment);
            }
            
            resolve();
        });
    }

    // Optimize list rendering with virtual scrolling concept
    optimizeListRendering(container, items, renderItem, options = {}) {
        const {
            itemHeight = 60,
            bufferSize = 5,
            containerHeight = 400
        } = options;
        
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const totalHeight = items.length * itemHeight;
        
        // Create container with proper height
        container.style.height = `${totalHeight}px`;
        container.style.position = 'relative';
        
        // Only render visible items + buffer
        const startIndex = Math.max(0, Math.floor(container.scrollTop / itemHeight) - bufferSize);
        const endIndex = Math.min(items.length, startIndex + visibleCount + bufferSize * 2);
        
        // Clear container
        container.innerHTML = '';
        
        // Render visible items
        for (let i = startIndex; i < endIndex; i++) {
            const item = items[i];
            const itemElement = renderItem(item, i);
            if (itemElement) {
                itemElement.style.position = 'absolute';
                itemElement.style.top = `${i * itemHeight}px`;
                itemElement.style.height = `${itemHeight}px`;
                itemElement.style.width = '100%';
                container.appendChild(itemElement);
            }
        }
        
        return { startIndex, endIndex, totalHeight };
    }

    // Debounced scroll handler for performance
    createScrollHandler(callback, delay = 100) {
        let timeoutId = null;
        
        return (event) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            timeoutId = setTimeout(() => {
                callback(event);
            }, delay);
        };
    }

    // Optimize image loading
    optimizeImageLoading(images, options = {}) {
        const {
            lazyLoad = true,
            preloadCount = 3,
            quality = 'auto'
        } = options;
        
        if (lazyLoad && window.IntersectionObserver) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        this.loadImage(img, quality);
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback: load all images
            images.forEach(img => this.loadImage(img, quality));
        }
    }

    // Load image with optimization
    loadImage(img, quality = 'auto') {
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            
            // Add loading animation
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
            
            img.onload = () => {
                img.style.opacity = '1';
            };
        }
    }

    // Cleanup
    destroy() {
        this.pendingUpdates.clear();
        this.updateQueue = [];
        this.isProcessing = false;
    }
}

// Export for use in other modules
window.DOMOptimizer = DOMOptimizer;


