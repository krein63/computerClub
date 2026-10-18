'use strict';

function setupAbout() {
    const app = window.TopGame;
    const form = document.getElementById('review-form');
    if (!app || !form) return;

    // 1. Находим готовые элементы страницы.
    const name = document.getElementById('review-name');
    const rating = document.getElementById('review-rating');
    const text = document.getElementById('review-text');
    const counter = document.getElementById('review-counter');
    const status = document.getElementById('review-status');
    const sort = document.getElementById('review-sort');
    const filter = document.getElementById('review-rating-filter');
    const list = document.getElementById('review-list');
    const count = document.getElementById('review-result-count');
    const template = document.getElementById('review-card-template');
    let attempted = false;
    let resetAfterSubmit = false;
    const reviews = [];

    // 2. Загружаем только корректные отзывы из браузера.
    function isValidReview(review) {
        if (!review || typeof review.id !== 'string') return false;
        if (typeof review.name !== 'string') return false;
        if (review.name.trim().length < 2 || review.name.length > 80) return false;
        if (typeof review.text !== 'string') return false;
        if (review.text.trim().length < 20 || review.text.length > 1000) return false;
        if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) return false;
        if (typeof review.createdAt !== 'string') return false;
        return Number.isFinite(Date.parse(review.createdAt));
    }

    const stored = app.store.get('demo-reviews', []);
    if (Array.isArray(stored)) {
        for (const review of stored) {
            if (isValidReview(review)) reviews.push(review);
        }
    }

    function validateReview() {
        app.clearErrors(form);
        const invalid = [];
        const nameLength = name.value.trim().length;
        const textLength = text.value.trim().length;
        const score = Number(rating.value);
        if (nameLength < 2 || nameLength > 80) {
            app.setError(name, 'Имя должно содержать от 2 до 80 символов.');
            invalid.push(name);
        }
        if (!Number.isInteger(score) || score < 1 || score > 5) {
            app.setError(rating, 'Выберите оценку от 1 до 5.');
            invalid.push(rating);
        }
        if (textLength < 20 || textLength > 1000) {
            app.setError(text, 'Напишите от 20 до 1000 символов без учёта пробелов по краям.');
            invalid.push(text);
        }
        return invalid;
    }

    function updateCounter() {
        counter.textContent = `${text.value.length} / 1000 · минимум 20 символов`;
    }

    // 3. Копируем HTML-шаблон и заполняем его безопасным текстом.
    function renderReview(review) {
        const card = template.content.firstElementChild.cloneNode(true);
        card.querySelector('article').dataset.review = review.id;
        card.querySelector('[data-review-name]').textContent = review.name;
        card.querySelector('[data-review-rating]').textContent = '★ ' + review.rating + ' / 5';
        card.querySelector('[data-review-text]').textContent = review.text;
        const date = card.querySelector('time');
        date.dateTime = review.createdAt;
        const format = new Intl.DateTimeFormat('ru-RU', {
            timeZone: 'Asia/Almaty', dateStyle: 'medium', timeStyle: 'short'
        });
        date.textContent = format.format(new Date(review.createdAt)) + ' (Астана)';
        const remove = card.querySelector('button');
        remove.dataset.removeReview = review.id;
        remove.addEventListener('click', removeReview);
        return card;
    }

    function compareReviews(first, second) {
        const dateDifference = Date.parse(second.createdAt) - Date.parse(first.createdAt);
        if (sort.value === 'oldest') return -dateDifference;
        if (sort.value === 'rating' && first.rating !== second.rating) {
            return second.rating - first.rating;
        }
        return dateDifference;
    }

    function renderReviews() {
        const matches = [];
        for (const review of reviews) {
            if (filter.value === '0' || review.rating === Number(filter.value)) {
                matches.push(review);
            }
        }
        matches.sort(compareReviews);
        let emptyText = 'С такой оценкой пока нет отзывов. Попробуй другой фильтр.';
        if (reviews.length === 0) {
            emptyText = 'Отзывов пока нет. Можно оставить первый в форме выше.';
        }
        app.renderList(list, matches, renderReview, emptyText);
        count.textContent = `${matches.length} из ${reviews.length} отзывов`;
    }

    function removeReview(event) {
        const id = event.currentTarget.dataset.removeReview;
        for (let index = reviews.length - 1; index >= 0; index -= 1) {
            if (reviews[index].id === id) reviews.splice(index, 1);
        }
        const saved = app.store.set('demo-reviews', reviews);
        renderReviews();
        let message = 'Отзыв удалён с текущей страницы. Браузер не разрешил обновить хранилище; после перезагрузки он может появиться снова.';
        if (saved) message = 'Демонстрационный отзыв удалён из этого браузера.';
        app.notify(status, message, '');
        sort.focus();
    }

    // 4. Проверяем форму и сохраняем новый отзыв.
    function onFormEdit() {
        updateCounter();
        if (attempted) {
            const invalid = validateReview();
            if (invalid.length === 0) {
                app.notify(status, 'Поля исправлены. Можно добавить демонстрационный отзыв.', '');
            }
        } else {
            status.classList.add('hidden');
        }
    }

    function submitReview(event) {
        event.preventDefault();
        attempted = true;
        const invalid = validateReview();
        if (invalid.length > 0) {
            app.notify(status, `Отзыв не добавлен. Исправьте поля с ошибками: ${invalid.length}.`, 'error');
            invalid[0].focus();
            return;
        }
        reviews.push({
            id: app.reference('REVIEW'),
            name: name.value.trim(),
            rating: Number(rating.value),
            text: text.value.trim(),
            createdAt: new Date().toISOString()
        });
        const saved = app.store.set('demo-reviews', reviews);
        resetFilters();
        resetAfterSubmit = true;
        form.reset();
        resetAfterSubmit = false;
        updateCounter();
        let message = 'Демонстрационный отзыв добавлен на текущую страницу. Браузер не разрешил сохранение: после перезагрузки он исчезнет. Данные не отправлены на сервер.';
        if (saved) {
            message = 'Отзыв сохранён в этом браузере. В клуб он не отправлен.';
        }
        app.notify(status, message, 'success');
    }

    function finishReset() {
        updateCounter();
        app.notify(status, 'Форма отзыва очищена.', '');
    }

    function resetForm() {
        app.clearErrors(form);
        attempted = false;
        // Событие reset приходит до очистки полей самим браузером.
        if (!resetAfterSubmit) setTimeout(finishReset, 0);
    }

    function resetFilters() {
        filter.value = '0';
        sort.value = 'newest';
        renderReviews();
    }

    form.addEventListener('input', onFormEdit);
    form.addEventListener('change', onFormEdit);
    form.addEventListener('submit', submitReview);
    form.addEventListener('reset', resetForm);
    sort.addEventListener('change', renderReviews);
    filter.addEventListener('change', renderReviews);
    document.getElementById('review-filter-reset').addEventListener('click', resetFilters);
    updateCounter();
    renderReviews();
}

setupAbout();
