import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import { PublicLayout } from '@/layouts/PublicLayout.tsx'
import { AdminHomePage } from '@/pages/AdminHomePage.tsx'
import { DashboardPage } from '@/pages/DashboardPage.tsx'
import { FavoritesPage } from '@/pages/FavoritesPage.tsx'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage.tsx'
import { HomePage } from '@/pages/HomePage.tsx'
import { LoginPage } from '@/pages/LoginPage.tsx'
import { LocationDetailPage } from '@/pages/LocationDetailPage.tsx'
import { LocationsPage } from '@/pages/LocationsPage.tsx'
import { NotFoundPage } from '@/pages/NotFoundPage.tsx'
import { ProfilePage } from '@/pages/ProfilePage.tsx'
import { RegisterPage } from '@/pages/RegisterPage.tsx'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage.tsx'
import { ProtectedRoute } from '@/routes/ProtectedRoute.tsx'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute.tsx'

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
        element: <PublicOnlyRoute />,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
        ],
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'reset-password',
        element: <ResetPasswordPage />,
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
        element: <ProtectedRoute allowedRoles={['visitor']} />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'favorites',
            element: <FavoritesPage />,
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['admin']} />,
        children: [
          {
            path: 'admin',
            element: <AdminHomePage />,
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
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
