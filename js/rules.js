'use strict';

function setupRules() {
    const app = window.TopGame;
    const list = document.getElementById('rules-help-list');
    if (!app || !list) return;

    // 1. Для каждой ситуации храним слова для поиска и порядок действий.
    const situations = [
        { id: 'device', title: 'Не работает устройство', category: 'equipment', keywords: 'мышь клавиатура гарнитура компьютер техника', steps: ['Позовите администратора и объясните, какое устройство не работает.', 'Не разбирайте и не переносите оборудование самостоятельно.'], link: 'about.html#contacts', action: 'Открыть контакты клуба' },
        { id: 'damage', title: 'Обнаружено повреждение до начала игры', category: 'equipment', keywords: 'сломано повреждение техника начало', steps: ['Сообщите администратору о повреждении до начала сеанса.', 'Не пытайтесь самостоятельно ремонтировать устройство.'], link: 'about.html#contacts', action: 'Открыть контакты клуба' },
        { id: 'extend', title: 'Нужно продлить время', category: 'visit', keywords: 'сеанс время продление тариф', steps: ['До окончания сеанса уточните у администратора доступность вашего места.', 'Согласуйте стоимость и возможность продления; калькулятор показывает только ориентир.'], link: 'prices.html', action: 'Посмотреть тарифы' },
        { id: 'lost', title: 'Найдена чужая вещь', category: 'visit', keywords: 'забыто потеряно вещи находка', steps: ['Передайте найденную вещь администратору.', 'Не забирайте чужие вещи с собой.'], link: 'about.html#contacts', action: 'Открыть контакты клуба' },
        { id: 'account', title: 'Нужно безопасно выйти из аккаунтов', category: 'account', keywords: 'пароль браузер выход безопасность логин', steps: ['Выйдите из игровых клиентов и аккаунтов в браузере.', 'Не сохраняйте пароль на общем компьютере и выполните проверку перед уходом.'], link: '#departure-checklist', action: 'Открыть проверку перед уходом' },
        { id: 'install', title: 'Нужна другая игра или программа', category: 'equipment', keywords: 'установка скачать игра программа версия', steps: ['Не устанавливайте программы самостоятельно.', 'Уточните возможность установки у администратора. На странице игр можно подготовить демонстрационный запрос.'], link: 'games.html#game-request', action: 'Открыть запрос игры' }
    ];
    const controls = document.getElementById('rules-filters');
    const search = document.getElementById('rules-search');
    const category = document.getElementById('rules-category');
    const count = document.getElementById('rules-result-count');
    const detailPrompt = document.getElementById('rules-detail-prompt');
    const detailContent = document.getElementById('rules-detail-content');
    const detailTitle = document.getElementById('rules-detail-title');
    const detailSteps = document.getElementById('rules-detail-steps');
    const detailNext = document.getElementById('rules-detail-next');
    const checklist = document.getElementById('departure-list');
    const checkboxes = checklist.querySelectorAll('input');
    const progress = document.getElementById('departure-progress');
    const remainingLabel = document.getElementById('departure-remaining-label');
    const remainingList = document.getElementById('departure-remaining');
    const complete = document.getElementById('departure-complete');
    const message = document.getElementById('departure-confirmation');
    let selectedSituation = '';
    let completedCount = 0;

    for (const situation of situations) {
        situation.button = document.getElementById('rules-choose-' + situation.id);
        situation.card = situation.button.closest('article');
        situation.column = situation.card.parentElement;
        situation.button.addEventListener('click', chooseSituation);
    }

    // 2. Фильтруем готовые карточки и показываем выбранную инструкцию.
    function renderHelp() {
        const query = search.value.trim().toLocaleLowerCase('ru');
        const matches = [];
        let selected = null;
        for (const situation of situations) {
            const text = situation.title + ' ' + situation.keywords + ' ' + situation.steps.join(' ');
            if (category.value !== 'all' && situation.category !== category.value) continue;
            if (!text.toLocaleLowerCase('ru').includes(query)) continue;
            matches.push(situation);
            if (situation.id === selectedSituation) selected = situation;
        }
        if (!selected) selectedSituation = '';
        list.replaceChildren();
        for (const situation of matches) {
            const isSelected = situation.id === selectedSituation;
            situation.card.classList.toggle('selected', isSelected);
            situation.button.setAttribute('aria-pressed', String(isSelected));
            list.append(situation.column);
        }
        if (matches.length === 0) {
            list.append(app.el('p', 'mb-0', 'Подходящих ситуаций нет. Измените запрос или сбросьте поиск.'));
        }
        count.textContent = 'Найдено ситуаций: ' + matches.length + ' из ' + situations.length;
        showInstructions(selected);
    }

    function showInstructions(situation) {
        detailPrompt.classList.toggle('hidden', Boolean(situation));
        detailContent.classList.toggle('hidden', !situation);
        if (!situation) return;
        detailTitle.textContent = situation.title;
        detailSteps.replaceChildren();
        for (const step of situation.steps) {
            detailSteps.append(app.el('li', 'mb-2', step));
        }
        detailNext.textContent = situation.action;
        detailNext.href = situation.link;
    }

    function chooseSituation(event) {
        selectedSituation = event.currentTarget.dataset.situation;
        renderHelp();
        detailTitle.focus();
    }

    function closeInstructions() {
        const previousId = selectedSituation;
        selectedSituation = '';
        renderHelp();
        const previousButton = document.getElementById('rules-choose-' + previousId);
        if (previousButton) previousButton.focus();
    }

    function searchHelp(event) {
        event.preventDefault();
        renderHelp();
    }

    function resetFilters() {
        controls.reset();
        selectedSituation = '';
        renderHelp();
        search.focus();
    }

    // 3. Считаем отметки и выводим оставшиеся пункты проверки.
    function updateChecklist() {
        completedCount = 0;
        remainingList.replaceChildren();
        for (const checkbox of checkboxes) {
            const row = checkbox.parentElement;
            row.classList.toggle('selected', checkbox.checked);
            if (checkbox.checked) {
                completedCount += 1;
            } else {
                const label = row.querySelector('label');
                remainingList.append(app.el('li', 'mb-2', label.textContent));
            }
        }
        const ready = completedCount === checkboxes.length;
        let hint = 'Отметьте оставшиеся действия.';
        if (ready) {
            hint = 'Можно завершить проверку.';
            remainingList.append(app.el('li', 'mb-2', 'Все пункты отмечены.'));
        }
        progress.textContent = 'Выполнено: ' + completedCount + ' из ' + checkboxes.length + '. ' + hint;
        progress.classList.toggle('success', ready);
        complete.disabled = !ready;
        remainingLabel.classList.toggle('hidden', ready);
        app.notify(message, '');
    }

    function completeChecklist() {
        if (completedCount !== checkboxes.length) return;
        app.notify(message, 'Самопроверка завершена: ' + completedCount + ' из ' + checkboxes.length + ' действий отмечены. Спасибо за заботу о безопасности и порядке.', 'success');
    }

    function resetChecklist() {
        for (const checkbox of checkboxes) {
            checkbox.checked = false;
        }
        updateChecklist();
        app.notify(message, 'Проверка сброшена. Можно начать заново.');
        checkboxes[0].focus();
    }

    controls.addEventListener('input', renderHelp);
    controls.addEventListener('change', renderHelp);
    controls.addEventListener('submit', searchHelp);
    document.getElementById('rules-filter-reset').addEventListener('click', resetFilters);
    document.getElementById('rules-detail-close').addEventListener('click', closeInstructions);
    checklist.addEventListener('change', updateChecklist);
    complete.addEventListener('click', completeChecklist);
    document.getElementById('departure-reset').addEventListener('click', resetChecklist);
    renderHelp();
    updateChecklist();
}

setupRules();
