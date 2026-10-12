# Проверки сайта

Актуальный отчёт: `oct12-review.json`; независимое описание: `oct12-review.md`. `browser-check.cjs` проверяет все семь страниц на 375, 768 и 1440 px, ресурсы, консоль, переполнение, frozen HTML/CSS, формы, фильтры, корзину, сохранение и отмену бронирований, пакеты и игровые обложки. Проверки не подключаются к сайту.

Для запуска нужен Git checkout с тегом midterm, Node.js и внешний пакет Playwright:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node checks/browser-check.cjs
```

`CHROME_PATH` задаёт браузер, `QA_OUTPUT` — папку результатов. На macOS по умолчанию используется Google Chrome. Результаты по умолчанию сохраняются в `checks/generated/`. Это зависимости инструмента проверки, сайт работает без JS-библиотек и сборки.

Контрольные суммы `baseline.sourceSha256` связывают отчёт с проверенными исходниками. `baseline.head` указывает HEAD перед итоговым коммитом. Старые `assignment-5.json`, `current.json`, `functional-review.md`, `design-review.md` и снимки Assignment 5 сохранены как история, а не как проверка новой версии.

Для четырёх дополнительных проверок HTTP запускайте сайт на `127.0.0.1:8765` и выполните `http-storage-check.cjs` с теми же переменными Playwright/Chrome. Отчёт: `oct12-http-storage.json`.
