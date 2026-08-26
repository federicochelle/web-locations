const WHATSAPP_BASE_URL = 'https://wa.me/'

export function buildWhatsAppUrl(message?: string) {
  if (!message || message.trim().length === 0) {
    return WHATSAPP_BASE_URL
  }

  const params = new URLSearchParams({
    text: message.trim(),
  })

  return `${WHATSAPP_BASE_URL}?${params.toString()}`
}
