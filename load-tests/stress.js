import { createSummaryHandler } from './lib/summary.js'
import { ensureRuntimeConfig, buildScenarioOptions } from './lib/config.js'
import { runWeightedJourney, runtimeConfig, setupSuite } from './lib/runtime.js'

ensureRuntimeConfig(runtimeConfig)

export const options = buildScenarioOptions('stress', {
  executor: 'ramping-vus',
  startVUs: 1,
  stages: [
    { duration: '2m', target: 10 },
    { duration: '2m', target: 25 },
    { duration: '3m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '2m', target: 25 },
  ],
  gracefulRampDown: '45s',
}
)

export function setup() {
  return setupSuite()
}

export default function main(dataset) {
  runWeightedJourney(dataset)
}

export const handleSummary = createSummaryHandler('stress', runtimeConfig)
