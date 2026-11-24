/* <instagram-feed>: port of components/home/InstagramStrip.tsx + the live feed.
 *
 * Markup: <instagram-feed data-feed-url data-limit data-profile>
 *           <ul class="instagram-feed__strip" data-strip><li data-video="...">fallback tiles</li></ul>
 *         </instagram-feed>
 * Once near the viewport it fetches data-feed-url; if there are posts they replace the fallback
 * tiles. Errors / empty feed leave the fallback untouched. Two feed formats are accepted:
 *   - headless site /api/instagram: { profile, posts: [{ id, kind, image, video, href, caption }] }
 *   - Behold.so JSON feed (CORS-enabled): a plain array of posts, or { username, posts: [...] },
 *     each post { permalink, mediaType, mediaUrl, thumbnailUrl, sizes, caption, prunedCaption }.
 * Reels (live videos and block tiles with data-video) play muted while >= 50% visible.
 */
class InstagramFeed extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this.strip = this.querySelector('[data-strip]');
    if (!this.strip) return;
    this._ready = true;

    this.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.observers = [];
    this.limit = parseInt(this.dataset.limit, 10) || 12;

    // Manual tiles that carry a reel video.
    this.strip.querySelectorAll('[data-video]').forEach((tile) => {
      const src = this.safeUrl(tile.dataset.video);
      const link = tile.querySelector('.instagram-feed__link');
      if (src && link) this.addReel(link, src);
    });

    const feedUrl = this.safeUrl(this.dataset.feedUrl);
    if (!feedUrl) return;
    if (!('IntersectionObserver' in window)) { this.load(feedUrl); return; }
    this.loader = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        this.loader.disconnect();
        this.load(feedUrl);
      }
    }, { rootMargin: '400px' });
    this.loader.observe(this);
  }

  disconnectedCallback() {
    if (this.loader) this.loader.disconnect();
    (this.observers || []).forEach((o) => o.disconnect());
    this.observers = [];
    this._ready = false;
  }

  safeUrl(value) {
    if (typeof value !== 'string' || !value) return null;
    try {
      const u = new URL(value, window.location.href);
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
    } catch (e) {
      return null;
    }
  }

  async load(feedUrl) {
    try {
      const res = await fetch(feedUrl, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const body = await res.json();
      const list = Array.isArray(body) ? body : (body && Array.isArray(body.posts) ? body.posts : []);
      const posts = list
        .map((p) => this.normalise(p))
        .filter(Boolean)
        .slice(0, this.limit);
      if (!posts.length) return;
      this.render(posts);
    } catch (e) {
      /* keep the fallback tiles */
    }
  }

  normalise(p) {
    if (!p || typeof p !== 'object') return null;
    if (p.permalink || p.mediaType) return this.normaliseBehold(p);
    const image = this.safeUrl(p.image);
    const href = this.safeUrl(p.href);
    if (!image || !href) return null;
    const kind = p.kind === 'video' || p.kind === 'carousel' ? p.kind : 'image';
    return {
      kind,
      image,
      href,
      video: kind === 'video' ? this.safeUrl(p.video) : null,
      caption: typeof p.caption === 'string' ? p.caption.trim() : '',
    };
  }

  // Behold.so post -> internal shape.
  normaliseBehold(p) {
    const sizes = p.sizes && typeof p.sizes === 'object' ? p.sizes : {};
    const isVideo = p.mediaType === 'VIDEO';
    const image = this.safeUrl(sizes.medium && sizes.medium.mediaUrl)
      || this.safeUrl(sizes.large && sizes.large.mediaUrl)
      || this.safeUrl(isVideo ? p.thumbnailUrl : p.mediaUrl)
      || this.safeUrl(p.thumbnailUrl);
    const href = this.safeUrl(p.permalink);
    if (!image || !href) return null;
    const kind = isVideo ? 'video' : p.mediaType === 'CAROUSEL_ALBUM' ? 'carousel' : 'image';
    const caption = [p.prunedCaption, p.caption].find((c) => typeof c === 'string' && c.trim());
    return {
      kind,
      image,
      href,
      video: isVideo ? this.safeUrl(p.mediaUrl) : null,
      caption: caption ? caption.trim() : '',
    };
  }

  // lib/site.ts trimTo(text, 90)
  trimTo(text, max) {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd() + '…';
  }

  render(posts) {
    (this.observers || []).forEach((o) => o.disconnect());
    this.observers = [];
    const frag = document.createDocumentFragment();
    posts.forEach((p) => frag.appendChild(this.tile(p)));
    this.strip.replaceChildren(frag);
    this.strip.scrollLeft = 0;
  }

  tile(p) {
    const li = document.createElement('li');
    li.className = 'instagram-feed__tile';
    const a = document.createElement('a');
    a.className = 'instagram-feed__link';
    a.href = p.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label',
      (p.kind === 'video' ? 'Reel' : 'Post') + ' on Instagram' + (p.caption ? ': ' + this.trimTo(p.caption, 90) : ''));

    const img = document.createElement('img');
    img.className = 'instagram-feed__media';
    img.src = p.image;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    a.appendChild(img);

    if (p.video) this.addReel(a, p.video);

    if (p.kind !== 'image') {
      const badge = document.createElement('span');
      badge.className = 'instagram-feed__badge';
      badge.appendChild(this.icon(p.kind === 'video' ? 'reel' : 'carousel'));
      a.appendChild(badge);
    }

    const hover = document.createElement('span');
    hover.className = 'instagram-feed__hover';
    hover.setAttribute('aria-hidden', 'true');
    const glyph = document.createElement('span');
    glyph.className = 'instagram-feed__glyph';
    hover.appendChild(glyph);
    a.appendChild(hover);

    li.appendChild(a);
    return li;
  }

  // Muted looping video over the cover frame; plays while >= 50% visible.
  addReel(link, src) {
    if (this.reduced) return;
    const video = document.createElement('video');
    video.className = 'instagram-feed__video';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-hidden', 'true');
    video.src = src;
    video.addEventListener('playing', () => video.setAttribute('data-playing', ''));
    const media = link.querySelector('.instagram-feed__media');
    if (media && media.nextSibling) link.insertBefore(video, media.nextSibling);
    else link.appendChild(video);

    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        video.pause();
      }
    }, { threshold: 0.5 });
    io.observe(video);
    this.observers.push(io);
  }

  icon(kind) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (name, attrs) => {
      const n = document.createElementNS(NS, name);
      Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
      return n;
    };
    const svg = el('svg', {
      viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none',
      stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
    });
    if (kind === 'reel') {
      svg.appendChild(el('rect', { x: '2.75', y: '2.75', width: '18.5', height: '18.5', rx: '5' }));
      svg.appendChild(el('path', { d: 'M2.75 8h18.5M8.5 2.75 11.5 8M14.5 2.75 17.5 8' }));
      svg.appendChild(el('path', { d: 'M10 11.25v6l5-3z', fill: 'currentColor' }));
    } else {
      svg.appendChild(el('rect', { x: '7.75', y: '2.75', width: '13.5', height: '13.5', rx: '3' }));
      svg.appendChild(el('path', { d: 'M16.25 19.25a2 2 0 0 1-2 2H5.75a3 3 0 0 1-3-3V9.75a2 2 0 0 1 2-2' }));
    }
    return svg;
  }
}

if (!customElements.get('instagram-feed')) customElements.define('instagram-feed', InstagramFeed);
