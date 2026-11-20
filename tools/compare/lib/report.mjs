// report.html + console table.
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))

function selectorTable(row) {
  if (!row.selectors.length) return ""
  const body = row.selectors
    .map((s) => {
      const bad = s.status !== "ok"
      const head = `<tr class="${bad ? "bad" : "ok"}"><th colspan="4">${esc(s.name)} <span class="tag ${esc(s.status)}">${esc(s.status)}</span> <code>${esc(s.refSel || "-")}</code> | <code>${esc(s.themeSel || "-")}</code></th></tr>`
      const rows = (s.props || [])
        .filter((p) => !p.equal)
        .map((p) => `<tr class="bad"><td></td><td>${esc(p.prop)}</td><td>${esc(p.ref)}</td><td>${esc(p.theme)}</td></tr>`)
        .join("")
      return head + rows
    })
    .join("")
  return `<details${row.selectors.some((s) => s.status !== "ok") ? " open" : ""}><summary>Key selectors (${row.selectors.filter((s) => s.status !== "ok").length} issues / ${row.selectors.length})</summary><table class="sel"><tr><th></th><th>property</th><th>ref</th><th>theme</th></tr>${body}</table></details>`
}

export function renderReport(rows, meta) {
  const trs = rows
    .map((r) => {
      const dir = `${r.page}/${r.viewport}`
      const thumb = (f, label) => (r.files.includes(f) ? `<a href="${dir}/${f}"><img loading="lazy" src="${dir}/${f}" alt="${label}"><span>${label}</span></a>` : "")
      const diff = r.diff
        ? `<b class="${r.diff.percent > 5 ? "hi" : r.diff.percent > 1 ? "mid" : "lo"}">${r.diff.percent.toFixed(2)}%</b><br><small>${esc(r.diff.sizeRef)} vs ${esc(r.diff.sizeTheme)}</small>`
        : `<i>${esc(r.note || "n/a")}</i>`
      const secs = r.sections?.length
        ? `<details open><summary>Sections (worst first)</summary><table class="sel"><tr><th>section</th><th>diff</th><th>images</th></tr>${r.sections
            .map((x) => {
              const f = (n, l) => (x.files.some((y) => y.endsWith(n)) ? `<a href="${dir}/${x.files.find((y) => y.endsWith(n))}">${l}</a>` : "")
              const pct = x.diff ? `<b class="${x.diff.percent > 5 ? "hi" : x.diff.percent > 1 ? "mid" : "lo"}">${x.diff.percent.toFixed(2)}%</b> <small>${esc(x.diff.sizeRef)} vs ${esc(x.diff.sizeTheme)}</small>` : `<i>${esc(x.note || "n/a")}</i>`
              return `<tr class="${x.diff && x.diff.percent <= 1 ? "ok" : "bad"}"><td>${esc(x.name)}</td><td>${pct}</td><td>${f("--side-by-side.png", "side-by-side")} ${f("--diff.png", "diff")} ${f("--ref.png", "ref")} ${f("--theme.png", "theme")}</td></tr>`
            })
            .join("")}</table></details>`
        : ""
      const errs = r.errors.length ? `<ul class="err">${r.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""
      return `<tr><td class="name"><b>${esc(r.page)}</b><br>${esc(r.viewport)}<br><small>ref ${esc(r.refPath ?? "none")} (${esc(r.refStatus ?? "-")})<br>theme ${esc(r.themePath ?? "none")} (${esc(r.themeStatus ?? "-")})</small></td>
<td class="thumbs">${thumb("side-by-side.png", "full side-by-side (informational)")}${thumb("diff.png", "full diff (informational)")}${thumb("ref-viewport.png", "ref")}${thumb("theme-viewport.png", "theme")}<br><small><a href="${dir}/ref-full.png">ref full</a> · <a href="${dir}/theme-full.png">theme full</a> · <a href="${dir}/styles.json">styles.json</a></small></td>
<td class="diff">${diff}</td><td>${secs}${selectorTable(r)}${errs}</td></tr>`
    })
    .join("\n")
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Khuwabb compare report</title>
<style>
body{font:14px/1.4 system-ui,sans-serif;margin:16px;background:#fafafa;color:#111}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px;vertical-align:top;text-align:left}
.thumbs img{max-width:220px;max-height:200px;display:block;border:1px solid #ccc;background:#fff}
.thumbs a{display:inline-block;margin:0 8px 8px 0;font-size:11px;text-decoration:none;color:#333}
.name{white-space:nowrap}.diff{white-space:nowrap}.hi{color:#c00}.mid{color:#c70}.lo{color:#080}
.sel{font-size:12px;margin-top:6px}.sel tr.bad td,.sel tr.bad th{background:#fff0f0}.sel tr.ok th{background:#f0fff0}
.tag{font-size:11px;padding:1px 5px;border-radius:3px;background:#ddd}.tag.mismatch,.tag.missing-ref,.tag.missing-theme,.tag.missing-both{background:#f99}.tag.ok{background:#9d9}
.err{color:#c00;margin:4px 0}code{font-size:11px}
</style></head><body>
<h1>Khuwabb compare report</h1>
<p>Section diffs are the meaningful numbers: full-page shots keep the reference's whileInView reveals hidden below the fold.</p>
<p>ref: ${esc(meta.refUrl)} | theme: ${esc(meta.themeUrl)} | generated ${esc(meta.when)} | style tolerance ${esc(meta.tolerance)}px</p>
<table><tr><th>page / viewport</th><th>images</th><th>full-page diff (informational)</th><th>sections / details</th></tr>
${trs}
</table></body></html>`
}

export function consoleTable(rows) {
  const out = rows.map((r) => ({
    page: r.page,
    viewport: r.viewport,
    "worst section": r.sections?.[0]?.diff ? `${r.sections[0].name} ${r.sections[0].diff.percent.toFixed(2)}%` : "-",
    "full diff (info)": r.diff ? `${r.diff.percent.toFixed(2)}%` : r.note || "n/a",
    "style issues": r.selectors.filter((s) => s.status !== "ok").length,
    errors: r.errors.length,
  }))
  console.table(out)
  const secRows = rows.flatMap((r) => (r.sections || []).map((x) => ({ page: r.page, viewport: r.viewport, section: x.name, diff: x.diff ? `${x.diff.percent.toFixed(2)}%` : x.note || "n/a" })))
  if (secRows.length) console.table(secRows)
}
