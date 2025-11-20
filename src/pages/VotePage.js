import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Vote, AlertCircle } from 'lucide-react';

// Using centralized API helper (baseURL = REACT_APP_BACKEND_URL + /api/v1)
const API = '';


const VotePage = () => {
  const { electionId, token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voting, setVoting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);

  useEffect(() => {
    if (!token || !electionId) {
      toast.error('Lien de vote invalide');
      setLoading(false);
      return;
    }
    // GET /api/v1/elections/<election_id>/vote/<token_hash>
    // Response: { election: {...}, candidates: [...] }
    (async () => {
      try {
        const response = await api.get(`/elections/${electionId}/vote/${token}`);
        setCandidates(response.data.candidates || []);
        setValidToken(true);
        console.log('Token valid, candidates fetched:', response);
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Token invalide');
        setValidToken(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, electionId]);



  // removed: validateToken and fetchCandidates; using combined endpoint in useEffect above


  const handleVote = async () => {
    if (!selectedCandidate) {
      toast.error('Veuillez sélectionner un candidat');
      return;
    }

    setVoting(true);
    try {
      // POST /api/v1/elections/<election_id>/vote/<token_hash>
      // Body: { "candidate_id": <id> }
      await api.post(`/elections/${electionId}/vote/${token}`, {
        candidate_id: selectedCandidate,
      });
      setVoteSuccess(true);
      toast.success('Vote enregistré avec succès !');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du vote');
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100" data-testid="vote-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 p-4" data-testid="vote-invalid-token">
        <Card className="max-w-md w-full shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Token Invalide</CardTitle>
            <CardDescription>Votre lien de vote n'est pas valide ou a déjà été utilisé.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/results')} className="w-full" data-testid="view-results-button">
              Voir les résultats
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (voteSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 p-4" data-testid="vote-success">
        <Card className="max-w-md w-full shadow-2xl animate-slide-up">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-600">Vote Enregistré !</CardTitle>
            <CardDescription className="text-lg mt-2">Merci pour votre participation</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 mb-4">Redirection vers les résultats...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 py-12 px-4" data-testid="vote-page">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent" data-testid="vote-title">
            Vote Sécurisé
          </h1>
          <p className="text-lg text-slate-600" data-testid="vote-description">
            Sélectionnez votre candidat préféré
          </p>
        </div>

        <div className="grid gap-6 mb-8" data-testid="candidates-list">
          {candidates.map((candidate) => (
            <Card
              key={candidate.id}
              className={`cursor-pointer transition-all hover:shadow-xl ${
                selectedCandidate === candidate.id
                  ? 'ring-4 ring-green-600 shadow-2xl scale-[1.02]'
                  : 'hover:scale-[1.01]'
              }`}
              onClick={() => setSelectedCandidate(candidate.id)}
              data-testid={`candidate-card-${candidate.id}`}
            >
              <CardContent className="p-6 flex items-center gap-6">
                <div className="flex-shrink-0">
                  {candidate.photo ? (
                    <img
                      src={candidate.photo}
                      alt={candidate.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {candidate.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2" data-testid={`candidate-name-${candidate.id}`}>
                    {candidate.name}  {candidate.prenom}
                  </h3>
                  <p className="text-slate-600" data-testid={`candidate-description-${candidate.id}`}>
                    {candidate.description}
                  </p>
                </div>
                {selectedCandidate === candidate.id && (
                  <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" data-testid={`candidate-selected-${candidate.id}`} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleVote}
            disabled={!selectedCandidate || voting}
            size="lg"
            className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-xl"
            data-testid="submit-vote-button"
          >
            {voting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Envoi en cours...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Vote size={20} />
                Confirmer mon vote
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VotePage;
