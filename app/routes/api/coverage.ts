import { createRoute } from 'honox/factory'
import { handleApiError, json } from '../../lib/api'
import { getCoverage } from '../../lib/db'

export default createRoute(async (c) => {
  try { return await json(c, await getCoverage()) } catch (error) { return handleApiError(c, error) }
})
