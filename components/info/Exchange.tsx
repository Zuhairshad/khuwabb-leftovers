import { Appear } from "../Appear"
import { ArrowButton } from "../ArrowButton"
import styles from "./InfoPage.module.css"

// DRAFT wording for the 7-day exchange page. It only builds on what the store
// already promises (7-day exchange, cash on delivery, delivery across
// Pakistan, support by email). Confirm the conditions below match how you
// actually handle exchanges before launch.
const EMAIL = "khuwabb@gmail.com"

const STEPS = [
  {
    title: "Message us within 7 days",
    text: `Email ${EMAIL} within 7 days of your order arriving. Tell us your order number, the piece, the size you have and the size or colour you would like instead.`,
  },
  {
    title: "We confirm",
    text: "We check that the piece you want is in stock and tell you how to send yours back to us.",
  },
  {
    title: "Send it back, get your new piece",
    text: "Pack the piece up in its original packaging and send it to us. Once it arrives and we have checked it, we send out your replacement.",
  },
]

const ELIGIBLE = [
  "Pieces that are unworn, unwashed and free of marks, perfume or make-up.",
  "Pieces with their original tags and packaging.",
  "Size or colour swaps for something we have in stock.",
]

export function Exchange() {
  return (
    <div className={styles.page} data-section="exchange">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Help</p>
        <Appear preset="rise">
          <h1 className={styles.title}>7-day exchange</h1>
        </Appear>
        <p className={styles.lede}>Wrong size or not quite right? Tell us within 7 days of your order arriving and we will swap it.</p>
      </header>

      <section className={styles.section} aria-labelledby="exchange-how">
        <h2 className={styles.heading} id="exchange-how">
          How it works
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((s) => (
            <li key={s.title}>
              <div className={styles.body}>
                <strong>{s.title}</strong>
                <span>{s.text}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="exchange-what">
        <h2 className={styles.heading} id="exchange-what">
          What can be exchanged
        </h2>
        <ul className={`${styles.list} ${styles.body}`}>
          {ELIGIBLE.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="exchange-wrong">
        <h2 className={styles.heading} id="exchange-wrong">
          Damaged or not what you ordered?
        </h2>
        <div className={styles.body}>
          <p>If your piece arrives damaged, or is not the one you ordered, email us photos within 7 days and we will put it right with a replacement.</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="exchange-size">
        <h2 className={styles.heading} id="exchange-size">
          Not sure of your size?
        </h2>
        <div className={styles.body}>
          <p>
            Our <a href="/size-guide">size guide</a> has the measurements of every piece in centimetres and inches. Compare them with something you already love wearing. Ordered with cash on delivery? Exchanges work the same way.
          </p>
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.heading}>Need a hand?</h2>
        <p>Write to us and we will help you sort the right size or colour.</p>
        <div className={styles.ctaActions}>
          <ArrowButton href={`mailto:${EMAIL}?subject=Exchange`} label="Email us" />
          <a className={styles.ctaLink} href="/size-guide">
            View the size guide
          </a>
        </div>
      </section>
    </div>
  )
}
