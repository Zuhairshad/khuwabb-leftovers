import data from "@/data/size-guide.json"
import { getProduct, productHref } from "@/lib/catalog"
import { Appear } from "../Appear"
import { ArrowButton } from "../ArrowButton"
import styles from "./SizeGuide.module.css"

// The size guide from the October 2026 product catalog. Every chart lives in
// data/size-guide.json (cm and inches); this file only lays it out. The cm /
// inches switch is pure CSS: the radio inputs sit inside .page and :has()
// hides whichever unit isn't picked, so there is no client JS.
const EMAIL = "khuwabb@gmail.com"

type Row = { k: string; label: string; v: string[] }
type Part = { name: string | null; image: string; w: number; h: number; sizes: { label: string; alt?: string }[]; cm: Row[]; in: Row[] }
type Article = { id: string; title: string; tag: string; sizes: string; product: string | null; parts: Part[] }
type Group = { id: string; title: string; articles: Article[] }

const groups = data.groups as Group[]

function Chart({ part, unit, caption }: { part: Part; unit: "cm" | "in"; caption: string }) {
  const rows = part[unit]
  return (
    <div className={`${styles.scroll} ${unit === "cm" ? styles.cmChart : styles.inChart}`} role="region" aria-label={caption} tabIndex={0}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.measure}>
              Measurement
            </th>
            {part.sizes.map((s) => (
              <th scope="col" key={s.label} className={styles.size}>
                <span>{s.label}</span>
                {s.alt && <small>{s.alt}</small>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k}>
              <th scope="row" className={styles.rowHead}>
                <span className={styles.letter} aria-hidden>
                  {r.k}
                </span>
                {r.label}
              </th>
              {r.v.map((v, i) => (
                <td key={part.sizes[i].label}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ArticleCard({ a }: { a: Article }) {
  const product = getProduct(a.product)
  return (
    <article className={styles.card} id={`sg-${a.id}`}>
      <header className={styles.cardHead}>
        <div>
          <p className={styles.tag}>{a.tag}</p>
          <h3 className={styles.cardTitle}>
            {a.title.split(" ").map((w, i) => (
              <span key={i}>
                {i > 0 && " "}
                <span className={styles.nw}>{w}</span>
              </span>
            ))}
          </h3>
          {product && (
            <a className={styles.pieceLink} href={productHref(product)}>
              View this piece
            </a>
          )}
        </div>
        <p className={styles.sizesBadge}>
          <span>Sizes</span>
          {a.sizes}
        </p>
      </header>
      {a.parts.map((part) => {
        const what = part.name ? `${a.title}, ${part.name.toLowerCase()}` : a.title
        return (
          <div key={part.image} className={styles.part}>
            <img className={styles.diagram} src={part.image} width={part.w} height={part.h} alt={`Diagram of the ${what.toLowerCase()} measurements, marked A to E`} loading="lazy" decoding="async" />
            <div className={styles.charts}>
              {part.name && <h4 className={styles.partName}>{part.name}</h4>}
              <Chart part={part} unit="cm" caption={`${what}: measurements in centimetres`} />
              <Chart part={part} unit="in" caption={`${what}: measurements in inches`} />
            </div>
          </div>
        )
      })}
    </article>
  )
}

export function SizeGuide() {
  return (
    <div className={styles.page} data-section="size-guide">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Size &amp; fit</p>
        <Appear preset="rise">
          <h1 className={styles.title}>Size guide</h1>
        </Appear>
        <p className={styles.lede}>{data.intro}</p>
      </header>

      <div className={styles.bar}>
        <fieldset className={styles.units}>
          <legend className={styles.srOnly}>Units</legend>
          <input className={styles.unitInput} type="radio" name="unit" id="unit-cm" defaultChecked />
          <label className={styles.unitLabel} htmlFor="unit-cm">
            cm
          </label>
          <input className={`${styles.unitInput} ${styles.unitIn}`} type="radio" name="unit" id="unit-in" />
          <label className={styles.unitLabel} htmlFor="unit-in">
            inches
          </label>
        </fieldset>
        <nav className={styles.jump} aria-label="Jump to a category">
          {groups.map((g) => (
            <a key={g.id} href={`#${g.id}`}>
              {g.title}
            </a>
          ))}
        </nav>
      </div>

      <section className={styles.how} aria-labelledby="how-to-measure">
        <h2 className={styles.groupTitle} id="how-to-measure">
          How we measure
        </h2>
        <div className={styles.howGrid}>
          {data.howToMeasure.map((m) => (
            <div key={m.title} className={styles.howCard}>
              <h3 className={styles.howTitle}>{m.title}</h3>
              <img className={styles.howImage} src={m.image} width={m.w} height={m.h} alt={m.alt} loading="lazy" decoding="async" />
              <ol className={styles.legend}>
                {m.items.map(([k, term, text]) => (
                  <li key={k}>
                    <span className={styles.letter} aria-hidden>
                      {k}
                    </span>
                    <span>
                      <strong>{term}:</strong> {text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <div className={styles.notes}>
          <div className={`${styles.note} ${styles.numeric}`}>
            <h3 className={styles.noteTitle}>Numeric sizes</h3>
            <dl className={styles.sizeMap}>
              {data.numericSizes.map(([num, letter]) => (
                <div key={num}>
                  <dt>{num}</dt>
                  <dd>{letter}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className={`${styles.note} ${styles.know}`}>
            <h3 className={styles.noteTitle}>Good to know</h3>
            <p>{data.goodToKnow}</p>
          </div>
        </div>
      </section>

      {groups.map((g) => (
        <section key={g.id} className={styles.group} id={g.id} aria-labelledby={`${g.id}-title`}>
          <h2 className={styles.groupTitle} id={`${g.id}-title`}>
            {g.title}
          </h2>
          <div className={styles.cards}>
            {g.articles.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      ))}

      <section className={styles.help}>
        <h2 className={styles.helpTitle}>Still not sure?</h2>
        <p>Email us the piece you like and a measurement from something that fits you well, and we&rsquo;ll help you pick. Changed your mind after it arrives? Sizes can be swapped within 7 days.</p>
        <div className={styles.helpActions}>
          <ArrowButton href={`mailto:${EMAIL}?subject=Size%20help`} label="Email us" tone="light" />
          <a className={styles.helpLink} href="/exchange">
            How the 7-day exchange works
          </a>
        </div>
      </section>
    </div>
  )
}
