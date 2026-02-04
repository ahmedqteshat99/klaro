import DOMPurify from "dompurify";

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "ul",
    "ol",
    "li",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "div",
    "span",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "a",
  ],
  ALLOWED_ATTR: ["class", "style", "href"],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
  FORBID_ATTR: ["onclick", "onerror", "onload", "onmouseover"],
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
} as const;

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
};
