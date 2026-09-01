import { createSummaryHandler } from './lib/summary.js'
import { ensureRuntimeConfig, buildScenarioOptions } from './lib/config.js'
import { runWeightedJourney, runtimeConfig, setupSuite } from './lib/runtime.js'

ensureRuntimeConfig(runtimeConfig)

export const options = buildScenarioOptions(
  'prod_moderate',
  {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 5 },
      { duration: '1m', target: 10 },
      { duration: '1m', target: 25 },
      { duration: '1m', target: 25 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '20s',
  },
  {
    error_rate: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '45s' }],
    http_req_duration: [{ threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '90s' }],
    timeout_rate: [{ threshold: 'rate==0', abortOnFail: true, delayAbortEval: '30s' }],
    http_429: [{ threshold: 'count==0', abortOnFail: true, delayAbortEval: '60s' }],
    http_5xx: [{ threshold: 'count==0', abortOnFail: true, delayAbortEval: '45s' }],
    slow_request_rate: [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '90s' }],
  },
)

export function setup() {
  return setupSuite()
}

export default function main(dataset) {
  runWeightedJourney(dataset)
}

export const handleSummary = createSummaryHandler('prod-moderate', runtimeConfig)
