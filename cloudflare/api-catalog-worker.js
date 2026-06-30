const API_CATALOG_SOURCE =
  "https://raw.githubusercontent.com/Erin1ss/TransportSite/master/api-catalog.json";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/.well-known/api-catalog") {
      const sourceResponse = await fetch(API_CATALOG_SOURCE, {
        headers: { accept: "application/json, application/linkset+json" },
      });

      if (!sourceResponse.ok) {
        return new Response("API catalog source is unavailable.", {
          status: 502,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      return new Response(await sourceResponse.text(), {
        status: 200,
        headers: {
          "content-type": "application/linkset+json; charset=utf-8",
          "cache-control": "public, max-age=600",
          link: '</.well-known/api-catalog>; rel="self"; type="application/linkset+json", </openapi.json>; rel="service-desc"; type="application/openapi+json", </contacts.html>; rel="service-doc"; type="text/html", </status.json>; rel="status"; type="application/json"',
        },
      });
    }

    return fetch(request);
  },
};
