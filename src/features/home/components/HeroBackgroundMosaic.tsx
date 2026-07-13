import type { CSSProperties } from 'react'
import image0 from '@/assets/home-mosaic/foto.avif'
import image1 from '@/assets/home-mosaic/foto1.avif'
import image2 from '@/assets/home-mosaic/foto2.jpg'
import image3 from '@/assets/home-mosaic/foto3.avif'
import image4 from '@/assets/home-mosaic/foto4.jpeg'
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
  offset: string
  tiles: MosaicTile[]
  hiddenBelowDesktop?: boolean
}

const baseTiles: MosaicTile[] = [
  {
    src: image0,
    alt: 'Locacion cinematografica exterior',
    widthClassName: 'w-[42vw] sm:w-[28vw] lg:w-[19vw] xl:w-[17vw]',
  },
  {
    src: image1,
    alt: 'Interior de locacion para produccion',
    widthClassName: 'w-[34vw] sm:w-[24vw] lg:w-[16vw] xl:w-[14vw]',
  },
  {
    src: image2,
    alt: 'Locacion urbana en Uruguay',
    widthClassName: 'w-[46vw] sm:w-[30vw] lg:w-[21vw] xl:w-[18vw]',
  },
  {
    src: image3,
    alt: 'Locacion editorial con luz natural',
    widthClassName: 'w-[36vw] sm:w-[26vw] lg:w-[17vw] xl:w-[15vw]',
  },
  {
    src: image4,
    alt: 'Espacio arquitectonico para rodaje',
    widthClassName: 'w-[48vw] sm:w-[32vw] lg:w-[22vw] xl:w-[19vw]',
  },
  {
    src: image5,
    alt: 'Locacion premium para fotografia',
    widthClassName: 'w-[38vw] sm:w-[27vw] lg:w-[18vw] xl:w-[16vw]',
  },
]

const rows: MosaicRow[] = [
  {
    id: 'row-1',
    direction: 'left',
    duration: '35s',
    offset: '-12%',
    tiles: [baseTiles[0], baseTiles[2], baseTiles[4], baseTiles[1], baseTiles[5], baseTiles[3]],
  },
  {
    id: 'row-2',
    direction: 'right',
    duration: '42s',
    offset: '-28%',
    tiles: [baseTiles[3], baseTiles[1], baseTiles[5], baseTiles[0], baseTiles[2], baseTiles[4]],
  },
  {
    id: 'row-3',
    direction: 'left',
    duration: '38s',
    offset: '-18%',
    tiles: [baseTiles[4], baseTiles[2], baseTiles[0], baseTiles[5], baseTiles[3], baseTiles[1]],
  },
  {
    id: 'row-4',
    direction: 'right',
    duration: '46s',
    offset: '-34%',
    tiles: [baseTiles[5], baseTiles[3], baseTiles[1], baseTiles[4], baseTiles[0], baseTiles[2]],
    hiddenBelowDesktop: true,
  },
]

function MosaicTrack({ row }: { row: MosaicRow }) {
  const duplicatedTiles = [...row.tiles, ...row.tiles]

  return (
    <div className={`relative overflow-hidden ${row.hiddenBelowDesktop ? 'hidden lg:block' : ''}`}>
      <div
        className={`hero-mosaic-track hero-mosaic-track-${row.direction} flex w-max gap-px will-change-transform motion-reduce:transform-none motion-reduce:animate-none`}
        style={
          {
            '--hero-duration': row.duration,
            '--hero-offset': row.offset,
          } as CSSProperties
        }
      >
        {duplicatedTiles.map((tile, index) => (
          <div
            key={`${row.id}-${tile.src}-${index}`}
            className={`relative h-[160px] overflow-hidden sm:h-[172px] lg:h-[150px] xl:h-[164px] ${tile.widthClassName}`}
          >
            <img
              src={tile.src}
              alt={tile.alt}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function HeroBackgroundMosaic() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="grid h-full grid-rows-3 gap-px lg:grid-rows-4">
        {rows.map((row) => (
          <MosaicTrack key={row.id} row={row} />
        ))}
      </div>

      <div className="absolute inset-0 bg-black/70" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.64),rgba(5,4,4,0.72)_38%,rgba(5,4,4,0.8))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.1),transparent_22%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.05),transparent_20%),radial-gradient(circle_at_50%_50%,transparent_48%,rgba(0,0,0,0.22)_100%)]" />
    </div>
  )
}
