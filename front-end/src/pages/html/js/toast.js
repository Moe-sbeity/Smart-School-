/**
 * Global Toast Notification System for Smart School
 * Shows beautiful popup notifications for success, error, warning, and info messages
 */

(function() {
  // Create toast container if it doesn't exist
  function createToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  // Inject styles
  function injectStyles() {
    if (document.getElementById('toast-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'toast-styles';
    styles.textContent = `
      #toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 320px;
        max-width: 400px;
        pointer-events: none;
      }

      .toast {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px 20px;
        border-radius: 12px;
        background: white;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
        animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
        min-width: 320px;
        max-width: 100%;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      .toast.hiding {
        animation: toastSlideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes toastSlideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes toastSlideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      .toast-icon {
        width: 24px;
        height: 24px;
        min-width: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
      }

      .toast-content {
        flex: 1;
        min-width: 200px;
      }

      .toast-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
        color: #1a202c;
      }

      .toast-message {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.4;
      }

      .toast-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: #9ca3af;
        font-size: 18px;
        line-height: 1;
        transition: color 0.2s;
      }

      .toast-close:hover {
        color: #4b5563;
      }

      /* Success */
      .toast.success {
        border-left: 4px solid #10b981;
      }
      .toast.success .toast-icon {
        background: #d1fae5;
        color: #10b981;
      }
      .toast.success .toast-title {
        color: #065f46;
      }

      /* Error */
      .toast.error {
        border-left: 4px solid #ef4444;
      }
      .toast.error .toast-icon {
        background: #fee2e2;
        color: #ef4444;
      }
      .toast.error .toast-title {
        color: #991b1b;
      }

      /* Warning */
      .toast.warning {
        border-left: 4px solid #f59e0b;
      }
      .toast.warning .toast-icon {
        background: #fef3c7;
        color: #f59e0b;
      }
      .toast.warning .toast-title {
        color: #92400e;
      }

      /* Info */
      .toast.info {
        border-left: 4px solid #3b82f6;
      }
      .toast.info .toast-icon {
        background: #dbeafe;
        color: #3b82f6;
      }
      .toast.info .toast-title {
        color: #1e40af;
      }

      /* Progress bar */
      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: currentColor;
        opacity: 0.3;
        border-radius: 0 0 0 12px;
      }

      .toast {
        position: relative;
        overflow: hidden;
      }

      /* Mobile responsive */
      @media (max-width: 480px) {
        #toast-container {
          left: 10px;
          right: 10px;
          min-width: auto;
          max-width: none;
        }
        .toast {
          min-width: auto;
        }
        .toast-content {
          min-width: 0;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // Get icon SVG based on type
  function getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '!',
      info: 'i'
    };
    return icons[type] || icons.info;
  }

  // Get title based on type
  function getTitle(type) {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info'
    };
    return titles[type] || 'Notification';
  }

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in ms (default: 5000, 0 = no auto-close)
   * @param {string} title - Custom title (optional)
   */
  function showToast(message, type = 'info', duration = 5000, title = null) {
    injectStyles();
    const container = createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
      <div class="toast-icon">${getIcon(type)}</div>
      <div class="toast-content">
        <div class="toast-title">${title || getTitle(type)}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
      ${duration > 0 ? `<div class="toast-progress" style="animation: shrink ${duration}ms linear forwards;"></div>` : ''}
    `;

    // Add shrink animation for progress bar
    if (duration > 0) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `;
      toast.appendChild(style);
    }

    container.appendChild(toast);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  }

  // Convenience methods
  window.Toast = {
    show: showToast,
    success: (message, duration, title) => showToast(message, 'success', duration, title),
    error: (message, duration, title) => showToast(message, 'error', duration, title),
    warning: (message, duration, title) => showToast(message, 'warning', duration, title),
    info: (message, duration, title) => showToast(message, 'info', duration, title)
  };

  // Also expose as global function for easy use
  window.showToast = showToast;
})();
