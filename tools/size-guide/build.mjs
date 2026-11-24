// Builds the Shopify theme's size-guide markup and stylesheet from the same data the Next.js
// storefront renders (data/size-guide.json, copied from `main`).
//
//   node tools/size-guide/build.mjs
//
// Writes:
//   theme/snippets/size-guide-body.liquid   "How we measure" + every chart (generated, do not hand-edit)
//
// To change a measurement, edit data/size-guide.json (here AND on main) and rerun this script.
// The diagrams live in theme/assets/size-guide-*.webp.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))
const data = JSON.parse(readFileSync(`${root}data/size-guide.json`, "utf8"))

// The headless site's product slugs differ from the Shopify handles for two pieces
// (see REDIRECTS in tools/store-setup/lib/data.mjs).
const HANDLE = {
  "boat-neck-long-sleeve-maxi-dress": "womens-boat-neck-long-sleeve-maxi-dress",
  "ladies-vinyl-jacket": "womens-high-shine-vinyl-puffer-jacket",
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const asset = (name) => `{{ 'size-guide-${name}' | asset_url }}`
const imgName = (path) => path.split("/").pop()

function chart(part, unit, caption) {
  const rows = part[unit]
  const head = part.sizes.map((s) => `<th scope="col" class="size-guide__size"><span>${esc(s.label)}</span>${s.alt ? `<small>${esc(s.alt)}</small>` : ""}</th>`).join("")
  const body = rows
    .map((r) => `<tr><th scope="row" class="size-guide__row-head"><span class="size-guide__letter" aria-hidden="true">${r.k}</span>${esc(r.label)}</th>${r.v.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`)
    .join("\n            ")
  return `      <div class="size-guide__scroll size-guide__${unit}-chart" role="region" aria-label="${esc(caption)}" tabindex="0">
        <table class="size-guide__table">
          <caption class="size-guide__sr-only">${esc(caption)}</caption>
          <thead><tr><th scope="col" class="size-guide__measure">Measurement</th>${head}</tr></thead>
          <tbody>
            ${body}
          </tbody>
        </table>
      </div>`
}

function card(a) {
  const words = a.title.split(" ").map((w) => `<span class="size-guide__nw">${esc(w)}</span>`).join(" ")
  const handle = a.product ? HANDLE[a.product] || a.product : null
  const link = handle
    ? `\n      {%- assign sg_product = all_products['${handle}'] -%}\n      {%- if sg_product != blank -%}<a class="size-guide__piece-link" href="{{ sg_product.url }}">View this piece</a>{%- endif -%}`
    : ""
  const parts = a.parts
    .map((p) => {
      const what = p.name ? `${a.title}, ${p.name.toLowerCase()}` : a.title
      return `    <div class="size-guide__part">
      <img class="size-guide__diagram" src="${asset(imgName(p.image))}" width="${p.w}" height="${p.h}" alt="${esc(`Diagram of the ${what.toLowerCase()} measurements, marked A to E`)}" loading="lazy" decoding="async">
      <div class="size-guide__charts">${p.name ? `\n      <h4 class="size-guide__part-name">${esc(p.name)}</h4>` : ""}
${chart(p, "cm", `${what}: measurements in centimetres`)}
${chart(p, "in", `${what}: measurements in inches`)}
      </div>
    </div>`
    })
    .join("\n")
  return `  <article class="size-guide__card" id="sg-${a.id}">
    <header class="size-guide__card-head">
      <div>
        <p class="size-guide__tag">${esc(a.tag)}</p>
        <h3 class="size-guide__card-title">${words}</h3>${link}
      </div>
      <p class="size-guide__sizes-badge"><span>Sizes</span>${esc(a.sizes)}</p>
    </header>
${parts}
  </article>`
}

const how = `<section class="size-guide__how" id="how-to-measure" aria-labelledby="how-to-measure-title">
  <h2 class="size-guide__group-title" id="how-to-measure-title">How we measure</h2>
  <div class="size-guide__how-grid">
${data.howToMeasure
  .map(
    (m) => `    <div class="size-guide__how-card">
      <h3 class="size-guide__how-title">${esc(m.title)}</h3>
      <img class="size-guide__how-image" src="${asset(imgName(m.image))}" width="${m.w}" height="${m.h}" alt="${esc(m.alt)}" loading="lazy" decoding="async">
      <ol class="size-guide__legend">
${m.items.map(([k, term, text]) => `        <li><span class="size-guide__letter" aria-hidden="true">${k}</span><span><strong>${esc(term)}:</strong> ${esc(text)}</span></li>`).join("\n")}
      </ol>
    </div>`,
  )
  .join("\n")}
  </div>
  <div class="size-guide__notes">
    <div class="size-guide__note size-guide__numeric">
      <h3 class="size-guide__note-title">Numeric sizes</h3>
      <dl class="size-guide__size-map">
${data.numericSizes.map(([n, l]) => `        <div><dt>${esc(n)}</dt><dd>${esc(l)}</dd></div>`).join("\n")}
      </dl>
    </div>
    <div class="size-guide__note size-guide__know">
      <h3 class="size-guide__note-title">Good to know</h3>
      <p>${esc(data.goodToKnow)}</p>
    </div>
  </div>
</section>`

const groups = data.groups
  .map(
    (g) => `<section class="size-guide__group" id="${g.id}" aria-labelledby="${g.id}-title">
  <h2 class="size-guide__group-title" id="${g.id}-title">${esc(g.title)}</h2>
  <div class="size-guide__cards">
${g.articles.map(card).join("\n")}
  </div>
</section>`,
  )
  .join("\n\n")

const out = `{%- comment -%}
  GENERATED by tools/size-guide/build.mjs from data/size-guide.json. Do not edit by hand:
  change the data and rerun \`node tools/size-guide/build.mjs\`.
  Rendered by sections/main-size-guide.liquid. Mirrors components/size-guide/SizeGuide.tsx on main.
  Product links use all_products[...] (12 handles, under the 20-per-page cap).
{%- endcomment -%}
${how}

${groups}
`
writeFileSync(`${root}theme/snippets/size-guide-body.liquid`, out)
console.log(`wrote theme/snippets/size-guide-body.liquid (${out.length} bytes, ${data.groups.reduce((n, g) => n + g.articles.length, 0)} articles)`)
