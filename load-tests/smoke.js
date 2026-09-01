import { createSummaryHandler } from './lib/summary.js'
import { ensureRuntimeConfig, buildScenarioOptions } from './lib/config.js'
import { runWeightedJourney, runtimeConfig, setupSuite } from './lib/runtime.js'

ensureRuntimeConfig(runtimeConfig)

export const options = buildScenarioOptions('smoke', {
  executor: 'ramping-vus',
  startVUs: 1,
  stages: [
    { duration: '2m', target: 5 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 1 },
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

export const handleSummary = createSummaryHandler('smoke', runtimeConfig)
