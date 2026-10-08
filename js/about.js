'use strict';

(() => {
    const app = window.TopGame;
    const main = document.getElementById('about-content');
    if (!app || !main) return;
    const stored = app.store.get('demo-reviews', []);
    let reviews = Array.isArray(stored) ? stored.filter(review => review && typeof review.id === 'string'
        && typeof review.name === 'string' && review.name.trim().length >= 2 && review.name.length <= 80
        && typeof review.text === 'string' && review.text.trim().length >= 20 && review.text.length <= 1000
        && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5
        && typeof review.createdAt === 'string' && Number.isFinite(Date.parse(review.createdAt))) : [];
    const section = app.el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
    section.id = 'reviews';
    const heading = app.el('h2', 'h2 fw-bold mb-3', 'Ваш отзыв о клубе');
    heading.id = 'reviews-title';
    section.setAttribute('aria-labelledby', heading.id);
    section.append(heading, app.el('p', 'mb-3', 'Здесь можно попробовать форму отзыва. Демонстрационные отзывы сохраняются только в этом браузере и не отправляются в клуб. Опубликованных отзывов клиентов в исходных данных нет.'));
    const form = app.el('form', 'row g-3 mb-4');
    form.id = 'review-form';
    form.noValidate = true;
    function makeField(id, labelText, kind, classes) {
        const wrapper = app.el('div', classes);
        const label = app.el('label', 'form-label fw-semibold', labelText);
        label.htmlFor = id;
        const field = app.el(kind, kind === 'select' ? 'form-select' : 'form-control');
        field.id = id;
        field.name = id;
        field.required = true;
        wrapper.append(label, field);
        form.append(wrapper);
        return { wrapper, field };
    }
    const name = makeField('review-name', 'Имя', 'input', 'col-12 col-md-6');
    name.field.type = 'text';
    name.field.autocomplete = 'name';
    name.field.maxLength = 80;
    const rating = makeField('review-rating', 'Оценка от 1 до 5', 'select', 'col-12 col-md-6');
    const placeholder = app.el('option', '', 'Выберите оценку');
    placeholder.value = '';
    rating.field.append(placeholder);
    for (let value = 1; value <= 5; value += 1) {
        const option = app.el('option', '', `${value} из 5`);
        option.value = String(value);
        rating.field.append(option);
    }
    const text = makeField('review-text', 'Текст отзыва', 'textarea', 'col-12');
    text.field.rows = 5;
    text.field.minLength = 20;
    text.field.maxLength = 1000;
    const counter = app.el('p', 'form-text mb-0');
    counter.id = 'review-counter';
    counter.setAttribute('aria-live', 'polite');
    text.field.setAttribute('aria-describedby', counter.id);
    text.wrapper.append(counter);
    const submit = app.el('button', 'btn btn-danger', 'Добавить демонстрационный отзыв');
    submit.type = 'submit';
    submit.id = 'review-submit';
    const reset = app.el('button', 'btn btn-outline-secondary', 'Очистить форму');
    reset.type = 'reset';
    const formActions = app.el('div', 'col-12 d-flex flex-wrap gap-2');
    formActions.append(submit, reset);
    const status = app.el('p', 'col-12 hidden p-3 rounded-3 text-break');
    status.id = 'review-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.append(formActions, status);

    const reviewHeading = app.el('h3', 'h4 fw-bold mb-3', 'Отзывы из вашего браузера');
    const sortWrapper = app.el('div', 'row g-3 mb-3');
    const sortColumn = app.el('div', 'col-12 col-md-6');
    const sortLabel = app.el('label', 'form-label fw-semibold', 'Порядок отзывов');
    sortLabel.htmlFor = 'review-sort';
    const sort = app.el('select', 'form-select');
    sort.id = 'review-sort';
    [['newest', 'Сначала новые'], ['oldest', 'Сначала старые'], ['rating', 'Сначала высокая оценка']].forEach(([value, label]) => {
        const option = app.el('option', '', label);
        option.value = value;
        sort.append(option);
    });
    sortColumn.append(sortLabel, sort);
    const filterColumn = app.el('div', 'col-12 col-md-6');
    const filterLabel = app.el('label', 'form-label fw-semibold', 'Оценка');
    filterLabel.htmlFor = 'review-rating-filter';
    const filter = app.el('select', 'form-select');
    filter.id = 'review-rating-filter';
    for (let value = 0; value <= 5; value += 1) {
        const option = app.el('option', '', value === 0 ? 'Все оценки' : `${value} из 5`);
        option.value = String(value);
        filter.append(option);
    }
    filterColumn.append(filterLabel, filter);
    sortWrapper.append(sortColumn, filterColumn);
    const list = app.el('div', 'row g-3');
    list.id = 'review-list';
    const count = app.el('p', 'mb-3');
    count.id = 'review-result-count';
    count.setAttribute('aria-live', 'polite');
    const filterReset = app.el('button', 'btn btn-outline-secondary mb-3', 'Сбросить фильтр отзывов');
    filterReset.type = 'button';
    filterReset.id = 'review-filter-reset';
    section.append(form, reviewHeading, sortWrapper, filterReset, count, list);
    main.append(section);
    let attempted = false;
    let resetAfterSubmit = false;

    function validateReview() {
        app.clearErrors(form);
        const errors = [
            [name.field, name.field.value.trim().length < 2 || name.field.value.trim().length > 80 ? 'Имя должно содержать от 2 до 80 символов.' : ''],
            [rating.field, !Number.isInteger(Number(rating.field.value)) || Number(rating.field.value) < 1 || Number(rating.field.value) > 5 ? 'Выберите оценку от 1 до 5.' : ''],
            [text.field, text.field.value.trim().length < 20 || text.field.value.trim().length > 1000 ? 'Напишите от 20 до 1000 символов без учёта пробелов по краям.' : '']
        ];
        errors.forEach(([field, error]) => app.setError(field, error));
        return errors.filter(([, error]) => error).map(([field]) => field);
    }
    function updateCounter() {
        counter.textContent = `${text.field.value.length} / 1000 символов. Минимум 20 символов без пробелов по краям.`;
    }
    function saveReviews() {
        return app.store.set('demo-reviews', reviews);
    }
    function renderReview(review) {
        const column = app.el('div', 'col-12 col-lg-6');
        const card = app.el('article', 'card h-100');
        card.dataset.review = review.id;
        const body = app.el('div', 'card-body d-flex flex-column');
        const title = app.el('h4', 'h5 fw-bold text-break', review.name);
        const ratingText = app.el('p', 'fw-semibold mb-2', `Оценка: ${review.rating} из 5`);
        const date = app.el('time', 'small text-body-secondary mb-3');
        date.dateTime = review.createdAt;
        date.textContent = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(review.createdAt)) + ' (Астана)';
        const comment = app.el('p', 'text-break', review.text);
        const note = app.el('p', 'small text-body-secondary', 'Ваш демонстрационный отзыв. Сохранён только в этом браузере.');
        const remove = app.el('button', 'btn btn-outline-secondary mt-auto align-self-start', 'Удалить мой отзыв');
        remove.type = 'button';
        remove.dataset.removeReview = review.id;
        remove.addEventListener('click', () => {
            reviews = reviews.filter(item => item.id !== review.id);
            const saved = saveReviews();
            renderReviews();
            app.notify(status, saved ? 'Демонстрационный отзыв удалён из этого браузера.' : 'Отзыв удалён с текущей страницы. Браузер не разрешил обновить хранилище; после перезагрузки он может появиться снова.', '');
            sort.focus();
        });
        body.append(title, ratingText, date, comment, note, remove);
        card.append(body);
        column.append(card);
        return column;
    }
    function renderReviews() {
        const matches = reviews.filter(review => filter.value === '0' || review.rating === Number(filter.value));
        matches.sort((first, second) => sort.value === 'rating'
            ? second.rating - first.rating || Date.parse(second.createdAt) - Date.parse(first.createdAt)
            : sort.value === 'oldest' ? Date.parse(first.createdAt) - Date.parse(second.createdAt)
                : Date.parse(second.createdAt) - Date.parse(first.createdAt));
        app.renderList(list, matches, renderReview, reviews.length === 0 ? 'Отзывы пока не добавлены. Создайте свой демонстрационный отзыв в форме выше.' : 'Отзывов с такой оценкой нет. Выберите другую оценку или сбросьте фильтр.');
        count.textContent = `Показано отзывов: ${matches.length} из ${reviews.length}`;
    }
    function onFormEdit() {
        updateCounter();
        if (attempted) {
            const invalid = validateReview();
            if (invalid.length === 0) app.notify(status, 'Поля исправлены. Можно добавить демонстрационный отзыв.', '');
        } else status.classList.add('hidden');
    }
    form.addEventListener('input', onFormEdit);
    form.addEventListener('change', onFormEdit);
    form.addEventListener('submit', event => {
        event.preventDefault();
        attempted = true;
        const invalid = validateReview();
        if (invalid.length) {
            app.notify(status, `Отзыв не добавлен. Исправьте поля с ошибками: ${invalid.length}.`, 'error');
            invalid[0].focus();
            return;
        }
        const review = { id: app.reference('REVIEW'), name: name.field.value.trim(), rating: Number(rating.field.value), text: text.field.value.trim(), createdAt: new Date().toISOString() };
        reviews.push(review);
        const saved = saveReviews();
        filter.value = '0';
        sort.value = 'newest';
        renderReviews();
        resetAfterSubmit = true;
        form.reset();
        resetAfterSubmit = false;
        attempted = false;
        updateCounter();
        app.notify(status, saved ? 'Демонстрационный отзыв добавлен в этом браузере. Данные не отправлены на сервер и не опубликованы клубом.' : 'Демонстрационный отзыв добавлен на текущую страницу. Браузер не разрешил сохранение: после перезагрузки он исчезнет. Данные не отправлены на сервер.', 'success');
    });
    form.addEventListener('reset', () => {
        app.clearErrors(form);
        attempted = false;
        if (!resetAfterSubmit) {
            setTimeout(() => { updateCounter(); app.notify(status, 'Форма отзыва очищена.', ''); }, 0);
        }
    });
    sort.addEventListener('change', renderReviews);
    filter.addEventListener('change', renderReviews);
    filterReset.addEventListener('click', () => { filter.value = '0'; sort.value = 'newest'; renderReviews(); });
    updateCounter();
    renderReviews();
})();
