import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
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
            element: (
              <div className="p-12 font-['Geist']">
                <h1 className="text-4xl font-bold mb-4 font-['Bricolage_Grotesque']">Dashboard</h1>
                <p className="text-gray-400">Welcome to Caption Roulette! This is a protected route.</p>
              </div>
            )
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
