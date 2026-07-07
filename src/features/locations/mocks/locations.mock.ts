import type {
  Category,
  Department,
  Feature,
  Location,
  LocationFeature,
  Zone,
} from '@/types/location.ts'

export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Casas',
    slug: 'casas',
    description: 'Residencias y hogares con perfiles visuales variados.',
  },
  {
    id: 'cat-2',
    name: 'Espacios industriales',
    slug: 'espacios-industriales',
    description: 'Naves, depósitos y estructuras de carácter productivo.',
  },
  {
    id: 'cat-3',
    name: 'Campo',
    slug: 'campo',
    description: 'Entornos naturales, chacras y paisajes abiertos.',
  },
  {
    id: 'cat-4',
    name: 'Comercial',
    slug: 'comercial',
    description: 'Locales, showrooms y espacios de atención al público.',
  },
]

export const mockDepartments: Department[] = [
  { id: 'dep-1', name: 'Montevideo', slug: 'montevideo' },
  { id: 'dep-2', name: 'Maldonado', slug: 'maldonado' },
  { id: 'dep-3', name: 'Canelones', slug: 'canelones' },
]

export const mockZones: Zone[] = [
  { id: 'zone-1', departmentId: 'dep-1', name: 'Carrasco', slug: 'carrasco' },
  { id: 'zone-2', departmentId: 'dep-2', name: 'José Ignacio', slug: 'jose-ignacio' },
  { id: 'zone-3', departmentId: 'dep-3', name: 'Atlántida', slug: 'atlantida' },
]

export const mockFeatures: Feature[] = [
  { id: 'feature-1', name: 'Luz natural', slug: 'luz-natural' },
  { id: 'feature-2', name: 'Estacionamiento', slug: 'estacionamiento' },
  { id: 'feature-3', name: 'Exterior amplio', slug: 'exterior-amplio' },
  { id: 'feature-4', name: 'Acceso técnico', slug: 'acceso-tecnico' },
]

const locationFeatureMap: Record<string, Feature[]> = {
  'loc-1': [mockFeatures[0], mockFeatures[1], mockFeatures[2]],
  'loc-2': [mockFeatures[0], mockFeatures[3]],
  'loc-3': [mockFeatures[1], mockFeatures[2], mockFeatures[3]],
}

export const mockLocationFeatures: LocationFeature[] = Object.entries(
  locationFeatureMap,
).flatMap(([locationId, features]) =>
  features.map((feature) => ({
    id: `${locationId}-${feature.id}`,
    locationId,
    featureId: feature.id,
    feature,
  })),
)

export const mockLocations: Location[] = [
  {
    id: 'loc-1',
    slug: 'casa-editorial-carrasco',
    name: 'Casa Editorial Carrasco',
    shortDescription: 'Residencia luminosa con living amplio, jardín y estética contemporánea.',
    description:
      'Mock de detalle para la base pública. Este contenido representa el futuro bloque editorial donde se mostrará información curada, condiciones de uso y material visual.',
    capacity: 30,
    priceLabel: 'Desde USD 950',
    isFeatured: true,
    category: mockCategories[0],
    department: mockDepartments[0],
    zone: mockZones[0],
    images: [
      {
        id: 'img-1',
        locationId: 'loc-1',
        url: 'mock://casa-editorial-carrasco/1',
        alt: 'Fachada principal',
        isPrimary: true,
        sortOrder: 1,
      },
      {
        id: 'img-2',
        locationId: 'loc-1',
        url: 'mock://casa-editorial-carrasco/2',
        alt: 'Living principal',
        isPrimary: false,
        sortOrder: 2,
      },
      {
        id: 'img-3',
        locationId: 'loc-1',
        url: 'mock://casa-editorial-carrasco/3',
        alt: 'Jardín exterior',
        isPrimary: false,
        sortOrder: 3,
      },
    ],
    features: locationFeatureMap['loc-1'],
  },
  {
    id: 'loc-2',
    slug: 'galpon-industrial-bahia',
    name: 'Galpón Industrial Bahía',
    shortDescription: 'Espacio de gran escala con doble altura y recorrido técnico simple.',
    description:
      'Mock de locación industrial para preparar galerías, ficha técnica y recomendaciones de locaciones similares.',
    capacity: 80,
    priceLabel: 'Desde USD 1.500',
    isFeatured: true,
    category: mockCategories[1],
    department: mockDepartments[0],
    zone: {
      id: 'zone-4',
      departmentId: 'dep-1',
      name: 'Paso de la Arena',
      slug: 'paso-de-la-arena',
    },
    images: [
      {
        id: 'img-4',
        locationId: 'loc-2',
        url: 'mock://galpon-industrial-bahia/1',
        alt: 'Vista general interior',
        isPrimary: true,
        sortOrder: 1,
      },
      {
        id: 'img-5',
        locationId: 'loc-2',
        url: 'mock://galpon-industrial-bahia/2',
        alt: 'Acceso de carga',
        isPrimary: false,
        sortOrder: 2,
      },
    ],
    features: locationFeatureMap['loc-2'],
  },
  {
    id: 'loc-3',
    slug: 'chacra-oceano-atlantida',
    name: 'Chacra Océano Atlántida',
    shortDescription: 'Paisaje costero con campo abierto, árboles maduros y construcciones auxiliares.',
    description:
      'Mock de locación exterior para representar estructura de información, amenities y recomendaciones cruzadas.',
    capacity: 120,
    priceLabel: 'Desde USD 1.200',
    isFeatured: false,
    category: mockCategories[2],
    department: mockDepartments[2],
    zone: mockZones[2],
    images: [
      {
        id: 'img-6',
        locationId: 'loc-3',
        url: 'mock://chacra-oceano-atlantida/1',
        alt: 'Camino de acceso',
        isPrimary: true,
        sortOrder: 1,
      },
      {
        id: 'img-7',
        locationId: 'loc-3',
        url: 'mock://chacra-oceano-atlantida/2',
        alt: 'Vista del campo',
        isPrimary: false,
        sortOrder: 2,
      },
      {
        id: 'img-8',
        locationId: 'loc-3',
        url: 'mock://chacra-oceano-atlantida/3',
        alt: 'Sector arbolado',
        isPrimary: false,
        sortOrder: 3,
      },
    ],
    features: locationFeatureMap['loc-3'],
  },
]
