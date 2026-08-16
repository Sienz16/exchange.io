import { reactRenderer, useRequestContext } from '@hono/react-renderer'
import type { FC, PropsWithChildren } from 'react'

const HasIslands: FC<PropsWithChildren> = ({ children }) => {
  const IMPORTING_ISLANDS_ID = '__importing_islands' as const
  const c = useRequestContext()
  return <>{c.get(IMPORTING_ISLANDS_ID) ? children : <></>}</>
}

export default reactRenderer(({ children, title }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
      </head>
      <body>{children}</body>
    </html>
  )
})
