import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Users, UserCheck, Settings, FileText, CheckCircle2, Award, Trophy } from 'lucide-react';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, adminEmail } = useAdmin();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/candidates', icon: Users, label: 'Candidats' },
    { path: '/admin/voters', icon: UserCheck, label: 'Électeurs' },
    { path: '/admin/election', icon: CheckCircle2, label: 'Scrutin' },
    { path: '/results', icon: Trophy, label: 'Résultats' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl border-r border-slate-200 z-50">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-300 to-green-600 bg-clip-text text-transparent" data-testid="admin-title">
            Election BDE
          </h1>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-green-600 to-green-300 text-white shadow-lg'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center gap-2 "
            data-testid="logout-button"
          >
            <LogOut size={18} />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen p-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
