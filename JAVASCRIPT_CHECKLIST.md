# JavaScript checklist

Номера строк относятся к исходникам готовой версии Assignment 5. Строгий режим присутствует в первой строке каждого JS-файла. Все подключения используют `defer`. Этот checklist создан при помощи AI, как раскрыто в AI-log.txt.

| Требование | Точный файл и строка | Реализация |
| --- | --- | --- |
| Массив минимум 6 объектов с ≥4 свойствами и фото | [js/data.js:12](js/data.js#L12) | 8 учебных товаров: id, name, category, price, portion, description, allergens, available |
| 20 объектов мест | [js/data.js:23](js/data.js#L23) | Номер, зона, этаж и тип компьютера |
| Параметры и возвращаемые значения функций | [js/logic.js:5](js/logic.js#L5) | findProduct, validQuantity, cartTotals, filterMenu, estimateVisit, reference |
| Одна функция вызывает другую; итоги и арифметика | [js/logic.js:13](js/logic.js#L13) | Вызов findProduct/validQuantity, обычный цикл for, количество и цена |
| Фильтрация, логические операторы и строгие сравнения | [js/logic.js:26](js/logic.js#L26) | filter, &&, ||, ===; estimateVisit использует !== |
| if/else и расчёт тарифов | [js/logic.js:36](js/logic.js#L36) | Длительность, число игроков, пакет 3 часа, ограничение PRIVATE |
| Math.random с полезным назначением | [js/logic.js:45](js/logic.js#L45) | Случайный суффикс номера DEMO; без обещания реального заказа |
| Общий DOM renderer и пустые состояния | [js/main.js:65](js/main.js#L65) | replaceChildren/append и одна функция renderItem для повторяемого содержимого |
| Создание элементов и classList | [js/main.js:20](js/main.js#L20) | createElement, classList; setError/notify меняют состояния |
| textContent для пользовательского текста | [js/main.js:25](js/main.js#L25) | Общий конструктор и вывод значений; innerHTML не применяется |
| Ошибки рядом с полем и aria-invalid | [js/main.js:75](js/main.js#L75) | Связанный span, aria-describedby, error/is-invalid и clearErrors |
| Проверка trimmed имени, почты и телефона | [js/main.js:99](js/main.js#L99) | Имя 2–80, email и +7 с 10 цифрами |
| Клавиатурный keydown | [js/main.js:140](js/main.js#L140) | Escape закрывает мобильную навигацию и возвращает фокус |
| Меню из массива, связанный поиск/категории/сортировка | [js/food.js:223](js/food.js#L223) | Количество, отсутствие результатов, доступность, сброс и действие добавления |
| Карточки товаров через одну функцию | [js/food.js:198](js/food.js#L198) | Весь каталог создаётся DOM-методами |
| Подытоги строк корзины | [js/food.js:232](js/food.js#L232) | Цена × количество и кнопки +/-/удалить |
| Полный итог корзины и пустое состояние | [js/food.js:251](js/food.js#L251) | Пересчёт количества/суммы, отключённое оформление, общий счётчик |
| Событие click и изменение корзины | [js/food.js:273](js/food.js#L273) | Добавление, увеличение/уменьшение, удаление/очистка |
| События input и change | [js/food.js:312](js/food.js#L312) | Поиск, фильтры, очистка устаревших ошибок и текущий итог |
| Событие submit и заказ: минимум 4 поля | [js/food.js:340](js/food.js#L340) | Имя/email/телефон/получение/ПК/согласие; получение к ПК требует номер; фокус первой ошибки |
| Карта со свободными/занятыми/выбранными ПК | [js/booking.js:242](js/booking.js#L242) | disabled, aria-pressed, текстовое состояние, classList |
| Правильные даты и интервалы | [js/booking.js:157](js/booking.js#L157) | Календарная дата, время UTC+05, длительность 1–12, пересечение [start,end) |
| Занятость и локальные пересечения | [js/booking.js:188](js/booking.js#L188) | Учебный пример и сохранённые локальные заявки |
| Живой итог бронирования | [js/booking.js:271](js/booking.js#L271) | Тариф/зона/дата/время/игроки/ПК/длительность и ценовой ориентир |
| Связанные правила бронирования | [js/booking.js:291](js/booking.js#L291) | Будущие дата/время, вместимость, целые игроки, DUO=2, PRIVATE, 3 часа и число выбранных ПК |
| Демо-заявка, повтор, подтверждение | [js/booking.js:365](js/booking.js#L365) | Сохранение без контактов, повтор не дублирует заявку, явный демонстрационный итог |
| Отмена локальной заявки | [js/booking.js:341](js/booking.js#L341) | Удаление записи, освобождение мест и восстановление фокуса |
| Каталог игр ≥6 объектов | [js/games.js:9](js/games.js#L9) | Настоящие названия с признаками источника/предложения; наличие не обещается |
| Игры: фильтры и renderer | [js/games.js:114](js/games.js#L114) | Поиск, жанр, предложения/исходные, сортировка, количество и пустое состояние |
| Полная валидация запроса игры | [js/games.js:167](js/games.js#L167) | Контакты/дата/игроки/жанр/название/командная игра/согласие |
| Калькулятор тарифов | [js/prices.js:107](js/prices.js#L107) | Группа, длительность, вместимость демо-зоны; PRIVATE без выдуманного счёта |
| Подбор оборудования | [js/computers.js:90](js/computers.js#L90) | Поиск, частота, формат, количество и сброс |
| Сравнение и выбор зон | [js/computers.js:98](js/computers.js#L98) | Характеристики выбранных зон, очистка/удаление, переход с параметрами |
| Отзывы: проверка длины/рейтинга/имени | [js/about.js:107](js/about.js#L107) | Имя 2–80, рейтинг 1–5, trimmed текст 20–1000 |
| Отзывы: счётчик | [js/about.js:117](js/about.js#L117) | Текущее число символов и допустимые границы |
| Отзывы: единый renderer | [js/about.js:123](js/about.js#L123) | Карточка с именем, рейтингом, текстом и автоматической датой/временем, удаление |

## Проверки и границы соответствия

- HTML совпадает с `midterm` после удаления добавленных ссылок скриптов; CSS совпадает полностью. Исправления замороженной разметки не потребовались.
- Браузерный отчёт: [checks/assignment-5.json](checks/assignment-5.json); доказательства: `screenshots/assignment-5/`.
- Нет var, loose equality, inline events, document.write, eval, alert-валидации, innerHTML или element.style; пользовательский ввод выводится текстом.
- Все формы и статусы заявок/заказов явно обозначают отсутствие отправки на сервер, реального бронирования, заказа и оплаты.
- Страниц входа/регистрации нет, поэтому модуль паролей к этому проекту не применяется.
- Условия запрета AI и личного вклада/коммитов минимум за три дня не заявляются выполненными: код создан AI в одной сессии. Неизменённые midterm и новые assignment-4/assignment-5 теги фиксируют технические этапы.


## Games / Rules — exact locations for 2026-10-12 update

Earlier checks and repository-tag claims above describe historical versions. This archive has no Git history. Current checks for the additions are in `checks/games-rules-update.json`; the upload-relative HTML/CSS comparison is in `checks/games-rules-freeze.json`.

| Requirement / Behaviour | Exact location | Evidence |
| --- | --- | --- |
| Six Games objects, meaningful properties | [js/games.js:9](js/games.js#L9) | Catalogue/search data |
| Reusable game-card renderer | [js/games.js:74](js/games.js#L74) | Creates cards and real selection buttons |
| Connected search/category/catalogue controls; sort/count/reset/empty state | [js/games.js:114](js/games.js#L114) | filter, sort and shared renderList |
| Live preview and comment counter | [js/games.js:141](js/games.js#L141) | input/change update results and clear obsolete success |
| Four validation categories and related-field rules | [js/games.js:167](js/games.js#L167) | Contacts, date, players, title/genre, team size, agreement |
| Validated submission and summary | [js/games.js:206](js/games.js#L206) | Field errors, first-invalid focus and explicit demo result |
| Repeated identical request keeps the demo reference | [js/games.js:230](js/games.js#L230) | JSON comparison with strict inequality |
| Reset draft and reference | [js/games.js:242](js/games.js#L242) | Clear errors, old list and comparison state |
| Six Rules objects with seven useful properties | [js/rules.js:12](js/rules.js#L12) | Derived from existing page rules |
| Reusable function with parameters and return value | [js/rules.js:28](js/rules.js#L28) | Case-insensitive trimmed search plus category |
| Reusable object lookup | [js/rules.js:34](js/rules.js#L34) | find with strict ID equality |
| Reusable selected-items function | [js/rules.js:38](js/rules.js#L38) | filter checked IDs |
| Function calls another function; returned result | [js/rules.js:42](js/rules.js#L42) | Calls getCompletedItems; returns counts/remaining/ready |
| Repeated help cards rendered through one function | [js/rules.js:100](js/rules.js#L100) | DOM methods, selected class, aria-pressed |
| Instructions and relevant next action; clear/close | [js/rules.js:120](js/rules.js#L120) | Step list, link, close and restored focus |
| Help filtering, result count and empty state | [js/rules.js:144](js/rules.js#L144) | Invisible selections are cleared |
| submit, input, change events | [js/rules.js:152](js/rules.js#L152) | Search form interaction |
| Reusable checkbox renderer | [js/rules.js:171](js/rules.js#L171) | Connected labels and real checkbox controls |
| Meaningful selection flow, totals and states | [js/rules.js:205](js/rules.js#L205) | Progress, remaining list, disabled/selected/success/hidden |
| Clear completion feedback and reset | [js/rules.js:218](js/rules.js#L218) | Self-check confirmation only; reset starts a fresh checklist |


## Visibility update — 2026-10-16

| Behaviour | Location |
| --- | --- |
| Shared table/list/link/accent contrast | [js/main.js:7](js/main.js#L7) |
| Every newly created element receives theme classes | [js/main.js:23](js/main.js#L23) |
| All tariff properties shown on mobile | [js/prices.js:8](js/prices.js#L8) |
| Mobile data copied from the existing table | [js/prices.js:17](js/prices.js#L17) |

Verification source: checks/visibility-check.cjs; current result: checks/visibility-update.json. Existing Games/Rules browser checks were rerun. The changes in main.js and prices.js shift historical line references in earlier checklist sections.
