/**
 * Global Enhanced Theme Management, Transitions & Utilities
 * Premium modern features: smooth theme transitions, page animations, accessibility, performance optimized
 */

// Performance: Request Animation Frame polyfill and utilities
const requestIdleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
const cancelIdleCallback = window.cancelIdleCallback || ((id) => clearTimeout(id));

/**
 * SVG Icon System - Grayscale, Professional, Claymorphism-aligned
 */
const SvgIconLibrary = (() => {
  const icons = {
    // Theme Toggle Icons
    moon: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    sun: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',

    // Navigation & Menu Icons
    menu: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>',
    close: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',

    // Action Icons
    search: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    send: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
    refresh: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path></svg>',
    compose: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',

    // Page Navigation Icons
    home: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    inbox: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 21 6 12 2 12"></polyline><path d="M6 12a6 6 0 0 0 12 0"></path></svg>',
    mail: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>',

    // Feature Icons
    lock: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    unlock: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>',
    users: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    star: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 10.26 24 10.27 17.18 16.70 20.27 25 12 19.54 3.73 25 6.82 16.70 0 10.27 8.91 10.26 12 2"></polygon></svg>',
    flag: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>',
    delete: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
    archive: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="5"></rect><path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><line x1="10" y1="12" x2="14" y2="12"></line></svg>',

    // Settings & Control Icons
    settings: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path><path d="M4.22 4.22l4.24 4.24m4.24 4.24l4.24 4.24"></path><path d="M1 12h6m6 0h6"></path><path d="M4.22 19.78l4.24-4.24m4.24-4.24l4.24-4.24"></path></svg>',
    sliders: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="12" x2="15" y2="12"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>',
    zap: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',

    // Admin Icons
    admin: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"></path></svg>',
    database: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14a9 3 0 0 0 18 0V5"></path><ellipse cx="12" cy="19" rx="9" ry="3"></ellipse></svg>',

    // Navigation Arrows
    arrowRight: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
    arrowLeft: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
    chevronDown: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>',

    // Status Icons
    checkCircle: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    alertCircle: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    infoCircle: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  };

  /**
   * Create SVG icon element with proper accessibility
   * @param {string} iconName - Name of the icon
   * @param {string} ariaLabel - Accessibility label (optional)
   * @param {string} title - Tooltip text (optional)
   * @returns {HTMLElement} SVG element
   */
  const createSvgIcon = (iconName, ariaLabel = '', title = '') => {
    if (!icons[iconName]) {
      console.warn(`Icon "${iconName}" not found in SVG Icon Library`);
      return document.createElement('span');
    }

    const container = document.createElement('span');
    container.innerHTML = icons[iconName];
    const svg = container.firstChild;

    // Add accessibility attributes
    if (ariaLabel) {
      svg.setAttribute('aria-label', ariaLabel);
    } else {
      svg.setAttribute('aria-hidden', 'true');
    }

    if (title) {
      svg.setAttribute('title', title);
    }

    return svg;
  };

  /**
   * Get raw SVG string for an icon
   * @param {string} iconName - Name of the icon
   * @returns {string} SVG markup
   */
  const getSvgString = (iconName) => {
    return icons[iconName] || '';
  };

  return {
    createSvgIcon,
    getSvgString,
    icons,
  };
})();

// Alias for easier use
const createSvgIcon = SvgIconLibrary.createSvgIcon;

/**
 * Utility: Debounce function for performance optimization
 */
const debounce = (func, delay = 300) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * Utility: Throttle function for scroll and resize events
 */
const throttle = (func, limit = 100) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Enhanced Theme Manager with smooth transitions
 */
const ThemeManager = (() => {
  const STORAGE_KEY = 'theme-preference';
  const THEME_ATTRIBUTE = 'data-theme';
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';
  const MOON_EMOJI = '🌙';
  const SUN_EMOJI = '☀️';
  const TRANSITION_CLASS = 'theme-transitioning';
  const READY_CLASS = 'theme-transition-ready';

  /**
   * Get system color scheme preference
   */
  const getSystemPreference = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return DARK_THEME;
    }
    return LIGHT_THEME;
  };

  /**
   * Get current theme from localStorage or system preference
   */
  const getCurrentTheme = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return getSystemPreference();
  };

  /**
   * Apply theme to document root with smooth transition
   */
  const applyTheme = (theme) => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    document.documentElement.style.colorScheme = theme;
  };

  /**
   * Update all theme toggle buttons with smooth animation
   */
  const updateToggleButtons = (theme) => {
    const buttons = document.querySelectorAll('button[id="themeToggle"]');
    const emoji = theme === DARK_THEME ? SUN_EMOJI : MOON_EMOJI;
    const label = `Switch to ${theme === DARK_THEME ? 'light' : 'dark'} mode`;

    buttons.forEach((button) => {
      button.classList.add('theme-toggle-animating');
      button.textContent = emoji;
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);

      // Remove animation class after transition
      setTimeout(() => button.classList.remove('theme-toggle-animating'), 300);
    });
  };

  /**
   * Set theme with smooth transition animation
   */
  const setTheme = (theme) => {
    if (![DARK_THEME, LIGHT_THEME].includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Using ${LIGHT_THEME}`);
      theme = LIGHT_THEME;
    }

    // Trigger smooth transition
    document.documentElement.classList.add(TRANSITION_CLASS);

    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    updateToggleButtons(theme);

    // Remove transition class after animation completes
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.documentElement.classList.remove(TRANSITION_CLASS);
      }, 300);
    });

    // Dispatch custom event for other parts of app to listen to
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  };

  /**
   * Toggle between light and dark themes with debouncing
   */
  const toggleTheme = debounce(() => {
    const current = getCurrentTheme();
    const next = current === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    setTheme(next);
  }, 100);

  /**
   * Attach click handlers to theme toggle buttons
   */
  const initializeToggleButtons = () => {
    const buttons = document.querySelectorAll('button[id="themeToggle"]');
    buttons.forEach((button) => {
      button.removeEventListener('click', toggleTheme);
      button.addEventListener('click', toggleTheme);

      // Add keyboard support (Enter and Space)
      button.removeEventListener('keydown', handleToggleKeydown);
      button.addEventListener('keydown', handleToggleKeydown);
    });
  };

  /**
   * Keyboard shortcut handler for theme toggle
   */
  const handleToggleKeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
    }
  };

  /**
   * Initialize theme management on DOM ready
   */
  const initialize = () => {
    const theme = getCurrentTheme();

    // Prevent flash of unstyled content
    document.documentElement.classList.add(READY_CLASS);

    // Apply theme and update buttons
    applyTheme(theme);
    updateToggleButtons(theme);

    // Initialize event listeners
    initializeToggleButtons();

    // Watch for dynamically added toggle buttons with optimized observer
    if (window.MutationObserver) {
      const observer = new MutationObserver(
        debounce(() => {
          initializeToggleButtons();
        }, 100)
      );

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  };

  /**
   * Public API
   */
  return {
    getCurrentTheme,
    setTheme,
    toggleTheme,
    initialize,
  };
})();

/**
 * Page Transition Manager for smooth page navigation
 */
const PageTransitions = (() => {
  const TRANSITION_CLASS = 'page-transition';
  const ACTIVE_CLASS = 'page-active';
  const DURATION = 300;

  /**
   * Fade out current page
   */
  const fadeOut = () => {
    return new Promise((resolve) => {
      document.body.classList.add(TRANSITION_CLASS);
      setTimeout(resolve, DURATION);
    });
  };

  /**
   * Fade in new page
   */
  const fadeIn = () => {
    document.body.classList.remove(TRANSITION_CLASS);
    document.body.classList.add(ACTIVE_CLASS);
  };

  /**
   * Handle link navigation with transitions
   */
  const handleLinkClick = (e) => {
    const link = e.target.closest('a');
    if (!link || link.target === '_blank' || link.target === '_external') return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    e.preventDefault();
    fadeOut().then(() => {
      window.location.href = href;
    });
  };

  /**
   * Initialize page transitions
   */
  const initialize = () => {
    fadeIn();
    document.addEventListener('click', handleLinkClick);

    // Support browser back/forward buttons
    window.addEventListener('pageshow', () => fadeIn());
  };

  return {
    initialize,
    fadeOut,
    fadeIn,
  };
})();

/**
 * Smooth Scroll Behavior Manager
 */
const SmoothScroll = (() => {
  /**
   * Scroll to element smoothly with offset
   */
  const scrollToElement = (element, offset = 80) => {
    if (!element) return;

    const targetPosition = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });
  };

  /**
   * Handle anchor links with smooth scroll
   */
  const handleAnchorClick = (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (href === '#') return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();
    scrollToElement(target);

    // Update URL without triggering page reload
    window.history.pushState(null, '', href);
  };

  /**
   * Initialize smooth scroll
   */
  const initialize = () => {
    // Enable smooth scrolling via CSS
    document.documentElement.style.scrollBehavior = 'smooth';

    // Handle anchor links
    document.addEventListener('click', handleAnchorClick);
  };

  return {
    initialize,
    scrollToElement,
  };
})();

/**
 * Accessibility Manager for enhanced keyboard navigation and ARIA
 */
const AccessibilityManager = (() => {
  /**
   * Initialize keyboard shortcuts
   */
  const initializeKeyboardShortcuts = () => {
    document.addEventListener('keydown', (e) => {
      // Theme toggle: Ctrl/Cmd + Shift + T
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        ThemeManager.toggleTheme();
      }

      // Skip to main content: Ctrl + Alt + M
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'm') {
        e.preventDefault();
        const main = document.querySelector('main') || document.querySelector('[role="main"]');
        if (main) {
          main.focus();
          main.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  };

  /**
   * Enhance focus management
   */
  const enhanceFocusManagement = () => {
    const style = document.createElement('style');
    style.textContent = `
      *:focus-visible {
        outline: 2px solid var(--focus-color, #4f46e5);
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  };

  /**
   * Add skip links for keyboard navigation
   */
  const addSkipLinks = () => {
    const skipLink = document.createElement('a');
    skipLink.href = '#main';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.setAttribute('aria-label', 'Skip to main content');
    document.body.insertBefore(skipLink, document.body.firstChild);

    const style = document.createElement('style');
    style.textContent = `
      .skip-link {
        position: absolute;
        top: -40px;
        left: 0;
        background: #000;
        color: white;
        padding: 8px;
        text-decoration: none;
        z-index: 100;
      }
      .skip-link:focus {
        top: 0;
      }
    `;
    document.head.appendChild(style);
  };

  /**
   * Initialize accessibility features
   */
  const initialize = () => {
    initializeKeyboardShortcuts();
    enhanceFocusManagement();
    addSkipLinks();

    // Announce dynamic content changes to screen readers
    if (!document.querySelector('[role="status"][aria-live]')) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      document.body.appendChild(liveRegion);
    }
  };

  return {
    initialize,
  };
})();

/**
 * Loading State Manager for async operations
 */
const LoadingManager = (() => {
  let loadingCount = 0;
  const SPINNER_CLASS = 'loading-spinner';

  /**
   * Show loading state
   */
  const show = (message = 'Loading...') => {
    loadingCount++;

    if (!document.querySelector(`.${SPINNER_CLASS}`)) {
      const spinner = document.createElement('div');
      spinner.className = SPINNER_CLASS;
      spinner.setAttribute('role', 'status');
      spinner.setAttribute('aria-live', 'polite');
      spinner.innerHTML = `
        <div class="${SPINNER_CLASS}-ring"></div>
        <div class="${SPINNER_CLASS}-message">${message}</div>
      `;
      document.body.appendChild(spinner);
    }

    document.body.classList.add('loading');
  };

  /**
   * Hide loading state
   */
  const hide = () => {
    loadingCount = Math.max(0, loadingCount - 1);

    if (loadingCount === 0) {
      document.body.classList.remove('loading');
      const spinner = document.querySelector(`.${SPINNER_CLASS}`);
      if (spinner) {
        spinner.style.opacity = '0';
        setTimeout(() => spinner.remove(), 300);
      }
    }
  };

  /**
   * Wrap async operation with loading state
   */
  const withLoadingState = async (asyncFn, message = 'Loading...') => {
    show(message);
    try {
      return await asyncFn();
    } finally {
      hide();
    }
  };

  return {
    show,
    hide,
    withLoadingState,
  };
})();

/**
 * Mobile Menu Manager for responsive navigation
 */
const MobileMenuManager = (() => {
  const MENU_CLASS = 'mobile-menu-open';
  const MENU_BUTTON_SELECTOR = '[data-menu-toggle]';
  const MENU_SELECTOR = '[data-mobile-menu]';

  /**
   * Toggle mobile menu
   */
  const toggle = () => {
    document.body.classList.toggle(MENU_CLASS);
    const button = document.querySelector(MENU_BUTTON_SELECTOR);
    if (button) {
      const isOpen = document.body.classList.contains(MENU_CLASS);
      button.setAttribute('aria-expanded', isOpen);
    }
  };

  /**
   * Close mobile menu
   */
  const close = () => {
    document.body.classList.remove(MENU_CLASS);
    const button = document.querySelector(MENU_BUTTON_SELECTOR);
    if (button) {
      button.setAttribute('aria-expanded', 'false');
    }
  };

  /**
   * Initialize mobile menu
   */
  const initialize = () => {
    const button = document.querySelector(MENU_BUTTON_SELECTOR);
    if (!button) return;

    button.addEventListener('click', toggle);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Toggle mobile menu');

    // Close menu on link click
    const menu = document.querySelector(MENU_SELECTOR);
    if (menu) {
      menu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
          close();
        }
      });
    }

    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains(MENU_CLASS)) {
        close();
      }
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest(MENU_BUTTON_SELECTOR) &&
          !e.target.closest(MENU_SELECTOR) &&
          document.body.classList.contains(MENU_CLASS)) {
        close();
      }
    });
  };

  return {
    initialize,
    toggle,
    close,
  };
})();

/**
 * Performance Monitor and Optimization
 */
const PerformanceOptimizer = (() => {
  /**
   * Lazy load images
   */
  const initializeLazyLoading = () => {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            observer.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach((img) => {
        imageObserver.observe(img);
      });
    }
  };

  /**
   * Optimize scroll performance
   */
  const optimizeScrollPerformance = () => {
    let ticking = false;

    window.addEventListener('scroll', throttle(() => {
      window.dispatchEvent(new CustomEvent('scroll-optimized'));
    }, 150), { passive: true });
  };

  /**
   * Preload critical resources
   */
  const preloadCriticalResources = () => {
    const criticalLinks = document.querySelectorAll('link[rel="preload"]');
    if (criticalLinks.length === 0 && document.fonts) {
      document.fonts.ready.then(() => {
        window.dispatchEvent(new CustomEvent('fonts-loaded'));
      });
    }
  };

  /**
   * Initialize performance optimizations
   */
  const initialize = () => {
    requestIdleCallback(() => {
      initializeLazyLoading();
      preloadCriticalResources();
      optimizeScrollPerformance();
    });
  };

  return {
    initialize,
  };
})();

/**
 * Utility: Footer Year Manager
 */
const FooterYearManager = (() => {
  const initialize = () => {
    const yearElements = document.querySelectorAll('[id="mailpro-year"]');
    const currentYear = new Date().getFullYear();
    yearElements.forEach(element => {
      element.textContent = currentYear;
    });
  };

  return {
    initialize,
  };
})();

/**
 * Global Initialization Handler
 */
const GlobalInit = (() => {
  const initialize = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeAll);
    } else {
      initializeAll();
    }
  };

  const initializeAll = () => {
    FooterYearManager.initialize();
    ThemeManager.initialize();
    PageTransitions.initialize();
    SmoothScroll.initialize();
    AccessibilityManager.initialize();
    MobileMenuManager.initialize();
    PerformanceOptimizer.initialize();
  };

  return {
    initialize,
  };
})();

/**
 * Start initialization
 */
GlobalInit.initialize();

/**
 * Listen for system theme preference changes
 */
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme-preference')) {
      ThemeManager.setTheme(e.matches ? 'dark' : 'light');
    }
  });
}
