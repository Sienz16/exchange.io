import { createRoute } from 'honox/factory'
import { json } from '../../lib/api'
import { getDatabase } from '../../lib/db'
import { getRateServiceStatus } from '../../lib/rates'

export default createRoute((c) => {
  const service = getRateServiceStatus()
  const status = service.status === 'unavailable' ? 'unavailable' : service.status === 'degraded' ? 'degraded' : 'ok'
  const response = json(c, {
    status,
    time: new Date().toISOString(),
    data_source: {
      ...service,
      name: 'ecb.europa.eu',
      database: getDatabase() ? 'configured' : 'disabled',
    },
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
})
