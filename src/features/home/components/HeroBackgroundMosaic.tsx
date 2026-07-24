import type { CSSProperties } from 'react'
import image0 from '@/assets/home-mosaic/foto.avif'
import image1 from '@/assets/home-mosaic/foto1.avif'
import image2 from '@/assets/home-mosaic/foto2-hero-opt.jpg'
import image3 from '@/assets/home-mosaic/foto3.avif'
import image4 from '@/assets/home-mosaic/foto4-hero-opt.jpg'
import image5 from '@/assets/home-mosaic/foto5.avif'

type MosaicTile = {
  src: string
  alt: string
  widthClassName: string
}

type MosaicRow = {
  id: string
  direction: 'left' | 'right'
  duration: string
  tiles: MosaicTile[]
}

const baseTiles: MosaicTile[] = [
  {
    src: image0,
    alt: 'Locacion cinematografica exterior',
    widthClassName: 'w-[58vw] sm:w-[42vw] lg:w-[31vw] xl:w-[27vw]',
  },
  {
    src: image1,
    alt: 'Interior de locacion para produccion',
    widthClassName: 'w-[52vw] sm:w-[38vw] lg:w-[28vw] xl:w-[24vw]',
  },
  {
    src: image2,
    alt: 'Locacion urbana en Uruguay',
    widthClassName: 'w-[62vw] sm:w-[46vw] lg:w-[34vw] xl:w-[30vw]',
  },
  {
    src: image3,
    alt: 'Locacion editorial con luz natural',
    widthClassName: 'w-[54vw] sm:w-[40vw] lg:w-[29vw] xl:w-[25vw]',
  },
  {
    src: image4,
    alt: 'Espacio arquitectonico para rodaje',
    widthClassName: 'w-[64vw] sm:w-[48vw] lg:w-[36vw] xl:w-[31vw]',
  },
  {
    src: image5,
    alt: 'Locacion premium para fotografia',
    widthClassName: 'w-[56vw] sm:w-[41vw] lg:w-[30vw] xl:w-[26vw]',
  },
]

const rows: MosaicRow[] = [
  {
    id: 'row-1',
    direction: 'left',
    duration: '52s',
    tiles: [baseTiles[0], baseTiles[2], baseTiles[4], baseTiles[1]],
  },
  {
    id: 'row-2',
    direction: 'right',
    duration: '62s',
    tiles: [baseTiles[3], baseTiles[1], baseTiles[5], baseTiles[0]],
  },
  {
    id: 'row-3',
    direction: 'left',
    duration: '56s',
    tiles: [baseTiles[4], baseTiles[2], baseTiles[0], baseTiles[5]],
  },
]

function isHighPriorityTile(rowId: string, tileIndex: number, sequenceIndex: number) {
  if (sequenceIndex !== 0) {
    return false
  }

  return (
    (rowId === 'row-1' && tileIndex === 0) ||
    (rowId === 'row-2' && tileIndex === 0)
  )
}

function MosaicTrack({ row }: { row: MosaicRow }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className={`hero-mosaic-track hero-mosaic-track-${row.direction} flex h-full w-max`}
        style={
          {
            '--hero-duration': row.duration,
          } as CSSProperties
        }
      >
        {[0, 1].map((sequenceIndex) => (
          <div
            key={`${row.id}-sequence-${sequenceIndex}`}
            className="hero-mosaic-sequence flex h-full shrink-0 gap-px"
            aria-hidden={sequenceIndex === 1}
          >
            {row.tiles.map((tile, index) => {
              const isCriticalTile = isHighPriorityTile(row.id, index, sequenceIndex)

              return (
                <div
                  key={`${row.id}-${sequenceIndex}-${tile.src}-${index}`}
                  className={`relative h-full shrink-0 overflow-hidden ${tile.widthClassName}`}
                >
                  <img
                    src={tile.src}
                    alt={tile.alt}
                    width={1600}
                    height={900}
                    loading={isCriticalTile ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={isCriticalTile ? 'high' : 'auto'}
                    className="h-full w-full object-cover"
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function HeroBackgroundMosaic() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="grid h-full grid-rows-3 gap-px">
        {rows.map((row) => (
          <MosaicTrack key={row.id} row={row} />
        ))}
      </div>

      <div className="absolute inset-0 bg-black/46" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.32),rgba(5,4,4,0.4)_38%,rgba(5,4,4,0.5))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.16),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_50%_50%,transparent_58%,rgba(0,0,0,0.08)_100%)]" />
    </div>
  )
}
