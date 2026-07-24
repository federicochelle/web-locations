import { useEffect, useState } from 'react'

type SelectionPdfBlobPreviewProps = {
  blob: Blob
  fileName: string
}

export function SelectionPdfBlobPreview({
  blob,
  fileName,
}: SelectionPdfBlobPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    const nextBlobUrl = URL.createObjectURL(blob)
    setBlobUrl(nextBlobUrl)

    return () => {
      URL.revokeObjectURL(nextBlobUrl)
    }
  }, [blob])

  if (!blobUrl) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center border border-white/10 bg-white/4 px-6 text-center text-sm text-brand-300">
        Preparando la vista previa del PDF oficial...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-brand-300">
        {fileName}
      </div>
      <div className="overflow-hidden border border-white/10 bg-white">
        <iframe
          src={blobUrl}
          title={`Vista previa de ${fileName}`}
          className="min-h-[70vh] w-full"
        />
      </div>
    </div>
  )
}
