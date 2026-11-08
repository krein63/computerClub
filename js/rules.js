// jQuery 3.7.1 full build is loaded first; ready waits until the page exists.
'use strict';

$(function () {
  const app = window.TopGame;
  const helpSection = $('#rule-table').get(0);
  const safetySection = $('#account-safety').get(0);
  if (!app || !helpSection || !safetySection) return;
  // Готовый класс Bootstrap сохраняет читаемость исходной таблицы в тёмной теме.
  $(helpSection).find('table').first().addClass("table-dark");

  // Инструкции основаны на правилах этой страницы; помощь не отправляет заявки.
  const situations = [{
    id: 'device',
    title: 'Не работает устройство',
    category: 'equipment',
    keywords: 'мышь клавиатура гарнитура компьютер техника',
    steps: ['Позовите администратора и объясните, какое устройство не работает.', 'Не разбирайте и не переносите оборудование самостоятельно.'],
    link: 'about.html#contacts',
    action: 'Открыть контакты клуба'
  }, {
    id: 'damage',
    title: 'Обнаружено повреждение до начала игры',
    category: 'equipment',
    keywords: 'сломано повреждение техника начало',
    steps: ['Сообщите администратору о повреждении до начала сеанса.', 'Не пытайтесь самостоятельно ремонтировать устройство.'],
    link: 'about.html#contacts',
    action: 'Открыть контакты клуба'
  }, {
    id: 'extend',
    title: 'Нужно продлить время',
    category: 'visit',
    keywords: 'сеанс время продление тариф',
    steps: ['До окончания сеанса уточните у администратора доступность вашего места.', 'Согласуйте стоимость и возможность продления; калькулятор показывает только ориентир.'],
    link: 'prices.html',
    action: 'Посмотреть тарифы'
  }, {
    id: 'lost',
    title: 'Найдена чужая вещь',
    category: 'visit',
    keywords: 'забыто потеряно вещи находка',
    steps: ['Передайте найденную вещь администратору.', 'Не забирайте чужие вещи с собой.'],
    link: 'about.html#contacts',
    action: 'Открыть контакты клуба'
  }, {
    id: 'account',
    title: 'Нужно безопасно выйти из аккаунтов',
    category: 'account',
    keywords: 'пароль браузер выход безопасность логин',
    steps: ['Выйдите из игровых клиентов и аккаунтов в браузере.', 'Не сохраняйте пароль на общем компьютере и выполните проверку перед уходом.'],
    link: '#departure-checklist',
    action: 'Открыть проверку перед уходом'
  }, {
    id: 'install',
    title: 'Нужна другая игра или программа',
    category: 'equipment',
    keywords: 'установка скачать игра программа версия',
    steps: ['Не устанавливайте программы самостоятельно.', 'Уточните возможность установки у администратора. На странице игр можно подготовить демонстрационный запрос.'],
    link: 'games.html#game-request',
    action: 'Открыть запрос игры'
  }];
  const categories = {
    equipment: 'Оборудование',
    visit: 'Посещение',
    account: 'Аккаунты'
  };
  const departureItems = [{
    id: 'clients',
    text: 'Я вышел из игровых клиентов.'
  }, {
    id: 'browser',
    text: 'Я вышел из аккаунтов в браузере и не сохранил пароли.'
  }, {
    id: 'belongings',
    text: 'Я забрал свои личные вещи.'
  }, {
    id: 'workstation',
    text: 'Я проверил чистоту места и сообщил о проблемах администратору.'
  }];
  function filterSituations(items, query, category) {
    const text = query.trim().toLocaleLowerCase('ru');
    return items.filter(item => (category === 'all' || item.category === category) && `${item.title} ${item.keywords} ${item.steps.join(' ')}`.toLocaleLowerCase('ru').includes(text));
  }
  function findSituation(items, id) {
    return items.find(item => item.id === id);
  }
  function getCompletedItems(items, selectedIds) {
    return items.filter(item => selectedIds.includes(item.id));
  }
  function checklistSummary(items, selectedIds) {
    const completed = getCompletedItems(items, selectedIds);
    return {
      completed: completed.length,
      total: items.length,
      remaining: items.filter(item => !selectedIds.includes(item.id)),
      ready: items.length > 0 && completed.length === items.length
    };
  }
  function makeButton(text, id, classes = 'btn btn-outline-danger') {
    const button = app.el('button', classes, text);
    $(button).attr("type", 'button');
    $(button).attr("id", id);
    return button;
  }
  function addControl(container, id, labelText, tag) {
    const wrapper = app.el('div', 'col-12 col-md-6');
    const label = app.el('label', 'form-label fw-semibold', labelText);
    $(label).attr("for", id);
    const field = app.el(tag, tag === 'select' ? 'form-select' : 'form-control');
    $(field).attr("id", id);
    $(wrapper).append(label, field);
    $(container).append(wrapper);
    return field;
  }

  // Существующая таблица остаётся; поисковые элементы создаются через DOM.
  const finder = app.el('div', 'mt-4');
  $(finder).append(app.el('h3', 'h4 fw-bold mb-3', 'Найти помощь по ситуации'));
  const controls = app.el('form', 'row g-3 mb-3');
  $(controls).attr('role', 'search');
  $(controls).attr('aria-label', 'Поиск помощи по правилам клуба');
  const search = addControl(controls, 'rules-search', 'Опишите ситуацию', 'input');
  $(search).attr("type", 'search');
  const category = addControl(controls, 'rules-category', 'Категория', 'select');
  for (const [value, text] of [['all', 'Все категории'], ...Object.entries(categories)]) {
    const option = app.el('option', '', text);
    $(option).val(value);
    $(category).append(option);
  }
  const actions = app.el('div', 'col-12 d-flex flex-wrap gap-3 align-items-center');
  const reset = makeButton('Сбросить поиск', 'rules-filter-reset', 'btn btn-outline-secondary');
  const count = app.el('p', 'mb-0');
  $(count).attr("id", 'rules-result-count');
  $(count).attr('role', 'status');
  $(actions).append(reset, count);
  $(controls).append(actions);
  const list = app.el('div', 'row g-3');
  $(list).attr("id", 'rules-help-list');
  const detail = app.el('section', 'bg-body-tertiary border rounded-3 p-3 p-md-4 mt-4');
  $(detail).attr("id", 'rules-help-detail');
  $(detail).attr('aria-label', 'Инструкции для выбранной ситуации');
  $(finder).append(controls, list, detail);
  $(helpSection).append(finder);
  let selectedSituation = '';
  function renderSituation(item) {
    const column = app.el('div', 'col-12 col-md-6');
    const card = app.el('article', 'card h-100');
    $(card).toggleClass('selected', item.id === selectedSituation);
    const body = app.el('div', 'card-body d-flex flex-column');
    $(body).append(app.el('p', 'small text-body-secondary mb-2', categories[item.category]), app.el('h4', 'h5 fw-bold mb-3', item.title));
    const choose = makeButton('Показать действия', `rules-choose-${item.id}`, 'btn btn-outline-danger mt-auto');
    $(choose).attr('aria-controls', detail.id);
    $(choose).attr('aria-pressed', String(item.id === selectedSituation));
    $(choose).attr('data-rule-id', item.id);
    $(body).append(choose);
    $(card).append(body);
    $(column).append(card);
    return column;
  }
  // REWRITE 3: .slideDown()/.slideUp() and .on() replace the old rebuild-only detail panel.
  // The effect needs more lines, but opening, closing and focus movement are clearer to the visitor.
  $(list).on('click', '[data-rule-id]', function () {
    selectedSituation = $(this).attr('data-rule-id');
    // Walk from the clicked button to its card and column, then to the other columns.
    $(this).closest('article').addClass('selected').parent().siblings().find('article').removeClass('selected');
    $(list).find('[data-rule-id]').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    renderHelpDetail(findSituation(situations, selectedSituation));
  });
  function renderHelpDetail(item) {
    $(detail).stop(true, true).empty();
    if (!item) {
      $(detail).addClass('hidden');
      return;
    }
    const heading = app.el('h3', 'h4 fw-bold mb-3', item.title);
    $(heading).prop("tabIndex", -1);
    const steps = app.el('ol', 'ps-3 mb-3');
    app.renderList(steps, item.steps, text => app.el('li', 'mb-2', text), 'Уточните действия у администратора.');
    const next = app.el('a', 'btn btn-danger', item.action);
    $(next).attr("href", item.link);
    const close = makeButton('Закрыть инструкции', 'rules-detail-close', 'btn btn-outline-secondary');
    $(close).on('click', () => {
      const previousId = selectedSituation;
      selectedSituation = '';
      // Callback runs after the instructions close, then gives keyboard focus back to their button.
      $(detail).stop(true, true).slideUp(180, function () {
        $(this).addClass('hidden').empty();
        $(list).find('article').removeClass('selected');
        $(list).find('[data-rule-id]').attr('aria-pressed', 'false');
        $('#rules-choose-' + previousId).trigger('focus');
      });
    });
    const links = app.el('div', 'd-flex flex-wrap gap-2');
    $(links).append(next, close);
    $(detail).append(heading, steps, links, app.el('p', 'small text-body-secondary mt-3 mb-0', 'Инструкции не отправляют сообщение администратору. Для помощи обратитесь к персоналу клуба.'));
    $(detail).removeClass('hidden').hide().slideDown(220, function () {
      $(this).find('h3').trigger('focus');
    });
  }
  function renderHelp() {
    const matches = filterSituations(situations, $(search).val(), $(category).val());
    if (!matches.some(item => item.id === selectedSituation)) selectedSituation = '';
    app.renderList(list, matches, renderSituation, 'Подходящих ситуаций нет. Измените запрос или сбросьте поиск.');
    $(count).text(`Найдено ситуаций: ${matches.length} из ${situations.length}`);
    renderHelpDetail(findSituation(matches, selectedSituation));
  }
  // Search updates on typing; select updates on change. Rebuilding on text blur would swallow a click.
  $(controls).on('input', 'input', renderHelp);
  $(controls).on('change', 'select', renderHelp);
  $(controls).on('submit', event => {
    event.preventDefault();
    renderHelp();
  });
  $(reset).on('click', () => {
    $(controls).trigger("reset");
    selectedSituation = '';
    renderHelp();
    $(search).trigger("focus");
  });
  const checklist = app.el('section', 'bg-body-tertiary border rounded-3 p-3 p-md-4 mt-4');
  $(checklist).attr("id", 'departure-checklist');
  $(checklist).attr('aria-labelledby', 'departure-title');
  const title = app.el('h3', 'h4 fw-bold mb-3', 'Проверка перед уходом');
  $(title).attr("id", 'departure-title');
  $(checklist).append(title, app.el('p', 'mb-3', 'Отметьте выполненные действия. Это ваша самостоятельная проверка: сайт не проверяет аккаунты и не завершает сеанс на ПК.'));
  const checklistList = app.el('ul', 'list-group mb-3');
  $(checklistList).attr("id", 'departure-list');
  function renderDepartureItem(item) {
    const row = app.el('li', 'list-group-item bg-dark text-light');
    const input = app.el('input', 'form-check-input me-2');
    $(input).attr("type", 'checkbox');
    $(input).attr("id", `departure-${item.id}`);
    $(input).val(item.id);
    const label = app.el('label', 'form-check-label', item.text);
    $(label).attr("for", input.id);
    $(row).append(input, label);
    return row;
  }
  app.renderList(checklistList, departureItems, renderDepartureItem, 'Нет пунктов для проверки.');
  const progress = app.el('p', 'fw-semibold mb-3');
  $(progress).attr("id", 'departure-progress');
  $(progress).attr('role', 'status');
  const remainingLabel = app.el('p', 'mb-2', 'Осталось выполнить:');
  const remainingList = app.el('ul', 'ps-3 mb-3');
  $(remainingList).attr("id", 'departure-remaining');
  const complete = makeButton('Завершить проверку', 'departure-complete', 'btn btn-danger');
  const clear = makeButton('Начать заново', 'departure-reset', 'btn btn-outline-secondary');
  const unfinished = makeButton('Показать только невыполненные', 'departure-filter', 'btn btn-outline-secondary');
  $(unfinished).attr('aria-pressed', 'false');
  let unfinishedOnly = false;
  const checklistActions = app.el('div', 'd-flex flex-wrap gap-2');
  $(checklistActions).append(complete, clear, unfinished);
  const draftNote = app.el('p', 'small text-body-secondary mt-3 mb-0', 'Незавершённая проверка сохраняется в этой вкладке на 2 часа. При новом посещении нажмите «Начать заново».');
  $(draftNote).attr({ id: 'departure-draft-note', role: 'status' });
  const message = app.el('p', 'p-3 mt-3 mb-0 hidden');
  $(message).attr("id", 'departure-confirmation');
  $(message).attr('role', 'status');
  $(checklist).append(checklistList, progress, remainingLabel, remainingList, checklistActions, message, draftNote);
  // sessionStorage keeps a temporary draft in this tab, not a permanent safety claim.
  const draftKey = 'topgame-departure-draft';
  function saveChecklistDraft() {
    const ids = $(checklistList).find('input:checked').toArray().map(input => $(input).val());
    try {
      if (ids.length) sessionStorage.setItem(draftKey, JSON.stringify({ ids, savedAt: Date.now() }));
      else sessionStorage.removeItem(draftKey);
      return true;
    } catch {
      $(draftNote).text('Браузер запретил сохранение: проверка действует до перезагрузки страницы.');
      return false;
    }
  }
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey));
    const age = draft && Date.now() - draft.savedAt;
    if (draft && Array.isArray(draft.ids) && age >= 0 && age < 2 * 60 * 60 * 1000) {
      $(checklistList).find('input').each(function () { $(this).prop('checked', draft.ids.includes($(this).val())); });
      $(draftNote).text('Восстановлена незавершённая проверка из этой вкладки. Для нового посещения нажмите «Начать заново».');
    } else sessionStorage.removeItem(draftKey);
  } catch {
    $(draftNote).text('Черновик недоступен: выполните проверку заново.');
  }
  $(safetySection).find('aside').first().before(checklist);
  function currentChecklistSummary() {
    const selectedIds = Array.from($(checklistList).find('input:checked').toArray(), input => $(input).val());
    return checklistSummary(departureItems, selectedIds);
  }
  function updateChecklist() {
    const summary = currentChecklistSummary();
    $(progress).text(`Выполнено: ${summary.completed} из ${summary.total}. ${summary.ready ? 'Можно завершить проверку.' : 'Отметьте оставшиеся действия.'}`);
    $(progress).toggleClass('success', summary.ready);
    $(complete).prop("disabled", !summary.ready);
    $(checklistList).find('li').each(function () {
      const checked = $(this).find('input').first().prop('checked');
      $(this).toggleClass('selected', checked).toggleClass('hidden', unfinishedOnly && checked);
    });
    app.renderList(remainingList, summary.remaining, item => app.el('li', 'mb-2', item.text), 'Все пункты отмечены.');
    $(remainingLabel).toggleClass('hidden', summary.ready);
    app.notify(message, '');
    return summary;
  }
  $(checklistList).on('change', 'input', () => { updateChecklist(); saveChecklistDraft(); });
  $(unfinished).on('click', function () {
    unfinishedOnly = !unfinishedOnly;
    $(this).attr('aria-pressed', String(unfinishedOnly)).text(unfinishedOnly ? 'Показать все пункты' : 'Показать только невыполненные');
    updateChecklist();
  });
  $(complete).on('click', () => {
    const summary = currentChecklistSummary();
    if (!summary.ready) return;
    try { sessionStorage.removeItem(draftKey); } catch { /* The completed check still works without storage. */ }
    app.notify(message, `Самопроверка завершена: ${summary.completed} из ${summary.total} действий отмечены. Спасибо за заботу о безопасности и порядке.`, 'success');
  });
  $(clear).on('click', () => {
    unfinishedOnly = false;
    $(unfinished).attr('aria-pressed', 'false').text('Показать только невыполненные');
    $(checklistList).find('input').toArray().forEach(input => {
      $(input).prop("checked", false);
    });
    updateChecklist();
    saveChecklistDraft();
    app.notify(message, 'Проверка сброшена. Можно начать заново.');
    $(checklistList).find('input').first().trigger("focus");
  });
  renderHelp();
  updateChecklist();
});

