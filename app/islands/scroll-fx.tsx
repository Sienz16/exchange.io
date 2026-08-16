import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Client-side motion layer for server-rendered pages. Renders nothing; it
 * animates `[data-reveal]`, `[data-count]`, and `[data-parallax]` markers in
 * the surrounding SSR markup. Initial visual states are applied by GSAP only,
 * so content stays fully visible without JS or under reduced-motion.
 */
export default function ScrollFx() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 30, opacity: 0, duration: 0.9, ease: 'power3.out',
          delay: Number(el.dataset.revealDelay ?? 0),
          scrollTrigger: { trigger: el, start: 'top 88%' },
        })
      })

      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
        const target = Number(el.dataset.count)
        if (!Number.isFinite(target)) return
        const counter = { value: 0 }
        gsap.to(counter, {
          value: target, duration: 1.6, ease: 'power2.out', snap: { value: 1 },
          scrollTrigger: { trigger: el, start: 'top 88%' },
          onUpdate: () => { el.textContent = Math.round(counter.value).toLocaleString('en-US') },
        })
      })

      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const scope = el.closest('section') ?? el
        gsap.to(el, {
          yPercent: Number(el.dataset.parallax ?? 12), ease: 'none',
          scrollTrigger: { trigger: scope, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        })
      })
    })

    return () => ctx.revert()
  }, [])

  return null
}
