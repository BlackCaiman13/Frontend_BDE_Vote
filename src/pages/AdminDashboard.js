import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Users, Vote, CheckCircle, TrendingUp, Calendar, Clock } from 'lucide-react';

const AdminDashboard = () => {
  const { authRequest } = useAdmin();
  const [stats, setStats] = useState({
    total_voters: 0,
    total_tokens: 0,
    votes_cast: 0,
    total_candidates: 0,
    participation_rate: 0
  });
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  useEffect(() => {
    if (selectedElectionId && elections.length > 0) {
      const electionStats = elections.find(e => e.election_uid === selectedElectionId);
      if (electionStats) {
        setSelectedStats(electionStats);
        setStats({
          total_voters: electionStats.total_voters || 0,
          total_tokens: electionStats.total_tokens || 0,
          votes_cast: electionStats.votes_cast || 0,
          total_candidates: electionStats.total_candidates || 0,
          participation_rate: electionStats.participation_rate || 0
        });
      }
    }
  }, [selectedElectionId, elections]);

  const fetchStatistics = async () => {
    try {
      // GET /admin/stats avec refresh auto
      const response = await authRequest({ method: 'get', url: '/admin/stats' });
      const statsData = response.data;
      console.log('Stats fetched for dashboard:', statsData);
      
      // Si c'est un array de stats
      if (Array.isArray(statsData)) {
        setElections(statsData);
        if (statsData.length > 0) {
          setSelectedElectionId(statsData[0].election_uid);
        }
      } else {
        // Si c'est un objet unique
        setElections([statsData]);
        setSelectedElectionId(statsData.election_uid);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Électeurs Éligibles',
      value: stats.total_voters,
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      testId: 'stat-voters'
    },
    {
      title: 'Tokens Générés',
      value: stats.total_tokens,
      icon: CheckCircle,
      color: 'from-green-600 to-green-400',
      testId: 'stat-tokens'
    },
    {
      title: 'Votes Enregistrés',
      value: stats.votes_cast,
      icon: Vote,
      color: 'from-emerald-500 to-teal-500',
      testId: 'stat-votes'
    },
    {
      title: 'Taux de Participation',
      value: `${stats.participation_rate}%`,
      icon: TrendingUp,
      color: 'from-green-400 to-emerald-600',
      testId: 'stat-participation'
    }
  ];

  const getStatusBadge = () => {
    if (!stats.status) return null;
    
    const statusMap = {
      'Programmée': { label: 'Programmée', color: 'bg-slate-500' },
      'En Cours': { label: 'En Cours', color: 'bg-green-500' },
      'Terminée': { label: 'Terminée', color: 'bg-red-500' }
    };
    const statusInfo = statusMap[stats.status] || statusMap['Programmée'];
    return (
      <span className={`px-4 py-2 rounded-full text-white text-sm font-semibold ${statusInfo.color}`} data-testid="election-status-badge">
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96" data-testid="dashboard-loading">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8" data-testid="admin-dashboard">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2" data-testid="dashboard-title">Dashboard</h1>
          <p className="text-slate-600" data-testid="dashboard-description">Vue d'ensemble du scrutin</p>
        </div>

        {/* Election Selector */}
        {elections.length > 0 && (
          <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-6 flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="election-select" className="text-base font-semibold mb-3 block">
                  Sélectionner une élection
                </Label>
                <select
                  id="election-select"
                  value={selectedElectionId || ''}
                  onChange={(e) => setSelectedElectionId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                  data-testid="election-selector"
                >
                  {elections.map(election => (
                    <option key={election.election_uid} value={election.election_uid}>
                      {election.title}
                    </option>
                  ))}
                </select>
              </div>
              {getStatusBadge()}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow" data-testid={stat.testId}>
                <CardHeader className={`bg-gradient-to-r ${stat.color} text-white pb-4`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">{stat.title}</CardTitle>
                    <Icon className="w-8 h-8 opacity-80" />
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-slate-800" data-testid={`${stat.testId}-value`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedStats && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Informations sur le Scrutin</CardTitle>
              <CardDescription>{selectedStats.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">Candidats</span>
                  <span className="text-slate-900" data-testid="candidates-count">{stats.total_candidates}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">Électeurs Éligibles</span>
                  <span className="text-slate-900" data-testid="total-voters">{stats.total_voters}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">Votes Enregistrés</span>
                  <span className="text-slate-900" data-testid="votes-recorded">{stats.votes_cast}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">Votes Restants</span>
                  <span className="text-slate-900" data-testid="remaining-votes">
                    {Math.max(0, stats.total_voters - stats.votes_cast)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
