import { createSummaryHandler } from './lib/summary.js'
import { ensureRuntimeConfig, buildScenarioOptions } from './lib/config.js'
import { runWeightedJourney, runtimeConfig, setupSuite } from './lib/runtime.js'

ensureRuntimeConfig(runtimeConfig)

export const options = buildScenarioOptions('spike', {
  executor: 'ramping-vus',
  startVUs: 10,
  stages: [
    { duration: '2m', target: 10 },
    { duration: '30s', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 10 },
  ],
  gracefulRampDown: '30s',
}
)

export function setup() {
  return setupSuite()
}

export default function main(dataset) {
  runWeightedJourney(dataset)
}

export const handleSummary = createSummaryHandler('spike', runtimeConfig)
