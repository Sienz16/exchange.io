import { createRoute } from 'honox/factory'
import { json } from '../../lib/api'
import { getCacheStats, getRateServiceStatus } from '../../lib/rates'

export default createRoute(async (c) => json(c, {
  service: getRateServiceStatus(),
  cache: getCacheStats(),
  uptime_seconds: Math.round(performance.timeOrigin ? (performance.now() / 1000) : 0),
}))
