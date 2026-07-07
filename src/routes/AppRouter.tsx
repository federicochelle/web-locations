import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import { PublicLayout } from '@/layouts/PublicLayout.tsx'
import { HomePage } from '@/pages/HomePage.tsx'
import { LocationDetailPage } from '@/pages/LocationDetailPage.tsx'
import { LocationsPage } from '@/pages/LocationsPage.tsx'
import { NotFoundPage } from '@/pages/NotFoundPage.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'locations',
        element: <LocationsPage />,
      },
      {
        path: 'locations/:slug',
        element: <LocationDetailPage />,
      },
      {
        path: '404',
        element: <NotFoundPage />,
      },
      {
        path: '*',
        element: <Navigate replace to="/404" />,
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
