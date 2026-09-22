declare const __APP_RELEASE__: string | undefined

export const APP_RELEASE =
  typeof __APP_RELEASE__ === 'string' && __APP_RELEASE__.length > 0
    ? __APP_RELEASE__
    : 'local-dev'
