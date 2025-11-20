import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Vote, AlertCircle, Clock, CalendarX2 } from 'lucide-react';


const VotePage = () => {
  const { electionId, token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voting, setVoting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [voteState, setVoteState] = useState('loading'); // loading | ready | invalid | not-started | ended | already-voted
  const [timeline, setTimeline] = useState({ start: null, end: null });
  const [statusMessage, setStatusMessage] = useState('');
  const [countdownText, setCountdownText] = useState('');

  const getCandidateId = (candidate) => candidate?.uid || candidate?.id || candidate?.candidate_uid;

  const getPayload = (data) => {
    if (!data) return {};
    if (typeof data === 'object' && data.data && typeof data.data === 'object') {
      return { ...data.data };
    }
    return data;
  };

  const formatDateTime = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'short'
    });
  };

  const evaluateForbiddenResponse = useCallback((payload, message) => {
    const lowerMessage = message?.toLowerCase?.() || '';
    const start = payload?.start || null;
    const end = payload?.end || null;

    setTimeline(prev => ({
      start: start ?? prev.start,
      end: end ?? prev.end,
    }));
    setStatusMessage(message || '');

    if (lowerMessage.includes('vote déjà effectué')) {
      setVoteState('already-voted');
      toast.info('Vous avez déjà voté');
      return;
    }

    if (start && new Date(start).getTime() > Date.now()) {
      setVoteState('not-started');
      toast.info('Le scrutin n\'a pas encore commencé');
      return;
    }

    if (end) {
      setVoteState('ended');
      toast.error('L\'élection est terminée');
      return;
    }

    setVoteState('invalid');
    toast.error(message || 'Token invalide');
  }, []);

  const loadBallot = useCallback(async () => {
    if (!token || !electionId) {
      toast.error('Lien de vote invalide');
      setVoteState('invalid');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/elections/${electionId}/vote/${token}`);
      setCandidates(response.data.candidates || []);
      setTimeline({
        start: response.data?.election?.start_at || null,
        end: response.data?.election?.end_at || null,
      });
      setVoteState('ready');
      setStatusMessage('');
      setSelectedCandidate(null);
    } catch (error) {
      const payload = getPayload(error.response?.data);
      const message = payload?.error || payload?.detail || error.message;
      if (error.response?.status === 403) {
        evaluateForbiddenResponse(payload, message);
      } else {
        setVoteState('invalid');
        toast.error(message || 'Token invalide');
        setStatusMessage(message || '');
      }
    } finally {
      setLoading(false);
    }
  }, [token, electionId, evaluateForbiddenResponse]);

  useEffect(() => {
    loadBallot();
  }, [loadBallot]);
  
  useEffect(() => {
    if (voteState !== 'not-started' || !timeline.start) {
      setCountdownText('');
      return;
    }

    const target = new Date(timeline.start).getTime();
    if (Number.isNaN(target)) {
      setCountdownText('');
      return;
    }

    const updateCountdown = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdownText('');
        setVoteState('loading');
        loadBallot();
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (value) => String(value).padStart(2, '0');
      setCountdownText(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [voteState, timeline.start, loadBallot]);



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
      const payload = getPayload(error.response?.data);
      const message = payload?.detail || payload?.error || error.message;
      if (error.response?.status === 403) {
        if ((message || '').toLowerCase().includes('vote déjà effectué')) {
          setVoteState('already-voted');
          toast.info('Vous avez déjà voté');
        } else if (payload?.end) {
          setTimeline(prev => ({ ...prev, end: payload.end }));
          setVoteState('ended');
          toast.error('L\'élection est terminée');
        } else {
          toast.error(message || 'Action non autorisée');
        }
      } else {
        toast.error(message || 'Erreur lors du vote');
      }
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
          
        </Card>
      </div>
    );
  }

  if (voteState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 p-4" data-testid="vote-invalid-token">
        <Card className="max-w-md w-full shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Token invalide</CardTitle>
            <CardDescription>{statusMessage || 'Votre lien de vote n’est pas valide ou n’est plus actif.'}</CardDescription>
          </CardHeader>
          <CardContent>
            
          </CardContent>
        </Card>
      </div>
    );
  }

  if (voteState === 'not-started') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 p-4" data-testid="vote-not-started">
        <Card className="max-w-lg w-full shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-3xl text-amber-700">Scrutin à venir</CardTitle>
            <CardDescription>Le vote n’a pas encore commencé</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-600">Début prévu le {formatDateTime(timeline.start)}</p>
            <div className="text-4xl font-bold text-green-700 tracking-wide">
              {countdownText || '...'}
            </div>
            {timeline.end && (
              <p className="text-sm text-slate-500">
                Clôture le {formatDateTime(timeline.end)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (voteState === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 p-4" data-testid="vote-ended">
        <Card className="max-w-md w-full shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <CalendarX2 className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-3xl text-red-700">Élection terminée</CardTitle>
            <CardDescription>{statusMessage || 'Ce lien de vote est expiré.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {timeline.end && (
              <p className="text-slate-600">Scrutin clôturé le {formatDateTime(timeline.end)}</p>
            )}
            
          </CardContent>
        </Card>
      </div>
    );
  }

  if (voteState === 'already-voted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 p-4" data-testid="vote-already-voted">
        <Card className="max-w-md w-full shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-3xl text-slate-800">Vous avez déjà voté</CardTitle>
            <CardDescription>Ce lien a déjà été utilisé.</CardDescription>
          </CardHeader>
          
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
          {candidates.map((candidate) => {
            const candidateId = getCandidateId(candidate);
            return (
            <Card
              key={candidateId}
              className={`cursor-pointer transition-all hover:shadow-xl ${
                selectedCandidate === candidateId
                  ? 'ring-4 ring-green-600 shadow-2xl scale-[1.02]'
                  : 'hover:scale-[1.01]'
              }`}
              onClick={() => setSelectedCandidate(candidateId)}
              data-testid={`candidate-card-${candidateId}`}
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
                  <h3 className="text-2xl font-bold text-slate-800 mb-2" data-testid={`candidate-name-${candidateId}`}>
                    {candidate.name}  {candidate.prenom}
                  </h3>
                  <p className="text-slate-600" data-testid={`candidate-description-${candidateId}`}>
                    {candidate.description}
                  </p>
                </div>
                {selectedCandidate === candidateId && (
                  <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" data-testid={`candidate-selected-${candidateId}`} />
                )}
              </CardContent>
            </Card>
          )})}
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
