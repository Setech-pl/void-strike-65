// A local HTML preview of a docs page, styled like GitHub's markdown view, so
// the Enemies and Bosses pages can be reviewed without GitHub
// (docs/plans/enemies-bosses-pages.md). It understands only what those pages
// use: headings, paragraphs, nested bullet lists, tables, block quotes, rules,
// **bold**, *italic*, `code`, links and inline <img> HTML. Relative image and
// link paths are resolved against the page's directory.
//
//   node scripts/pages/preview-html.mjs docs/enemies.md [--out=build/pages/html]

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(text, base) {
  const html = [];
  const parts = text.split(/(<img [^>]*>)/);
  for (const part of parts) {
    if (part.startsWith("<img ")) {
      html.push(part.replace(/src="([^"]+)"/, (_, src) => `src="${resolve(src, base)}"`));
      continue;
    }
    html.push(escape(part)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${resolve(href, base)}">${label}</a>`));
  }
  return html.join("");
}

function resolve(href, base) {
  if (/^[a-z]+:/.test(href) || href.startsWith("#")) return href;
  const [file, anchor] = href.split("#");
  const target = path.resolve(base, file);
  const url = target.endsWith(".md")
    ? pathToFileURL(path.join(path.resolve("build/pages/html"), path.basename(target, ".md") + ".html")).href
    : pathToFileURL(target).href;
  return anchor ? `${url}#${anchor}` : url;
}

const slug = (text) => text.replace(/<[^>]+>/g, "").trim().toLowerCase()
  .replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-");

export function renderMarkdown(markdown, base) {
  const lines = markdown.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    const heading = line.match(/^(#{1,6}) (.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level} id="${slug(heading[2])}">${inline(heading[2], base)}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^---+$/.test(line.trim())) { out.push("<hr>"); i += 1; continue; }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (row) => row.replace(/^\||\|$/g, "").split(" | ").map((c) => c.trim());
      const align = cells(rows[1]).map((c) => (c.endsWith(":") ? "right" : "left"));
      out.push("<table><thead><tr>" + cells(rows[0]).map((c, k) => `<th style="text-align:${align[k]}">${inline(c, base)}</th>`).join("") + "</tr></thead><tbody>");
      for (const row of rows.slice(2)) out.push("<tr>" + cells(row).map((c, k) => `<td style="text-align:${align[k]}">${inline(c, base)}</td>`).join("") + "</tr>");
      out.push("</tbody></table>");
      continue;
    }
    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^> ?/, ""));
      out.push(`<blockquote><p>${inline(quote.join(" "), base)}</p></blockquote>`);
      continue;
    }
    if (/^\s*- /.test(line)) {
      // Nested bullets by indentation; a continuation line joins its item.
      const items = [];
      while (i < lines.length && lines[i].trim() && (/^\s*- /.test(lines[i]) || /^\s+\S/.test(lines[i]))) {
        const m = lines[i].match(/^(\s*)- (.*)$/);
        if (m) items.push({ depth: m[1].length / 2, text: m[2] });
        else items[items.length - 1].text += " " + lines[i].trim();
        i += 1;
      }
      let depth = -1;
      for (const item of items) {
        while (depth < item.depth) { out.push("<ul>"); depth += 1; }
        while (depth > item.depth) { out.push("</ul>"); depth -= 1; }
        out.push(`<li>${inline(item.text, base)}</li>`);
      }
      while (depth >= 0) { out.push("</ul>"); depth -= 1; }
      continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||>|\s*- |---)/.test(lines[i])) paragraph.push(lines[i++].trim());
    out.push(`<p>${inline(paragraph.join(" "), base)}</p>`);
  }
  return out.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "build/pages/html";
  fs.mkdirSync(out, { recursive: true });
  for (const page of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
    const body = renderMarkdown(fs.readFileSync(page, "utf8"), path.dirname(path.resolve(page)));
    const title = path.basename(page, ".md");
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>${title} (preview)</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{margin:0;background:#fff;color:#1f2328;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif}
main{box-sizing:border-box;max-width:1012px;margin:32px auto;padding:32px;border:1px solid #d1d9e0;border-radius:6px}
h1,h2{border-bottom:1px solid #d1d9e0;padding-bottom:.3em}h1{font-size:2em}h2{font-size:1.5em;margin-top:24px}h3{font-size:1.25em;margin-top:24px}
img{max-width:100%;vertical-align:middle;image-rendering:auto}table{border-collapse:collapse;display:block;overflow:auto;margin:16px 0}
th,td{border:1px solid #d1d9e0;padding:6px 13px}tr:nth-child(2n){background:#f6f8fa}code{background:#818b981f;border-radius:6px;padding:.2em .4em;font-size:85%}
blockquote{margin:0;padding:0 1em;color:#59636e;border-left:.25em solid #d1d9e0}hr{height:.25em;border:0;background:#d1d9e0;margin:24px 0}a{color:#0969da}
</style><main>${body}</main></html>\n`;
    const file = path.join(out, `${title}.html`);
    fs.writeFileSync(file, html);
    console.log(path.resolve(file));
  }
}
