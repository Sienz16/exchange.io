import { createRoute } from 'honox/factory'
import Counter from '../islands/counter'

export default createRoute((c) => {
  return c.render(
    <div className="py-8 text-center">
      <h1 className="text-3xl font-bold">exchange.io</h1>
      <p className="mt-2 text-muted-foreground">Currency exchange rates API — landing page coming soon.</p>
      <div className="mt-6">
        <Counter />
      </div>
    </div>,
    { title: 'exchange.io — Currency Exchange Rates API' }
  )
})
