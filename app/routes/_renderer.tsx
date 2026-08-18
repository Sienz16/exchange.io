import { reactRenderer, useRequestContext } from '@hono/react-renderer'
import type { FC, PropsWithChildren } from 'react'

const HasIslands: FC<PropsWithChildren> = ({ children }) => {
  const IMPORTING_ISLANDS_ID = '__importing_islands' as const
  const c = useRequestContext()
  return <>{c.get(IMPORTING_ISLANDS_ID) ? children : <></>}</>
}

export default reactRenderer(({ children, title, description }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#05070c" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('exchangeio-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute('content',t==='light'?'#f6f5f0':'#05070c')}}catch(e){}})()` }} />
        {import.meta.env.PROD ? (
          <>
            <HasIslands>
              <script type="module" src="/static/client.js"></script>
            </HasIslands>
            <link href="/static/assets/style.css" rel="stylesheet" />
          </>
        ) : (
          <>
            <script type="module" src="/app/client.ts"></script>
            <link href="/app/style.css" rel="stylesheet" />
          </>
        )}
        {title ? <title>{title}</title> : ''}
        {description ? <meta name="description" content={description} /> : ''}
        {title ? <meta property="og:title" content={title} /> : ''}
        {description ? <meta property="og:description" content={description} /> : ''}
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="/og-image.svg" />
        <link rel="canonical" href={typeof location !== 'undefined' ? location.href : ''} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'exchange.io', description: description ?? 'No-key currency API' }) }} />
      </head>
      <body>{children}</body>
    </html>
  )
})
