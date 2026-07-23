import { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import { AuthLayout } from '@/layouts/AuthLayout.tsx'
import { PublicLayout } from '@/layouts/PublicLayout.tsx'
import { HomePage } from '@/pages/HomePage.tsx'
import { NotFoundPage } from '@/pages/NotFoundPage.tsx'
import { ProtectedRoute } from '@/routes/ProtectedRoute.tsx'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute.tsx'
import { RouteLoadingFallback } from '@/routes/RouteLoadingFallback.tsx'

const LoginPage = lazy(() =>
  import('@/pages/LoginPage.tsx').then((module) => ({
    default: module.LoginPage,
  })),
)
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage.tsx').then((module) => ({
    default: module.RegisterPage,
  })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage.tsx').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage.tsx').then((module) => ({
    default: module.ResetPasswordPage,
  })),
)
const SearchLocationsPage = lazy(() =>
  import('@/pages/SearchLocationsPage.tsx').then((module) => ({
    default: module.SearchLocationsPage,
  })),
)
const CategoryLocationsPage = lazy(() =>
  import('@/pages/CategoryLocationsPage.tsx').then((module) => ({
    default: module.CategoryLocationsPage,
  })),
)
const LocationDetailPage = lazy(() =>
  import('@/pages/LocationDetailPage.tsx').then((module) => ({
    default: module.LocationDetailPage,
  })),
)
const LocationSubmissionPage = lazy(() =>
  import('@/pages/LocationSubmissionPage.tsx').then((module) => ({
    default: module.LocationSubmissionPage,
  })),
)
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage.tsx').then((module) => ({
    default: module.DashboardPage,
  })),
)
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage.tsx').then((module) => ({
    default: module.ProfilePage,
  })),
)
const FavoritesPage = lazy(() =>
  import('@/pages/FavoritesPage.tsx').then((module) => ({
    default: module.FavoritesPage,
  })),
)
const RequestsPage = lazy(() =>
  import('@/pages/RequestsPage.tsx').then((module) => ({
    default: module.RequestsPage,
  })),
)
const NewRequestProjectPage = lazy(() =>
  import('@/pages/NewRequestProjectPage.tsx').then((module) => ({
    default: module.NewRequestProjectPage,
  })),
)
const RequestDetailPage = lazy(() =>
  import('@/pages/RequestDetailPage.tsx').then((module) => ({
    default: module.RequestDetailPage,
  })),
)
const AdminHomePage = lazy(() =>
  import('@/pages/AdminHomePage.tsx').then((module) => ({
    default: module.AdminHomePage,
  })),
)

function withRouteSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>
}

const router = createBrowserRouter([
  {
    path: '/',
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            element: <PublicOnlyRoute />,
            children: [
              {
                path: 'login',
                element: withRouteSuspense(<LoginPage />),
              },
              {
                path: 'register',
                element: withRouteSuspense(<RegisterPage />),
              },
            ],
          },
          {
            path: 'forgot-password',
            element: withRouteSuspense(<ForgotPasswordPage />),
          },
          {
            path: 'reset-password',
            element: withRouteSuspense(<ResetPasswordPage />),
          },
        ],
      },
      {
        element: <PublicLayout />,
        children: [
          {
            index: true,
            element: <HomePage />,
          },
          {
            path: 'busqueda',
            element: withRouteSuspense(<SearchLocationsPage />),
          },
          {
            path: 'categorias/:slug',
            element: withRouteSuspense(<CategoryLocationsPage />),
          },
          {
            path: 'categorias/:categorySlug/:locationCode',
            element: withRouteSuspense(<LocationDetailPage />),
          },
          {
            path: 'locations/:slug',
            element: withRouteSuspense(<LocationDetailPage />),
          },
          {
            path: 'postular-locacion',
            element: withRouteSuspense(<LocationSubmissionPage />),
          },
          {
            element: <ProtectedRoute allowedRoles={['visitor', 'admin']} />,
            children: [
              {
                path: 'dashboard',
                element: withRouteSuspense(<DashboardPage />),
              },
              {
                path: 'profile',
                element: withRouteSuspense(<ProfilePage />),
              },
              {
                path: 'favorites',
                element: withRouteSuspense(<FavoritesPage />),
              },
              {
                path: 'requests',
                element: withRouteSuspense(<RequestsPage />),
              },
              {
                path: 'requests/new',
                element: withRouteSuspense(<NewRequestProjectPage />),
              },
              {
                path: 'requests/:id',
                element: withRouteSuspense(<RequestDetailPage />),
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              {
                path: 'admin',
                element: withRouteSuspense(<AdminHomePage />),
              },
            ],
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
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
