import type { CSSProperties } from 'react'

import image0 from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.38 PM.webp'
import image1 from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.38 PM (1).webp'
import image2 from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.38 PM (2).webp'
import image3 from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.39 PM.webp'
import image4 from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.39 PM (1).webp'
import image5 from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.39 PM (2).webp'
import image6 from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.39 PM (3).webp'
import image7 from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.39 PM (4).webp'
import image8 from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.40 PM.webp'

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

const tiles: MosaicTile[] = [
  {
    src: image0,
    alt: 'Locacion destacada 1',
    widthClassName: 'w-[46vw] sm:w-[38vw] lg:w-[40vw]',
  },
  {
    src: image1,
    alt: 'Locacion destacada 2',
    widthClassName: 'w-[36vw] sm:w-[30vw] lg:w-[31vw]',
  },
  {
    src: image2,
    alt: 'Locacion destacada 3',
    widthClassName: 'w-[44vw] sm:w-[36vw] lg:w-[37vw]',
  },
  {
    src: image3,
    alt: 'Locacion destacada 4',
    widthClassName: 'w-[42vw] sm:w-[35vw] lg:w-[36vw]',
  },
  {
    src: image4,
    alt: 'Locacion destacada 5',
    widthClassName: 'w-[48vw] sm:w-[39vw] lg:w-[41vw]',
  },
  {
    src: image5,
    alt: 'Locacion destacada 6',
    widthClassName: 'w-[38vw] sm:w-[31vw] lg:w-[32vw]',
  },
  {
    src: image6,
    alt: 'Locacion destacada 7',
    widthClassName: 'w-[45vw] sm:w-[37vw] lg:w-[39vw]',
  },
  {
    src: image7,
    alt: 'Locacion destacada 8',
    widthClassName: 'w-[34vw] sm:w-[28vw] lg:w-[29vw]',
  },
  {
    src: image8,
    alt: 'Locacion destacada 9',
    widthClassName: 'w-[43vw] sm:w-[35vw] lg:w-[37vw]',
  },
]

const rows: MosaicRow[] = [
  {
    id: 'row-1',
    direction: 'left',
    duration: '57s',
    tiles: [tiles[0], tiles[1], tiles[2]],
  },
  {
    id: 'row-2',
    direction: 'right',
    duration: '57s',
    tiles: [tiles[3], tiles[4], tiles[5]],
  },
  {
    id: 'row-3',
    direction: 'left',
    duration: '57s',
    tiles: [tiles[6], tiles[7], tiles[8]],
  },
]

function isPriorityTile(rowId: string, tileIndex: number, sequenceIndex: number) {
  return sequenceIndex === 0 && rowId === 'row-1' && tileIndex < 2
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
              const isPriority = isPriorityTile(row.id, index, sequenceIndex)

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
                    loading={isPriority ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={isPriority ? 'high' : 'auto'}
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
