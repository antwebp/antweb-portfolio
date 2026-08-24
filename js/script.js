// Header: shrink + blur on scroll, scroll progress bar, back-to-top visibility
const header = document.getElementById('siteHeader');
const scrollProgressFill = document.getElementById('scrollProgressFill');
const backToTop = document.getElementById('backToTop');
const onScroll = () => {
  if (window.scrollY > 40) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }

  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
  scrollProgressFill.style.width = progress + '%';

  if (window.scrollY > 500) {
    backToTop.classList.add('visible');
  } else {
    backToTop.classList.remove('visible');
  }
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Mobile menu toggle
const burger = document.getElementById('burger');
const mobileNav = document.getElementById('mobileNav');

burger.addEventListener('click', () => {
  burger.classList.toggle('active');
  mobileNav.classList.toggle('open');
  document.body.classList.toggle('menu-open');
});

mobileNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    burger.classList.remove('active');
    mobileNav.classList.remove('open');
    document.body.classList.remove('menu-open');
  });
});

// Scroll reveal animations
const animatedEls = document.querySelectorAll('[data-animate]');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  animatedEls.forEach((el) => observer.observe(el));
} else {
  animatedEls.forEach((el) => el.classList.add('in-view'));
}

// Feature-detect: skip motion-heavy interactions for reduced-motion / touch users
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

if (!prefersReducedMotion && !isTouchDevice) {
  // Project card 3D tilt
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -4;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 4;
      card.style.transition = 'transform 0.1s ease-out';
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s var(--ease)';
      card.style.transform = '';
    });
  });
}

// Count-up stats
const statNumbers = document.querySelectorAll('.stat-number');

if (statNumbers.length && 'IntersectionObserver' in window) {
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.countTo, 10) || 0;

        if (prefersReducedMotion) {
          el.textContent = target;
        } else {
          const duration = 1200;
          const start = performance.now();
          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased);
            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              el.textContent = target;
            }
          };
          requestAnimationFrame(tick);
        }
        countObserver.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  statNumbers.forEach((el) => countObserver.observe(el));
} else {
  statNumbers.forEach((el) => {
    el.textContent = el.dataset.countTo;
  });
}

// Lead modal
const leadModal = document.getElementById('leadModal');
const modalClose = document.getElementById('modalClose');
const leadForm = document.getElementById('leadForm');
const modalStatus = document.getElementById('modalStatus');

const openModal = () => {
  leadForm.hidden = false;
  modalStatus.className = 'modal-status';
  modalStatus.textContent = '';
  leadModal.classList.add('open');
  document.body.classList.add('modal-open');
  document.getElementById('leadName').focus();
};

const closeModal = () => {
  leadModal.classList.remove('open');
  document.body.classList.remove('modal-open');
};

document.querySelectorAll('.js-open-modal').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });
});

modalClose.addEventListener('click', closeModal);

leadModal.addEventListener('click', (e) => {
  if (e.target === leadModal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && leadModal.classList.contains('open')) closeModal();
});

leadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('leadName').value.trim();
  const phone = document.getElementById('leadPhone').value.trim();
  const submitBtn = leadForm.querySelector('button[type="submit"]');

  modalStatus.className = 'modal-status';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправляю...';

  try {
    const response = await fetch('send-lead.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error('Lead API error');

    leadForm.reset();
    leadForm.hidden = true;
    modalStatus.textContent = 'Спасибо! Заявка отправлена, скоро свяжусь с вами.';
    modalStatus.classList.add('show', 'success');
  } catch (err) {
    modalStatus.textContent = 'Не получилось отправить форму. Напишите напрямую в Telegram: @ant_webp';
    modalStatus.classList.add('show', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Отправить заявку';
  }
});
