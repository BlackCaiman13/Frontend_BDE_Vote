import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Upload, UserCheck, Mail, Send, Plus, Trash2 } from 'lucide-react';

const AdminVoters = () => {
  const { authRequest } = useAdmin();
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [singleEmail, setSingleEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState(null);
  const fileInputRef = useRef(null);

  const getElectionUid = (election) => election?.uid || election?.id || election?.election_uid;

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElectionId) {
      fetchVoters();
    }
  }, [selectedElectionId]);

  const fetchElections = async () => {
    try {
      const response = await authRequest({ method: 'get', url: '/admin/elections' });
      setElections(response.data);
      if (response.data.length > 0) {
        setSelectedElectionId(getElectionUid(response.data[0]));
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des élections');
    } finally {
      setLoading(false);
    }
  };

  const fetchVoters = async () => {
    try {
      const response = await authRequest({
        method: 'get',
        url: `/admin/elections/${selectedElectionId}/votants`
      });
      setVoters(response.data);
      console.log('Voters fetched:', response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des électeurs');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error('Aucun fichier sélectionné');
      return;
    }
    setCsvFile(file);
    toast.success('Fichier sélectionné. Cliquez sur "Générer les tokens" pour importer et créer les tokens.');
    
  };

  const handleGenerateTokens = async () => {
    if (!selectedElectionId) {
      toast.error('Veuillez sélectionner une élection');
      return;
    }

    if (!csvFile) {
      toast.error('Veuillez sélectionner un fichier CSV avant de générer les tokens');
      return;
    }

    setGenerating(true);
    const formData = new FormData();
    formData.set('file', csvFile);
    try {
      const response = await authRequest({
        method: 'post',
        url: `/admin/elections/${selectedElectionId}/tokens/create/csv`,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${response.data.created ?? response.data.sent ?? 0} électeurs importés`);
      fetchVoters();
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la génération des tokens');
      console.error('Generating tokens error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!selectedElectionId) {
      toast.error('Veuillez sélectionner une élection');
      return;
    }
    if (!singleEmail.trim()) {
      toast.error('Veuillez saisir un email');
      return;
    }
    setAddingEmail(true);
    try {
      await authRequest({
        method: 'post',
        url: `/admin/elections/${selectedElectionId}/tokens/create/email`,
        data: { email: singleEmail.trim() }
      });
      toast.success('Électeur ajouté');
      setSingleEmail('');
      fetchVoters();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    } finally {
      setAddingEmail(false);
    }
  };

  const handleDeleteVoter = (email) => {
    setEmailToDelete(email);
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteVoter = async () => {
    if (!selectedElectionId || !emailToDelete) return;
    setConfirmDeleteOpen(false);
    setDeletingEmail(emailToDelete);
    try {
      await authRequest({
        method: 'delete',
        url: `/admin/elections/${selectedElectionId}/votants/${encodeURIComponent(emailToDelete)}`
      });
      toast.success('Électeur supprimé');
      fetchVoters();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setDeletingEmail(null);
      setEmailToDelete(null);
    }
  };

  const handleSendEmails = async () => {
    if (!selectedElectionId) {
      toast.error('Veuillez sélectionner une élection');
      return;
    }

    setSending(true);
    try {
      // POST /api/v1/admin/elections/<election_id>/tokens/send avec refresh auto
      const response = await authRequest({
        method: 'post',
        url: `/admin/elections/${selectedElectionId}/tokens/send`,
        data: {}
      });
      toast.success(`${response.data.sent} emails envoyés`);
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi des emails');
    } finally {
      setSending(false);
      fetchVoters();
    }
  };

  const downloadTemplate = () => {
    const csv = 'email\nadmin@example.com\nvoter1@example.com\nvoter2@example.com';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_electeurs.csv';
    a.click();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96" data-testid="voters-loading">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8" data-testid="admin-voters-page">
        {/* Page Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2" data-testid="voters-title">Gestion des Électeurs</h1>
          <p className="text-slate-600" data-testid="voters-description">Importez et gérez les électeurs éligibles</p>
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
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                data-testid="election-selector"
              >
                {elections.map((election) => {
                  const electionId = getElectionUid(election);
                  return (
                    <option key={electionId} value={electionId}>
                      {election.title}
                    </option>
                  );
                })}
              </select>
            </CardContent>
          </Card>
        )}

        {/* Operations Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-lg" data-testid="import-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="text-violet-600" />
                Importer CSV
              </CardTitle>
              <CardDescription>
                Importez une liste d'électeurs depuis un fichier CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                data-testid="csv-file-input"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !selectedElectionId}
                className="w-full"
                data-testid="upload-csv-button"
              >
                {uploading ? 'Import en cours...' : 'Sélectionner un fichier'}
              </Button>
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="w-full"
                data-testid="download-template-button"
              >
                Télécharger le modèle
              </Button>
              {csvFile && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-600">Fichier sélectionné: {csvFile.name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCsvFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    data-testid="clear-csv-button"
                  >
                    Effacer
                  </Button>
                </div>
              )}
              <Button
                onClick={handleGenerateTokens}
                disabled={generating || !selectedElectionId || !csvFile}
                className="w-full bg-green-600 hover:bg-green-700"
                data-testid="generate-tokens-button"
              >
                {generating ? 'Import en cours...' : 'Générer les tokens'}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg" data-testid="add-email-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="text-emerald-600" />
                Ajouter un électeur
              </CardTitle>
              <CardDescription>
                Ajoutez une adresse email individuellement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddEmail} className="space-y-3">
                <Input
                  type="email"
                  placeholder="ex: etudiant@example.com"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  disabled={addingEmail || !selectedElectionId}
                  data-testid="single-email-input"
                />
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={addingEmail || !selectedElectionId}
                  data-testid="add-email-button"
                >
                  {addingEmail ? 'Ajout...' : 'Ajouter'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-lg" data-testid="emails-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="text-blue-600" />
                Envoyer Emails
              </CardTitle>
              <CardDescription>
                Envoyez les liens de vote par email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSendEmails}
                disabled={sending || voters.length === 0 || !selectedElectionId}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="send-emails-button"
              >
                {sending ? 'Envoi...' : 'Envoyer les emails'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Voters List */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle data-testid="voters-list-title">Électeurs Éligibles ({voters.length})</CardTitle>
            <CardDescription>Liste de tous les électeurs importés</CardDescription>
          </CardHeader>
          <CardContent>
            {voters.length === 0 ? (
              <div className="text-center py-8" data-testid="no-voters">
                <UserCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-xl text-slate-500 mb-2">Aucun électeur</p>
                <p className="text-slate-400">Commencez par importer un fichier CSV</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="voters-table">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Vote</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Mail</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voters.map((voter) => {
                      const keyId = voter.id ?? voter.uid ?? voter.email;
                      return (
                        <tr key={keyId} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`voter-row-${keyId}`}>
                          <td className="py-3 px-4 text-slate-700" data-testid={`voter-email-${keyId}`}>{voter.email}</td>
                          <td className="py-3 px-4 text-center">
                            {voter.is_active ? (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium" data-testid={`voter-eligible-${keyId}`}>
                                Pas voté
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                Voté      
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {voter.mailed ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium" data-testid={`voter-mailed-${keyId}`}>
                                Envoyé
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium" data-testid={`voter-mailed-${keyId}`}>
                                Non envoyé
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteVoter(voter.email)}
                              disabled={deletingEmail === voter.email}
                              data-testid={`delete-voter-${keyId}`}
                            >
                              <Trash2 size={16} className="mr-1" />
                              {deletingEmail === voter.email ? 'Suppression...' : 'Supprimer'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer l'électeur {emailToDelete} ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteVoter}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminVoters;
