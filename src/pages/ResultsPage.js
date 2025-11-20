import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Users, Award } from 'lucide-react';

const ResultsPage = () => {
  const { authRequest } = useAdmin();
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [results, setResults] = useState({ candidates: [], total_votes: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElectionId) {
      fetchResults(selectedElectionId);
    }
  }, [selectedElectionId]);

  const fetchElections = async () => {
    try {
      const response = await authRequest({ method: 'get', url: '/admin/elections' });
      setElections(response.data || []);
      if (response.data && response.data.length > 0) {
        // Utiliser 'id' ou 'uid' selon ce que le backend retourne
        const firstElectionId = response.data[0].id || response.data[0].uid;
        setSelectedElectionId(firstElectionId);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des élections');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (electionId) => {
    setLoadingResults(true);
    try {
      // GET /admin/elections/<election_id>/results
      // Format de réponse: { election: {...}, results: [{ candidate_uid, name, prenom, photo, vote_count }] }
      const response = await authRequest({ 
        method: 'get',
        url: `/admin/elections/${electionId}/results`
      });
      
      const resultsData = response.data;
      console.log('Results fetched:', resultsData);

      // Transformer les résultats pour utiliser un format cohérent
      // Le backend retourne vote_count, on le convertit en votes pour la cohérence
      const candidates = (resultsData?.results || []).map(result => ({
        id: result.candidate_uid, // Utiliser candidate_uid comme id
        candidate_uid: result.candidate_uid,
        name: result.name,
        prenom: result.prenom,
        photo: result.photo,
        photo_url: result.photo, // Alias pour compatibilité
        votes: result.vote_count || 0, // Convertir vote_count en votes
        vote_count: result.vote_count || 0
      }));

      const total_votes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
      
      setResults({
        candidates: candidates,
        total_votes: total_votes
      });
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du chargement des résultats');
      setResults({
        candidates: [],
        total_votes: 0
      });
    } finally {
      setLoadingResults(false);
    }
  };

  const getPercentage = (votes) => {
    if (results.total_votes === 0) return 0;
    return Number(((votes / results.total_votes) * 100).toFixed(1));
  };

  const sortedCandidates = [...results.candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const winner = sortedCandidates.length > 0 && results.total_votes > 0 ? sortedCandidates[0] : null;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96" data-testid="results-loading">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8" data-testid="results-page">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2" data-testid="results-title">
            Résultats des Élections
          </h1>
          <p className="text-slate-600" data-testid="results-description">
            Consultez les résultats en temps réel pour chaque scrutin
          </p>
        </div>

        {/* Election Selector */}
        {elections.length > 0 && (
          <Card className="shadow-lg bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-200">
            <CardContent className="pt-6">
              <Label htmlFor="election-select" className="text-base font-semibold mb-3 block">
                Sélectionner une élection
              </Label>
              <select
                id="election-select"
                value={selectedElectionId || ''}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600 bg-white"
                data-testid="election-selector"
              >
                {elections.map(election => (
                  <option key={election.id || election.uid} value={election.id || election.uid}>
                    {election.title}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {!selectedElectionId && elections.length === 0 && (
          <Card className="shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-xl text-slate-500 mb-2">Aucune élection disponible</p>
              <p className="text-slate-400">Créez une élection pour voir les résultats</p>
            </CardContent>
          </Card>
        )}

        {selectedElectionId && (
          <>
            {loadingResults ? (
              <div className="flex items-center justify-center h-64" data-testid="results-loading">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent"></div>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <p className="text-xl text-slate-600" data-testid="total-votes">
                    <Users className="inline mr-2" size={24} />
                    {results.total_votes} votes enregistrés
                  </p>
                </div>

                {/* Winner card */}
                {winner && results.total_votes > 0 && (
              <Card className="mb-8 bg-gradient-to-r from-amber-50 to-yellow-50 border-4 border-amber-400 shadow-2xl" data-testid="winner-card">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center">
                    <Award className="w-10 h-10 text-amber-900" />
                  </div>
                  <CardTitle className="text-3xl text-amber-900">En Tête</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {winner.photo || winner.photo_url ? (
                      <img
                        src={winner.photo || winner.photo_url}
                        alt={winner.name || `${winner.prenom} ${winner.name}`}
                        className="w-24 h-24 rounded-full object-cover border-4 border-amber-400 shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                        {(winner.name || winner.prenom || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <h3 className="text-3xl font-bold text-amber-900" data-testid="winner-name">
                        {winner.prenom ? `${winner.prenom} ${winner.name}` : winner.name}
                      </h3>
                      <p className="text-amber-700 text-xl mt-1" data-testid="winner-votes">
                        {winner.votes || 0} votes ({getPercentage(winner.votes || 0)}%)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
                )}

                {/* All candidates */}
                {sortedCandidates.length === 0 ? (
              <Card className="shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-xl text-slate-500 mb-2">Aucun résultat disponible</p>
                  <p className="text-slate-400">Les résultats apparaîtront après les premiers votes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6" data-testid="candidates-results-list">
                {sortedCandidates.map((candidate, index) => (
                  <Card
                    key={candidate.id}
                    className="shadow-xl hover:shadow-2xl transition-all"
                    data-testid={`result-card-${candidate.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-6 mb-4">
                        <div className="text-3xl font-bold text-slate-400 w-12 text-center" data-testid={`candidate-rank-${candidate.id}`}>
                          #{index + 1}
                        </div>
                        <div className="flex-shrink-0">
                          {candidate.photo || candidate.photo_url ? (
                            <img
                              src={candidate.photo || candidate.photo_url}
                              alt={candidate.name || `${candidate.prenom} ${candidate.name}`}
                              className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                              {(candidate.name || candidate.prenom || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-slate-800 mb-1" data-testid={`result-name-${candidate.id}`}>
                            {candidate.prenom ? `${candidate.prenom} ${candidate.name}` : candidate.name}
                          </h3>
                          {candidate.description && (
                            <p className="text-slate-600" data-testid={`result-description-${candidate.id}`}>
                              {candidate.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold text-violet-600" data-testid={`result-votes-${candidate.id}`}>
                            {candidate.votes || 0}
                          </div>
                          <div className="text-sm text-slate-500" data-testid={`result-percentage-${candidate.id}`}>
                            {getPercentage(candidate.votes || 0)}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden" data-testid={`result-progress-${candidate.id}`}>
                        <div
                          className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-500 ease-out"
                          style={{ width: `${getPercentage(candidate.votes || 0)}%` }}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default ResultsPage;
