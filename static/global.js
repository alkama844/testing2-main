/**
 * Global Enhanced Theme Management, Transitions & Utilities
 * Premium modern features: smooth theme transitions, page animations, accessibility, performance optimized
 */

// Performance: Request Animation Frame polyfill and utilities
const requestIdleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
const cancelIdleCallback = window.cancelIdleCallback || ((id) => clearTimeout(id));

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
