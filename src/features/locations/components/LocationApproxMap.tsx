/// <reference types="google.maps" />

import { APIProvider, AdvancedMarker, Circle, Map } from '@vis.gl/react-google-maps'

import approxMarkerUrl from '@/assets/map/location-approx-marker.svg'

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
      <div className="flex h-[15.5rem] w-full items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6 px-6 text-center text-sm text-brand-100/72 shadow-[0_18px_34px_rgba(0,0,0,0.12)]">
        Configura <code className="mx-1">VITE_GOOGLE_MAPS_API_KEY</code> para mostrar la zona aproximada.
      </div>
    )
  }

  return (
    <div className="h-[15.5rem] w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#EEE7DE] p-1 shadow-[0_18px_34px_rgba(0,0,0,0.18)]">
      <div className="h-[15.5rem] w-full overflow-hidden rounded-[1.2rem]">
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
            <AdvancedMarker
              position={center}
              clickable={false}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-transparent">
                <img
                  src={approxMarkerUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-11 w-11 select-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.32)]"
                  draggable={false}
                />
              </div>
            </AdvancedMarker>
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
