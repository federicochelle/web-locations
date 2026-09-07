import { recoverableImport, recovery } from '@/version-recovery/browser.ts'
import { Suspense, lazy, useEffect } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import { AuthLayout } from '@/layouts/AuthLayout.tsx'
import { PublicLayout } from '@/layouts/PublicLayout.tsx'
import { HomePage } from '@/pages/HomePage.tsx'
import { NotFoundPage } from '@/pages/NotFoundPage.tsx'
import { ProtectedRoute } from '@/routes/ProtectedRoute.tsx'
import { RouteErrorBoundary } from '@/routes/RouteErrorBoundary.tsx'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute.tsx'
import { RouteLoadingFallback } from '@/routes/RouteLoadingFallback.tsx'

const LoginPage = lazy(() =>
  recoverableImport(() => import('@/pages/LoginPage.tsx')).then((module) => ({
    default: module.LoginPage,
  })),
)
const RegisterPage = lazy(() =>
  recoverableImport(() => import('@/pages/RegisterPage.tsx')).then((module) => ({
    default: module.RegisterPage,
  })),
)
const ForgotPasswordPage = lazy(() =>
  recoverableImport(() => import('@/pages/ForgotPasswordPage.tsx')).then((module) => ({
    default: module.ForgotPasswordPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  recoverableImport(() => import('@/pages/ResetPasswordPage.tsx')).then((module) => ({
    default: module.ResetPasswordPage,
  })),
)
const SearchLocationsPage = lazy(() =>
  recoverableImport(() => import('@/pages/SearchLocationsPage.tsx')).then((module) => ({
    default: module.SearchLocationsPage,
  })),
)
const CategoryLocationsPage = lazy(() =>
  recoverableImport(() => import('@/pages/CategoryLocationsPage.tsx')).then((module) => ({
    default: module.CategoryLocationsPage,
  })),
)
const TermsPage = lazy(() =>
  recoverableImport(() => import('@/pages/TermsPage.tsx')).then((module) => ({
    default: module.TermsPage,
  })),
)
const PrivacyPage = lazy(() =>
  recoverableImport(() => import('@/pages/PrivacyPage.tsx')).then((module) => ({
    default: module.PrivacyPage,
  })),
)
const AboutPage = lazy(() =>
  recoverableImport(() => import('@/pages/AboutPage.tsx')).then((module) => ({
    default: module.AboutPage,
  })),
)
const LocationDetailPage = lazy(() =>
  recoverableImport(() => import('@/pages/LocationDetailPage.tsx')).then((module) => ({
    default: module.LocationDetailPage,
  })),
)
const LocationSubmissionPage = lazy(() =>
  recoverableImport(() => import('@/pages/LocationSubmissionPage.tsx')).then((module) => ({
    default: module.LocationSubmissionPage,
  })),
)
const DashboardPage = lazy(() =>
  recoverableImport(() => import('@/pages/DashboardPage.tsx')).then((module) => ({
    default: module.DashboardPage,
  })),
)
const ProfilePage = lazy(() =>
  recoverableImport(() => import('@/pages/ProfilePage.tsx')).then((module) => ({
    default: module.ProfilePage,
  })),
)
const FavoritesPage = lazy(() =>
  recoverableImport(() => import('@/pages/FavoritesPage.tsx')).then((module) => ({
    default: module.FavoritesPage,
  })),
)
const RequestsPage = lazy(() =>
  recoverableImport(() => import('@/pages/RequestsPage.tsx')).then((module) => ({
    default: module.RequestsPage,
  })),
)
const NewRequestProjectPage = lazy(() =>
  recoverableImport(() => import('@/pages/NewRequestProjectPage.tsx')).then((module) => ({
    default: module.NewRequestProjectPage,
  })),
)
const RequestDetailPage = lazy(() =>
  recoverableImport(() => import('@/pages/RequestDetailPage.tsx')).then((module) => ({
    default: module.RequestDetailPage,
  })),
)
function HealthyRoute({ children }: { children: React.ReactNode }) {
  useEffect(() => { recovery.acknowledgeHealthyRoute() }, [])
  return children
}

function withRouteSuspense(
  element: React.ReactNode,
  fallback: React.ReactNode = <RouteLoadingFallback />,
) {
  return <Suspense fallback={fallback}><HealthyRoute>{element}</HealthyRoute></Suspense>
}

const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteErrorBoundary />,
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
            element: withRouteSuspense(
              <CategoryLocationsPage />,
              <RouteLoadingFallback label="Cargando locaciones..." />,
            ),
          },
          {
            path: 'terminos',
            element: withRouteSuspense(<TermsPage />),
          },
          {
            path: 'privacidad',
            element: withRouteSuspense(<PrivacyPage />),
          },
          {
            path: 'nosotros',
            element: withRouteSuspense(<AboutPage />),
          },
          {
            element: <ProtectedRoute allowedRoles={['visitor', 'admin']} />,
            children: [
              {
                path: 'categorias/:categorySlug/:locationCode',
                element: withRouteSuspense(<LocationDetailPage />),
              },
              {
                path: 'locations/:slug',
                element: withRouteSuspense(<LocationDetailPage />),
              },
            ],
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
            path: 'admin',
            element: <Navigate replace to="/" />,
          },
          {
            path: 'admin/*',
            element: <Navigate replace to="/" />,
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
