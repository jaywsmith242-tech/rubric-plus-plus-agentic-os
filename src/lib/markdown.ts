/** Tiny markdown renderer → sanitized HTML string.
 *  Supports: h1–h4, bold/italic/inline code, links, ul/ol, ☐/☑ checkboxes,
 *  blockquote, fenced code, tables, hr. Content is local and trusted; we
 *  still escape raw HTML before applying transforms. */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => {
    const href = String(u).startsWith("http") ? String(u) : `#/${String(u).replace(/^#/, "")}`;
    const ext = String(u).startsWith("http") ? ` target="_blank" rel="noreferrer"` : "";
    return `<a href="${href}"${ext}>${t}</a>`;
  });
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const html: string[] = [];
  let i = 0;
  let listStack: string[] = [];

  const closeLists = () => {
    while (listStack.length) html.push(`</${listStack.pop()}>`);
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (/^```/.test(line)) {
      closeLists();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      html.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // table block
    if (/^\|.*\|$/.test(line.trim()) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      closeLists();
      const header = line.trim().slice(1, -1).split("|").map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
        rows.push(lines[i].trim().slice(1, -1).split("|").map((c) => c.trim()));
        i++;
      }
      html.push(
        `<table><thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>` +
          rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") +
          `</tbody></table>`
      );
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeLists();
      const lvl = h[1].length;
      html.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line.trim())) {
      closeLists();
      html.push("<hr/>");
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      closeLists();
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote>${buf.map(inline).join("<br/>")}</blockquote>`);
      continue;
    }

    const cb = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/);
    if (cb) {
      if (listStack[listStack.length - 1] !== "ul") { closeLists(); html.push("<ul>"); listStack.push("ul"); }
      const checked = cb[1].toLowerCase() === "x";
      html.push(
        `<li><span class="tnum" style="color:rgb(var(--${checked ? "ok" : "text-lo"}))">${checked ? "☑" : "☐"}</span> ${inline(cb[2])}</li>`
      );
      i++;
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (listStack[listStack.length - 1] !== "ul") { closeLists(); html.push("<ul>"); listStack.push("ul"); }
      html.push(`<li>${inline(ul[1])}</li>`);
      i++;
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (listStack[listStack.length - 1] !== "ol") { closeLists(); html.push("<ol>"); listStack.push("ol"); }
      html.push(`<li>${inline(ol[1])}</li>`);
      i++;
      continue;
    }

    closeLists();
    if (line.trim() === "") { i++; continue; }
    html.push(`<p>${inline(line)}</p>`);
    i++;
  }
  closeLists();
  return html.join("\n");
}
