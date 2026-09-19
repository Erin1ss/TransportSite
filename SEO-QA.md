# SEO QA

Локальная проверка запускается без зависимостей:

```text
node seo-qa.mjs
```

Проверка опубликованного сайта запускается отдельно:

```text
node seo-qa.mjs --production
```

Скрипт проверяет:

- наличие title, description, canonical и одного H1 на indexable-страницах;
- дубли title и description;
- парсинг всех JSON-LD-блоков;
- соответствие sitemap локальным HTML-файлам и canonical;
- включение noindex-страниц в sitemap;
- битые внутренние ссылки;
- изображения без width/height;
- крупные изображения и наличие оптимизированного hero WebP;
- robots.txt и ссылку на sitemap;
- признаки mojibake в HTML.

В режиме `--production` дополнительно проверяются реальные HTTP-статусы, цепочки redirect, canonical, title, H1, JSON-LD, sitemap, robots.txt, hero WebP и основные страницы на `https://edemleza.ru/`. Невозможность проверить `https://www.edemleza.ru/` из-за внешней ошибки TLS отмечается как инфраструктурное предупреждение.

Скрипт не заменяет Google Search Console, Яндекс Вебмастер, Rich Results Test или полевые Core Web Vitals. После публикации нужно дополнительно проверить реальные HTTP-статусы, выбранные canonical, индексацию и данные пользователей.
