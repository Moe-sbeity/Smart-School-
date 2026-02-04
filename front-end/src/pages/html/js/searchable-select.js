/**
 * Searchable Select Component for Smart School
 * Transforms regular select elements into searchable dropdowns
 */

(function() {
  // Inject styles
  function injectStyles() {
    if (document.getElementById('searchable-select-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'searchable-select-styles';
    styles.textContent = `
      .searchable-select-container {
        position: relative;
        width: 100%;
      }

      .searchable-select-display {
        width: 100%;
        padding: 12px 40px 12px 14px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
        background: white;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 46px;
        color: #333;
      }

      .searchable-select-display:hover {
        border-color: #667eea;
      }

      .searchable-select-display.open {
        border-color: #667eea;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }

      .searchable-select-display .placeholder {
        color: #999;
      }

      .searchable-select-display .selected-text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .searchable-select-display .arrow {
        position: absolute;
        right: 14px;
        color: #666;
        transition: transform 0.3s;
      }

      .searchable-select-display.open .arrow {
        transform: rotate(180deg);
      }

      .searchable-select-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 2px solid #667eea;
        border-top: none;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        z-index: 1000;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transition: max-height 0.3s ease, opacity 0.2s ease;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }

      .searchable-select-dropdown.open {
        max-height: 350px;
        opacity: 1;
        overflow: visible;
      }

      .searchable-select-search-wrapper {
        padding: 10px;
        border-bottom: 1px solid #e0e0e0;
        background: #f8f9fa;
        position: relative;
      }

      .searchable-select-search {
        width: 100%;
        padding: 10px 14px;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.3s;
        background: white;
      }

      .searchable-select-search:focus {
        border-color: #667eea;
      }

      .searchable-select-search::placeholder {
        color: #aaa;
      }

      .searchable-select-options {
        max-height: 250px;
        overflow-y: auto;
      }

      .searchable-select-option {
        padding: 12px 14px;
        cursor: pointer;
        transition: background 0.2s;
        border-bottom: 1px solid #f0f0f0;
      }

      .searchable-select-option:last-child {
        border-bottom: none;
      }

      .searchable-select-option:hover {
        background: #f0f4ff;
      }

      .searchable-select-option.selected {
        background: #667eea;
        color: white;
      }

      .searchable-select-option.selected:hover {
        background: #5568d3;
      }

      .searchable-select-option.highlighted {
        background: #f0f4ff;
      }

      .searchable-select-option-main {
        font-weight: 500;
        font-size: 14px;
        margin-bottom: 2px;
      }

      .searchable-select-option-sub {
        font-size: 12px;
        color: #666;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .searchable-select-option.selected .searchable-select-option-sub {
        color: rgba(255, 255, 255, 0.85);
      }

      .searchable-select-option-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        background: #e8f4f8;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        color: #667eea;
      }

      .searchable-select-option.selected .searchable-select-option-badge {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      .searchable-select-no-results {
        padding: 20px;
        text-align: center;
        color: #999;
        font-size: 14px;
      }

      .searchable-select-no-results i {
        display: block;
        font-size: 24px;
        margin-bottom: 8px;
        color: #ddd;
      }

      /* Scrollbar styling */
      .searchable-select-options::-webkit-scrollbar {
        width: 6px;
      }

      .searchable-select-options::-webkit-scrollbar-track {
        background: #f1f1f1;
      }

      .searchable-select-options::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 3px;
      }

      .searchable-select-options::-webkit-scrollbar-thumb:hover {
        background: #aaa;
      }

      /* Hide original select */
      select.searchable-select-hidden {
        position: absolute;
        opacity: 0;
        pointer-events: none;
        height: 0;
        width: 0;
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Create a searchable select from a regular select element
   * @param {HTMLSelectElement} selectElement - The original select element
   * @param {Object} options - Configuration options
   */
  function createSearchableSelect(selectElement, options = {}) {
    if (selectElement.dataset.searchableInitialized) return;
    
    injectStyles();
    
    const config = {
      placeholder: options.placeholder || selectElement.options[0]?.text || 'Select an option',
      searchPlaceholder: options.searchPlaceholder || 'Search by name or email...',
      noResultsText: options.noResultsText || 'No results found',
      formatOption: options.formatOption || null,
      showBadge: options.showBadge !== false,
      ...options
    };

    // Create container
    const container = document.createElement('div');
    container.className = 'searchable-select-container';
    
    // Create display element
    const display = document.createElement('div');
    display.className = 'searchable-select-display';
    display.innerHTML = `
      <span class="selected-text placeholder">${config.placeholder}</span>
      <span class="arrow">▼</span>
    `;

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-select-dropdown';
    dropdown.innerHTML = `
      <div class="searchable-select-search-wrapper">
        <input type="text" class="searchable-select-search" placeholder="${config.searchPlaceholder}">
      </div>
      <div class="searchable-select-options"></div>
    `;

    container.appendChild(display);
    container.appendChild(dropdown);

    // Insert container and hide original select
    selectElement.parentNode.insertBefore(container, selectElement);
    selectElement.classList.add('searchable-select-hidden');
    container.appendChild(selectElement);
    
    selectElement.dataset.searchableInitialized = 'true';

    const searchInput = dropdown.querySelector('.searchable-select-search');
    const optionsContainer = dropdown.querySelector('.searchable-select-options');
    
    let isOpen = false;
    let highlightedIndex = -1;
    let currentOptions = [];

    // Render options
    function renderOptions(filter = '') {
      const options = Array.from(selectElement.options).slice(1); // Skip placeholder
      const filterLower = filter.toLowerCase();
      
      currentOptions = options.filter(opt => {
        const text = opt.text.toLowerCase();
        const value = opt.value.toLowerCase();
        const data = opt.dataset.student ? JSON.parse(opt.dataset.student) : {};
        const name = (data.name || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        const grade = (data.classGrade || '').toLowerCase();
        
        return text.includes(filterLower) || 
               value.includes(filterLower) || 
               name.includes(filterLower) || 
               email.includes(filterLower) ||
               grade.includes(filterLower);
      });

      if (currentOptions.length === 0) {
        optionsContainer.innerHTML = `
          <div class="searchable-select-no-results">
            <i class="fas fa-search"></i>
            ${config.noResultsText}
          </div>
        `;
        return;
      }

      optionsContainer.innerHTML = currentOptions.map((opt, index) => {
        const data = opt.dataset.student ? JSON.parse(opt.dataset.student) : {};
        const isSelected = opt.value === selectElement.value;
        
        let mainText = data.name || opt.text;
        let subText = '';
        let badge = '';
        
        if (data.email) {
          subText = `<span>📧 ${data.email}</span>`;
        }
        
        if (data.classGrade && config.showBadge) {
          const gradeDisplay = formatGrade(data.classGrade);
          const sectionDisplay = data.classSection ? ` - ${data.classSection}` : '';
          badge = `<span class="searchable-select-option-badge">🎓 ${gradeDisplay}${sectionDisplay}</span>`;
        }
        
        if (config.formatOption) {
          const formatted = config.formatOption(opt, data);
          mainText = formatted.main || mainText;
          subText = formatted.sub || subText;
          badge = formatted.badge || badge;
        }

        return `
          <div class="searchable-select-option ${isSelected ? 'selected' : ''}" 
               data-value="${opt.value}" 
               data-index="${index}">
            <div class="searchable-select-option-main">${mainText}</div>
            ${(subText || badge) ? `<div class="searchable-select-option-sub">${subText}${badge}</div>` : ''}
          </div>
        `;
      }).join('');

      highlightedIndex = -1;
    }

    // Format grade display
    function formatGrade(grade) {
      if (!grade) return '';
      return grade
        .replace('grade', 'Grade ')
        .replace('kg1', 'KG 1')
        .replace('kg2', 'KG 2');
    }

    // Toggle dropdown
    function toggleDropdown(open) {
      isOpen = open;
      display.classList.toggle('open', open);
      dropdown.classList.toggle('open', open);
      
      if (open) {
        searchInput.value = '';
        renderOptions();
        setTimeout(() => searchInput.focus(), 50);
      }
    }

    // Select option
    function selectOption(value) {
      selectElement.value = value;
      
      const selectedOpt = Array.from(selectElement.options).find(o => o.value === value);
      if (selectedOpt && value) {
        const data = selectedOpt.dataset.student ? JSON.parse(selectedOpt.dataset.student) : {};
        let displayText = data.name || selectedOpt.text;
        
        if (data.classGrade) {
          displayText += ` (${formatGrade(data.classGrade)})`;
        }
        
        display.querySelector('.selected-text').textContent = displayText;
        display.querySelector('.selected-text').classList.remove('placeholder');
      } else {
        display.querySelector('.selected-text').textContent = config.placeholder;
        display.querySelector('.selected-text').classList.add('placeholder');
      }
      
      toggleDropdown(false);
      
      // Trigger change event
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Update highlight
    function updateHighlight(index) {
      const options = optionsContainer.querySelectorAll('.searchable-select-option');
      options.forEach((opt, i) => {
        opt.classList.toggle('highlighted', i === index);
      });
      
      if (index >= 0 && options[index]) {
        options[index].scrollIntoView({ block: 'nearest' });
      }
    }

    // Event listeners
    display.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(!isOpen);
    });

    searchInput.addEventListener('input', (e) => {
      renderOptions(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      const options = optionsContainer.querySelectorAll('.searchable-select-option');
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          highlightedIndex = Math.min(highlightedIndex + 1, options.length - 1);
          updateHighlight(highlightedIndex);
          break;
        case 'ArrowUp':
          e.preventDefault();
          highlightedIndex = Math.max(highlightedIndex - 1, 0);
          updateHighlight(highlightedIndex);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && currentOptions[highlightedIndex]) {
            selectOption(currentOptions[highlightedIndex].value);
          }
          break;
        case 'Escape':
          toggleDropdown(false);
          break;
      }
    });

    optionsContainer.addEventListener('click', (e) => {
      const option = e.target.closest('.searchable-select-option');
      if (option) {
        selectOption(option.dataset.value);
      }
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        toggleDropdown(false);
      }
    });

    // Public API
    container.searchableSelect = {
      refresh: () => renderOptions(searchInput.value),
      getValue: () => selectElement.value,
      setValue: (value) => selectOption(value),
      open: () => toggleDropdown(true),
      close: () => toggleDropdown(false)
    };

    // Initial render if there's a selected value
    if (selectElement.value) {
      selectOption(selectElement.value);
    }

    return container.searchableSelect;
  }

  /**
   * Initialize all searchable selects with a specific attribute
   */
  function initSearchableSelects() {
    document.querySelectorAll('select[data-searchable]').forEach(select => {
      createSearchableSelect(select);
    });
  }

  // Export globally
  window.SearchableSelect = {
    create: createSearchableSelect,
    init: initSearchableSelects
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchableSelects);
  } else {
    initSearchableSelects();
  }
})();
