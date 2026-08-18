import { createRoute } from 'honox/factory'
import { json } from '../../lib/api'
import { checkDatabase, getDatabase, getLatestFetchedAt } from '../../lib/db'
import { getRateServiceStatus } from '../../lib/rates'

export default createRoute(async (c) => {
  const service = getRateServiceStatus()
  const databaseConfigured = getDatabase() != null
  const databaseHealthy = await checkDatabase()
  const latestFetchedAt = databaseConfigured ? await getLatestFetchedAt() : service.checked_at
  const stale = databaseConfigured
    ? latestFetchedAt == null || Date.now() - new Date(latestFetchedAt).getTime() > 26 * 60 * 60 * 1000
    : service.checked_at != null && Date.now() - new Date(service.checked_at).getTime() > 26 * 60 * 60 * 1000
  const status = service.status === 'unavailable' || !databaseHealthy ? 'unavailable' : service.status === 'degraded' || stale ? 'degraded' : 'ok'
  const response = json(c, {
    status,
    time: new Date().toISOString(),
    data_source: {
      ...service,
      name: 'ecb.europa.eu',
       database: databaseConfigured ? (databaseHealthy ? 'healthy' : 'unavailable') : 'disabled',
     },
  }, status === 'ok' ? 200 : 503)
  response.headers.set('Cache-Control', 'no-store')
  return response
})
