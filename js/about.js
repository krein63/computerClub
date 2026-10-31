// jQuery 3.7.1 full build: ready waits for the DOM; full build provides effects.
// .find(), .val(), .on() replace native queries/properties/listeners; creation code remains explicit.
'use strict';

$(function () {
    const app = window.TopGame;
    const ui = window.TopGameJQuery;
    const make = (tag, classes = '', text = '') => $('<' + tag + '>').addClass(classes).text(text);
    const main = $('#about-content');
    if (!app || !main.length) return;
    const stored = app.store.get('demo-reviews', []);
    let reviews = Array.isArray(stored) ? stored.filter(review => review && typeof review.id === 'string'
        && typeof review.name === 'string' && review.name.trim().length >= 2 && review.name.length <= 80
        && typeof review.text === 'string' && review.text.trim().length >= 20 && review.text.length <= 1000
        && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5
        && typeof review.createdAt === 'string' && Number.isFinite(Date.parse(review.createdAt))) : [];
    const section = make('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
    section.attr('id', 'reviews');
    const heading = make('h2', 'h2 fw-bold mb-3', 'Ваш отзыв о клубе');
    heading.attr('id', 'reviews-title');
    section.attr('aria-labelledby', heading.attr('id'));
    section.append(heading, make('p', 'mb-3', 'Здесь можно попробовать форму отзыва. Демонстрационные отзывы сохраняются только в этом браузере и не отправляются в клуб. Опубликованных отзывов клиентов в исходных данных нет.'));
    const form = make('form', 'row g-3 mb-4');
    form.attr('id', 'review-form');
    form.attr('novalidate', true);
    function makeField(id, labelText, kind, classes) {
        const wrapper = make('div', classes);
        const label = make('label', 'form-label fw-semibold', labelText);
        label.attr('for', id);
        const field = make(kind, kind === 'select' ? 'form-select' : 'form-control');
        field.attr('id', id);
        field.attr('name', id);
        field.attr('required', true);
        wrapper.append(label, field);
        form.append(wrapper);
        return { wrapper, field };
    }
    const name = makeField('review-name', 'Имя', 'input', 'col-12 col-md-6');
    name.field.attr('type', 'text');
    name.field.attr('autocomplete', 'name');
    name.field.attr('maxlength', 80);
    const rating = makeField('review-rating', 'Оценка от 1 до 5', 'select', 'col-12 col-md-6');
    const placeholder = make('option', '', 'Выберите оценку');
    placeholder.val('');
    rating.field.append(placeholder);
    for (let value = 1; value <= 5; value += 1) {
        const option = make('option', '', `${value} из 5`);
        option.val(String(value));
        rating.field.append(option);
    }
    const text = makeField('review-text', 'Текст отзыва', 'textarea', 'col-12');
    text.field.attr('rows', 5);
    text.field.attr('minlength', 20);
    text.field.attr('maxlength', 1000);
    const counter = make('p', 'form-text mb-0');
    counter.attr('id', 'review-counter');
    counter.attr('aria-live', 'polite');
    text.field.attr('aria-describedby', counter.attr('id'));
    text.wrapper.append(counter);
    const submit = make('button', 'btn btn-danger', 'Добавить демонстрационный отзыв');
    submit.attr('type', 'submit');
    submit.attr('id', 'review-submit');
    const reset = make('button', 'btn btn-outline-secondary', 'Очистить форму');
    reset.attr('type', 'reset');
    const formActions = make('div', 'col-12 d-flex flex-wrap gap-2');
    formActions.append(submit, reset);
    const status = make('p', 'col-12 hidden p-3 rounded-3 text-break');
    status.attr('id', 'review-status');
    status.attr('role', 'status');
    status.attr('aria-live', 'polite');
    form.append(formActions, status);

    const reviewHeading = make('h3', 'h4 fw-bold mb-3', 'Отзывы из вашего браузера');
    const sortWrapper = make('div', 'row g-3 mb-3');
    const sortColumn = make('div', 'col-12 col-md-6');
    const sortLabel = make('label', 'form-label fw-semibold', 'Порядок отзывов');
    sortLabel.attr('for', 'review-sort');
    const sort = make('select', 'form-select');
    sort.attr('id', 'review-sort');
    [['newest', 'Сначала новые'], ['oldest', 'Сначала старые'], ['rating', 'Сначала высокая оценка']].forEach(([value, label]) => {
        const option = make('option', '', label);
        option.val(value);
        sort.append(option);
    });
    sortColumn.append(sortLabel, sort);
    const filterColumn = make('div', 'col-12 col-md-6');
    const filterLabel = make('label', 'form-label fw-semibold', 'Оценка');
    filterLabel.attr('for', 'review-rating-filter');
    const filter = make('select', 'form-select');
    filter.attr('id', 'review-rating-filter');
    for (let value = 0; value <= 5; value += 1) {
        const option = make('option', '', value === 0 ? 'Все оценки' : `${value} из 5`);
        option.val(String(value));
        filter.append(option);
    }
    filterColumn.append(filterLabel, filter);
    sortWrapper.append(sortColumn, filterColumn);
    const list = make('div', 'row g-3');
    list.attr('id', 'review-list');
    const count = make('p', 'mb-3');
    count.attr('id', 'review-result-count');
    count.attr('aria-live', 'polite');
    const filterReset = make('button', 'btn btn-outline-secondary mb-3', 'Сбросить фильтр отзывов');
    filterReset.attr('type', 'button');
    filterReset.attr('id', 'review-filter-reset');
    section.append(form, reviewHeading, sortWrapper, filterReset, count, list);
    main.append(section);
    let attempted = false;
    let resetAfterSubmit = false;

    function validateReview() {
        ui.clearErrors(form);
        const errors = [
            [name.field, name.field.val().trim().length < 2 || name.field.val().trim().length > 80 ? 'Имя должно содержать от 2 до 80 символов.' : ''],
            [rating.field, !Number.isInteger(Number(rating.field.val())) || Number(rating.field.val()) < 1 || Number(rating.field.val()) > 5 ? 'Выберите оценку от 1 до 5.' : ''],
            [text.field, text.field.val().trim().length < 20 || text.field.val().trim().length > 1000 ? 'Напишите от 20 до 1000 символов без учёта пробелов по краям.' : '']
        ];
        errors.forEach(([field, error]) => ui.setError(field, error));
        return errors.filter(([, error]) => error).map(([field]) => field);
    }
    function updateCounter() {
        counter.text(`${text.field.val().length} / 1000 символов. Минимум 20 символов без пробелов по краям.`);
    }
    function saveReviews() {
        return app.store.set('demo-reviews', reviews);
    }
    function renderReview(review) {
        const column = make('div', 'col-12 col-lg-6');
        const card = make('article', 'card h-100');
        card.attr('data-review', review.id);
        const body = make('div', 'card-body d-flex flex-column');
        const title = make('h4', 'h5 fw-bold text-break', review.name);
        const ratingText = make('p', 'fw-semibold mb-2', `Оценка: ${review.rating} из 5`);
        const date = make('time', 'small text-body-secondary mb-3');
        date.attr('datetime', review.createdAt);
        date.text(new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(review.createdAt)) + ' (Астана)');
        const comment = make('p', 'text-break', review.text);
        const note = make('p', 'small text-body-secondary', 'Ваш демонстрационный отзыв. Сохранён только в этом браузере.');
        const remove = make('button', 'btn btn-outline-secondary mt-auto align-self-start', 'Удалить мой отзыв');
        remove.attr('type', 'button');
        remove.attr('data-remove-review', review.id);

        body.append(title, ratingText, date, comment, note, remove);
        card.append(body);
        column.append(card);
        return column;
    }
    function renderReviews() {
        const matches = reviews.filter(review => filter.val() === '0' || review.rating === Number(filter.val()));
        matches.sort((first, second) => sort.val() === 'rating'
            ? second.rating - first.rating || Date.parse(second.createdAt) - Date.parse(first.createdAt)
            : sort.val() === 'oldest' ? Date.parse(first.createdAt) - Date.parse(second.createdAt)
                : Date.parse(second.createdAt) - Date.parse(first.createdAt));
        ui.renderList(list, matches, renderReview, reviews.length === 0 ? 'Отзывы пока не добавлены. Создайте свой демонстрационный отзыв в форме выше.' : 'Отзывов с такой оценкой нет. Выберите другую оценку или сбросьте фильтр.');
        count.text(`Показано отзывов: ${matches.length} из ${reviews.length}`);
    }
    function onFormEdit() {
        updateCounter();
        if (attempted) {
            const invalid = validateReview();
            if (invalid.length === 0) ui.notify(status, 'Поля исправлены. Можно добавить демонстрационный отзыв.', '');
        } else status.addClass('hidden');
    }
    // Reviews are created from the array after load, so this parent owns all removal events.
    list.on('click.reviews', '[data-remove-review]', function () {
        const button = $(this), id = button.attr('data-remove-review');
        button.prop('disabled', true).closest('article').fadeOut(160, function () {
            reviews = reviews.filter(item => item.id !== id);
            const saved = saveReviews();
            renderReviews();
            ui.notify(status, saved ? 'Демонстрационный отзыв удалён из этого браузера.' : 'Отзыв удалён до перезагрузки: сохранение недоступно.');
            sort.trigger('focus');
        });
    });
    form.on('input', onFormEdit);
    form.on('change', onFormEdit);
    form.on('submit', event => {
        // Prevent a reload: this action only changes the local demonstration.
        event.preventDefault();
        attempted = true;
        const invalid = validateReview();
        if (invalid.length) {
            ui.notify(status, `Отзыв не добавлен. Исправьте поля с ошибками: ${invalid.length}.`, 'error');
            invalid[0].trigger('focus');
            return;
        }
        const review = { id: app.reference('REVIEW'), name: name.field.val().trim(), rating: Number(rating.field.val()), text: text.field.val().trim(), createdAt: new Date().toISOString() };
        reviews.push(review);
        const saved = saveReviews();
        filter.val('0');
        sort.val('newest');
        renderReviews();
        resetAfterSubmit = true;
        form[0].reset();
        resetAfterSubmit = false;
        attempted = false;
        updateCounter();
        ui.notify(status, saved ? 'Демонстрационный отзыв добавлен в этом браузере. Данные не отправлены на сервер и не опубликованы клубом.' : 'Демонстрационный отзыв добавлен на текущую страницу. Браузер не разрешил сохранение: после перезагрузки он исчезнет. Данные не отправлены на сервер.', 'success');
    });
    form.on('reset', () => {
        ui.clearErrors(form);
        attempted = false;
        if (!resetAfterSubmit) {
            setTimeout(function () { updateCounter(); ui.notify(status, 'Форма отзыва очищена.', ''); }, 0);
        }
    });
    sort.on('change', renderReviews);
    filter.on('change', renderReviews);
    filterReset.on('click', () => { filter.val('0'); sort.val('newest'); renderReviews(); });
    updateCounter();
    renderReviews();
});
