import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { HomePage } from './pages/HomePage';
import { SettledPage } from './pages/SettledPage';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import PostDetailsPage from './pages/PostDetailsPage';
import { TagPage } from './pages/TagPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // Public routes — no auth required
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'settled',
        element: <SettledPage />
      },
      {
        path: 'posts/:postId',
        element: <PostDetailsPage />
      },
      {
        path: 'tags/:tagName',
        element: <TagPage />
      },
      {
        path: 'users/:username',
        element: <UserProfilePage />
      },
      // Protected routes — auth required
      {
        path: '',
        element: <ProtectedRoute />,
        children: [
          {
            path: 'notifications',
            element: <NotificationsPage />
          },
        ]
      },
    ]
  }
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster theme="dark" />
    </AuthProvider>
  );
}

export default App;
