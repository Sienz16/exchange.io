import { createRoute } from 'honox/factory'
import { json, options } from '../../lib/api'

export default createRoute((c) => {
  if (c.req.method === 'OPTIONS') return options(c)
  return json(c, {
    status: 'ok',
    time: new Date().toISOString(),
    data_source: { status: 'available', name: 'open.er-api.com' },
  })
})

export const OPTIONS = createRoute((c) => options(c))
