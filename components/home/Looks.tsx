import looks from "@/data/looks.json"
import { getProduct, photo, productHref, type Product } from "@/lib/catalog"
import { formatPrice } from "@/lib/format"
import { ProductPrice } from "@/components/product/ProductPrice"
import { ArrowButton } from "../ArrowButton"
import { SectionHeader } from "./SectionHeader"
import styles from "./Looks.module.css"
import { atLeast, responsive } from "@/lib/img"
import { LaterImg } from "../LaterImg"

type Piece = { p: Product; colour: string }

// Where each piece sits in the outfit picture: a jacket over trousers, or a
// jacket beside a full-length piece (dress or co-ord set).
const role = (p: Product) => (p.category === "Jackets" ? "top" : p.category === "Trousers" ? "bottom" : "full")

function Outfit({ pieces, name }: { pieces: Piece[]; name: string }) {
  const hasFull = pieces.some((x) => role(x.p) === "full")
  return (
    <div className={styles.outfit} data-layout={hasFull ? "beside" : "stack"} role="img" aria-label={`${name}: ${pieces.map((x) => `${x.p.name} in ${x.colour}`).join(", ")}`}>
      {pieces.map((x) => (
        <div key={x.p.slug} className={styles.layer} data-role={role(x.p)}>
          <LaterImg src={atLeast(photo(x.p, x.colour).src, 600)} alt="" draggable={false} loading="lazy" decoding="async" />
        </div>
      ))}
    </div>
  )
}

// Each look is a complete outfit from the catalog: its lookbook photo (or,
// without one, the pieces themselves) on a sticky card; the next one slides
// up over it as you scroll.
export function Looks() {
  return (
    <section id="looks" className={styles.section} data-section="looks">
      <SectionHeader title="Shop the look" />
      <div className={styles.list}>
        {looks.map((look) => {
          const pieces = look.pieces.flatMap(({ slug, colour }) => {
            const p = getProduct(slug)
            return p ? [{ p, colour }] : []
          })
          const total = pieces.every((x) => typeof x.p.price === "number") ? pieces.reduce((n, x) => n + (x.p.price ?? 0), 0) : null
          return (
            <article key={look.id} className={styles.look} style={{ background: look.tint }} data-look={look.slug}>
              <div className={styles.photo}>
                {look.image ? <LaterImg className={styles.lookPhoto} {...responsive(look.image)} sizes="(max-width: 809px) calc(100vw - 72px), (max-width: 1199px) 320px, 470px" alt={look.imageAlt} loading="lazy" decoding="async" /> : <Outfit pieces={pieces} name={look.name} />}
              </div>
              <div className={styles.details}>
                <div className={styles.intro}>
                  <h2 className={styles.name}>{look.name}</h2>
                  <p className={styles.description}>{look.description}</p>
                </div>
                <div className={styles.pieces}>
                  {pieces.map(({ p, colour }) => (
                    <a key={p.id} href={`${productHref(p)}?colour=${encodeURIComponent(colour)}`} className={styles.piece}>
                      <div className={styles.thumb}>
                        <LaterImg src={atLeast(photo(p, colour).src, 300)} alt={`${p.name} in ${colour}`} loading="lazy" decoding="async" />
                      </div>
                      <div className={styles.text}>
                        <p className={styles.pieceName}>{p.name}</p>
                        <p className={styles.colour}>{colour}</p>
                      </div>
                      <p className={styles.price}><ProductPrice price={p.price} compareAt={p.compareAt} /></p>
                    </a>
                  ))}
                </div>
                <div className={styles.actions}>
                  <ArrowButton href="/shop" label="Shop all" />
                  {total !== null && <p className={styles.total}>The look · {formatPrice(total)}</p>}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
