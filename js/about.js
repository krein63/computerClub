// .find(), .val(), .text() and .on() replace native lookups, properties and listeners.
// DOM access is more concise; delegation and effects make the complete feature slightly longer.
'use strict';

function setupAbout() {
    const app = window.TopGame;
    const ui = window.TopGameJQuery;
    const form = $('#review-form');
    if (!app || !form.length) return;

    // 1. Находим готовые элементы страницы.
    const name = $('#review-name');
    const rating = $('#review-rating');
    const text = $('#review-text');
    const counter = $('#review-counter');
    const status = $('#review-status');
    const sort = $('#review-sort');
    const filter = $('#review-rating-filter');
    const list = $('#review-list');
    const count = $('#review-result-count');
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
        ui.clearErrors(form);
        const invalid = [];
        const nameLength = name.val().trim().length;
        const textLength = text.val().trim().length;
        const score = Number(rating.val());
        if (nameLength < 2 || nameLength > 80) {
            ui.setError(name, 'Имя должно содержать от 2 до 80 символов.');
            invalid.push(name);
        }
        if (!Number.isInteger(score) || score < 1 || score > 5) {
            ui.setError(rating, 'Выберите оценку от 1 до 5.');
            invalid.push(rating);
        }
        if (textLength < 20 || textLength > 1000) {
            ui.setError(text, 'Напишите от 20 до 1000 символов без учёта пробелов по краям.');
            invalid.push(text);
        }
        return invalid;
    }

    function updateCounter() {
        counter.text(`${text.val().length} / 1000 · минимум 20 символов`);
    }

    // 3. Копируем HTML-шаблон и заполняем его безопасным текстом.
    function renderReview(review) {
        // Only trusted structural markup uses .html(); user names and reviews use .text().
        const card = $('<div>').addClass('review-card-wrapper').html('<article class="review-card"><div class="review-card-heading"><h3 data-review-name></h3><span data-review-rating></span></div><p class="review-card-text" data-review-text></p><div class="review-card-bottom"><time></time><button type="button" class="about-text-button">Удалить мой отзыв</button></div></article>');
        card.find('article').attr('data-review', review.id);
        card.find('[data-review-name]').text(review.name);
        card.find('[data-review-rating]').text('★ ' + review.rating + ' / 5');
        card.find('[data-review-text]').text(review.text);
        const date = card.find('time');
        date.attr('datetime', review.createdAt);
        const format = new Intl.DateTimeFormat('ru-RU', {
            timeZone: 'Asia/Almaty', dateStyle: 'medium', timeStyle: 'short'
        });
        date.text(format.format(new Date(review.createdAt)) + ' (Астана)');
        const remove = card.find('button');
        remove.attr('data-remove-review', review.id);

        return card;
    }

    function compareReviews(first, second) {
        const dateDifference = Date.parse(second.createdAt) - Date.parse(first.createdAt);
        if (sort.val() === 'oldest') return -dateDifference;
        if (sort.val() === 'rating' && first.rating !== second.rating) {
            return second.rating - first.rating;
        }
        return dateDifference;
    }

    function renderReviews() {
        const matches = [];
        for (const review of reviews) {
            if (filter.val() === '0' || review.rating === Number(filter.val())) {
                matches.push(review);
            }
        }
        matches.sort(compareReviews);
        let emptyText = 'С такой оценкой пока нет отзывов. Попробуй другой фильтр.';
        if (reviews.length === 0) {
            emptyText = 'Отзывов пока нет. Можно оставить первый в форме выше.';
        }
        ui.renderList(list, matches, renderReview, emptyText);
        count.text(`${matches.length} из ${reviews.length} отзывов`);
    }

    function removeReview(event) {
        const id = $(event.currentTarget).attr('data-remove-review');
        for (let index = reviews.length - 1; index >= 0; index -= 1) {
            if (reviews[index].id === id) reviews.splice(index, 1);
        }
        const saved = app.store.set('demo-reviews', reviews);
        renderReviews();
        let message = 'Отзыв удалён с текущей страницы. Браузер не разрешил обновить хранилище; после перезагрузки он может появиться снова.';
        if (saved) message = 'Демонстрационный отзыв удалён из этого браузера.';
        ui.notify(status, message, '');
        sort.trigger('focus');
    }

    // 4. Проверяем форму и сохраняем новый отзыв.
    function onFormEdit() {
        updateCounter();
        if (attempted) {
            const invalid = validateReview();
            if (invalid.length === 0) {
                ui.notify(status, 'Поля исправлены. Можно добавить демонстрационный отзыв.', '');
            }
        } else {
            status.stop(true, true).fadeOut(120, function () { $(this).addClass('hidden'); });
        }
    }

    function submitReview(event) {
        // Keep filtering/submission local instead of navigating or reloading the page.
        event.preventDefault();
        attempted = true;
        const invalid = validateReview();
        if (invalid.length > 0) {
            ui.notify(status, `Отзыв не добавлен. Исправьте поля с ошибками: ${invalid.length}.`, 'error');
            invalid[0].trigger('focus');
            return;
        }
        reviews.push({
            id: app.reference('REVIEW'),
            name: name.val().trim(),
            rating: Number(rating.val()),
            text: text.val().trim(),
            createdAt: new Date().toISOString()
        });
        const saved = app.store.set('demo-reviews', reviews);
        resetFilters();
        resetAfterSubmit = true;
        form[0].reset();
        resetAfterSubmit = false;
        updateCounter();
        let message = 'Демонстрационный отзыв добавлен на текущую страницу. Браузер не разрешил сохранение: после перезагрузки он исчезнет. Данные не отправлены на сервер.';
        if (saved) {
            message = 'Отзыв сохранён в этом браузере. В клуб он не отправлен.';
        }
        ui.notify(status, message, 'success');
    }

    function finishReset() {
        updateCounter();
        ui.notify(status, 'Форма отзыва очищена.', '');
    }

    function resetForm() {
        ui.clearErrors(form);
        attempted = false;
        // Событие reset приходит до очистки полей самим браузером.
        if (!resetAfterSubmit) setTimeout(finishReset, 0);
    }

    function resetFilters() {
        filter.val('0');
        sort.val('newest');
        renderReviews();
    }

    // The buttons are built after load, so delegate on the existing list.
    list.on('click.reviews', '[data-remove-review]', function (event) {
        const button = this;
        $(this).prop('disabled', true).closest('[data-review]').fadeOut(160, function () {
            removeReview({ currentTarget: button });
        });
    });
    form.on('input.reviews', onFormEdit);
    form.on('change', onFormEdit);
    form.on('submit', submitReview);
    form.on('reset', resetForm);
    sort.on('change', renderReviews);
    filter.on('change', renderReviews);
    $('#review-filter-reset').on('click', resetFilters);
    updateCounter();
    renderReviews();
}

// jQuery 3.7.1 full build supplies effects; ready waits for the form and templates.
$(setupAbout);
