# TOP GAME

Статический сайт компьютерного клуба: выбор ПК, времени и еды в одном заказе. Работает без сборки, библиотек JavaScript и сервера приложений.

## Запуск

Откройте `index.html` в браузере. Для общего хранилища между страницами и вкладками рекомендуется локальный сервер:

```sh
python3 -m http.server 8000
```

Откройте `http://localhost:8000`. Скрипты, стили и изображения находятся в проекте.

## Как устроен заказ

1. **Место и время.** Дата и время по Астане, тариф и схема из 20 демонстрационных ПК. Количество игроков равно числу выбранных мест. Зона и тариф Private согласуются автоматически.
2. **Еда и напитки.** Поиск, категории, фотографии и изменение количества прямо в карточках. Этот шаг можно пропустить.
3. **Контакты.** Одна форма на весь заказ. Обязательны имя и телефон, почта — по желанию. При заказе еды можно выбрать получение у стойки или доставку к ПК.

На компьютере общая корзина остаётся рядом с выбором. На телефоне есть нижняя панель с итогом и корзина в стандартном диалоге браузера. При возвращении назад данные формы сохраняются; выбранные места и еда восстанавливаются после перезагрузки и синхронизируются между вкладками.

Заявка демонстрационная: оплаты, отправки данных в клуб и реального бронирования нет. Интервалы мест проверяются по локальным демо-заявкам; отмена освобождает места только на учебной схеме. Для Private итог группы не выдумывается; условия ночного пакета уточняются у клуба.

## Страницы

| Файл | Содержание |
| --- | --- |
| `index.html` | Краткий путь заказа, фотографии и выбор зоны |
| `booking.html` | Единый процесс выбора ПК, еды и контактов |
| `prices.html` | Тарифы и предварительный калькулятор |
| `computers.html` | Зоны и сравнение оборудования |
| `games.html` | Шесть игр с официальными изображениями, фильтры и запрос игры |
| `rules.html` | Четыре раскрывающиеся группы правил, помощь и проверка перед уходом |
| `about.html` | Фотографии, контакты, ссылка на 2ГИС и локальные демо-отзывы |

Все семь разделов есть в навигации. Меню еды находится внутри бронирования.

## JavaScript

- `data.js` — тарифы, меню и компьютеры.
- `logic.js` — поиск и расчёты без изменения страницы.
- `main.js` — общие функции для DOM, ошибок, дат, цен и хранилища.
- `food.js` — товары и корзина еды; API `TopGameFood` передаёт её общему заказу.
- `booking.js` — шаги заказа, выбор ПК, общая корзина, контакты, проверка пересечений и отмена.
- Остальные файлы соответствуют своим страницам.

Код интерфейса написан обычными функциями, `if` и циклами. Постоянная разметка находится в HTML, оформление — в CSS. Пользовательский текст вставляется через `textContent`. Краткое объяснение: [JS_EXPLAIN_RU.txt](JS_EXPLAIN_RU.txt).

Карточки общей корзины находятся в `<template>` в `booking.html`. `booking.js` клонирует шаблон и заполняет значения. Повторы проверки заказа, сохранения, вывода заявок и подключения кнопок объединены в общие функции.

В `localStorage` сохраняются корзина, черновик выбора, демонстрационные заявки и отзывы. Имя, телефон, почта и комментарий бронирования туда не записываются. Если хранилище недоступно, текущий заказ работает до перезагрузки.

## Изображения

Все изображения локальные. Источники фотографий еды и игровые правообладатели указаны в [images/food/sources.json](images/food/sources.json), [FOOD_PHOTO_CREDITS.md](FOOD_PHOTO_CREDITS.md) и [images/games/sources.json](images/games/sources.json). Фотографии блюд иллюстрируют учебное меню; ассортимент и наличие игр требуют подтверждения клуба.

## Проверки

Проверены размеры 375, 768 и 1440 px, навигация и изображения, шаги заказа, корзина, формы, интервалы и отмена, часовой пояс, перезагрузка, синхронизация вкладок, повреждённое и недоступное хранилище. Проверки игр, правил и отзывов выполнены отдельно.

`checks/unified-check.cjs` содержит актуальные браузерные сценарии общего заказа. Для него нужны Node.js, Playwright и Chrome/Chromium; сайт от этих инструментов не зависит:

```sh
node checks/unified-check.cjs
```

Можно задать `CHROME_PATH` и `QA_OUTPUT`. Прежние отчёты, скриншоты и ограничения midterm в остальных файлах сохранены как история проекта и не описывают текущий интерфейс.


## Assignment 6 — jQuery

The existing catalogue/comparison, reviews and booking contact validation now use jQuery 3.7.1 (full CDN build with effects). Original implementations are preserved in `js/old-js-version.js`, which is never linked to a page. Existing booking calculations, cart, seat selection and other pages retain their business rules.

Methods demonstrated: ID/class/element/attribute and `:checked` selectors; `find`, `closest`, `parent`, `siblings`, `each`, `$(this)`; chained `text`, `html`, `val`, `attr`, `prop`; existing classes via `addClass`, `removeClass`, `toggleClass`, `hasClass`; array rendering via `append`/`appendTo`; `on` with delegated click/change and form submit/input/reset; `fadeIn`, `fadeOut` with callback and `slideDown`. Text from users is inserted through `text`, never `html`.

Booking remains a browser-only demonstration: no real booking or payment is created. Email remains optional as labelled in the existing interface, but supplied addresses are validated. Required names, phone, agreement, date, time, duration, seats and delivery selection are checked. Corrected fields lose their errors; successful submission resets the form after building confirmation. Browser validation does not replace backend checks.

Modified files: `about.html`, `computers.html`, `booking.html`, `js/about.js`, `js/computers.js`, `js/booking.js`; added `js/jquery-features.js`, `js/old-js-version.js`. CSS and interface markup are unchanged except external script tags.

Run with a static server from the repository root, e.g. `python -m http.server 8000`, then open `http://localhost:8000`. Internet access is needed for the jQuery CDN. Development-only browser checks require Playwright outside the website; see `checks/README.md`.

Assignment 6 verification: `node checks/assignment6-check.cjs` with `PLAYWRIGHT_MODULE` pointing to an external Playwright installation and `CHROME_PATH` to Chrome, if needed. `QA_OUTPUT` optionally selects the results folder. Seven grouped browser checks passed, covering all seven pages at 375/768/1440 px, catalogue/delegation, reviews/effects, validation/reset and unchanged CSS/AI Log. The existing unified checkout regression also passed all 113 checks; its two-tab scenario now brings the tab being operated to the foreground before clicking. Results: `checks/assignment6-report.json` and `checks/assignment6-new-flows-report.json`.
