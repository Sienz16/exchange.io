import { useEffect } from 'react'

export default function ScrollFx() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      }
    }, { rootMargin: '0px 0px -12% 0px' })
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => {
      element.classList.add('reveal-ready')
      element.style.setProperty('--reveal-delay', `${Number(element.dataset.revealDelay ?? 0)}s`)
      observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])
  return null
}
