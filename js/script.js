// Feature-detect: skip motion-heavy interactions for reduced-motion / touch users
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

// ==========================================================================
// Lenis — сглаженный (инерционный) скролл, как у good-fella.com: колесо
// мыши прокручивает страницу с плавным ускорением/торможением. Библиотека
// подключена в index.html с CDN; если она не загрузилась — работает обычный
// скролл. Все внутренние переходы (меню, точки, «наверх») идут через него.
// ==========================================================================
let lenis = null;

if (!prefersReducedMotion && typeof Lenis !== 'undefined') {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  const rafLoop = (time) => {
    lenis.raf(time);
    requestAnimationFrame(rafLoop);
  };
  requestAnimationFrame(rafLoop);
}

// Идёт программный скролл (меню/точки/«наверх»)? В это время скролл-гейт
// навыков не должен срабатывать, даже если прокрутка пролетает границу секции.
let navScrolling = false;
// Снимает скролл-гейт навыков, если он активен (переопределяется ниже)
let releaseSkillsGate = () => {};

const scrollToTarget = (target, offset = 0) => {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.2 });
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' });
  } else {
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
};

// Preloader: counts up to 100% while the page finishes loading
const preloader = document.getElementById('preloader');
const preloaderCount = document.getElementById('preloaderCount');
const preloaderBarFill = document.getElementById('preloaderBarFill');

if (preloader && preloaderCount) {
  document.body.classList.add('preload-lock');

  const setProgress = (value) => {
    preloaderCount.textContent = Math.floor(value) + '%';
    if (preloaderBarFill) preloaderBarFill.style.width = value + '%';
  };

  const finishPreload = () => {
    setProgress(100);
    preloader.classList.add('done');
    document.body.classList.remove('preload-lock');
    setTimeout(() => preloader.remove(), 700);
  };

  if (prefersReducedMotion) {
    finishPreload();
  } else {
    const minDuration = 2200; // keep the loading screen visible a bit longer
    const startTime = performance.now();
    let progress = 0;
    let pageLoaded = false;
    window.addEventListener('load', () => { pageLoaded = true; });

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const readyToFinish = pageLoaded && elapsed >= minDuration;
      const ceiling = readyToFinish ? 100 : pageLoaded ? 96 : 90;
      progress += (ceiling - progress) * 0.06 + 0.22;
      if (progress >= 100) {
        finishPreload();
        return;
      }
      setProgress(progress);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Safety net: never let the preloader block the page indefinitely
    setTimeout(() => {
      if (document.body.contains(preloader)) finishPreload();
    }, 5000);
  }
}

// Header: shrink + blur on scroll, scroll progress bar, back-to-top visibility
const header = document.getElementById('siteHeader');
const scrollProgressFill = document.getElementById('scrollProgressFill');
const backToTop = document.getElementById('backToTop');
// как у good-fella: когда футер доходит до шапки, шапка уезжает вверх
const siteFooter = document.querySelector('.site-footer');
const footerInner = document.querySelector('.footer-inner');
let footerShiftPct = 0; // последний применённый сдвиг футера, % его высоты
const onScroll = () => {
  if (window.scrollY > 40) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }

  if (siteFooter) {
    const footerTop = siteFooter.getBoundingClientRect().top;
    header.classList.toggle('footer-reached', footerTop <= header.offsetHeight);

    // как у good-fella (их FooterClient): фон футера поднимается «с опережением» —
    // стартует на 20% собственной высоты выше и доезжает до натурального места,
    // а контент футера за это же время проявляется из прозрачного. Выглядит
    // как мягкое размытое полотно, которое «собирается» в чёткий футер.
    // rect футера включает сдвиг transform, поэтому натуральный top
    // восстанавливаем вычитанием последнего применённого сдвига.
    if (!prefersReducedMotion) {
      const rect = siteFooter.getBoundingClientRect();
      const vh = window.innerHeight;
      const naturalTop = rect.top - (footerShiftPct / 100) * rect.height;
      const s = Math.min(1, Math.max(0, (vh - naturalTop) / rect.height));
      footerShiftPct = -20 + 20 * s;
      siteFooter.style.transform = `translate3d(0, ${(-20 + 20 * s).toFixed(3)}%, 0)`;
      if (footerInner) footerInner.style.opacity = s.toFixed(3);
    }
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
  scrollToTarget(0);
});

// Header adapts to the section under it (see updateSectionState below)

// Logo easter egg: 5 quick clicks
const logoMark = document.getElementById('logoMark');
const easterToast = document.getElementById('easterToast');

if (logoMark && easterToast) {
  let eggClicks = 0;
  let eggTimer = null;

  logoMark.addEventListener('click', (e) => {
    eggClicks += 1;
    clearTimeout(eggTimer);
    eggTimer = setTimeout(() => { eggClicks = 0; }, 900);

    if (eggClicks >= 5) {
      eggClicks = 0;
      e.preventDefault();
      logoMark.classList.remove('egg-spin');
      void logoMark.offsetWidth;
      logoMark.classList.add('egg-spin');
      easterToast.classList.add('show');
      setTimeout(() => easterToast.classList.remove('show'), 2600);
    }
  });
}

// Active section tracking — drives both the top nav underline and the side dot nav
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
const sectionMeta = {
  heroSection: 'Начало',
  about: 'Обо мне',
  work: 'Проекты',
  services: 'Услуги',
  process: 'Как работаю',
  faq: 'Вопросы',
  contact: 'Контакты',
};
const sectionEls = Object.keys(sectionMeta)
  .map((id) => document.getElementById(id))
  .filter(Boolean);

const dotsNav = document.getElementById('sectionDots');
const dotButtons = new Map();

if (dotsNav) {
  sectionEls.forEach((sec) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', sectionMeta[sec.id]);
    btn.addEventListener('click', () => {
      scrollToTarget(sec);
    });
    dotsNav.appendChild(btn);
    dotButtons.set(sec.id, btn);
  });
}

let activeSectionId = null;

const setActiveSection = (id) => {
  if (id === activeSectionId) return;
  activeSectionId = id;
  dotButtons.forEach((btn, key) => btn.classList.toggle('active', key === id));
  navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === '#' + id));
};

// ==========================================================================
// Sticky stacking — наезд секций (как у good-fella.com)
// Каждая секция «замерзает» (CSS-правило main > section: position sticky),
// следующая наезжает поверх. Смещение top = высота секции − вьюпорт:
// секция замирает ровно на своём последнем экране.
// ==========================================================================
const stackSections = [...document.querySelectorAll('main > section')];

const updateStackTops = () => {
  if (!window.matchMedia('(min-width: 1024px)').matches) {
    stackSections.forEach((sec) => sec.style.removeProperty('top'));
    return;
  }
  const vh = window.innerHeight;
  stackSections.forEach((sec) => {
    const h = sec.getBoundingClientRect().height;
    sec.style.top = Math.min(0, vh - h) + 'px';
  });
};

// Замороженная секция всегда остаётся в вьюпорте под наезжающими —
// IntersectionObserver тут врёт (никогда не «уходит»). Поэтому и тема шапки,
// и активная секция считаются по позиции: идём по секциям в порядке DOM,
// верхним слоем в точке под шапкой будет последняя перекрывающая её секция.
const probeY = () => Math.max(24, header.offsetHeight / 2);

const currentTopSection = () => {
  let current = null;
  sectionEls.forEach((sec) => {
    const r = sec.getBoundingClientRect();
    if (r.top <= probeY() && r.bottom > probeY()) current = sec;
  });
  return current;
};

const updateSectionState = () => {
  const sec = currentTopSection();
  const onDark = !!(sec && sec.dataset.theme === 'dark');
  header.classList.toggle('on-dark', onDark);
  // панель меню тоже подстраивается под секцию (как surface у good-fella)
  const mnav = document.getElementById('mobileNav');
  if (mnav) mnav.classList.toggle('on-dark', onDark);
  if (sec) setActiveSection(sec.id);
};

window.addEventListener('scroll', updateSectionState, { passive: true });
window.addEventListener('resize', () => {
  updateStackTops();
  updateSectionState();
});
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { updateStackTops(); updateSectionState(); });
}
window.addEventListener('load', () => { updateStackTops(); updateSectionState(); });
updateStackTops();
updateSectionState();

// Mobile menu toggle
const burger = document.getElementById('burger');
const mobileNav = document.getElementById('mobileNav');

const closeMenu = () => {
  burger.classList.remove('active');
  mobileNav.classList.remove('open');
  document.body.classList.remove('menu-open');
};

burger.addEventListener('click', () => {
  burger.classList.toggle('active');
  mobileNav.classList.toggle('open');
  document.body.classList.toggle('menu-open');
});

// как у good-fella: клик вне панели закрывает меню
document.addEventListener('click', (e) => {
  if (!mobileNav.classList.contains('open')) return;
  if (mobileNav.contains(e.target) || burger.contains(e.target)) return;
  closeMenu();
});

mobileNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

// плавный скролл по внутренним якорям (меню, навигация, футер)
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
  });
});

// ==========================================================================
// Квадрат-маркер в меню — как у good-fella: при наведении на пункт выезжает
// слева к его вертикальному центру и доворачивается на 90° при переходе
// между пунктами. Без hover квадрат стоит у ПУНКТА АКТИВНОЙ СЕКЦИИ
// (скролл-спай выше), как у оригинала: hovered ?? active.
// ==========================================================================
const gfMenu = document.getElementById('gfMenu');
const menuSquare = document.getElementById('menuSquare');

if (gfMenu && menuSquare) {
  const menuItems = [...gfMenu.querySelectorAll('.gf-menu-item')];
  let squareRotation = 0;
  let currentItem = null;

  // квадрат ставится левее текста на --square-offset (на десктопе совпадает с --menu-shift)
  const shiftValue = () =>
    parseFloat(getComputedStyle(gfMenu).getPropertyValue('--square-offset')) ||
    parseFloat(getComputedStyle(gfMenu).getPropertyValue('--menu-shift')) ||
    64;

  const placeSquare = (item, show) => {
    const size = menuSquare.offsetWidth;
    const shift = shiftValue();
    // куда встаёт квадрат у помеченного пункта: на десктопе текст сдвигается
    // на --menu-shift и квадрат занимает его место (сдвиг − офсет = 0);
    // на мобильной текст не сдвигается (--menu-shift: 0) — квадрат
    // остаётся левее текста, в паддинге панели, и не налезает на буквы
    const cs = getComputedStyle(gfMenu);
    const markedX = (parseFloat(cs.getPropertyValue('--menu-shift')) || 0) -
      (parseFloat(cs.getPropertyValue('--square-offset')) || 0);
    let y = parseFloat(menuSquare.style.translate.split(' ')[1]) || 0;
    if (item) {
      // координату берём по обёртке .gf-menu-clip, а не по самому пункту:
      // пункт лежит в .gf-menu-in, который при открытии меню каскадно
      // сдвинут translateY(110%), и его rect учитал бы этот сдвиг
      const menuRect = gfMenu.getBoundingClientRect();
      const wrapRect = item.closest('.gf-menu-clip').getBoundingClientRect();
      y = wrapRect.top - menuRect.top + (item.offsetHeight - size) / 2;
    }
    menuSquare.style.translate = (show ? markedX + 'px' : -shift + 'px') + ' ' + y + 'px';
    menuSquare.style.opacity = show ? '1' : '0';
  };

  const activeMenuItem = () =>
    menuItems.find((item) => item.getAttribute('href') === '#' + activeSectionId) || null;

  // Как у good-fella (K = hovered ?? active): пункт, на котором стоит квадрат,
  // помечается .is-marked — сам сдвигается вправо, освобождая место квадрату.
  // Пункт активной секции дополнительно подсвечен (.is-active), пока меню открыто.
  const markItem = (item) => {
    menuItems.forEach((it) => it.classList.toggle('is-marked', it === item));
  };

  const setActiveTint = () => {
    const home = activeMenuItem();
    menuItems.forEach((it) => it.classList.toggle('is-active', it === home));
  };

  // вернуть квадрат к пункту активной секции (или спрятать, если секции нет)
  const returnSquareHome = () => {
    const home = activeMenuItem();
    currentItem = null;
    markItem(home);
    placeSquare(home, !!home);
  };

  const placeSquareIntro = (item) => {
    if (!item) {
      // активной секции с пунктом меню нет — квадрат спрятан, а не «где-то рядом»
      markItem(null);
      placeSquare(null, false);
      return;
    }
    // при открытии меню квадрат выезжает из-за левого края к активному пункту
    placeSquare(item, false);
    void menuSquare.offsetWidth; // reflow, чтобы transition проигрался
    placeSquare(item, true);
    markItem(item);
  };

  gfMenu.querySelectorAll('.gf-menu-item').forEach((item) => {
    item.addEventListener('mouseenter', () => {
      // при переходе на новый пункт квадрат доворачивается на 90°
      if (currentItem !== item) {
        squareRotation += 90;
        currentItem = item;
      }
      menuSquare.style.rotate = squareRotation + 'deg';
      markItem(item);
      placeSquare(item, true);
    });

    // уход с пункта — квадрат возвращается к активной секции (как у good-fella:
    // K = hovered ?? active), а не зависает на последнем наведённом
    item.addEventListener('mouseleave', returnSquareHome);
  });

  gfMenu.addEventListener('mouseleave', returnSquareHome);

  // при открытии меню квадрат сразу встаёт у активной секции
  burger.addEventListener('click', () => {
    if (mobileNav.classList.contains('open')) {
      mobileNav.classList.toggle('on-dark', header.classList.contains('on-dark'));
      setActiveTint();
      currentItem = null;
      placeSquareIntro(activeMenuItem());
    }
  });
}

// ==========================================================================
// Скролл-подсветка в закреплённых секциях — как «Process» у good-fella:
// секция выше экрана, её контент прилипает (sticky .section-pin) и стоит
// на месте, пока скролл идёт «сквозь» секцию. Подсветка — чистая функция
// от позиции скролла: каждый шаг прогресса (.is-hot, вид = hover секции)
// переносится на следующий элемент. Скролл никак не блокируется, поэтому
// в обратную сторону всё работает само: листаешь вверх — подсветка
// возвращается по пунктам.
// ==========================================================================
const pinnedHighlightGroups = [
  { section: document.getElementById('about'), itemsSelector: '.skills-panel ul li' },
  { section: document.getElementById('services'), itemsSelector: '.service-row' },
  { section: document.getElementById('process'), itemsSelector: '.process-row' },
].filter((group) => group.section);

const updatePinnedHighlights = () => {
  pinnedHighlightGroups.forEach(({ section, itemsSelector }) => {
    const pin = section.querySelector('.section-pin');
    const items = [...section.querySelectorAll(itemsSelector)];
    // на узких экранах пин выключен (CSS) — подсветки там нет
    if (!items.length || !pin || getComputedStyle(pin).position !== 'sticky') return;

    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    // секция ещё не заняла экран или уже ушла — подсветки нет
    if (rect.top > 0 || rect.bottom < vh) {
      items.forEach((li) => li.classList.remove('is-hot'));
      return;
    }
    // 0 — липкая часть только началась, 1 — полностью пройдена
    const total = rect.height - vh;
    const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
    const index = Math.min(items.length - 1, Math.floor(progress * items.length));
    items.forEach((li, i) => li.classList.toggle('is-hot', i === index));
  });
};

window.addEventListener('scroll', updatePinnedHighlights, { passive: true });
window.addEventListener('resize', updatePinnedHighlights);
updatePinnedHighlights();

// Клик по пункту — как у good-fella: страница плавно доскролливается до
// позиции, где этот пункт становится активным (hover на пунктах, как и
// в оригинале, ничего не делает — подсветка управляется только скроллом).
pinnedHighlightGroups.forEach(({ section, itemsSelector }) => {
  section.querySelectorAll(itemsSelector).forEach((item, i, items) => {
    item.addEventListener('click', () => {
      const pin = section.querySelector('.section-pin');
      // на узких экранах пина нет — клик никуда не скроллит
      if (!pin || getComputedStyle(pin).position !== 'sticky') return;
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return;
      // индекс i активен, когда прогресс ∈ [i/n, (i+1)/n)
      const y = Math.round(rect.top + window.scrollY + (i / items.length) * total);
      scrollToTarget(y);
    });
  });
});

// ==========================================================================
// FAQ — аккордеон как у good-fella «Common questions»: открыт один элемент,
// клик по открытому закрывает его; aria-expanded синхронно с состоянием
// ==========================================================================
const faqItems = [...document.querySelectorAll('.faq-item')];

faqItems.forEach((item) => {
  const btn = item.querySelector('.faq-q');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    faqItems.forEach((other) => {
      other.classList.remove('open');
      other.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
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

// ==========================================================================
// Заявка в футере — отправка в Telegram (send-lead.php): имя + телефон.
// ==========================================================================
const newsForm = document.getElementById('newsForm');

if (newsForm) {
  newsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('newsName').value.trim();
    const phone = document.getElementById('newsPhone').value.trim();
    const btn = newsForm.querySelector('.footer-news-btn');
    const btnLabel = btn ? btn.querySelector('.fnb-label') : null;
    const status = document.getElementById('newsStatus');

    if (btn) btn.disabled = true;
    if (btnLabel) btnLabel.textContent = 'Отправляю...';

    try {
      const response = await fetch('send-lead.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, source: 'Заявка (футер)' }),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error('Subscribe API error');

      newsForm.reset();
      status.textContent = 'Заявка отправлена. Свяжусь с вами!';
      status.classList.add('show');
      status.classList.remove('error');
    } catch (err) {
      status.textContent = 'Не получилось. Напишите напрямую: t.me/ant_webp';
      status.classList.add('show', 'error');
    } finally {
      if (btn) btn.disabled = false;
      if (btnLabel) btnLabel.textContent = 'Оставить заявку';
    }
  });
}

// ==========================================================================
// Скрейбл текста кнопок на hover — как у good-fella (их useDualLayerScramble
// на GSAP ScrambleTextPlugin): текст в покое белый, на hover вспыхивает чёрным
// и мерцает случайными символами, а затем посимвольно «проявляется» обратно
// в белый слева направо. Итог — тот же белый текст, меняется только цвет
// во время волны. mouseleave анимацию не отменяет — она доигрывает до конца.
// ==========================================================================
const SCRAMBLE_CHARS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ0123456789_$#&*';
const SCRAMBLE_WAVE_COLOR = '#141314';
// задержка до начала «проявления» и длительность посимвольной волны
// (как у оригинала: твин скрейбла 0.5s + твин проявления 0.5s со сдвигом
// по символам — вся волна занимает ~1s)
const SCRAMBLE_HOLD = 250;
const SCRAMBLE_RESOLVE = 750;

function setupButtonScramble() {
  if (prefersReducedMotion || isTouchDevice) return;

  // light-кнопка вспыхивает тёмным (как у них на светлом фоне),
  // кнопка подписки и ссылки футера — оранжевым (их scramble-brand),
  // проявляется обратно в родной цвет ссылки (scramble-inherit).
  // center: не фиксировать ширину и не менять выравнивание — для mono-текста
  // и центрированного лейбла, иначе текст «прыгает» при hover
  const targets = [
    // тёмная кнопка в контактах вспыхивает акцентом — чёрная волна на чёрном
    // фоне была бы невидима
    { btn: '.btn-accent:not(.btn-accent-dark)', label: '.btn-label', wave: '#141314' },
    { btn: '.btn-accent-dark', label: '.btn-label', wave: '#9f2933' },
    { btn: '.footer-news-btn', label: '.fnb-label', wave: '#9f2933', center: true },
    // скорость волны как у оригинала: два GSAP-твина по 0.5s → ~1s на цикл
    { btn: '.footer-nav a', label: null, wave: '#9f2933', center: true, hold: 250, resolve: 750 },
  ];

  targets.forEach(({ btn: btnSel, label: labelSel, wave, center, hold: holdMs, resolve: resolveMs }) => {
  document.querySelectorAll(btnSel).forEach((btn) => {
    const label = labelSel ? btn.querySelector(labelSel) : btn;
    if (!label) return;

    const original = label.textContent;
    let rafId = null;

    btn.addEventListener('mouseenter', () => {
      // как у good-fella: пока анимация идёт, повторный hover её не перезапускает
      if (rafId) return;
      const hold = holdMs || SCRAMBLE_HOLD;
      const resolve = resolveMs || SCRAMBLE_RESOLVE;
      const start = performance.now();

      // фиксируем ширину лейбла на время анимации, иначе короткая строка
      // схлопывает кнопку (как у good-fella). Для центрированных mono-целей
      // не трогаем ничего — рандомные символы той же длины ширину не меняют
      if (!center) {
        const lockedWidth = label.offsetWidth;
        label.style.width = lockedWidth + 'px';
        label.style.justifyContent = 'flex-start';
      }

      // два слоя: проявленный префикс + мерцающая волна вспышки
      const spDone = document.createElement('span');
      const spWave = document.createElement('span');
      spWave.style.color = wave;
      label.textContent = '';
      label.append(spDone, spWave);

      const randomChar = () =>
        SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];

      const step = (now) => {
        const elapsed = now - start;
        // сколько символов уже «проявилось» обратно в чёрный
        let done = 0;
        while (
          done < original.length &&
          elapsed >= hold + (done / original.length) * resolve
        ) {
          done += 1;
        }
        spDone.textContent = original.slice(0, done);
        let wave = '';
        for (let i = done; i < original.length; i++) {
          wave += original[i] === ' ' ? ' ' : randomChar();
        }
        spWave.textContent = wave;
        if (done < original.length) {
          rafId = requestAnimationFrame(step);
        } else {
          label.textContent = original;
          if (!center) {
            label.style.width = '';
            label.style.justifyContent = '';
          }
          rafId = null;
        }
      };

      rafId = requestAnimationFrame(step);
    });
  });
  });
}

setupButtonScramble();
