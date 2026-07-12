"use client";

interface SanitizedHtmlProps {
  html: string;
  className?: string;
}

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "ul", "ol", "li",
  "strong", "em", "b", "i", "u",
  "a", "span", "div", "section",
  "pre", "code", "blockquote",
];

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  span: ["class"],
  div: ["class"],
  code: ["class"],
};

function sanitize(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;

  const clean = (node: Element) => {
    const children = [...node.children];
    for (const child of children) {
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.includes(tag)) {
        child.replaceWith(...child.childNodes);
        continue;
      }
      const attrs = [...child.attributes];
      for (const attr of attrs) {
        const allowed = ALLOWED_ATTRS[tag];
        if (!allowed || !allowed.includes(attr.name)) {
          child.removeAttribute(attr.name);
        }
      }
      clean(child);
    }
  };

  clean(div);
  return div.innerHTML;
}

export function SanitizedHtml({ html, className }: SanitizedHtmlProps) {
  const sanitized = typeof window !== "undefined" ? sanitize(html) : html;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
