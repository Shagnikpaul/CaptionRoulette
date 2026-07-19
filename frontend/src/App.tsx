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
      {
        path: '',
        element: <ProtectedRoute />,
        children: [
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
            path: 'notifications',
            element: <NotificationsPage />
          },
        ]
      },
      // Public routes — no auth required
      {
        path: 'tags/:tagName',
        element: <TagPage />
      },
      {
        path: 'users/:username',
        element: <UserProfilePage />
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
