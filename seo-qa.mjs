import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const origin = "https://edemleza.ru";
const productionMode = process.argv.includes("--production");
const ignoreHtml = new Set(["404.html", "googlea05210b6d511edb1.html", "yandex_584e103fd0756b6a.html"]);
const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith(".html") && !ignoreHtml.has(file));
const errors = [];
const warnings = [];
const passes = [];
const productionMatrix = [];

function addError(message) { errors.push(message); }
function addWarning(message) { warnings.push(message); }
function addPass(message) { passes.push(message); }
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
function firstMatch(source, pattern) { return source.match(pattern)?.[1]?.trim() ?? ""; }
function textFromHtml(source) {
  return source.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
function fileForUrl(urlString) {
  const url = new URL(urlString, origin);
  if (url.origin !== origin) return null;
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname.endsWith("/")) pathname += "index.html";
  return path.join(root, pathname.replace(/^\//, ""));
}
function parsePage(source) {
  return {
    title: firstMatch(source, /<title>([\s\S]*?)<\/title>/i),
    description: firstMatch(source, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i),
    canonical: firstMatch(source, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i),
    robots: firstMatch(source, /<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i).toLowerCase(),
    h1Count: (source.match(/<h1\b/gi) ?? []).length,
  };
}
function jsonLdBlocks(source) {
  return [...source.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
}

const pages = [];
const titles = new Map();
const descriptions = new Map();

for (const file of htmlFiles) {
  const source = read(file);
  const meta = parsePage(source);
  const canonicalFile = meta.canonical ? fileForUrl(meta.canonical) : null;
  const isIndexable = !meta.robots.includes("noindex") && file !== "privacy.html";

  if (!meta.title) addError(`${file}: отсутствует title`);
  if (!meta.description) addError(`${file}: отсутствует meta description`);
  if (!meta.canonical) addError(`${file}: отсутствует canonical`);
  if (isIndexable && meta.h1Count !== 1) addError(`${file}: H1 найдено ${meta.h1Count}, ожидался ровно один`);
  if (meta.canonical && !canonicalFile) addError(`${file}: canonical ведёт на внешний или некорректный URL ${meta.canonical}`);
  if (meta.title && (meta.title.length < 25 || meta.title.length > 70)) addWarning(`${file}: длина title ${meta.title.length}`);
  if (meta.description && (meta.description.length < 80 || meta.description.length > 180)) addWarning(`${file}: длина description ${meta.description.length}`);
  if (meta.title) titles.set(file, meta.title);
  if (meta.description) descriptions.set(file, meta.description);

  for (const block of jsonLdBlocks(source)) {
    try { JSON.parse(block); }
    catch (error) { addError(`${file}: JSON-LD не парсится (${error.message})`); }
  }
  if (jsonLdBlocks(source).length === 0 && isIndexable) addWarning(`${file}: нет JSON-LD`);

  for (const img of source.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = img[1];
    const src = firstMatch(attrs, /\bsrc=["']([^"']*)["']/i);
    if (src.includes("mc.yandex.ru/watch")) continue;
    if (!/\bwidth=["'][^"']+["']/i.test(attrs) || !/\bheight=["'][^"']+["']/i.test(attrs)) addError(`${file}: изображение без width/height: ${src}`);
    const imageFile = src ? fileForUrl(src) : null;
    if (imageFile && fs.existsSync(imageFile) && fs.statSync(imageFile).size > 400000) addWarning(`${file}: изображение больше 400 КБ: ${src}`);
  }
  if (/vizit1\.jpg/i.test(source) && !/vizit1-\d+\.webp/i.test(source)) addWarning(`${file}: hero использует только тяжёлый JPEG без WebP source`);
  if (/Рџ|Рќ|Рљ|Р•Р|вЂ|В«/.test(source)) addError(`${file}: найден возможный mojibake`);

  pages.push({ file, source, meta, isIndexable });
}

for (const [label, map] of [["title", titles], ["description", descriptions]]) {
  const grouped = new Map();
  for (const [file, value] of map) grouped.set(value, [...(grouped.get(value) ?? []), file]);
  for (const [value, files] of grouped) if (files.length > 1) addError(`дублирующийся ${label}: ${files.join(", ")} — ${value}`);
}

const sitemap = read("sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim());
if (!sitemapUrls.length) addError("sitemap.xml: нет URL");
if (!read("robots.txt").includes("Sitemap: https://edemleza.ru/sitemap.xml")) addError("robots.txt: отсутствует ссылка на sitemap");
for (const url of sitemapUrls) {
  const target = fileForUrl(url);
  if (!target || !fs.existsSync(target)) addError(`sitemap: URL не сопоставлен с локальным файлом: ${url}`);
  const page = pages.find((item) => target && path.resolve(target) === path.resolve(path.join(root, item.file)));
  if (page?.meta.robots.includes("noindex")) addError(`sitemap: noindex-страница включена в sitemap: ${url}`);
  if (page && page.meta.canonical !== url) addError(`sitemap ↔ canonical: ${url} не совпадает с ${page.meta.canonical || "отсутствующим canonical"}`);
}
if (fs.existsSync(path.join(root, "index.md"))) addError("index.md всё ещё присутствует как потенциальный дубль главной");
else addPass("markdown-дубль главной удалён");
if (fs.existsSync(path.join(root, "cloudflare", "markdown-negotiation-worker.js")) || fs.existsSync(path.join(root, "cloudflare", "api-catalog-worker.js"))) addError("неиспользуемые Cloudflare Worker-артефакты всё ещё присутствуют");
if (fs.existsSync(path.join(root, "_redirects"))) addWarning("_redirects присутствует, но GitHub Pages его не применяет");

for (const page of pages) {
  for (const match of page.source.matchAll(/\bhref=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (href.startsWith("#") || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    let url;
    try { url = new URL(href, page.meta.canonical || origin); }
    catch { addError(`${page.file}: некорректная ссылка ${href}`); continue; }
    if (url.origin !== origin) continue;
    const target = fileForUrl(url.href);
    if (target && !fs.existsSync(target)) addError(`${page.file}: битая внутренняя ссылка ${href}`);
  }
}

const criticalImage = path.join(root, "images", "webp", "vizit1-1098.webp");
if (fs.existsSync(criticalImage) && fs.statSync(criticalImage).size < 150000) addPass(`hero WebP оптимизирован: ${fs.statSync(criticalImage).size} байт`);
else addWarning("hero WebP не найден или превышает 150 КБ");

for (const page of pages.filter((item) => item.isIndexable)) {
  const visibleText = textFromHtml(page.source);
  if (visibleText.length < 900) addWarning(`${page.file}: мало видимого текста по статическому анализу (${visibleText.length} символов)`);
}

const productionCache = new Map();
async function productionGet(startUrl) {
  if (productionCache.has(startUrl)) return productionCache.get(startUrl);
  let current = startUrl;
  const chain = [];
  for (let step = 0; step < 10; step += 1) {
    let response;
    try {
      response = await fetch(current, { redirect: "manual", headers: { "user-agent": "TransportSite-production-qa/2026" } });
    } catch (error) {
      const result = { startUrl, finalUrl: current, chain, error: error.message };
      productionCache.set(startUrl, result);
      return result;
    }
    const location = response.headers.get("location");
    chain.push({ url: current, status: response.status, location });
    if (!location || response.status < 300 || response.status >= 400) {
      const result = { startUrl, finalUrl: current, status: response.status, headers: Object.fromEntries(response.headers.entries()), body: await response.text(), chain };
      productionCache.set(startUrl, result);
      return result;
    }
    current = new URL(location, current).href;
  }
  const result = { startUrl, finalUrl: current, chain, error: "redirect limit exceeded" };
  productionCache.set(startUrl, result);
  return result;
}
function matrixLine(item) {
  return `${item.label} | ${item.status ?? "ERR"} | ${item.finalUrl || "—"} | ${item.canonical || "—"}`;
}

async function runProductionQa() {
  const criticalPages = [
    ["homepage", "/", "https://edemleza.ru/"],
    ["gkb", "/7-bolnica-kazan.html", "https://edemleza.ru/7-bolnica-kazan.html"],
    ["about", "/about.html", "https://edemleza.ru/about.html"],
    ["contacts", "/contacts.html", "https://edemleza.ru/contacts.html"],
    ["hospital-home", "/iz-bolnicy-domoy.html", "https://edemleza.ru/iz-bolnicy-domoy.html"],
    ["prices", "/prices.html", "https://edemleza.ru/prices.html"],
  ];
  for (const [label, pathname, expectedCanonical] of criticalPages) {
    const result = await productionGet(`${origin}${pathname}`);
    if (result.error) { addError(`production ${label}: ${result.error}`); continue; }
    if (result.status !== 200) addError(`production ${label}: HTTP ${result.status}, ожидался 200`);
    if (!/text\/html/i.test(result.headers["content-type"] ?? "")) addError(`production ${label}: неверный Content-Type ${result.headers["content-type"] ?? ""}`);
    const meta = parsePage(result.body);
    if (!meta.title) addError(`production ${label}: отсутствует title`);
    if (!meta.description) addError(`production ${label}: отсутствует description`);
    if (meta.h1Count !== 1) addError(`production ${label}: H1 найдено ${meta.h1Count}`);
    if (meta.canonical !== expectedCanonical) addError(`production ${label}: canonical ${meta.canonical || "—"}, ожидался ${expectedCanonical}`);
    for (const block of jsonLdBlocks(result.body)) {
      try { JSON.parse(block); }
      catch (error) { addError(`production ${label}: JSON-LD не парсится (${error.message})`); }
    }
  }

  const matrixSpecs = [
    ["http root", "http://edemleza.ru/", "https://edemleza.ru/", "https://edemleza.ru/", 200, true],
    ["https root", "https://edemleza.ru/", "https://edemleza.ru/", "https://edemleza.ru/", 200],
    ["http www", "http://www.edemleza.ru/", "https://edemleza.ru/", "https://edemleza.ru/", 200, true],
    ["https www", "https://www.edemleza.ru/", "https://edemleza.ru/", "https://edemleza.ru/", 200, true],
    ["index.html", "https://edemleza.ru/index.html", "https://edemleza.ru/", "https://edemleza.ru/", 200, true],
    ["about clean", "https://edemleza.ru/about", "https://edemleza.ru/about.html", "https://edemleza.ru/about.html", 200, true],
    ["about slash", "https://edemleza.ru/about/", "https://edemleza.ru/about.html", "https://edemleza.ru/about.html", 200, true],
    ["about.html", "https://edemleza.ru/about.html", "https://edemleza.ru/about.html", "https://edemleza.ru/about.html", 200],
    ["prices clean", "https://edemleza.ru/prices", "https://edemleza.ru/prices.html", "https://edemleza.ru/prices.html", 200, true],
    ["prices.html", "https://edemleza.ru/prices.html", "https://edemleza.ru/prices.html", "https://edemleza.ru/prices.html", 200],
    ["gkb", "https://edemleza.ru/7-bolnica-kazan.html", "https://edemleza.ru/7-bolnica-kazan.html", "https://edemleza.ru/7-bolnica-kazan.html", 200],
    ["utm root", "https://edemleza.ru/?utm_source=qa", "https://edemleza.ru/?utm_source=qa", "https://edemleza.ru/", 200],
    ["fake 404", "https://edemleza.ru/nonexistent-seo-check-2026", "https://edemleza.ru/nonexistent-seo-check-2026", "", 404],
  ];
  for (const [label, url, expectedFinal, expectedCanonical, expectedStatus, expectedRedirect = false] of matrixSpecs) {
    const result = await productionGet(url);
    const item = { label, status: result.status, finalUrl: result.finalUrl, canonical: "" };
    productionMatrix.push(item);
    if (result.error) {
      if (url.startsWith("https://www.")) addWarning(`production ${label}: TLS/hostname недоступен из Node (${result.error}); нужен внешний DNS/TLS-слой`);
      else addError(`production ${label}: ${result.error}`);
      continue;
    }
    const meta = parsePage(result.body);
    item.canonical = meta.canonical;
    if (result.status !== expectedStatus) addError(`production ${label}: HTTP ${result.status}, ожидался ${expectedStatus}`);
    if (result.finalUrl !== expectedFinal) addError(`production ${label}: final URL ${result.finalUrl}, ожидался ${expectedFinal}`);
    if (expectedCanonical && meta.canonical !== expectedCanonical) addError(`production ${label}: canonical ${meta.canonical || "—"}, ожидался ${expectedCanonical}`);
    if (expectedRedirect && !result.chain.some((step) => step.status === 301)) addError(`production ${label}: не найден ожидаемый HTTP 301`);
    if (result.status === 200 && expectedCanonical && result.finalUrl === url && result.finalUrl !== expectedCanonical && !url.includes("?")) addWarning(`production ${label}: альтернативный URL отвечает 200 без серверного redirect`);
  }

  const robots = await productionGet(`${origin}/robots.txt`);
  if (robots.error || robots.status !== 200) addError(`production robots.txt: ${robots.error || `HTTP ${robots.status}`}`);
  else {
    if (!/Sitemap:\s*https:\/\/edemleza\.ru\/sitemap\.xml/i.test(robots.body)) addError("production robots.txt: неверная ссылка на sitemap");
    if (/^Disallow:\s*\/\s*$/im.test(robots.body)) addError("production robots.txt: закрыт весь сайт");
    else addPass("production robots.txt доступен и не блокирует весь сайт");
  }

  const productionSitemap = await productionGet(`${origin}/sitemap.xml`);
  if (productionSitemap.error || productionSitemap.status !== 200) addError(`production sitemap.xml: ${productionSitemap.error || `HTTP ${productionSitemap.status}`}`);
  else {
    const urls = [...productionSitemap.body.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim());
    if (!urls.length) addError("production sitemap.xml: нет URL");
    for (const url of urls) {
      const result = await productionGet(url);
      if (result.error || result.status !== 200) addError(`production sitemap URL ${url}: ${result.error || `HTTP ${result.status}`}`);
      else if (parsePage(result.body).canonical !== url) addError(`production sitemap ↔ canonical: ${url}`);
    }
    addPass(`production sitemap проверен: ${urls.length} URL`);
  }

  const rootPage = await productionGet(`${origin}/`);
  if (!rootPage.error && !/vizit1-760\.webp/.test(rootPage.body)) addError("production homepage: мобильный hero WebP не указан в HTML");
  for (const asset of ["/images/webp/vizit1-760.webp", "/images/webp/vizit1-1098.webp"]) {
    const result = await productionGet(`${origin}${asset}`);
    const size = Number(result.headers?.["content-length"] ?? 0);
    if (result.error || result.status !== 200) addError(`production asset ${asset}: ${result.error || `HTTP ${result.status}`}`);
    else if (!/image\/webp/i.test(result.headers["content-type"] ?? "")) addError(`production asset ${asset}: неверный Content-Type`);
    else if (size > 150000) addWarning(`production asset ${asset}: ${size} байт`);
    else addPass(`production asset доступен: ${asset}`);
  }
}

if (productionMode) await runProductionQa();

console.log(`SEO QA${productionMode ? " (production)" : ""}: ${pages.length} HTML-файлов, ${sitemapUrls.length} sitemap URL`);
for (const item of passes) console.log(`PASS  ${item}`);
for (const item of warnings) console.log(`WARN  ${item}`);
for (const item of errors) console.log(`FAIL  ${item}`);
if (productionMode) {
  console.log("Production HTTP matrix:");
  for (const item of productionMatrix) console.log(`  ${matrixLine(item)}`);
}
console.log(`Итог: PASS=${passes.length} WARN=${warnings.length} FAIL=${errors.length}`);
process.exitCode = errors.length ? 1 : 0;
