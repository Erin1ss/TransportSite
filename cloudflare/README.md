# Cloudflare production configuration

Production uses the following chain:

```text
Browser → Cloudflare → GitHub Pages
```

The canonical public URL is `https://edemleza.ru/`. The `www` host is not canonical.

## Current zone state

- `edemleza.ru` is delegated from REG.RU to `mario.ns.cloudflare.com` and `venus.ns.cloudflare.com`.
- The apex points to GitHub Pages. The `www` host keeps the GitHub Pages A/AAAA origin records and is proxied through Cloudflare.
- The conflicting `www A 195.128.128.21` record was removed from the `edemleza.ru` zone. The unrelated `ervietpasta.top` zone was not changed.
- No MX/TXT mail records were present in the imported `edemleza.ru` records; none were invented or added.
- SSL/TLS encryption mode is `Full (strict)`.
- No Worker Routes are configured for `edemleza.ru`; the site does not depend on a Worker.

DNS delegation and edge certificate issuance can take up to 24 hours after the nameserver change. Complete the production checks after propagation has finished.

## Active Redirect Rules

Cloudflare Single Redirects are configured as real `301` responses with query-string preservation:

1. all HTTP requests → the same HTTPS URL;
2. all `www` HTTPS requests → the equivalent apex HTTPS URL;
3. `/index.html` → `/`;
4. `/about` and `/about/` → `/about.html`;
5. `/prices` and `/prices/` → `/prices.html`;
6. `/faq` and `/faq/` → `/faq.html`;
7. `/contacts` and `/contacts/` → `/contacts.html`;
8. `/testimonials` and `/testimonials/` → `/testimonials.html`;
9. `/7-bolnica-kazan` and `/7-bolnica-kazan/` → `/7-bolnica-kazan.html`.

The rules target the canonical `https://edemleza.ru` host and are ordered so that HTTP/host normalization happens before path normalization. No redirect rule points back to an alternate host.

## Verification after DNS propagation

```powershell
nslookup -type=ns edemleza.ru
curl.exe -I http://edemleza.ru/
curl.exe -I http://www.edemleza.ru/
curl.exe -I https://www.edemleza.ru/
curl.exe -I 'https://edemleza.ru/about?utm_source=qa'
curl.exe -I https://edemleza.ru/index.html
```

Expected results are `301` for alternate schemes/hosts/paths, `Location` on `https://edemleza.ru`, preserved query strings, and `200` for the final canonical HTML pages.

GitHub Pages custom domains are documented in the [GitHub Pages custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages). Redirect rule behavior is documented in the [Cloudflare Redirect Rules documentation](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/).
