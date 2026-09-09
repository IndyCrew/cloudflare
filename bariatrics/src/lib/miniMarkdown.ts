/**
 * Minimal, escape-first markdown -> HTML for short assistant replies.
 * Handles: paragraphs, line breaks, `code`, **bold**, *italic*, [links](url),
 * and `-` / `*` bullet lists (including lists that follow a lead-in line).
 * Not a full markdown implementation.
 */
export function renderMarkdown(md: string): string {
  const esc = (md || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*\s])\*([^*\n]+)\*(?!\S)/g, "$1<em>$2</em>")
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      );

  const isBullet = (l: string) => /^\s*[-*]\s+/.test(l);
  const lines = esc.split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(" ")).trim()}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list.length) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const line of lines) {
    if (isBullet(line)) {
      flushPara();
      list.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return out.join("");
}
