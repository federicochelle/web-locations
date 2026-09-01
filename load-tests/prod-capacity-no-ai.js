import { createSummaryHandler } from './lib/summary.js'
import { ensureRuntimeConfig, buildScenarioOptions } from './lib/config.js'
import { runWeightedJourneyWithoutInterpretation, runtimeConfig } from './lib/runtime.js'

ensureRuntimeConfig(runtimeConfig)

const dataset = JSON.parse(open('./data/prod-public-seeds.json'))

export const options = buildScenarioOptions(
  'prod_capacity_no_ai',
  {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '45s', target: 5 },
      { duration: '45s', target: 5 },
      { duration: '45s', target: 10 },
      { duration: '45s', target: 10 },
      { duration: '1m', target: 25 },
      { duration: '2m', target: 25 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '20s',
  },
  {
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '4m' }],
    error_rate: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '4m' }],
    timeout_rate: [{ threshold: 'rate==0', abortOnFail: true, delayAbortEval: '4m' }],
    http_429_rate: [{ threshold: 'rate<0.02', abortOnFail: true, delayAbortEval: '4m' }],
    http_5xx_rate: [{ threshold: 'rate<0.02', abortOnFail: true, delayAbortEval: '4m' }],
    http_req_duration: ['p(95)<1000'],
    http_429: ['count==0'],
    http_5xx: ['count==0'],
  },
)

export default function main() {
  runWeightedJourneyWithoutInterpretation(dataset)
}

export const handleSummary = createSummaryHandler('prod-capacity-no-ai', runtimeConfig)
