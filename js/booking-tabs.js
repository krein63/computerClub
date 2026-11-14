'use strict';

const bookingTabList = document.querySelector('.booking-tabs');
const bookingTabs = Array.from(bookingTabList.querySelectorAll('[role="tab"]'));
const bookingPanels = bookingTabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
bookingTabList.style.setProperty('--tab-count', bookingTabs.length);

function showBookingTab(index) {
  bookingTabList.style.setProperty('--active-tab', index);
  bookingTabs.forEach((tab, position) => {
    const selected = position === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    bookingPanels[position].hidden = !selected;
  });
}

function openBookingTab(index, focus = false) {
  const hash = '#' + bookingPanels[index].id;
  if (location.hash !== hash) {
    try {
      history.pushState(null, '', hash);
    } catch {
      location.hash = hash;
    }
  }
  showBookingTab(index);
  document.dispatchEvent(new Event('booking:tab-change'));
  if (focus) bookingTabs[index].focus();
}

const cartDialog = document.getElementById('food-cart-dialog');
const cartTargets = ['food-cart', cartDialog.id];
let cartTrigger;

function openCart(trigger = document.activeElement) {
  if (cartDialog.open) return;
  cartTrigger = trigger;
  cartDialog.showModal();
}

document.getElementById('food-cart-close').addEventListener('click', () => cartDialog.close());
cartDialog.addEventListener('close', () => {
  if (cartTargets.includes(location.hash.slice(1))) {
    history.replaceState(null, '', '#' + bookingPanels.find(panel => !panel.hidden).id);
    document.dispatchEvent(new Event('booking:tab-change'));
  }
  const returnFocus = cartTrigger instanceof HTMLElement && cartTrigger !== document.body
    ? cartTrigger
    : document.getElementById('nav-cart');
  returnFocus?.focus();
});
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  const link = event.target.closest('a[href]');
  if (!link || link.target || link.protocol !== location.protocol ||
      link.host !== location.host || link.pathname !== location.pathname) return;
  if (cartTargets.includes(link.hash.slice(1))) {
    event.preventDefault();
    openCart(link);
  }
});

function followBookingLink() {
  const id = location.hash.slice(1);
  if (cartTargets.includes(id)) {
    openCart();
    return;
  }
  if (cartDialog.open) cartDialog.close();
  if (!id) {
    showBookingTab(0);
    return;
  }
  const target = document.getElementById(id);
  const index = bookingPanels.findIndex(panel => panel.contains(target));
  const seatLink = id === 'seat-map' || id.startsWith('seats-');
  const section = index >= 0 ? index : seatLink ? 0 : -1;
  if (section < 0) return;
  showBookingTab(section);
  requestAnimationFrame(() => {
    if (location.hash === '#' + id) document.getElementById(id)?.scrollIntoView();
  });
}

bookingTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => openBookingTab(index));
  tab.addEventListener('keydown', event => {
    const next = {
      ArrowLeft: (index + bookingTabs.length - 1) % bookingTabs.length,
      ArrowRight: (index + 1) % bookingTabs.length,
      Home: 0,
      End: bookingTabs.length - 1
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    openBookingTab(next, true);
  });
});
window.addEventListener('hashchange', followBookingLink);
window.addEventListener('popstate', followBookingLink);
window.addEventListener('load', followBookingLink, { once: true });
document.addEventListener('booking:seats-ready', () => {
  if (/^#(?:seat-map|seats-)/.test(location.hash)) followBookingLink();
});
document.addEventListener('booking:saved', () => {
  const totalIndex = bookingTabs.findIndex(tab => tab.id === 'booking-tab-total');
  openBookingTab(totalIndex);
  bookingPanels[totalIndex].focus({ preventScroll: true });
  bookingTabList.scrollIntoView();
});
showBookingTab(0);
followBookingLink();
bookingTabList.hidden = false;

const formatBookingCost = new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 });
const cost = { pc: null, food: 0, pcLabel: 'ПК' };
const bookingMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const bookingTextAnimations = new WeakMap();

function updateBookingText(element, text) {
  if (element.textContent === text) return;
  element.textContent = text;
  bookingTextAnimations.get(element)?.cancel();
  if (bookingMotionPreference.matches || !element.animate || !element.getClientRects().length) return;
  bookingTextAnimations.set(element, element.animate([{ opacity: 0.55 }, { opacity: 1 }], {
    duration: 280,
    easing: 'ease-out'
  }));
}

function renderBookingCost() {
  document.getElementById('booking-cost-pc-label').textContent = cost.pcLabel;
  document.getElementById('booking-cost-pc').textContent = cost.pc === null ? '—' : formatBookingCost.format(cost.pc);
  document.getElementById('booking-cost-food').textContent = formatBookingCost.format(cost.food);
  const combined = cost.pc === null && !cost.food
    ? '—'
    : formatBookingCost.format((cost.pc ?? 0) + cost.food);
  updateBookingText(document.getElementById('booking-combined-total'), combined);
  document.getElementById('booking-cost-note').textContent = cost.pc === null
    ? 'Выберите тариф и места, чтобы добавить стоимость ПК.'
    : cost.pcLabel === 'ПК · последняя заявка'
      ? 'Последняя заявка на ПК и текущая корзина.'
      : 'Текущий выбор ПК и текущая корзина.';
}
document.addEventListener('booking:pc-cost', event => {
  cost.pc = event.detail.amount;
  cost.pcLabel = event.detail.label;
  renderBookingCost();
});
document.addEventListener('booking:food-cost', event => {
  cost.food = event.detail;
  renderBookingCost();
});
renderBookingCost();
