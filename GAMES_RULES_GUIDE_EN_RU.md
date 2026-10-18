# Games and Rules — explanation / объяснение

## 1. What this update does / Что делает обновление

**EN:** Your Games page helps visitors find a game and prepare a demonstration request. Your Rules page now helps visitors find instructions for a problem and complete a checklist before leaving. The interface stays in Russian, matching the existing site. All features run in the browser.

**RU:** Страница Games помогает найти игру и подготовить демонстрационный запрос. Страница Rules теперь помогает найти действия для конкретной ситуации и проверить себя перед уходом. Интерфейс остаётся на русском, как на остальных страницах. Всё работает в браузере.

The Games catalogue and form already existed in the supplied ZIP. They were retained and improved. The Rules features are new. / Каталог и форма Games уже были в исходном ZIP. Они сохранены и улучшены. Функции Rules добавлены сейчас.

| File / Файл | Role / Роль |
| --- | --- |
| `games.html` | Existing Games markup and form / Исходная разметка Games и форма |
| `js/games.js` | Game data, catalogue, selection, form validation and result / Данные игр, каталог, выбор, проверка формы, итог |
| `rules.html` | Existing Rules content; one new deferred script link / Исходные правила; добавлена только ссылка на скрипт |
| `js/rules.js` | Situation finder and departure checklist / Поиск помощи и проверка перед уходом |
| `js/main.js` | Shared element creation, rendering, validation messages and navigation / Общие инструменты создания элементов, вывода, ошибок, навигации |
| `js/logic.js` | Pure project logic and demonstration references / Логика проекта и номера демонстрационных запросов |
| `js/data.js` | Shared tariffs, menu and 20 demonstration PCs / Общие тарифы, меню, 20 учебных ПК |
| `js/food.js` | Existing shared cart and menu behaviour / Существующая общая корзина и меню |

JavaScript changes website behaviour. Java is a different language. / JavaScript отвечает за поведение сайта. Java — другой язык.

## 2. How to run / Как запустить

1. Extract the ZIP completely. / Полностью распакуйте архив.
2. Open `index.html`, then use the Games and Rules navigation links. / Откройте `index.html`, затем перейдите в «Игры» и «Правила».
3. You can also open `games.html` and `rules.html` directly. JavaScript must be enabled. / Эти страницы также можно открыть напрямую. JavaScript должен быть включён.
4. The website needs no Maven, Java, Node.js, database or build process to run. / Для сайта не нужны Maven, Java, Node.js, база данных или сборка.

Optional: from the project folder run `python -m http.server 8000` if Python is installed, then open `http://localhost:8000`. A static server only serves files. It does not receive bookings or orders. This is useful for consistent shared browser storage between pages.

При наличии Python можно запустить указанную команду из папки проекта. Такой сервер только отдаёт файлы; бронирования и заказы он не обрабатывает. Это удобно для проверки общего хранилища между страницами.

## 3. Games: catalogue / Каталог игр

**Visitor flow / Действия посетителя:** enter a title → select a genre or catalogue type → inspect results → choose a game → finish the form. / Ввести название → выбрать жанр или тип каталога → посмотреть результаты → выбрать игру → заполнить форму.

The `games` array contains six objects. Each object describes one game. Important properties are `id`, `title`, `genre`, `format`, `source` and `official`. Some objects also have an image. `source: true` means the game was mentioned in the original site; it does not prove installation or availability. Other entries are suggestions for the club.

Массив `games` содержит шесть объектов. Объект — данные одной игры. `id` — уникальное обозначение; `title` — название; `genre` — жанр; `format` — описание формата; `source` — упоминалась ли игра в исходном сайте; `official` — официальный сайт. Это не список подтверждённо установленных игр.

### What each catalogue function does / Функции каталога

| Function | Simple English | Русский |
| --- | --- | --- |
| `addControl(id, labelText, kind, options)` | Creates a labelled search/select control and returns it | Создаёт поле с подписью и возвращает его |
| `renderGame(game)` | Creates one card and its selection button; returns the card column | Создаёт одну карточку и кнопку выбора; возвращает колонку |
| `renderGames()` | Filters, sorts, renders and updates the result count | Фильтрует, сортирует, выводит карточки и количество |

Search is case-insensitive and ignores spaces at the beginning/end. Filtering combines all controls: the title must match AND the selected genre must match AND the catalogue type must match. Selecting “All” removes that particular restriction. Sorting changes the displayed order without deleting game data.

Поиск не зависит от регистра и убирает крайние пробелы. Условия объединены через `&&`: название подходит И жанр подходит И тип каталога подходит. Значение «Все» снимает соответствующее ограничение. Сортировка меняет порядок результатов, не удаляя исходные данные.

`app.renderList` clears the previous display with `replaceChildren`, then calls `renderGame` for every matching object. If the array of matches is empty, it displays a clear no-results message. Reset restores all filters and returns focus to search.

Общий `app.renderList` удаляет старое отображение через `replaceChildren`, затем вызывает `renderGame` для каждого результата. При отсутствии результатов появляется сообщение. Сброс возвращает фильтры в исходное состояние и фокус в поиск.

Clicking “Choose for request” fills the game title and genre, highlights the corresponding card with the existing `selected` class, and updates the live summary. The button exposes selection with `aria-pressed`. This update also keeps the highlight consistent when you edit the title manually.

Кнопка выбора заполняет название и жанр, выделяет карточку готовым классом `selected` и обновляет итог. `aria-pressed` сообщает вспомогательным технологиям состояние кнопки. При ручном изменении названия выделение обновляется.

## 4. Games: request form / Форма запроса

**EN:** This form prepares a request summary. It does not send anything to club staff, install a game or reserve a PC.

**RU:** Форма формирует итог запроса. Она не отправляет его персоналу, не устанавливает игру и не бронирует ПК.

| Field / Поле | Validation / Проверка |
| --- | --- |
| Name / Имя | Trimmed length 2–80 / После удаления крайних пробелов 2–80 символов |
| Email / Почта | Email format and maximum length / Формат адреса и ограничение длины |
| Telephone / Телефон | +7 followed by ten digits; common formatting spaces accepted / +7 и десять цифр; пробелы и обычное оформление допустимы |
| Visit date / Дата | Required and not before today in Kazakhstan time / Обязательна, не раньше сегодняшней даты в Казахстане |
| Players / Игроки | Whole number from 1 to 20, based on shared demonstration capacity / Целое число от 1 до 20 по общей учебной вместимости |
| Game title / Название | Trimmed length 2–120 / 2–120 символов после удаления крайних пробелов |
| Genre / Жанр | Valid selection; for a known game its genre must match / Допустимый выбор; для известной игры жанр должен совпадать |
| Team play / Командная игра | Choice required; “yes” requires at least two players / Выбор обязателен; «да» требует минимум двух игроков |
| Agreement / Подтверждение | Checkbox required / Флажок обязателен |
| Comment / Комментарий | Optional, maximum 1000 characters; live counter / Необязателен, максимум 1000 символов; живой счётчик |

The two related-field rules are useful: team play needs multiple players, and a known game's title must agree with its genre. Unknown games can still be suggested with a valid genre. You do not need exactly ten players merely to request a game described as 5×5.

Два правила связывают поля: для командной игры нужно несколько игроков, а название известной игры должно соответствовать жанру. Новую игру тоже можно предложить. Описание игры как 5×5 не означает, что для запроса установки обязательно нужны десять человек.

| Function | Simple English | Русский |
| --- | --- | --- |
| `updateSummary()` | Updates the preview, counter, selected cards and booking link; hides obsolete confirmation | Обновляет предварительный итог, счётчик, выделение и ссылку бронирования; скрывает устаревшее подтверждение |
| `validateRequest()` | Checks fields and returns an array of invalid field elements | Проверяет поля и возвращает массив элементов с ошибками |
| `check(field, message)` | Local helper: displays an error and records the invalid field | Внутренний помощник: выводит ошибку и запоминает неправильное поле |
| `onRequestEdit(event)` | Revalidates after an attempted submission and updates the preview | После попытки отправки повторно проверяет данные и обновляет итог |

On submit, `preventDefault()` keeps the browser on the page. Validation runs. If the invalid array is not empty, the form displays specific messages beside fields and focuses its first invalid field. If it is empty, the code makes a request object and renders the summary using safe text nodes.

При `submit` метод `preventDefault()` отменяет стандартную отправку и переход. Затем проверяются данные. Если массив ошибок не пуст, сообщения появляются у полей, а фокус переходит к первому неправильному полю. Если ошибок нет, создаётся объект запроса и выводится итог.

The confirmed summary now includes name, email, telephone, game, genre, date, player count, team-play choice and an optional comment. Contact data is displayed locally; this change does not save it to localStorage or send it to a server.

Подтверждённый итог теперь содержит контакты и все параметры запроса. Контакты отображаются в текущей странице; это обновление не сохраняет их в localStorage и не отправляет на сервер.

`JSON.stringify(request)` gives the current request a comparable text representation. If it differs from the previous successful request, the code creates a new demo reference. Repeating the identical successful submission keeps its reference. Reset clears that comparison state so a new draft can start. `Math.random()` contributes only to a demonstration reference; uniqueness and real booking are not promised.

`JSON.stringify(request)` превращает текущий объект в строку для сравнения. Изменённый запрос получает новый демо-номер. Повтор того же запроса сохраняет номер. Сброс очищает это состояние. `Math.random()` участвует только в создании демонстрационного номера; это не реальная бронь и не гарантированно уникальный идентификатор.

Editing clears old success feedback. Reset clears fields, messages, the list and reference state, then restores focus to the name field. The booking link passes only game/date/players through URL parameters; the booking page still performs its own validation and seat selection.

Изменение данных скрывает старый успех. Сброс очищает форму, сообщения, список и номер, затем возвращает фокус в имя. Ссылка бронирования передаёт только игру, дату и игроков; форма бронирования отдельно проверяет данные и требует выбрать места.

## 5. Rules: find help / Поиск помощи

The six situations are derived from existing rules: a broken device, damage before play, extra time, found belongings, account logout, and installing another game/program. Each object has `id`, `title`, `category`, `keywords`, `steps`, `link` and `action`.

Шесть ситуаций основаны на существующих правилах: устройство не работает; найдено повреждение до игры; нужно продлить время; найдена чужая вещь; нужен выход из аккаунтов; нужна другая игра или программа. `steps` — массив действий, `link` — полезный переход, `action` — подпись ссылки. Телефон и новые правила клуба не выдумываются.

**Example / Пример:** choose “Equipment” → search “mouse” using the Russian word `мышь` → choose the device problem → read instructions → open the club contacts. / Выбрать «Оборудование» → написать `мышь` → выбрать проблему → прочитать действия → открыть контакты клуба.

| Function | Simple English | Русский |
| --- | --- | --- |
| `filterSituations(items, query, category)` | Returns matching situations; searches title, keywords and steps | Возвращает подходящие ситуации; ищет по названию, ключевым словам и действиям |
| `findSituation(items, id)` | Returns the object with that ID, or undefined | Находит объект по ID; если нет — undefined |
| `makeButton(text, id, classes)` | Returns a real button with type="button" | Возвращает настоящую кнопку, не отправляющую форму |
| `addControl(container, id, labelText, tag)` | Creates a labelled input/select and returns it | Создаёт поле с подписью и возвращает его |
| `renderSituation(item)` | Creates one selectable help card | Создаёт одну выбираемую карточку помощи |
| `renderHelpDetail(item)` | Creates instructions, next link and close button; shows guidance when nothing is selected | Создаёт инструкции, ссылку и закрытие; без выбора показывает подсказку |
| `renderHelp()` | Filters, clears invisible selections, renders cards/count/details | Фильтрует, сбрасывает исчезнувший выбор и выводит карточки, количество, инструкции |

Click selection updates `selectedSituation`, rerenders, and focuses the instruction heading. Closing restores focus to the selected card's button. If a filter removes that card, its instructions disappear instead of remaining misleadingly visible. Reset restores all six results and clears selection. Enter in the search form is supported through its submit event.

Клик меняет `selectedSituation`, обновляет вывод и переводит фокус к заголовку инструкций. Закрытие возвращает фокус на кнопку выбранной карточки. Если фильтр убрал карточку, её инструкции тоже исчезают. Сброс возвращает все шесть результатов. Enter в поиске обрабатывается через `submit`.

The existing table remains visible. The new finder is inserted through JavaScript inside its section. The next link opens contacts, prices, the game request or the checklist. It does not notify staff or guarantee extra time.

Исходная таблица сохранена. Поиск добавляется через JavaScript в её раздел. Полезная ссылка ведёт к контактам, тарифам, запросу игры или проверке перед уходом. Она не уведомляет персонал и не гарантирует продление.

## 6. Rules: departure checklist / Проверка перед уходом

Four items cover game-client logout, browser-account logout/no saved passwords, personal belongings and workstation condition. Checkbox choices exist only on the current page. Reload starts a fresh checklist.

Четыре пункта: выход из игровых клиентов; выход из браузерных аккаунтов без сохранения паролей; личные вещи; состояние игрового места. Выбор существует только в текущей странице. После перезагрузки проверка начинается заново.

| Function | Simple English | Русский |
| --- | --- | --- |
| `getCompletedItems(items, selectedIds)` | Returns items whose IDs are selected | Возвращает отмеченные пункты |
| `checklistSummary(items, selectedIds)` | Calls getCompletedItems and returns completed/total/remaining/ready | Вызывает getCompletedItems и возвращает количество, остаток и готовность |
| `renderDepartureItem(item)` | Creates one checkbox with its label | Создаёт один флажок с подписью |
| `currentChecklistSummary()` | Reads checked inputs and asks checklistSummary for the result | Читает отмеченные поля и вызывает checklistSummary |
| `updateChecklist()` | Updates progress, remaining items, selection and button state; clears old confirmation | Обновляет прогресс, остаток, выделение и кнопку; очищает старый успех |

The readiness condition is “there are items AND completed count equals total count”. Initially it is 0/4 and completion is disabled. At 2/4 the remaining list shows two actions. At 4/4 completion becomes available. Clicking it shows self-check confirmation. Unchecking anything hides that confirmation and disables completion. Reset unchecks everything, shows feedback and focuses the first checkbox.

Готовность означает: пункты существуют И число выполненных равно общему числу. Сначала 0/4, завершение отключено. При 2/4 показаны два оставшихся действия. При 4/4 кнопка становится доступной. Нажатие подтверждает самопроверку. Снятие флажка скрывает успех и отключает завершение. Сброс снимает всё, выводит сообщение и возвращает фокус в первый флажок.

This is a visitor's self-check. The website cannot inspect another game's login state or log the visitor out of other applications. / Это самостоятельная проверка посетителя. Сайт не проверяет вход в другие игры и приложения и не выполняет выход из них.

## 7. JavaScript topics / Темы JavaScript

| Topic | Example / Пример |
| --- | --- |
| `const` / `let` | Arrays and DOM references stay const; changing selection and attempted state use let / Постоянные ссылки — const; меняющееся состояние — let |
| Arrays of objects / Массивы объектов | Six games and six help situations / Шесть игр и шесть ситуаций |
| `filter` | Game search and help search / Поиск игр и помощи |
| `find` | Known game validation and situation lookup / Поиск известной игры и ситуации |
| Traversal / Обход | for/of creates options; forEach renders items and updates classes / Циклы создают варианты и обновляют элементы |
| Functions calling functions / Вызов функций | checklistSummary calls getCompletedItems; renderHelp calls filterSituations / Одна функция использует другую |
| Arithmetic / Арифметика | Counts of completed/total; existing site calculators handle prices / Подсчёт пунктов; расчёты цен есть в общих калькуляторах |
| `&&`, `||`, `!` | Combined filters, alternatives and disabled state / Совместные условия, альтернативы, отрицание |
| `===`, `!==` | Matching IDs/genres; changed request comparison / Сравнение ID/жанров и изменившегося запроса |
| `Math.random()` | Shared demonstration-reference generator / Общий генератор демо-номера |
| DOM | createElement via app.el; append, before, replaceChildren, remove existing submit guard / Создание, вставка, замена и удаление элементов |
| `classList` | selected, hidden, success and error feedback / Состояния выбора, скрытия, успеха и ошибок |
| Events / События | click, input, change, submit and reset; shared navigation uses keydown / Клики, ввод, изменение, отправка, сброс; общая навигация использует keydown |
| Safe text / Безопасный текст | textContent through app.el/notify / Пользовательский текст выводится через textContent |
| Accessibility / Доступность | Labels, real buttons, focus, aria-pressed, role=status, disabled / Подписи, кнопки, фокус, состояния и текстовые сообщения |

`defer` loads the script without blocking HTML parsing and executes it after the document is parsed, in script order. `use strict` enables stricter JavaScript rules. The arrow-function wrapper isolates page variables. The guard returns early if this is not the correct page or the shared API is absent.

`defer` позволяет сначала разобрать HTML и затем выполнить скрипты в порядке подключения. `use strict` включает строгие правила JavaScript. Обёртка функции изолирует переменные страницы. Начальная проверка выходит из скрипта, если нужных элементов или общего API нет.

The new controls use existing responsive Bootstrap classes. At a narrow width, col-12 places controls/cards on separate rows; from the medium breakpoint, col-md-6 uses two columns. No new CSS rule or element.style is introduced. The existing Rules table receives the prepared table-dark class for readable text in the dark theme.

Новые элементы используют готовые адаптивные классы Bootstrap. На узком экране col-12 даёт отдельную строку; начиная с среднего размера col-md-6 делает две колонки. Новые CSS-правила и element.style не добавлены.

## 8. Practice before defence / Проверка перед защитой

1. Search for `Counter`, then choose a genre that does not match. Explain the empty state and reset. / Найдите Counter, выберите другой жанр, объясните пустое состояние и сброс.
2. Choose Dota 2. Explain why MOBA is filled automatically. / Выберите Dota 2 и объясните автоматический жанр.
3. Submit empty fields; inspect first-field focus and field errors. / Отправьте пустую форму и покажите ошибки и фокус.
4. Enter a past date, an invalid email and team play with one player. Correct each. / Проверьте прошлую дату, неправильную почту и команду из одного человека.
5. Submit valid data twice and show the stable reference. Edit the comment and show that old success disappears. / Отправьте правильные данные дважды; покажите номер. Измените комментарий; старый успех исчезнет.
6. Follow the booking link and inspect carried game/date/player values. / Перейдите в бронирование и проверьте переданные значения.
7. In Rules search `мышь`, open instructions, close them, then reset. / Найдите мышь, откройте и закройте инструкции, сбросьте поиск.
8. Search an impossible phrase and explain why the count is zero. / Введите несуществующую фразу и объясните ноль результатов.
9. Check two departure items, then four. Confirm, uncheck one and reset. / Отметьте два, затем четыре пункта; подтвердите, снимите один и сбросьте.
10. Use Tab, Enter and Space to operate the controls. / Используйте Tab, Enter и пробел.

## 9. Teacher questions / Вопросы преподавателя

**Why are these substantial features? / Почему это полноценные функции?**

EN: Each completes a visitor task: finding a game, preparing a valid request, finding correct help, or checking departure actions.

RU: Каждая решает задачу посетителя: найти игру, подготовить правильный запрос, получить помощь или проверить действия перед уходом.

**What is the difference between filter and find? / Чем отличаются filter и find?**

EN: filter returns an array of all matching objects. find returns the first matching object or undefined.

RU: filter возвращает массив всех подходящих объектов. find возвращает первый подходящий объект либо undefined.

**What is composition of functions here? / Где одна функция использует другую?**

EN: checklistSummary uses getCompletedItems instead of repeating its filtering logic.

RU: checklistSummary использует getCompletedItems, чтобы не повторять логику отбора выполненных пунктов.

**Why preventDefault? / Зачем preventDefault?**

EN: We handle the form in JavaScript and keep the visitor on the page instead of performing the browser's normal submission.

RU: Мы обрабатываем форму через JavaScript и отменяем стандартную отправку с переходом.

**Why textContent instead of innerHTML? / Почему textContent?**

EN: Visitor text must remain text. It must not become HTML or run code.

RU: Текст посетителя должен оставаться текстом, а не превращаться в HTML или исполняемый код.

**How do you avoid old results? / Как убирается устаревший результат?**

EN: Rendering replaces old children. Input hides the previous confirmation. Checklist change also clears confirmation.

RU: При выводе старые элементы заменяются. Ввод скрывает прежнее подтверждение. Изменение флажка тоже очищает подтверждение.

**Is the form a real booking? / Это реальная бронь?**

EN: No. It is an explicitly labelled browser demonstration. No server receives the request.

RU: Нет. Это явно обозначенная демонстрация в браузере. Сервер запрос не получает.

**Does the checklist log a visitor out? / Проверка выполняет выход?**

EN: No. The visitor performs the actions and checks the boxes. The page only tracks the self-check.

RU: Нет. Посетитель выполняет действия сам. Страница только учитывает его отметки.

### Possible live changes / Что могут попросить изменить

| Request / Задание | Where to change / Где менять | What else to consider / Что учесть |
| --- | --- | --- |
| Add a game / Добавить игру | games array in games.js | Add valid genre mapping and form option through DOM if introducing a genre / Для нового жанра обновить названия и DOM-варианты |
| Add a situation / Добавить ситуацию | situations array in rules.js | Use an existing category or add its label; provide useful steps/link / Категория, понятные действия и ссылка |
| Add a checklist item / Добавить пункт | departureItems array | Counts and remaining list adapt automatically / Количество и остаток обновляются автоматически |
| Change minimum team size / Изменить размер команды | Related-field condition in validateRequest | Update its error message too / Изменить также сообщение |
| Change comment length / Изменить длину комментария | DOM maxlength, validation, counter in games.js | Keep all three consistent; do not directly rewrite frozen HTML / Согласовать три места; HTML напрямую не менять |
| Add another filter / Добавить фильтр | DOM control plus filter function | Add reset and empty-state handling / Добавить сброс и пустое состояние |

## 10. Short defence speech / Короткая речь

**EN:** “My pages are Games and Rules. On Games, visitors can search, filter and choose a game. The choice fills the request form. I check contacts, the date, the number of players and related fields. Errors appear near the fields. A valid request shows a summary and a demo reference. On Rules, visitors can find instructions for a situation. They can also complete a checklist before leaving. I use arrays, functions, conditions, DOM methods and events. New elements are created with JavaScript and existing CSS classes. These are browser demonstrations; no real request is sent.”

**RU:** «Мои страницы — Игры и Правила. На странице игр посетитель ищет, фильтрует и выбирает игру. Выбор заполняет форму запроса. Я проверяю контакты, дату, количество игроков и связанные поля. Ошибки показываются рядом с полями. Правильный запрос показывает итог и демо-номер. На странице правил посетитель находит инструкции для ситуации. Также он может выполнить проверку перед уходом. Я использую массивы, функции, условия, DOM и события. Новые элементы создаются через JavaScript и готовые CSS-классы. Это демонстрация в браузере; реальный запрос не отправляется».

## 11. Scope and submission / Границы и сдача

This update implements the four suggested page features. It is not a certification that every team requirement is satisfied. The rest of the team's booking, cart, reviews, calculations and shared functionality remains in the archive. Current verification details are recorded separately from historical reports.

Это обновление реализует четыре предложенные функции страниц. Оно не подтверждает выполнение всех требований команды. Остальные бронирование, корзина, отзывы, калькуляторы и общие функции сохранены. Новые проверки отделены от исторических отчётов.

There is no .git directory in the supplied ZIP. Existing README tag/commit statements describe an earlier repository; this update does not verify or fabricate tags, commits or contributions across three days. CSS is unchanged and HTML differs from the supplied archive only by the Rules script link. Matching the actual midterm tag requires checking the real repository.

В ZIP нет .git. Упоминания тегов и коммитов в старых документах относятся к прежнему репозиторию. Сейчас теги, история и личный вклад не создаются и не подделываются. CSS сохранён, HTML изменён только добавлением Rules-скрипта. Совпадение с реальным midterm проверяется в репозитории.

The assignment prohibits AI-authored JavaScript, validation and project documents. This implementation and guide were created with AI at your explicit request, and the assistance is disclosed in AI-log.txt. Do not present it as independently written student work. Teacher permission is needed if this version is to be accepted despite that written policy.

Задание запрещает JavaScript, проверки и проектные документы, написанные AI. Эта реализация и объяснение созданы с AI по вашему запросу; помощь указана в AI-log.txt. Не выдавайте её за самостоятельно написанную работу. Для принятия этой версии вопреки письменному правилу нужно разрешение преподавателя.


## 12. Verification result / Результат проверки

54 browser checks passed at widths 375, 768 and 1440 px, with no page/console/resource errors. All seven pages were checked for overflow. Games and Rules were exercised with valid/invalid inputs, empty states, repeated actions, reset, keyboard checkbox operation and booking handoff. Internal phone screenshots were inspected; the original Rules table contrast was corrected through the existing Bootstrap table-dark class.

Пройдены 54 браузерные проверки на ширинах 375, 768 и 1440 px без ошибок страниц, консоли или загрузки ресурсов. Все семь страниц проверены на горизонтальное переполнение. Проверены правильный/неправильный ввод, пустые состояния, повторы, сброс, флажок с клавиатуры и переход к бронированию. Таблица правил исправлена для тёмной темы готовым классом Bootstrap.

Nine existing HTML/CSS files were byte-compared with the provided ZIP. The only HTML difference is the added deferred Rules script link; all CSS remains byte-identical. This compares the upload baseline, not an unavailable Git midterm tag.

Девять исходных HTML/CSS-файлов сравнены побайтно с предоставленным ZIP. Единственное отличие HTML — подключение Rules-скрипта; CSS полностью совпадает. Это проверка исходного архива, а не недоступного Git-тега midterm.


### Проверка читаемости — 16 октября 2026

Исправлены таблицы и списки заявок, светлые строки на тёмной теме, серые кнопки сброса, обычные ссылки и красные подписи. На телефоне сравнение тарифов теперь показывает стоимость, формат и назначение каждого тарифа целиком. Основные изменения находятся в js/main.js и js/prices.js.

Для просмотра распакуйте новый архив в отдельную папку и откройте index.html. Если используете уже открытый локальный сервер, обновите страницу Ctrl+F5.

Проверки текущего обновления: checks/visibility-update.json (60 проверок), checks/games-rules-update.json (54 проверки). Все проверки пройдены на 375/768/1440 px. Для таблиц, сохранённых заявок и сообщений калькулятора дополнительно измерена контрастность текста; для остальных видимых текстов выполнен поиск грубых проблем контраста. Это целевая проверка читаемости, а не полная сертификация доступности сайта. HTML и CSS не изменялись; контроль сравнения с предыдущим архивом — checks/visibility-freeze.json.
