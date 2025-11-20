import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, User, Upload } from 'lucide-react';

const AdminCandidates = () => {
  const { authRequest } = useAdmin();
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    prenom: '',
    photo: null,
    photoPreview: null
  });
  const photoInputRef = useRef(null);

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElectionId) {
      fetchCandidates(selectedElectionId);
    }
  }, [selectedElectionId]);

  const fetchElections = async () => {
    try {
      // GET /api/v1/admin/elections avec refresh auto
      const response = await authRequest({ method: 'get', url: '/admin/elections' });
      setElections(response.data);
      console.log('Elections fetched:', response.data); // Debug log
      if (response.data.length > 0) {
        setSelectedElectionId(response.data[0].uid);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des élections');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (electionId) => {
    try {
      // GET /admin/elections/<election_id>/candidates avec refresh auto
      const response = await authRequest({
        method: 'get',
        url: `/admin/elections/${electionId}/candidates`
      });
      setCandidates(response.data);
      console.log('Candidates fetched:', response.data); // Debug log
    } catch (error) {
      toast.error('Erreur lors du chargement des candidats');
      setCandidates([]);
    }
  };

  const handleElectionChange = (electionId) => {
    setSelectedElectionId(electionId);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          photo: file,
          photoPreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedElectionId) {
      toast.error('Veuillez sélectionner une élection');
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('prenom', formData.prenom);
      if (formData.photo) {
        submitData.append('photo', formData.photo);
      }

      // POST /api/v1/admin/elections/<election_id>/candidates avec refresh auto
      await authRequest({
        method: 'post',
        url: `/admin/elections/${selectedElectionId}/candidates`,
        data: submitData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Candidat ajouté avec succès');
      fetchCandidates(selectedElectionId);
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  

  const handleEdit = (candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      name: candidate.name,
      prenom: candidate.prenom || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (candidateId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce candidat ?')) return;

    try {
      // DELETE /admin/elections/<id>/candidates/<id> avec refresh auto
      await authRequest({
        method: 'delete',
        url: `/admin/elections/${selectedElectionId}/candidates/${candidateId}`
      });
      toast.success('Candidat supprimé');
      fetchCandidates(selectedElectionId);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', prenom: '', photo: null, photoPreview: null });
    setEditingCandidate(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8" data-testid="admin-candidates-page">
        {/* Page Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2" data-testid="candidates-title">Gestion des Candidats</h1>
          <p className="text-slate-600" data-testid="candidates-description">Ajoutez et gérez les candidats du scrutin</p>
        </div>

        {/* Election Selector - At Top */}
        {elections.length > 0 && (
          <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-6">
              <Label htmlFor="election-select" className="text-base font-semibold mb-3 block">
                Sélectionner une élection
              </Label>
              <select
                id="election-select"
                value={selectedElectionId || ''}
                onChange={(e) => handleElectionChange(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                data-testid="election-selector"
              >
                {elections.map(election => (
                  <option key={election.uid} value={election.uid}>
                    {election.title}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {/* Add Candidate Button */}
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600" data-testid="add-candidate-button">
                <Plus className="mr-2" size={20} />
                Ajouter un candidat
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="candidate-dialog">
              <DialogHeader>
                <DialogTitle data-testid="dialog-title">
                  Nouveau candidat
                </DialogTitle>
                <DialogDescription>
                  Remplissez les informations du candidat
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="candidate-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                    data-testid="candidate-prenom-input"
                  />
                </div>
                <div>
                  <Label htmlFor="photo">Photo du candidat</Label>
                  <div className="flex gap-2 items-end">
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      ref={photoInputRef}
                      className="flex-1"
                      data-testid="candidate-photo-input"
                    />
                    {formData.photoPreview && (
                      <div className="flex-shrink-0">
                        <img
                          src={formData.photoPreview}
                          alt="Preview"
                          className="w-12 h-12 rounded-full object-cover border-2 border-green-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" data-testid="save-candidate-button">
                    Ajouter
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    data-testid="cancel-button"
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96" data-testid="candidates-loading">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="candidates-list">
            {candidates.map((candidate) => (
              <Card key={candidate.id} className="shadow-lg hover:shadow-xl transition-shadow" data-testid={`candidate-item-${candidate.id}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {candidate.photo ? (
                        <img
                          src={candidate.photo}
                          alt={`${candidate.prenom} ${candidate.name}`}
                          className="w-16 h-16 rounded-full object-cover shadow-md border-2 border-green-600"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-white text-xl font-bold shadow-md">
                          {candidate.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1" data-testid={`candidate-name-${candidate.id}`}>
                        {candidate.prenom} {candidate.name}
                      </CardTitle>
                      <p className="text-sm text-slate-600" data-testid={`candidate-votes-${candidate.id}`}>
                        {candidate.votes || 0} votes
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(candidate)}
                        data-testid={`edit-candidate-${candidate.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(candidate.id)}
                        data-testid={`delete-candidate-${candidate.id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {!loading && candidates.length === 0 && (
          <Card className="shadow-lg" data-testid="no-candidates">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <User className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-xl text-slate-500 mb-2">Aucun candidat</p>
              <p className="text-slate-400">Commencez par ajouter votre premier candidat</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCandidates;
