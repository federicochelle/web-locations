import { CAPACITY_STAGE_KEYS, ENDPOINT_KEYS } from './config.js'

function metricValue(data, metricName, key, fallback = 0) {
  return data.metrics?.[metricName]?.values?.[key] ?? fallback
}

function formatMs(value) {
  return `${Number(value || 0).toFixed(2)} ms`
}

function formatNumber(value) {
  return Number(value || 0).toFixed(2)
}

function stageDurationSeconds(stageKey) {
  if (stageKey === 'stage_5') {
    return 45
  }

  if (stageKey === 'stage_10') {
    return 45
  }

  if (stageKey === 'stage_25') {
    return 120
  }

  return 1
}

function stageLabel(stageKey) {
  if (stageKey === 'stage_5') {
    return '5 VUs'
  }

  if (stageKey === 'stage_10') {
    return '10 VUs'
  }

  if (stageKey === 'stage_25') {
    return '25 VUs'
  }

  return stageKey
}

function buildEndpointRows(data) {
  return ENDPOINT_KEYS
    .map((key) => {
      const durationMetric = data.metrics?.[`endpoint_${key}_duration`]
      const requestCount = data.metrics?.[`endpoint_${key}_requests`]?.values?.count ?? 0
      const errorCount = data.metrics?.[`endpoint_${key}_errors`]?.values?.count ?? 0
      const count4xx = data.metrics?.[`endpoint_${key}_4xx`]?.values?.count ?? 0
      const count429 = data.metrics?.[`endpoint_${key}_429`]?.values?.count ?? 0
      const count5xx = data.metrics?.[`endpoint_${key}_5xx`]?.values?.count ?? 0
      const timeoutCount = data.metrics?.[`endpoint_${key}_timeouts`]?.values?.count ?? 0

      if (!durationMetric?.values && requestCount === 0 && errorCount === 0) {
        return null
      }

      return {
        key,
        count: requestCount,
        rps: requestCount / Math.max((data.state?.testRunDurationMs ?? 1) / 1000, 1),
        errorCount,
        errorRate: requestCount > 0 ? errorCount / requestCount : 0,
        count4xx,
        count429,
        count5xx,
        timeoutCount,
        avg: durationMetric?.values?.avg ?? 0,
        p50: durationMetric?.values?.['p(50)'] ?? 0,
        p95: durationMetric?.values?.['p(95)'] ?? 0,
        p99: durationMetric?.values?.['p(99)'] ?? 0,
      }
    })
    .filter((row) => Boolean(row))
    .sort((left, right) => right.p95 - left.p95)
}

function buildStageRows(data) {
  return CAPACITY_STAGE_KEYS
    .map((stageKey) => {
      const durationMetric = data.metrics?.[`${stageKey}_duration`]
      const requestCount = data.metrics?.[`${stageKey}_requests`]?.values?.count ?? 0
      const errorCount = data.metrics?.[`${stageKey}_errors`]?.values?.count ?? 0

      if (!durationMetric?.values && requestCount === 0 && errorCount === 0) {
        return null
      }

      return {
        key: stageKey,
        count: requestCount,
        rps: requestCount / stageDurationSeconds(stageKey),
        errorCount,
        avg: durationMetric?.values?.avg ?? 0,
        p50: durationMetric?.values?.['p(50)'] ?? 0,
        p95: durationMetric?.values?.['p(95)'] ?? 0,
        p99: durationMetric?.values?.['p(99)'] ?? 0,
      }
    })
    .filter((row) => Boolean(row))
}

function buildStageEndpointRows(data, stageKey) {
  return ENDPOINT_KEYS
    .map((endpointKey) => {
      const durationMetric = data.metrics?.[`endpoint_${endpointKey}_${stageKey}_duration`]
      const requestCount =
        data.metrics?.[`endpoint_${endpointKey}_${stageKey}_requests`]?.values?.count ?? 0

      if (!durationMetric?.values && requestCount === 0) {
        return null
      }

      return {
        key: endpointKey,
        count: requestCount,
        rps: requestCount / stageDurationSeconds(stageKey),
        avg: durationMetric?.values?.avg ?? 0,
        p50: durationMetric?.values?.['p(50)'] ?? 0,
        p95: durationMetric?.values?.['p(95)'] ?? 0,
        p99: durationMetric?.values?.['p(99)'] ?? 0,
      }
    })
    .filter((row) => Boolean(row))
    .sort((left, right) => right.p95 - left.p95)
}

function pageAggregate(endpointRows) {
  const pageRows = endpointRows.filter((row) => row.key.startsWith('page_'))

  if (pageRows.length === 0) {
    return null
  }

  const requestCount = pageRows.reduce((sum, row) => sum + row.count, 0)
  const count4xx = pageRows.reduce((sum, row) => sum + row.count4xx, 0)
  const count429 = pageRows.reduce((sum, row) => sum + row.count429, 0)
  const count5xx = pageRows.reduce((sum, row) => sum + row.count5xx, 0)
  const timeoutCount = pageRows.reduce((sum, row) => sum + row.timeoutCount, 0)
  const errorCount = pageRows.reduce((sum, row) => sum + row.errorCount, 0)

  return {
    count: requestCount,
    rps: pageRows.reduce((sum, row) => sum + row.rps, 0),
    errorCount,
    count4xx,
    count429,
    count5xx,
    timeoutCount,
    avg: pageRows.reduce((sum, row) => sum + row.avg * row.count, 0) / Math.max(requestCount, 1),
    p50: Math.max(...pageRows.map((row) => row.p50)),
    p95: Math.max(...pageRows.map((row) => row.p95)),
    p99: Math.max(...pageRows.map((row) => row.p99)),
  }
}

export function buildSummary(data, profileName, runtimeConfig) {
  const endpointRows = buildEndpointRows(data)
  const stageRows = buildStageRows(data)
  const slowestEndpoint = endpointRows[0] ?? null
  const pagesRow = pageAggregate(endpointRows)
  const lines = [
    `k6 profile: ${profileName}`,
    `Target env: ${runtimeConfig.targetEnv}`,
    `Base URL: ${runtimeConfig.baseUrl}`,
    `Supabase URL: ${runtimeConfig.supabaseUrl}`,
    `Total requests: ${metricValue(data, 'http_reqs', 'count', 0)}`,
    `Requests/sec: ${formatNumber(metricValue(data, 'http_reqs', 'rate', 0))}`,
    `p50: ${formatMs(metricValue(data, 'http_req_duration', 'p(50)', 0))}`,
    `p90: ${formatMs(metricValue(data, 'http_req_duration', 'p(90)', 0))}`,
    `p95: ${formatMs(metricValue(data, 'http_req_duration', 'p(95)', 0))}`,
    `p99: ${formatMs(metricValue(data, 'http_req_duration', 'p(99)', 0))}`,
    `Error rate: ${(metricValue(data, 'error_rate', 'rate', 0) * 100).toFixed(2)}%`,
    `HTTP 4xx: ${metricValue(data, 'http_4xx', 'count', 0)}`,
    `HTTP 429: ${metricValue(data, 'http_429', 'count', 0)}`,
    `HTTP 5xx: ${metricValue(data, 'http_5xx', 'count', 0)}`,
    `Timeouts: ${metricValue(data, 'timeout_count', 'count', 0)}`,
    `Slow requests: ${metricValue(data, 'slow_request_count', 'count', 0)}`,
    slowestEndpoint
      ? `Slowest endpoint p95: ${slowestEndpoint.key} (${formatMs(slowestEndpoint.p95)})`
      : 'Slowest endpoint p95: n/a',
  ]

  if (pagesRow) {
    lines.push(
      `Pages Vercel aggregate: requests=${pagesRow.count}, rps=${formatNumber(pagesRow.rps)}, avg=${formatMs(pagesRow.avg)}, p50=${formatMs(pagesRow.p50)}, p95=${formatMs(pagesRow.p95)}, p99=${formatMs(pagesRow.p99)}, errors=${pagesRow.errorCount}, 4xx=${pagesRow.count4xx}, 429=${pagesRow.count429}, 5xx=${pagesRow.count5xx}, timeouts=${pagesRow.timeoutCount}`,
    )
  }

  if (stageRows.length > 0) {
    lines.push('')
    lines.push('Stage breakdown:')

    for (const row of stageRows) {
      lines.push(
        `- ${stageLabel(row.key)}: requests=${row.count}, rps=${formatNumber(row.rps)}, avg=${formatMs(row.avg)}, p50=${formatMs(row.p50)}, p95=${formatMs(row.p95)}, p99=${formatMs(row.p99)}, errors=${row.errorCount}`,
      )
    }

    for (const row of stageRows) {
      const endpointStageRows = buildStageEndpointRows(data, row.key)

      if (endpointStageRows.length === 0) {
        continue
      }

      lines.push('')
      lines.push(`Endpoint breakdown during ${stageLabel(row.key)}:`)

      for (const endpointRow of endpointStageRows) {
        lines.push(
          `- ${endpointRow.key}: requests=${endpointRow.count}, rps=${formatNumber(endpointRow.rps)}, avg=${formatMs(endpointRow.avg)}, p50=${formatMs(endpointRow.p50)}, p95=${formatMs(endpointRow.p95)}, p99=${formatMs(endpointRow.p99)}`,
        )
      }
    }
  }

  if (endpointRows.length > 0) {
    lines.push('')
    lines.push('Endpoint breakdown by p95:')

    for (const row of endpointRows) {
      lines.push(
        `- ${row.key}: requests=${row.count}, rps=${formatNumber(row.rps)}, avg=${formatMs(row.avg)}, p50=${formatMs(row.p50)}, p95=${formatMs(row.p95)}, p99=${formatMs(row.p99)}, error_rate=${(row.errorRate * 100).toFixed(2)}%, errors=${row.errorCount}, 4xx=${row.count4xx}, 429=${row.count429}, 5xx=${row.count5xx}, timeouts=${row.timeoutCount}`,
      )
    }
  }

  return lines.join('\n')
}

export function createSummaryHandler(profileName, runtimeConfig) {
  const summaryFile = `load-tests/results/${profileName}-summary.json`
  const textFile = `load-tests/results/${profileName}-summary.txt`

  return function handleSummary(data) {
    const textSummary = buildSummary(data, profileName, runtimeConfig)

    return {
      stdout: `${textSummary}\n`,
      [summaryFile]: JSON.stringify(data, null, 2),
      [textFile]: textSummary,
    }
  }
}
