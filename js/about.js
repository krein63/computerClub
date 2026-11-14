// jQuery 3.7.1 full build is loaded first; ready waits until the page exists.
'use strict';

$(function () {
  const app = window.TopGame;
  const main = $('#about-content').get(0);
  if (!app || !main) return;

  const saved = app.store.get('demo-reviews', []);
  const reviews = Array.isArray(saved) ? saved.filter(review =>
    review && typeof review.id === 'string' &&
    typeof review.name === 'string' && review.name.trim().length >= 2 && review.name.length <= 80 &&
    typeof review.text === 'string' && review.text.trim().length >= 20 && review.text.length <= 1000 &&
    Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5 &&
    typeof review.createdAt === 'string' && Number.isFinite(Date.parse(review.createdAt))
  ) : [];

  const section = app.el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
  section.id = 'reviews';
  section.setAttribute('aria-labelledby', 'reviews-title');
  const heading = app.el('h2', 'h2 fw-bold mb-3', 'Отзывы гостей');
  heading.id = 'reviews-title';
  const list = app.el('div', 'row g-3');
  list.id = 'review-list';
  $(section).append(heading, app.el('p', 'mb-4', 'Расскажите о впечатлениях администратору клуба по телефону.'), list);
  $(main).append(section);

  if (!reviews.length) {
    const empty = app.el('div', 'col-12');
    const card = app.el('div', 'bg-body-tertiary border rounded-3 p-3 p-md-4');
    const phone = app.el('a', 'btn btn-outline-danger mt-2', 'Позвонить в клуб');
    phone.href = 'tel:+77064005040';
    $(card).append(app.el('p', 'mb-0', 'Отзывы пока не добавлены на этом устройстве.'), phone);
    $(empty).append(card);
    $(list).append(empty);
    return;
  }

  reviews.sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
  reviews.forEach(review => {
    const column = app.el('div', 'col-12 col-lg-6');
    const card = app.el('article', 'card h-100');
    const body = app.el('div', 'card-body');
    const date = app.el('time', 'small text-body-secondary d-block mb-2');
    date.dateTime = review.createdAt;
    date.textContent = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', dateStyle: 'medium' }).format(new Date(review.createdAt));
    $(body).append(app.el('h3', 'h5 fw-bold', review.name), app.el('p', 'fw-semibold', `Оценка: ${review.rating} из 5`), date, app.el('p', 'text-break mb-0', review.text));
    $(card).append(body);
    $(column).append(card);
    $(list).append(column);
  });
  $(section).append(app.el('p', 'small text-body-secondary mt-3 mb-0', 'Показаны отзывы, сохранённые в этом браузере.'));
});
