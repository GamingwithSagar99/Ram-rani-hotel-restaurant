/**
 * THE GRAND STAY — script.js
 * Luxury Hotel & Fine Dining Landing Page
 *
 * Modules:
 *  1. Lucide Icons bootstrap
 *  2. Navbar — scroll state + mobile menu toggle
 *  3. Hero parallax (subtle)
 *  4. Booking bar — guest counter
 *  5. Scroll-triggered fade-up animations (IntersectionObserver)
 *  6. Newsletter subscribe
 *  7. Smooth anchor scroll + active-link highlight
 *  8. Utility helpers
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const SCROLL_THRESHOLD   = 55;   // px before navbar solidifies
const PARALLAX_FACTOR    = 0.22; // fraction of scroll applied to hero bg
const GUESTS_MIN         = 1;
const GUESTS_MAX         = 10;
const OBSERVER_THRESHOLD = 0;
const OBSERVER_MARGIN    = '-70px';


/* ─────────────────────────────────────────────────────────────
   1. LUCIDE ICONS
   Wait for the Lucide UMD bundle to be ready, then render
   every <i data-lucide="…"> in the document.
───────────────────────────────────────────────────────────── */
function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  } else {
    // Retry once after a short delay (edge case: slow CDN)
    setTimeout(() => {
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 300);
  }
}


/* ─────────────────────────────────────────────────────────────
   2. NAVBAR
───────────────────────────────────────────────────────────── */
function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const burgerBtn = document.getElementById('burger-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!navbar) return;

  /* ── Scroll state ── */
  let lastScrollY = window.scrollY;
  let rafPending  = false;

  function applyScrollState() {
    const scrolled = window.scrollY > SCROLL_THRESHOLD;
    navbar.classList.toggle('is-scrolled', scrolled);
    lastScrollY = window.scrollY;
    rafPending = false;
  }

  window.addEventListener('scroll', () => {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(applyScrollState);
    }
  }, { passive: true });

  // Apply immediately (page might load mid-scroll)
  applyScrollState();

  /* ── Mobile menu toggle ── */
  if (!burgerBtn || !mobileMenu) return;

  function openMenu() {
    mobileMenu.removeAttribute('hidden');
    navbar.classList.add('menu-open');
    burgerBtn.setAttribute('aria-expanded', 'true');
    // Prevent body scroll while menu is open
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    navbar.classList.remove('menu-open');
    burgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    // Delay hiding so the CSS transition can finish
    setTimeout(() => {
      if (!navbar.classList.contains('menu-open')) {
        mobileMenu.setAttribute('hidden', '');
      }
    }, 350);
  }

  function toggleMenu() {
    const isOpen = navbar.classList.contains('menu-open');
    isOpen ? closeMenu() : openMenu();
  }

  burgerBtn.addEventListener('click', toggleMenu);

  // Close menu when a mobile nav link is clicked
  mobileMenu.querySelectorAll('.navbar__mobile-link, .btn--mobile-book').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navbar.classList.contains('menu-open')) {
      closeMenu();
      burgerBtn.focus();
    }
  });

  // Close when clicking outside the nav area
  document.addEventListener('click', (e) => {
    if (navbar.classList.contains('menu-open') && !navbar.contains(e.target)) {
      closeMenu();
    }
  });
}


/* ─────────────────────────────────────────────────────────────
   3. HERO PARALLAX
   Gently shifts the background image on scroll for depth.
   Disabled when prefers-reduced-motion is set.
───────────────────────────────────────────────────────────── */
function initParallax() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const heroBg = document.querySelector('.hero__bg');
  if (!heroBg) return;

  let rafId = null;

  function updateParallax() {
    const y = window.scrollY;
    heroBg.style.transform = `translateY(${y * PARALLAX_FACTOR}px)`;
    rafId = null;
  }

  window.addEventListener('scroll', () => {
    if (!rafId) {
      rafId = requestAnimationFrame(updateParallax);
    }
  }, { passive: true });
}


/* ─────────────────────────────────────────────────────────────
   4. BOOKING BAR — GUEST COUNTER
───────────────────────────────────────────────────────────── */
function initGuestCounter() {
  const decBtn    = document.getElementById('guests-dec');
  const incBtn    = document.getElementById('guests-inc');
  const countEl   = document.getElementById('guests-count');

  if (!decBtn || !incBtn || !countEl) return;

  let count = parseInt(countEl.textContent, 10) || 2;

  function updateCount(newCount) {
    count = clamp(newCount, GUESTS_MIN, GUESTS_MAX);
    countEl.textContent = count;

    // Disable buttons at bounds
    decBtn.disabled = count <= GUESTS_MIN;
    incBtn.disabled = count >= GUESTS_MAX;
    decBtn.style.opacity = count <= GUESTS_MIN ? '0.38' : '1';
    incBtn.style.opacity = count >= GUESTS_MAX ? '0.38' : '1';
  }

  decBtn.addEventListener('click', () => updateCount(count - 1));
  incBtn.addEventListener('click', () => updateCount(count + 1));

  // Initialise disabled states
  updateCount(count);

  // Check Availability button — basic feedback
  const ctaBtn = document.querySelector('.booking-bar__cta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      const checkin  = document.getElementById('checkin')?.value;
      const checkout = document.getElementById('checkout')?.value;

      if (!checkin || !checkout) {
        showToast('Please select your check-in and check-out dates.');
        return;
      }

      const inDate  = new Date(checkin);
      const outDate = new Date(checkout);

      if (outDate <= inDate) {
        showToast('Check-out must be after check-in.');
        return;
      }

      const nights = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
      showToast(`Searching availability for ${nights} night${nights > 1 ? 's' : ''}, ${count} guest${count > 1 ? 's' : ''}…`, 'success');
    });
  }
}


/* ─────────────────────────────────────────────────────────────
   5. SCROLL-TRIGGERED FADE-UP ANIMATIONS
   Uses IntersectionObserver to add .is-visible to .fade-up
   elements as they enter the viewport.
───────────────────────────────────────────────────────────── */
function initScrollAnimations() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const targets = document.querySelectorAll('.fade-up');
  if (!targets.length) return;

  // When reduced motion is preferred, show everything immediately
  if (prefersReducedMotion) {
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // fire once only
      }
    });
  }, {
    threshold: OBSERVER_THRESHOLD,
    rootMargin: OBSERVER_MARGIN,
  });

  targets.forEach(el => observer.observe(el));
}


/* ─────────────────────────────────────────────────────────────
   6. NEWSLETTER SUBSCRIBE
───────────────────────────────────────────────────────────── */
function initNewsletter() {
  const submitBtn  = document.getElementById('nl-submit-btn');
  const emailInput = document.getElementById('nl-email');
  const inputWrap  = document.getElementById('nl-input-wrap');
  const successMsg = document.getElementById('nl-success');

  if (!submitBtn || !emailInput) return;

  function trySubscribe() {
    const email = emailInput.value.trim();

    if (!email) {
      emailInput.focus();
      emailInput.style.outline = '1px solid rgba(201,168,76,0.6)';
      setTimeout(() => { emailInput.style.outline = ''; }, 1200);
      return;
    }

    if (!isValidEmail(email)) {
      showToast('Please enter a valid email address.');
      emailInput.focus();
      return;
    }

    // Success state
    if (inputWrap)  inputWrap.setAttribute('hidden', '');
    if (successMsg) successMsg.removeAttribute('hidden');
    showToast('You\'re subscribed. Welcome to the family!', 'success');
  }

  submitBtn.addEventListener('click', trySubscribe);

  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') trySubscribe();
  });
}


/* ─────────────────────────────────────────────────────────────
   7. SMOOTH ANCHOR SCROLL + ACTIVE LINK HIGHLIGHT
   Overrides the default anchor jump with a smooth scroll
   that accounts for the sticky navbar height.
───────────────────────────────────────────────────────────── */
function initSmoothScroll() {
  const navbar = document.getElementById('navbar');

  // Intercept all internal anchor clicks
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href    = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const target  = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const navH    = navbar ? navbar.getBoundingClientRect().height : 0;
      const top     = target.getBoundingClientRect().top + window.scrollY - navH - 16;

      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  });

  /* ── Active nav link on scroll ── */
  const sections    = document.querySelectorAll('section[id], footer[id]');
  const navLinks    = document.querySelectorAll('.navbar__link');

  if (!sections.length || !navLinks.length) return;

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          const matches = link.getAttribute('href') === `#${id}`;
          link.style.color = matches
            ? 'var(--gold)'
            : '';
        });
      }
    });
  }, {
    rootMargin: '-40% 0px -55% 0px',
    threshold: 0,
  });

  sections.forEach(s => sectionObserver.observe(s));
}


/* ─────────────────────────────────────────────────────────────
   8. UTILITY HELPERS
───────────────────────────────────────────────────────────── */

/**
 * Clamp a number between min and max.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Basic email format validation.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Show a lightweight toast notification.
 * Creates (or reuses) a single #gs-toast element.
 */
let toastTimer = null;

function showToast(message, type = 'error') {
  let toast = document.getElementById('gs-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'gs-toast';
    Object.assign(toast.style, {
      position:        'fixed',
      bottom:          '2rem',
      left:            '50%',
      transform:       'translateX(-50%) translateY(10px)',
      zIndex:          '9999',
      padding:         '0.85rem 1.75rem',
      borderRadius:    '3px',
      fontFamily:      "'Lato', sans-serif",
      fontSize:        '0.82rem',
      letterSpacing:   '0.04em',
      opacity:         '0',
      transition:      'opacity 0.35s, transform 0.35s',
      pointerEvents:   'none',
      whiteSpace:      'nowrap',
      maxWidth:        'calc(100vw - 3rem)',
      textAlign:       'center',
      boxShadow:       '0 8px 30px rgba(0,0,0,0.18)',
    });
    document.body.appendChild(toast);
  }

  // Style by type
  const isSuccess = type === 'success';
  toast.style.background = isSuccess ? '#1C1917' : '#1C1917';
  toast.style.color       = isSuccess ? '#C9A84C' : '#d6d3d1';
  toast.style.border      = `1px solid ${isSuccess ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.08)'}`;

  toast.textContent = message;

  // Show
  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Auto-hide
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, 3200);
}


/* ─────────────────────────────────────────────────────────────
   INITIALISE
   Run all modules after the DOM is ready.
───────────────────────────────────────────────────────────── */
function init() {
  initIcons();
  initNavbar();
  initParallax();
  initGuestCounter();
  initScrollAnimations();
  initNewsletter();
  initSmoothScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOMContentLoaded already fired
  init();
}
