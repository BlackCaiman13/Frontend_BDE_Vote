import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/App.css';
import VotePage from '@/pages/VotePage';
import ResultsPage from '@/pages/ResultsPage';
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminCandidates from '@/pages/AdminCandidates';
import AdminVoters from '@/pages/AdminVoters';
import AdminElection from '@/pages/AdminElection';
import { AdminProvider } from '@/contexts/AdminContext';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  return (
    <AdminProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/results" replace />} />
            <Route path="/elections/:electionId/vote/:token" element={<VotePage />} />
            <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/candidates" element={<ProtectedRoute><AdminCandidates /></ProtectedRoute>} />
            <Route path="/admin/voters" element={<ProtectedRoute><AdminVoters /></ProtectedRoute>} />
            <Route path="/admin/election" element={<ProtectedRoute><AdminElection /></ProtectedRoute>} />
            
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </AdminProvider>
  );
}

export default App;
