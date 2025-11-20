import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, Plus, Trash2, Pencil } from 'lucide-react';

const AdminElection = () => {
  const { authRequest } = useAdmin();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', start_at: '', end_at: '' });
  const [editingElection, setEditingElection] = useState(null);
  const [editFormData, setEditFormData] = useState({ title: '', start_at: '', end_at: '' });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [electionToDelete, setElectionToDelete] = useState(null);

  useEffect(() => {
    fetchElections();
  }, []);

  const getElectionUid = (election) => election?.uid || election?.id || election?.election_uid;

  const fetchElections = async () => {
    try {
      const response = await authRequest({ method: 'get', url: '/admin/elections' });
      setElections(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des élections');
      
    } finally {
      setLoading(false);
    }
  };

  const formatForBackend = (dt) => {
    const d = new Date(dt);
    const pad = (n) => String(n).padStart(2, '0');
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
  };

  const formatForInput = (dateValue) => {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  };

  const validateForm = (payload) => {
    if (!payload.title || !payload.start_at || !payload.end_at) {
      toast.error('Veuillez renseigner le titre, la date de début et la date de fin');
      return false;
    }
    const start = new Date(payload.start_at);
    const end = new Date(payload.end_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      toast.error('Les dates sont invalides ou la date de début doit être antérieure à la date de fin');
      return false;
    }
    return true;
  };

  const handleCreateElection = async (e) => {
    e.preventDefault();

    if (!validateForm(formData)) {
      return;
    }

    setActionLoading(true);
    try {
      const start_at = formatForBackend(formData.start_at);
      const end_at = formatForBackend(formData.end_at);
      

      const payload = {
        title: formData.title,
        start_at,
        end_at,
      };

      await authRequest({
        method: 'post',
        url: '/admin/elections',
        data: payload,
      });

      toast.success('Élection créée avec succès');
      setFormData({ title: '', start_at: '', end_at: '' });
      setDialogOpen(false);
      fetchElections();
    } catch (error) {
      console.error('Erreur création élection complète:', error);
      console.error('Response data:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setActionLoading(false);
    }
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingElection(null);
    setEditFormData({ title: '', start_at: '', end_at: '' });
  };

  const openEditDialog = (election) => {
    setEditingElection(election);
    setEditFormData({
      title: election.title || '',
      start_at: formatForInput(election.start_at),
      end_at: formatForInput(election.end_at),
    });
    setEditDialogOpen(true);
  };

  const handleUpdateElection = async (e) => {
    e.preventDefault();
    if (!editingElection) return;

    if (!validateForm(editFormData)) {
      return;
    }

    const payload = {
      title: editFormData.title,
      start_at: formatForBackend(editFormData.start_at),
      end_at: formatForBackend(editFormData.end_at),
    };

    setActionLoading(true);
    try {
      await authRequest({
        method: 'patch',
        url: `/admin/elections/${getElectionUid(editingElection)}`,
        data: payload,
      });
      toast.success('Élection mise à jour');
      closeEditDialog();
      fetchElections();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteElection = (electionId) => {
    setElectionToDelete(electionId);
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteElection = async () => {
    if (!electionToDelete) return;
    setConfirmDeleteOpen(false);
    setActionLoading(true);
    try {
      await authRequest({
        method: 'delete',
        url: `/admin/elections/${electionToDelete}`,
      });
      toast.success('Élection supprimée');
      fetchElections();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
      setElectionToDelete(null);
    }
  };

  const getElectionStatus = (election) => {
    const now = new Date();
    const startAt = new Date(election.start_at);
    const endAt = new Date(election.end_at);

    if (now < startAt) return { label: 'Programmée', color: 'bg-slate-100 text-slate-700' };
    if (now >= startAt && now < endAt) return { label: 'En Cours', color: 'bg-green-100 text-green-700' };
    return { label: 'Terminée', color: 'bg-red-100 text-red-700' };
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8" data-testid="admin-election-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Gestion des Élections</h1>
            <p className="text-slate-600">Gérez vos scrutins et consultez les résultats</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
                <Plus className="mr-2" size={20} />
                Nouvelle Élection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une nouvelle élection</DialogTitle>
                <DialogDescription>
                  Remplissez les informations de base de l'élection
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateElection} className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre de l'Élection</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      console.log('Titre changé:', e.target.value);
                      setFormData({ ...formData, title: e.target.value });
                    }}
                    placeholder="Titre"
                    required
                    data-testid="election-title-input"
                  />
                </div>
                <div>
                  <Label htmlFor="start_at">Date et Heure de Début</Label>
                  <Input
                    id="start_at"
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => {
                      console.log('Date début changée:', e.target.value);
                      setFormData({ ...formData, start_at: e.target.value });
                    }}
                    required
                    data-testid="election-start-date-input"
                  />
                </div>
                <div>
                  <Label htmlFor="end_at">Date et Heure de Fin</Label>
                  <Input
                    id="end_at"
                    type="datetime-local"
                    value={formData.end_at}
                    onChange={(e) => {
                      console.log('Date fin changée:', e.target.value);
                      setFormData({ ...formData, end_at: e.target.value });
                    }}
                    required
                    data-testid="election-end-date-input"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={actionLoading} className="flex-1" data-testid="election-create-submit">
                    Créer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Elections List */}
        <div className="grid grid-cols-1 gap-6">
          {elections.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-xl text-slate-500 mb-2">Aucune élection</p>
                <p className="text-slate-400">Créez votre première élection</p>
              </CardContent>
            </Card>
          ) : (
            elections.map((election) => {
              const status = getElectionStatus(election);
              const electionUid = getElectionUid(election);
              return (
                <Card key={electionUid} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2">{election.title}</CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <CardDescription className="space-y-1 text-sm">
                          <div>Début: {new Date(election.start_at).toLocaleString('fr-FR')}</div>
                          <div>Fin: {new Date(election.end_at).toLocaleString('fr-FR')}</div>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => openEditDialog(election)}
                        disabled={actionLoading}
                        size="sm"
                        variant="secondary"
                        className="bg-slate-100 text-slate-800 hover:bg-slate-200"
                      >
                        <Pencil size={16} className="mr-1" />
                        Modifier
                      </Button>
                      <Button
                        onClick={() => handleDeleteElection(electionUid)}
                        disabled={actionLoading}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} className="mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditDialog();
          } else {
            setEditDialogOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'élection</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de l'élection sélectionnée
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateElection} className="space-y-4">
            <div>
              <Label htmlFor="edit_title">Titre de l'Élection</Label>
              <Input
                id="edit_title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                placeholder="Titre"
                required
                data-testid="election-edit-title-input"
              />
            </div>
            <div>
              <Label htmlFor="edit_start_at">Date et Heure de Début</Label>
              <Input
                id="edit_start_at"
                type="datetime-local"
                value={editFormData.start_at}
                onChange={(e) => setEditFormData({ ...editFormData, start_at: e.target.value })}
                required
                data-testid="election-edit-start-date-input"
              />
            </div>
            <div>
              <Label htmlFor="edit_end_at">Date et Heure de Fin</Label>
              <Input
                id="edit_end_at"
                type="datetime-local"
                value={editFormData.end_at}
                onChange={(e) => setEditFormData({ ...editFormData, end_at: e.target.value })}
                required
                data-testid="election-edit-end-date-input"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={actionLoading} className="flex-1" data-testid="election-update-submit">
                Mettre à jour
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeEditDialog}
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer cette élection ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteElection}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminElection;
