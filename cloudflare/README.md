# Markdown for Agents

GitHub Pages does not support `Accept: text/markdown` content negotiation at the origin. To pass the Markdown for Agents check, put `edemleza.ru` behind Cloudflare and use one of these options:

1. Enable Cloudflare Markdown for Agents for the zone.
2. Deploy `markdown-negotiation-worker.js` as a Worker route for `edemleza.ru/*`.

The Worker keeps normal browser requests unchanged and returns `/index.md` as `text/markdown` when the homepage is requested with `Accept: text/markdown`.

Expected validation:

```powershell
Invoke-WebRequest -Uri "https://edemleza.ru/" -Headers @{ Accept = "text/markdown" }
```

The response should include:

```http
Content-Type: text/markdown; charset=utf-8
Vary: Accept
x-markdown-tokens: <number>
```
