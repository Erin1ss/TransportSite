const MARKDOWN_SOURCE =
  "https://raw.githubusercontent.com/Erin1ss/TransportSite/master/index.md";

function acceptsMarkdown(request) {
  const accept = request.headers.get("accept") || "";
  return accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .some((part) => part === "text/markdown" || part.startsWith("text/markdown;"));
}

function markdownTokenEstimate(markdown) {
  return Math.max(1, Math.ceil(markdown.trim().split(/\s+/).filter(Boolean).length * 1.35));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const isHomepage = url.pathname === "/" || url.pathname === "/index.html";

    if (isHomepage && acceptsMarkdown(request)) {
      const sourceResponse = await fetch(MARKDOWN_SOURCE, {
        headers: { accept: "text/plain, text/markdown" },
      });

      if (!sourceResponse.ok) {
        return new Response("Markdown source is unavailable.", {
          status: 502,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            vary: "accept",
          },
        });
      }

      const markdown = await sourceResponse.text();
      return new Response(markdown, {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "x-markdown-tokens": String(markdownTokenEstimate(markdown)),
          "cache-control": "public, max-age=600",
          vary: "accept",
        },
      });
    }

    const response = await fetch(request);
    const headers = new Headers(response.headers);
    headers.append("vary", "Accept");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
