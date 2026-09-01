import { supabase } from '@/lib/supabase.ts'
import { getSession, getSessionUser } from '@/services/auth.service.ts'

export const REQUEST_PROJECT_PRODUCTION_COMPANY_LOGOS_BUCKET =
  'request-project-assets'
export const MAX_REQUEST_PROJECT_PRODUCTION_COMPANY_LOGO_SIZE_BYTES =
  10 * 1024 * 1024
export const ALLOWED_REQUEST_PROJECT_PRODUCTION_COMPANY_LOGO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

type UploadRequestProjectProductionCompanyLogoInput = {
  projectId?: string | null
  file: File
}

type RequestProjectLogoAssetKind = 'product' | 'production-company'

type UploadRequestProjectLogoInput = UploadRequestProjectProductionCompanyLogoInput & {
  assetKind: RequestProjectLogoAssetKind
}

function getFileExtension(file: File) {
  switch (file.type) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return null
  }
}

async function getCurrentUserId() {
  const { session } = await getSession()
  const user = getSessionUser(session)

  if (!user) {
    throw new Error('Debes iniciar sesion para subir el logo.')
  }

  return user.id
}

export function isAllowedRequestProjectProductionCompanyLogoType(contentType: string) {
  return ALLOWED_REQUEST_PROJECT_PRODUCTION_COMPANY_LOGO_TYPES.includes(contentType)
}

export function getRequestProjectProductionCompanyLogoValidationError(file: File) {
  if (!isAllowedRequestProjectProductionCompanyLogoType(file.type)) {
    return 'Formato no permitido. Usa JPG, PNG o WEBP.'
  }

  if (file.size > MAX_REQUEST_PROJECT_PRODUCTION_COMPANY_LOGO_SIZE_BYTES) {
    return 'El logo supera el maximo de 10 MB.'
  }

  return null
}

async function uploadRequestProjectLogo({
  projectId = null,
  file,
  assetKind,
}: UploadRequestProjectLogoInput) {
  const validationError = getRequestProjectProductionCompanyLogoValidationError(file)

  if (validationError) {
    throw new Error(validationError)
  }

  const fileExtension = getFileExtension(file)

  if (!fileExtension) {
    throw new Error('No pudimos identificar el formato del logo.')
  }

  const userId = await getCurrentUserId()
  const scopeId =
    projectId?.trim() ||
    `draft-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e6)}`}`
  const assetId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e6)}`
  const path =
    `request-projects/${userId}/${scopeId}/${assetKind}-logo-${assetId}.${fileExtension}`

  const { error } = await supabase.storage
    .from(REQUEST_PROJECT_PRODUCTION_COMPANY_LOGOS_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw new Error(error.message || 'No pudimos subir el logo.')
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from(REQUEST_PROJECT_PRODUCTION_COMPANY_LOGOS_BUCKET)
    .getPublicUrl(path)

  if (!publicUrl.trim()) {
    throw new Error('No pudimos obtener la URL publica del logo.')
  }

  return {
    bucket: REQUEST_PROJECT_PRODUCTION_COMPANY_LOGOS_BUCKET,
    path,
    publicUrl,
  }
}

export function uploadRequestProjectProductionCompanyLogo(
  input: UploadRequestProjectProductionCompanyLogoInput,
) {
  return uploadRequestProjectLogo({
    ...input,
    assetKind: 'production-company',
  })
}

export function uploadRequestProjectProductLogo(
  input: UploadRequestProjectProductionCompanyLogoInput,
) {
  return uploadRequestProjectLogo({
    ...input,
    assetKind: 'product',
  })
}
