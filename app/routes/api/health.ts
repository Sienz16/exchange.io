import { createRoute } from 'honox/factory'
import { json, options } from '../../lib/api'
import { getRateServiceStatus } from '../../lib/rates'

export default createRoute((c) => {
  if (c.req.method === 'OPTIONS') return options(c)
  return json(c, {
    status: 'ok',
    time: new Date().toISOString(),
    data_source: { ...getRateServiceStatus(), name: 'open.er-api.com' },
  })
})
