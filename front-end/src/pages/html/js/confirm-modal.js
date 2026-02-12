/**
 * Shared Confirm Modal utility
 * Usage:
 *   const ok = await showConfirmModal({
 *     title: 'Confirm Delete',
 *     message: 'Are you sure?',
 *     subMessage: 'This action cannot be undone.',
 *     confirmText: 'Delete',
 *     cancelText: 'Cancel',
 *     type: 'danger',        // 'danger' | 'warning' | 'info'
 *     icon: 'fa-trash'       // FontAwesome icon class
 *   });
 *   if (!ok) return;
 */

// Auto-inject CSS if not already loaded
(function() {
    if (!document.querySelector('link[href*="confirm-modal.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        // Try relative paths based on common page locations
        const scripts = document.querySelectorAll('script[src*="confirm-modal"]');
        if (scripts.length > 0) {
            const src = scripts[scripts.length - 1].getAttribute('src');
            link.href = src.replace('.js', '.css');
        } else {
            // Fallback: guess path from known structure
            const path = window.location.pathname;
            if (path.includes('/Admin/') || path.includes('/Teacher/') || path.includes('/Student/') || path.includes('/Parent/')) {
                link.href = '../js/confirm-modal.css';
            } else {
                link.href = 'js/confirm-modal.css';
            }
        }
        document.head.appendChild(link);
    }
})();

function showConfirmModal(options = {}) {
    const {
        title = 'Confirm',
        message = 'Are you sure?',
        subMessage = '',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        type = 'danger',
        icon = 'fa-exclamation-triangle'
    } = options;

    return new Promise((resolve) => {
        // Remove any existing confirm modal
        const existing = document.querySelector('.confirm-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'confirm-modal-overlay';

        const confirmBtnClass = type === 'warning' ? 'confirm-btn-warning'
            : type === 'info' ? 'confirm-btn-primary'
            : 'confirm-btn-danger';

        overlay.innerHTML = `
            <div class="confirm-modal-box">
                <div class="confirm-modal-header ${type}">
                    <h3><i class="fas ${icon}"></i> ${title}</h3>
                    <button class="confirm-modal-close" data-action="cancel">&times;</button>
                </div>
                <div class="confirm-modal-body">
                    <p class="confirm-message">${message}</p>
                    ${subMessage ? `<p class="confirm-sub">${subMessage}</p>` : ''}
                </div>
                <div class="confirm-modal-footer">
                    <button class="confirm-btn confirm-btn-cancel" data-action="cancel">${cancelText}</button>
                    <button class="confirm-btn ${confirmBtnClass}" data-action="confirm">
                        <i class="fas ${icon === 'fa-exclamation-triangle' && type === 'danger' ? 'fa-trash' : icon}"></i> ${confirmText}
                    </button>
                </div>
            </div>
        `;

        function cleanup(result) {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
            resolve(result);
        }

        function escHandler(e) {
            if (e.key === 'Escape') cleanup(false);
        }

        // Click handlers
        overlay.addEventListener('click', (e) => {
            const action = e.target.dataset?.action || e.target.closest('[data-action]')?.dataset?.action;
            if (action === 'cancel') cleanup(false);
            else if (action === 'confirm') cleanup(true);
            else if (e.target === overlay) cleanup(false); // click on backdrop
        });

        document.addEventListener('keydown', escHandler);
        document.body.appendChild(overlay);

        // Focus the confirm button
        overlay.querySelector('[data-action="confirm"]').focus();
    });
}

// Make globally available
window.showConfirmModal = showConfirmModal;
