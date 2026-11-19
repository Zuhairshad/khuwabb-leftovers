// Pages that open straight away, without the "khuwabb" slot-machine intro:
// product pages (clicking a product should just show it).
export const skipsIntro = (pathname: string | null) => !!pathname && pathname.startsWith("/products/")
