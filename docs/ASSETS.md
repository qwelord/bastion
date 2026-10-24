# Графика и лицензии

## Шахматные фигуры

Используется оригинальный 2D-набор **Cburnett** из Lichess, автор **Colin M. L. Burnett**, лицензия **GPL v2 или более поздняя версия** согласно COPYING.md Lichess.

- Исходник: https://github.com/lichess-org/lila/tree/03f318ea75e5942d718c61cbb4d11d9317c9c1cd/public/piece/cburnett
- Все 12 SVG скопированы без изменений содержимого. Имена файлов приведены к нижнему регистру.
- Файлы поставки: `public/pieces/*.svg`.
- Точная ревизия, исходные имена и SHA-256: `public/pieces/SOURCE.json`.
- Лицензия набора: `public/pieces/COPYING.txt`, также `docs/licenses/cburnett-GPL-2.0.txt`.
- Таблица атрибуции исходного проекта: `docs/licenses/lichess-COPYING.md`.

Объёмные модели, PNG-рендеры и инструменты Three.js удалены. Доска состоит из обычных однотонных полей. Знак Bastion — собственная иконка башни. Проект не связан с Lichess организационно.

## Другие компоненты

| Компонент         | Назначение               | Лицензия     |
| ----------------- | ------------------------ | ------------ |
| React / React DOM | Интерфейс                | MIT          |
| Lucide            | Иконки интерфейса        | ISC          |
| Manrope           | Интерфейс и кириллица    | SIL OFL 1.1  |
| Literata          | Заголовки и кириллица    | SIL OFL 1.1  |
| chess.js          | Проверка учебных позиций | BSD-2-Clause |

Тексты лицензий находятся в `docs/licenses/`. Шрифты и фигуры размещены локально.

## Stockfish

Поставляется npm-пакет `stockfish@19.0.1`, автор порта Nathan Rugg и участники Stockfish.js/Chess.com; исходный движок — участники Stockfish. Лицензия GPLv3.

Скрипт `scripts/prepare-engine.mjs` копирует Lite/Full single-threaded JS/WASM и `Copying.txt` в `public/engine/`. Там же создаётся SOURCE.json с SHA-256 и ссылкой на соответствующие исходники точной ревизии `0d5dd7944f88c817c07a26bc4fb1905d5f9c46d6` (тег v19.0.1). Generated-файлы не коммитятся; они включаются в dist при сборке.

- Репозиторий: https://github.com/nmrugg/stockfish.js
- Соответствующие исходники: https://github.com/nmrugg/stockfish.js/archive/0d5dd7944f88c817c07a26bc4fb1905d5f9c46d6.tar.gz
- Оригинальный движок: https://github.com/official-stockfish/Stockfish

Сохранять лицензию и доступ к соответствующим исходникам при поставке web/mobile-версии.
