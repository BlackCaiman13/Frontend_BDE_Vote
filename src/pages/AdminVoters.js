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
  const [singlePhone, setSinglePhone] = useState('');
  const [addingPhone, setAddingPhone] = useState(false);
  const [deletingPhone, setDeletingPhone] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [phoneToDelete, setPhoneToDelete] = useState(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [filterSent, setFilterSent] = useState('all'); // 'all', 'sent', 'not-sent'
  const fileInputRef = useRef(null);

  const getElectionUid = (election) => election?.uid || election?.id || election?.election_uid;

  // Fonction de filtrage des votants
  const getFilteredVoters = () => {
    return voters.filter((voter) => {
      // Filtre par numéro de téléphone
      const matchesPhone = voter.phone && voter.phone.toLowerCase().includes(searchPhone.toLowerCase());
      
      // Filtre par statut d'envoi SMS
      const matchesSent = 
        filterSent === 'all' || 
        (filterSent === 'sent' && voter.sent) ||
        (filterSent === 'not-sent' && !voter.sent);
      
      
      
      return matchesPhone && matchesSent;
    });
  };

  const filteredVoters = getFilteredVoters();

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
        url: `admin/elections/${selectedElectionId}/votants`
      });
      setVoters(response.data);
      console.log('Voters fetched:', response);
    } catch (error) {
      toast.error('Erreur lors du chargement des électeurs',);
      console.error('Fetching voters error:', error);
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
        url: `admin/elections/${selectedElectionId}/tokens/create/csv`,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${response.data.created ?? 0} tokens créés`);
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

  const handleAddPhone = async (e) => {
    e.preventDefault();
    if (!selectedElectionId) {
      toast.error('Veuillez sélectionner une élection');
      return;
    }
    if (!singlePhone.trim()) {
      toast.error('Veuillez saisir un numéro de téléphone');
      return;
    }
    setAddingPhone(true);
    try {
      const response = await authRequest({
        method: 'post',
        url: `admin/elections/${selectedElectionId}/tokens/create/phone`,
        data: { phone: singlePhone.trim() }
      });
      toast.success('Token créé pour ' + (response.data.phone || singlePhone.trim()));
      setSinglePhone('');
      fetchVoters();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    } finally {
      setAddingPhone(false);
    }
  };

  const handleDeleteVoter = (phone) => {
    setPhoneToDelete(phone);
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteVoter = async () => {
    if (!selectedElectionId || !phoneToDelete) return;
    setConfirmDeleteOpen(false);
    setDeletingPhone(phoneToDelete);
    try {
      await authRequest({
        method: 'delete',
        url: `admin/elections/${selectedElectionId}/votants/${encodeURIComponent(phoneToDelete)}`
      });
      toast.success('Token supprimé');
      fetchVoters();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setDeletingPhone(null);
      setPhoneToDelete(null);
    }
  };

  const handleSendSMS = async () => {
    if (!selectedElectionId) {
      toast.error('Veuillez sélectionner une élection');
      return;
    }

    setSending(true);
    try {
      const response = await authRequest({
        method: 'post',
        url: `admin/elections/${selectedElectionId}/tokens/send`,
        data: {}
      });
      toast.success(`${response.data.sent ?? 0} SMS envoyés`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi des SMS');
    } finally {
      setSending(false);
      fetchVoters();
    }
  };

  const downloadTemplate = () => {
    const csv = 'phone\n225123456789\n225987654321\n225611223344';
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
                {generating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Import en cours...
                  </span>
                ) : (
                  'Générer les tokens'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg" data-testid="add-phone-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="text-emerald-600" />
                Ajouter un électeur (téléphone)
              </CardTitle>
              <CardDescription>
                Ajoutez un numéro de téléphone individuellement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPhone} className="space-y-3">
                <Input
                  type="tel"
                  placeholder="ex: 225123456789"
                  value={singlePhone}
                  onChange={(e) => setSinglePhone(e.target.value)}
                  disabled={addingPhone || !selectedElectionId}
                  data-testid="single-phone-input"
                />
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={addingPhone || !selectedElectionId}
                  data-testid="add-phone-button"
                >
                  {addingPhone ? 'Ajout...' : 'Ajouter'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-lg" data-testid="send-sms-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="text-blue-600" />
                Envoyer SMS
              </CardTitle>
              <CardDescription>
                Envoyez les SMS de vote aux numéros générés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSendSMS}
                disabled={sending || voters.length === 0 || !selectedElectionId}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="send-sms-button"
              >
                {sending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Envoi...
                  </span>
                ) : (
                  'Envoyer les SMS'
                )}
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedElectionId) return toast.error('Veuillez sélectionner une élection');
                  setSending(true);
                  try {
                    const resp = await authRequest({ method: 'post', url: `admin/elections/${selectedElectionId}/tokens/send/all`, data: {} });
                    toast.success(`${resp.data.sent ?? 0} SMS renvoyés`);
                    console.log('Resend all response:', resp);
                  } catch (err) {
                    toast.error(err.response?.data?.detail || 'Erreur lors du renvoi');
                  } finally {
                    setSending(false);
                    fetchVoters();
                  }
                }}
                disabled={sending || voters.length === 0 || !selectedElectionId}
                variant="outline"
                className="w-full mt-2"
                data-testid="resend-all-button"
              >
                {sending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 mr-2 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Renvoyer...
                  </span>
                ) : (
                  'Renvoyer à tous'
                )}
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Voters List */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle data-testid="voters-list-title">Électeurs Éligibles ({filteredVoters.length})</CardTitle>
            <CardDescription>Liste de tous les électeurs importés</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Barre de Recherche et Filtres */}
            <div className="mb-6 space-y-4">
              {/* Recherche par téléphone */}
              <div>
                <Label htmlFor="search-phone" className="text-sm font-semibold mb-2 block">
                  Rechercher par numéro de téléphone
                </Label>
                <Input
                  id="search-phone"
                  type="text"
                  placeholder="ex: 225123456789"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="w-full"
                  data-testid="search-phone-input"
                />
              </div>

              {/* Filtres */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Filtre SMS */}
                <div>
                  <Label htmlFor="filter-sent" className="text-sm font-semibold mb-2 block">
                    Filtre SMS
                  </Label>
                  <select
                    id="filter-sent"
                    value={filterSent}
                    onChange={(e) => setFilterSent(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                    data-testid="filter-sent"
                  >
                    <option value="all">Tous</option>
                    <option value="sent">SMS envoyés</option>
                    <option value="not-sent">SMS non envoyés</option>
                  </select>
                </div>

              </div>

              {/* Bouton réinitialiser les filtres */}
              <Button
                onClick={() => {
                  setSearchPhone('');
                  setFilterSent('all');
                }}
                variant="outline"
                size="sm"
                className="w-full md:w-auto"
                data-testid="reset-filters-button"
              >
                Réinitialiser les filtres
              </Button>
            </div>

            {/* Résumé des résultats */}
            {searchPhone || filterSent !== 'all' ? (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                Résultats : <strong>{filteredVoters.length}</strong> électeur(s) sur <strong>{voters.length}</strong>
              </div>
            ) : null}
            {filteredVoters.length === 0 ? (
              <div className="text-center py-8" data-testid="no-voters">
                <UserCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-xl text-slate-500 mb-2">Aucun électeur</p>
                <p className="text-slate-400">
                  {voters.length === 0 
                    ? 'Commencez par importer un fichier CSV' 
                    : 'Aucun résultat ne correspond à vos critères de recherche'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="voters-table">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Téléphone</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">Token</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">SMS</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVoters.map((voter) => {
                      const keyId = voter.id ?? voter.uid ?? voter.phone;
                      return (
                        <tr key={keyId} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`voter-row-${keyId}`}>
                          <td className="py-3 px-4 text-slate-700" data-testid={`voter-phone-${keyId}`}>{voter.phone}</td>
                          <td className="py-3 px-4 text-center" data-testid={`voter-token-${keyId}`}>{voter.token || '—'}</td>
                          <td className="py-3 px-4 text-center">
                            {voter.sent ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium" data-testid={`voter-sent-${keyId}`}>
                                Envoyé
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium" data-testid={`voter-sent-${keyId}`}>
                                Non envoyé
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteVoter(voter.phone)}
                              disabled={deletingPhone === voter.phone}
                              data-testid={`delete-voter-${keyId}`}
                            >
                              <Trash2 size={16} className="mr-1" />
                              {deletingPhone === voter.phone ? 'Suppression...' : 'Supprimer'}
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
                  Êtes-vous sûr de vouloir supprimer l'électeur {phoneToDelete} ? Cette action est irréversible.
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
