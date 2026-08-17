import { createRoute } from 'honox/factory'
import { json } from '../../lib/api'
import { getDatabase } from '../../lib/db'
import { getRateServiceStatus } from '../../lib/rates'

export default createRoute((c) => json(c, {
  status: 'ok',
  time: new Date().toISOString(),
  data_source: {
    ...getRateServiceStatus(),
    name: 'ecb.europa.eu',
    database: getDatabase() ? 'configured' : 'disabled',
  },
}))
