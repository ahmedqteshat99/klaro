type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

interface SeoMetaParams {
  title: string;
  description: string;
  canonicalUrl?: string | null;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image";
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  jsonLd?: JsonLdValue;
}

const upsertMeta = (selector: string, create: () => HTMLMetaElement, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const upsertLink = (selector: string, create: () => HTMLLinkElement, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

export const applySeoMeta = (params: SeoMetaParams) => {
  const title = params.title.trim();
  const description = params.description.trim();

  document.title = title;

  upsertMeta('meta[name="description"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("name", "description");
    return m;
  }, description);

  upsertMeta('meta[name="robots"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("name", "robots");
    return m;
  }, params.robots ?? "index,follow");

  upsertMeta('meta[property="og:title"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:title");
    return m;
  }, params.ogTitle?.trim() || title);

  upsertMeta('meta[property="og:description"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:description");
    return m;
  }, params.ogDescription?.trim() || description);

  upsertMeta('meta[property="og:type"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:type");
    return m;
  }, params.ogType ?? "website");

  if (params.ogImage) {
    upsertMeta('meta[property="og:image"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:image");
      return m;
    }, params.ogImage);
  }

  upsertMeta('meta[name="twitter:card"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("name", "twitter:card");
    return m;
  }, params.twitterCard ?? "summary_large_image");

  upsertMeta('meta[name="twitter:title"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("name", "twitter:title");
    return m;
  }, params.twitterTitle?.trim() || title);

  upsertMeta('meta[name="twitter:description"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("name", "twitter:description");
    return m;
  }, params.twitterDescription?.trim() || description);

  if (params.twitterImage || params.ogImage) {
    upsertMeta('meta[name="twitter:image"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "twitter:image");
      return m;
    }, params.twitterImage || (params.ogImage as string));
  }

  if (params.canonicalUrl) {
    upsertLink('link[rel="canonical"]', () => {
      const link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      return link;
    }, params.canonicalUrl);

    upsertMeta('meta[property="og:url"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:url");
      return m;
    }, params.canonicalUrl);
  }

  const existingJsonLd = document.getElementById("seo-jsonld");
  if (params.jsonLd) {
    let script = existingJsonLd as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "seo-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(params.jsonLd);
  } else if (existingJsonLd) {
    existingJsonLd.remove();
  }
};

