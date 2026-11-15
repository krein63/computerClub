'use strict';

$(function () {
  const app = window.TopGame;
  const list = $('#game-cards').get(0);
  if (!app || !list) return;

  const games = [
    { id: 'cs2', title: 'Counter-Strike 2', genre: 'shooter', format: 'Командный шутер, 5 × 5', official: 'https://www.counter-strike.net/cs2', image: 'images/games/cs2.jpg' },
    { id: 'dota2', title: 'Dota 2', genre: 'moba', format: 'MOBA, две команды по пять игроков', official: 'https://www.dota2.com/', image: 'images/games/dota2.jpg' },
    { id: 'valorant', title: 'VALORANT', genre: 'shooter', format: 'Тактический шутер, 5 × 5', official: 'https://playvalorant.com/', image: 'images/games/valorant.jpg' },
    { id: 'lol', title: 'League of Legends', genre: 'moba', format: 'Командная MOBA', official: 'https://www.leagueoflegends.com/', image: 'images/games/lol.jpg' },
    { id: 'rocket-league', title: 'Rocket League', genre: 'sports', format: 'Футбол на автомобилях', official: 'https://www.rocketleague.com/', image: 'images/games/rocket-league.jpg' },
    { id: 'civilization', title: 'Sid Meier’s Civilization VI', genre: 'strategy', format: 'Пошаговая стратегия', official: 'https://civilization.2k.com/civ-vi/', image: 'images/games/civilization.jpg' },
    { id: 'apex', title: 'Apex Legends', genre: 'shooter', format: 'Королевская битва отрядами', official: 'https://store.steampowered.com/app/1172470/', image: 'images/games/apex.jpg' },
    { id: 'pubg', title: 'PUBG: BATTLEGROUNDS', genre: 'shooter', format: 'Королевская битва в одиночку или в отряде', official: 'https://store.steampowered.com/app/578080/', image: 'images/games/pubg.jpg' },
    { id: 'rainbow-six', title: 'Tom Clancy’s Rainbow Six Siege X', genre: 'shooter', format: 'Тактический шутер с разрушаемым окружением', official: 'https://store.steampowered.com/app/359550/', image: 'images/games/rainbow-six.jpg' },
    { id: 'overwatch', title: 'Overwatch', genre: 'shooter', format: 'Командный шутер с героями', official: 'https://store.steampowered.com/app/2357570/', image: 'images/games/overwatch.jpg' },
    { id: 'team-fortress', title: 'Team Fortress 2', genre: 'shooter', format: 'Командный шутер с девятью классами', official: 'https://store.steampowered.com/app/440/', image: 'images/games/team-fortress.jpg' },
    { id: 'the-finals', title: 'THE FINALS', genre: 'shooter', format: 'Командные матчи на разрушаемых аренах', official: 'https://store.steampowered.com/app/2073850/', image: 'images/games/the-finals.jpg' },
    { id: 'warframe', title: 'Warframe', genre: 'shooter', format: 'Кооперативные миссии от третьего лица', official: 'https://store.steampowered.com/app/230410/', image: 'images/games/warframe.jpg' },
    { id: 'left-4-dead', title: 'Left 4 Dead 2', genre: 'shooter', format: 'Кооперативный шутер на четверых', official: 'https://store.steampowered.com/app/550/', image: 'images/games/left-4-dead.jpg' },
    { id: 'paladins', title: 'Paladins', genre: 'shooter', format: 'Командные матчи с героями', official: 'https://store.steampowered.com/app/444090/', image: 'images/games/paladins.jpg' },
    { id: 'smite', title: 'SMITE', genre: 'moba', format: 'Командная MOBA с видом от третьего лица', official: 'https://store.steampowered.com/app/386360/', image: 'images/games/smite.jpg' },
    { id: 'age-of-empires', title: 'Age of Empires IV', genre: 'strategy', format: 'Стратегия в реальном времени о средневековых цивилизациях', official: 'https://store.steampowered.com/app/1466860/', image: 'images/games/age-of-empires.jpg' },
    { id: 'company-of-heroes', title: 'Company of Heroes 3', genre: 'strategy', format: 'Тактическая стратегия в реальном времени', official: 'https://store.steampowered.com/app/1677280/', image: 'images/games/company-of-heroes.jpg' },
    { id: 'total-war', title: 'Total War: WARHAMMER III', genre: 'strategy', format: 'Пошаговая кампания с битвами в реальном времени', official: 'https://store.steampowered.com/app/1142710/', image: 'images/games/total-war.jpg' },
    { id: 'stellaris', title: 'Stellaris', genre: 'strategy', format: 'Глобальная стратегия об исследовании галактики', official: 'https://store.steampowered.com/app/281990/', image: 'images/games/stellaris.jpg' },
    { id: 'trackmania', title: 'Trackmania', genre: 'racing', format: 'Заезды на время и трассы сообщества', official: 'https://store.steampowered.com/app/2225070/', image: 'images/games/trackmania.jpg' },
    { id: 'forza', title: 'Forza Horizon 5', genre: 'racing', format: 'Гонки в открытом мире', official: 'https://store.steampowered.com/app/1551360/', image: 'images/games/forza.jpg' },
    { id: 'assetto-corsa', title: 'Assetto Corsa', genre: 'racing', format: 'Автосимулятор с кольцевыми трассами', official: 'https://store.steampowered.com/app/244210/', image: 'images/games/assetto-corsa.jpg' },
    { id: 'street-fighter', title: 'Street Fighter 6', genre: 'fighting', format: 'Файтинг с поединками один на один', official: 'https://store.steampowered.com/app/1364780/', image: 'images/games/street-fighter.jpg' },
    { id: 'tekken', title: 'TEKKEN 8', genre: 'fighting', format: 'Трёхмерный файтинг один на один', official: 'https://store.steampowered.com/app/1778820/', image: 'images/games/tekken.jpg' },
    { id: 'it-takes-two', title: 'It Takes Two', genre: 'co-op', format: 'Кооперативное приключение для двоих', official: 'https://store.steampowered.com/app/1426210/', image: 'images/games/it-takes-two.jpg' }
  ];
  const genreNames = {
    shooter: 'Шутер',
    moba: 'MOBA',
    strategy: 'Стратегия',
    sports: 'Спорт',
    racing: 'Гонки',
    fighting: 'Файтинг',
    'co-op': 'Кооперативное приключение'
  };
  function readFavorites() {
    const saved = app.store.get('favorite-games', []);
    return Array.isArray(saved) ? games.filter(game => saved.includes(game.id)).map(game => game.id) : [];
  }

  let favorites = readFavorites();
  let favoritesSaved = true;
  const controls = app.el('div', 'row g-3 mb-4');
  $(controls).attr({ role: 'search', 'aria-label': 'Поиск и фильтры игр' });

  function addControl(id, labelText, kind, options, classes = 'col-12 col-md-3') {
    const wrapper = app.el('div', classes);
    const label = app.el('label', 'form-label fw-semibold', labelText);
    $(label).attr('for', id);
    const field = app.el(kind, kind === 'select' ? 'form-select' : 'form-control');
    $(field).attr('id', id);
    if (kind === 'input') $(field).attr('type', 'search');
    if (options) options.forEach(([value, text]) => {
      const option = app.el('option', '', text);
      $(option).val(value);
      $(field).append(option);
    });
    $(wrapper).append(label, field);
    $(controls).append(wrapper);
    return field;
  }
  const search = addControl('games-search', 'Название игры', 'input');
  const category = addControl('games-category', 'Жанр', 'select', [['all', 'Все жанры'], ...Object.entries(genreNames)]);
  const availability = addControl('games-availability', 'Каталог', 'select', [['all', 'Все игры'], ['source', 'Упомянуты на сайте'], ['suggestion', 'Предложения для клуба']]);
  const sort = addControl('games-sort', 'Сортировать', 'select', [['name', 'По названию А–Я'], ['genre', 'По жанру']]);
  // New endterm feature: a visitor's shortlist survives a page reload.
  const savedFavorites = app.store.get('favorite-games', []);
  let favorites = Array.isArray(savedFavorites) ? games.filter(game => savedFavorites.includes(game.id)).map(game => game.id) : [];
  const favoriteFilter = addControl('games-favorites', 'Мой список', 'select', [['all', 'Все игры'], ['favorites', 'Только избранные']]);
  const favoriteStatus = app.el('p', 'p-3 rounded-3 hidden');
  $(favoriteStatus).attr({ id: 'games-favorite-status', role: 'status' });
  const actions = app.el('div', 'col-12 d-flex flex-wrap align-items-center gap-3');
  const reset = app.el('button', 'btn btn-outline-secondary', 'Сбросить фильтры');
  $(reset).attr({ type: 'button', id: 'games-filter-reset' });
  const count = app.el('p', 'mb-0');
  $(count).attr({ id: 'games-result-count', 'aria-live': 'polite' });
  $(actions).append(reset, count);
  $(controls).append(actions);
  $(list).before(controls, favoriteStatus);
  $(list).on('click', '[data-favorite-game]', function () {
    const id = $(this).attr('data-favorite-game');
    const game = games.find(item => item.id === id);
    if (!game) return;
    const adding = !favorites.includes(id);
    favorites = adding ? [...favorites, id] : favorites.filter(value => value !== id);
    const saved = app.store.set('favorite-games', favorites);
    renderGames();
    app.notify(favoriteStatus, `${game.title}: ${adding ? 'добавлена в избранное' : 'удалена из избранного'}.${saved ? '' : ' Сохранение недоступно, список действует до перезагрузки.'}`, saved ? 'success' : 'error');
    const $next = $(list).find(`[data-favorite-game="${id}"]`);
    if ($next.length) $next.trigger('focus');
    else $(favoriteFilter).trigger('focus');
  });
  $(list).closest('section').first().find('header .lead').first().text('Выберите игру и запланируйте визит с друзьями. Наличие нужной версии уточняйте у администратора.');
  function renderGame(game) {
    const column = app.el('div', 'col-12 col-md-6 col-lg-4');
    const card = app.el('article', 'card h-100 shadow-sm overflow-hidden position-relative');
    $(card).attr('id', `game-${game.id}`);
    const cover = app.el('div', 'ratio ratio-16x9 position-relative');
    const image = app.el('img', 'w-100 h-100 object-fit-cover');
    $(image).attr({ src: game.image, alt: `Обложка игры ${game.title}` });
    image.loading = 'lazy';
    image.decoding = 'async';
    const favorite = app.el('button', 'favorite-heart');
    $(favorite).attr({ type: 'button', 'data-favorite-game': game.id });
    setFavoriteButton(favorite, game, favorites.includes(game.id));
    const icon = document.createElementNS(svgNamespace, 'svg');
    $(icon).attr({ viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' });
    $(icon).append(favoritePath.cloneNode());
    $(favorite).append(icon);
    $(cover).append(image);
    const body = app.el('div', 'card-body p-3 p-lg-4 d-flex flex-column');
    const official = app.el('a', 'mb-3', 'Официальный сайт игры');
    $(official).attr({ href: game.official, target: '_blank', rel: 'noopener noreferrer' });
    if (new URL(game.official).hostname === 'store.steampowered.com') official.textContent = 'Страница игры в Steam';
    $(body).append(app.el('h2', 'h4 fw-bold mb-2', game.title), app.el('p', 'small text-danger fw-semibold', genreNames[game.genre]), app.el('p', 'card-text mb-2', game.format), official);
    $(card).append(cover, favorite, body);
    $(column).append(card);
    return column;
  }
  function renderGames() {
    const query = $(search).val().trim().toLocaleLowerCase('ru');
    const matches = games.filter(game => game.title.toLocaleLowerCase('ru').includes(query) && ($(category).val() === 'all' || game.genre === $(category).val()) && ($(availability).val() === 'all' || game.source === ($(availability).val() === 'source')) && ($(favoriteFilter).val() !== 'favorites' || favorites.includes(game.id)));
    matches.sort((first, second) => $(sort).val() === 'genre' ? genreNames[first.genre].localeCompare(genreNames[second.genre], 'ru') || first.title.localeCompare(second.title, 'ru') : first.title.localeCompare(second.title, 'ru'));
    app.renderList(list, matches, renderGame, 'Подходящих игр нет. Измените название, жанр или сбросьте фильтры.');
    $(count).text(`Найдено игр: ${matches.length} из ${games.length}`);
  }
  $(controls).on('submit', event => {
    event.preventDefault();
    renderGames();
  });
  $(controls).on('input', 'input', renderGames);
  $(controls).on('change', 'select', renderGames);
  $(reset).on('click', () => {
    $(search).val('');
    $(category).val('all');
    $(sort).val('name');
    $(favoriteFilter).val('all');
    renderGames();
    $(search).trigger('focus');
  });
  window.addEventListener('storage', event => {
    if (!favoritesSaved || (event.key !== 'topgame-favorite-games' && event.key !== null)) return;
    favorites = readFavorites();
    const active = document.activeElement;
    const focusedFavorite = list.contains(active) ? active.dataset.favoriteGame : null;
    renderGames();
    if (focusedFavorite) {
      const button = list.querySelector(`[data-favorite-game="${focusedFavorite}"]`);
      (button ?? favoriteFilter).focus({ preventScroll: true });
    }
  });
  renderGames();
});
