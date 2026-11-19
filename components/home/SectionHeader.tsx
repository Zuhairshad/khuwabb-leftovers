import { Appear } from "../Appear"
import { ArrowButton } from "../ArrowButton"
import styles from "./SectionHeader.module.css"

export function SectionHeader({ title, cta }: { title: string; cta?: { href: string; label: string } }) {
  return (
    <div className={styles.header}>
      <Appear preset="rise">
        <h2 className={styles.title}>{title}</h2>
      </Appear>
      {cta && <ArrowButton href={cta.href} label={cta.label} />}
    </div>
  )
}
