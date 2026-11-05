import sanitizeHtml from "sanitize-html";

/** Article HTML allowed after the rich-text editor (DEC-047). Images only from our own upload route. */
export function sanitizeArticle(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "img", "code", "pre", "hr"],
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: [] },
    allowProtocolRelative: false,
    exclusiveFilter: (frame) => frame.tag === "img" && !String(frame.attribs.src ?? "").startsWith("/api/files/"),
    transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
  });
}

export function htmlToText(html: string) {
  return sanitizeHtml(html.replace(/<\/(p|h2|h3|li|blockquote)>/g, "\n"), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
