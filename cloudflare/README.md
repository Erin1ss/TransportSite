# Markdown for Agents

GitHub Pages does not support `Accept: text/markdown` content negotiation at the origin. To pass the Markdown for Agents check, put `edemleza.ru` behind Cloudflare and use one of these options:

1. Enable Cloudflare Markdown for Agents for the zone.
2. Deploy `markdown-negotiation-worker.js` as a Worker route for `edemleza.ru/*`.

The Worker keeps normal browser requests unchanged and returns the dedicated source file `cloudflare/homepage.md` as `text/markdown` when the homepage is requested with `Accept: text/markdown`. The source is separated from the homepage URL, so `/index.md` is not a second crawlable copy of the homepage. The Worker also serves `/.well-known/api-catalog` as `application/linkset+json` and OAuth/OIDC discovery metadata under `/.well-known/openid-configuration`, `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, and `/.well-known/jwks.json`.

For homepage requests, the Worker also adds an RFC 8288 `Link` response header advertising `/.well-known/api-catalog`, OpenAPI metadata, service documentation, status, and sitemap resources.

`api-catalog-worker.js` is a smaller standalone version if you only need the API catalog behavior. GitHub Pages publishes `/api-catalog.json`, but it does not reliably publish the extensionless `/.well-known/api-catalog` path and MIME type required by RFC 9727 checks.

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

## Optional redirect layer for GitHub Pages

GitHub Pages publishes the repository but does not execute `_redirects` or `_headers`. The repository therefore does not pretend to provide server-side redirects. If the owner places the zone behind Cloudflare, configure the DNS records and redirect rules in the Cloudflare dashboard:

1. Keep the apex records pointed to GitHub Pages (`A @` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; remove conflicting `A`/`AAAA`/`CNAME` records). Add `CNAME www` → `Erin1ss.github.io` if the DNS provider supports it. Proxy both hostnames through Cloudflare only after the edge certificate for `edemleza.ru` and `www.edemleza.ru` is active.
2. Add a 301 Single Redirect with source wildcard `http*://www.edemleza.ru/*`, target `https://edemleza.ru/${1}`, and “Preserve query string” enabled.
3. Add a 301 Single Redirect with source wildcard `http://edemleza.ru/*`, target `https://edemleza.ru/${1}`, and “Preserve query string” enabled.
4. Add exact-path 301 rules on `https://edemleza.ru` for `/index.html` → `/`, `/about` and `/about/` → `/about.html`, `/prices` and `/prices/` → `/prices.html`, `/faq` and `/faq/` → `/faq.html`, `/contacts` and `/contacts/` → `/contacts.html`, `/testimonials` and `/testimonials/` → `/testimonials.html`, and `/7-bolnica-kazan` and `/7-bolnica-kazan/` → `/7-bolnica-kazan.html`.

Check the rules with `curl.exe -I` before enabling cache. Cloudflare supports 301 redirects and query-string preservation; the GitHub Pages DNS values and automatic custom-domain redirects are documented in the [GitHub Pages custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages) and [Cloudflare Redirect Rules documentation](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/).
