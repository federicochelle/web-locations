import { corsHeaders, createJsonResponse } from '../_shared/cors.ts'
import {
  getCloudflareApiToken,
  getCloudflareDeliveryUrl,
  createServiceRoleSupabaseClient,
  getEnv,
  MAX_SUBMISSION_IMAGE_COUNT,
} from '../_shared/submission-images.ts'

type FinalizeRequest = {
  submission_id?: string
  submission_token?: string
  cloudflare_image_id?: string
  sort_order?: number
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'No pudimos guardar la imagen.'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return createJsonResponse({ error: 'Metodo no permitido.' }, 405)
  }

  try {
    const body = (await request.json()) as FinalizeRequest
    const submissionId = body.submission_id?.trim()
    const submissionToken = body.submission_token?.trim()
    const cloudflareImageId = body.cloudflare_image_id?.trim()
    const sortOrder =
      typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)
        ? Math.max(0, Math.trunc(body.sort_order))
        : 0

    if (!submissionId || !submissionToken || !cloudflareImageId) {
      return createJsonResponse({ error: 'Faltan datos para guardar la imagen.' }, 400)
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: submission, error: submissionError } = await supabase
      .from('location_submissions')
      .select('id, submission_token')
      .eq('id', submissionId)
      .maybeSingle()

    if (submissionError) {
      throw new Error(submissionError.message)
    }

    if (!submission || submission.submission_token !== submissionToken) {
      return createJsonResponse({ error: 'La postulacion no es valida.' }, 403)
    }

    const { data: existingImage, error: existingImageError } = await supabase
      .from('location_submission_images')
      .select('id, cloudflare_image_id, image_url, sort_order')
      .eq('submission_id', submissionId)
      .eq('cloudflare_image_id', cloudflareImageId)
      .maybeSingle()

    if (existingImageError) {
      throw new Error(existingImageError.message)
    }

    if (existingImage) {
      return createJsonResponse({
        id: existingImage.id as string,
        cloudflareImageId: existingImage.cloudflare_image_id as string,
        imageUrl: existingImage.image_url as string,
        sortOrder: existingImage.sort_order as number,
      })
    }

    const { count, error: countError } = await supabase
      .from('location_submission_images')
      .select('id', { count: 'exact', head: true })
      .eq('submission_id', submissionId)

    if (countError) {
      throw new Error(countError.message)
    }

    if ((count ?? 0) >= MAX_SUBMISSION_IMAGE_COUNT) {
      return createJsonResponse(
        { error: 'Esta postulacion ya alcanzo el maximo de 8 imagenes.' },
        409,
      )
    }

    const cloudflareResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${getEnv('CLOUDFLARE_ACCOUNT_ID')}/images/v1/${cloudflareImageId}`,
      {
        headers: {
          Authorization: `Bearer ${getCloudflareApiToken()}`,
        },
      },
    )

    const cloudflareData = await cloudflareResponse.json()

    if (!cloudflareResponse.ok || !cloudflareData?.success) {
      return createJsonResponse(
        { error: 'No pudimos validar la imagen subida.' },
        400,
      )
    }

    const imageUrl = `${getCloudflareDeliveryUrl()}/${cloudflareImageId}/public`

    const { data: insertedImage, error: insertError } = await supabase
      .from('location_submission_images')
      .insert({
        submission_id: submissionId,
        submission_token: submissionToken,
        cloudflare_image_id: cloudflareImageId,
        image_url: imageUrl,
        sort_order: sortOrder,
      })
      .select('id, cloudflare_image_id, image_url, sort_order')
      .single()

    if (insertError) {
      throw new Error(insertError.message)
    }

    return createJsonResponse({
      id: insertedImage.id as string,
      cloudflareImageId: insertedImage.cloudflare_image_id as string,
      imageUrl: insertedImage.image_url as string,
      sortOrder: insertedImage.sort_order as number,
    })
  } catch (error) {
    return createJsonResponse({ error: getErrorMessage(error) }, 500)
  }
})
