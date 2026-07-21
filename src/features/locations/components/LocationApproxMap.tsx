/// <reference types="google.maps" />

import { APIProvider, Circle, Map } from '@vis.gl/react-google-maps'

const GOOGLE_MAP_LIBRARIES: string[] = []
const DEFAULT_APPROX_RADIUS_METERS = 700
const LOCATION_APPROX_MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
]

type LocationApproxMapProps = {
  approxLat: number
  approxLng: number
  approxRadius: number | null
}

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''

export function LocationApproxMap({
  approxLat,
  approxLng,
  approxRadius,
}: LocationApproxMapProps) {
  const center = {
    lat: approxLat,
    lng: approxLng,
  } satisfies google.maps.LatLngLiteral

  const radius = approxRadius ?? DEFAULT_APPROX_RADIUS_METERS

  if (!googleMapsApiKey) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/6 px-6 text-center text-sm text-brand-100/72">
        Configura <code className="mx-1">VITE_GOOGLE_MAPS_API_KEY</code> para mostrar la zona aproximada.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#EEE7DE] shadow-[0_20px_44px_rgba(0,0,0,0.12)]">
      <div className="border-b border-black/6 px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          Zona aproximada
        </p>
        <p className="mt-1 text-sm text-sand-700">
          Referencia visual estimada dentro de un radio de {radius} m.
        </p>
      </div>
      <div className="aspect-[16/9] min-h-[18rem]">
        <APIProvider apiKey={googleMapsApiKey} libraries={GOOGLE_MAP_LIBRARIES}>
          <Map
            defaultCenter={center}
            defaultZoom={14}
            gestureHandling="cooperative"
            disableDefaultUI
            clickableIcons={false}
            mapTypeControl={false}
            fullscreenControl={false}
            streetViewControl={false}
            zoomControl
            reuseMaps
            className="h-full w-full"
            styles={LOCATION_APPROX_MAP_STYLES}
          >
            <Circle
              center={center}
              radius={radius}
              strokeColor="#7C5B42"
              strokeOpacity={0.95}
              strokeWeight={2}
              fillColor="#C8AB8C"
              fillOpacity={0.28}
              clickable={false}
            />
          </Map>
        </APIProvider>
      </div>
    </div>
  )
}
