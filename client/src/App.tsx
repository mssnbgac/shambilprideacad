import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import Layout from './components/Layout.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Homepage from './pages/Homepage.tsx';
import Students from './pages/Students.tsx';
import Teachers from './pages/Teachers.tsx';
import Classes from './pages/Classes.tsx';
import Attendance from './pages/Attendance.tsx';
import Grades from './pages/Grades.tsx';
import Fees from './pages/Fees.tsx';
import Profile from './pages/Profile.tsx';
import TestFormPage from './TestFormPage.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/homepage" element={<Homepage />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/homepage" />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/students/*" element={<Students />} />
                <Route path="/teachers/*" element={<Teachers />} />
                <Route path="/classes/*" element={<Classes />} />
                <Route path="/attendance/*" element={<Attendance />} />
                <Route path="/grades/*" element={<Grades />} />
                <Route path="/fees/*" element={<Fees />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/test-form" element={<TestFormPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="App">
            <AppRoutes />
            <Toaster position="top-right" />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;