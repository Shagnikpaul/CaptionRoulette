import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { HomePage } from './pages/HomePage';
import { SettledPage } from './pages/SettledPage';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

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
          }
        ]
      }
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
