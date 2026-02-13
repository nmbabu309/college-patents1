import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Upload from './pages/Upload';
import AdminPage from './components/data/AdminPage';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/common/ErrorBoundary';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null; // Or a spinner

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={
            <ErrorBoundary>
              <Home />
            </ErrorBoundary>
          } />
          <Route
            path="/upload"
            element={
              <ErrorBoundary>
                <ProtectedRoute>
                  <Upload />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ErrorBoundary>
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          {/* Catch all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            // Define default options
            className: '',
            duration: 5000,
            style: {
              background: '#363636',
              color: '#fff',
              padding: '16px',
              borderRadius: '16px',
              fontSize: '16px',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            },

            // Default options for specific types
            success: {
              duration: 5000,
              style: {
                background: '#22c55e', // Bright vivid green
                color: '#ffffff',
                fontWeight: '600',
                border: 'none',
                padding: '16px 24px',
                fontSize: '16px',
              },
              iconTheme: {
                primary: '#ffffff',
                secondary: '#22c55e',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#ef4444', // Bright vivid red
                color: '#ffffff',
                fontWeight: '600',
                border: 'none',
                padding: '16px 24px',
                fontSize: '16px',
              },
              iconTheme: {
                primary: '#ffffff',
                secondary: '#ef4444',
              },
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
