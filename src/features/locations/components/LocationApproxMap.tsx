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
  approxLat: number | null
  approxLng: number | null
  approxRadius: number | null
}

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''

function LocationApproxMapPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex h-[15rem] w-full max-w-[26rem] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6 px-6 text-center text-sm text-brand-100/72 shadow-[0_18px_34px_rgba(0,0,0,0.12)]">
      {message}
    </div>
  )
}

export function LocationApproxMap({
  approxLat,
  approxLng,
  approxRadius,
}: LocationApproxMapProps) {
  if (approxLat === null || approxLng === null) {
    return <LocationApproxMapPlaceholder message="Mapa aproximado no disponible." />
  }

  const center = {
    lat: approxLat,
    lng: approxLng,
  } satisfies google.maps.LatLngLiteral

  const radius = approxRadius ?? DEFAULT_APPROX_RADIUS_METERS

  if (!googleMapsApiKey) {
    return (
      <LocationApproxMapPlaceholder message="Configura VITE_GOOGLE_MAPS_API_KEY para mostrar la zona aproximada." />
    )
  }

  return (
    <div className="w-full max-w-[26rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#EEE7DE] shadow-[0_18px_34px_rgba(0,0,0,0.18)]">
      <div className="h-[15rem] w-full">
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
