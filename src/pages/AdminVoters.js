import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, UserCheck, Mail, Send } from 'lucide-react';

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
  const fileInputRef = useRef(null);

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
        setSelectedElectionId(response.data[0].uid);
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
    console.log('FormData:', formData);
    try {
      const response = await authRequest({
        method: 'post',
        url: `/admin/elections/${selectedElectionId}/tokens/create`,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Emails sent response:', response.data);
      
      toast.success(`${response.data.created ?? response.data.sent ?? 0} tokens générés`);
      fetchVoters();
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la génération des tokens');
    } finally {
      setGenerating(false);
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
                {elections.map(election => (
                  <option key={election.uid } value={election.uid }>
                    {election.title}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {/* Operations Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </CardContent>
          </Card>

          <Card className="shadow-lg" data-testid="tokens-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="text-green-600" />
                Générer Tokens
              </CardTitle>
              <CardDescription>
                Créez des tokens uniques pour chaque électeur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGenerateTokens}
                disabled={generating || !selectedElectionId || (!csvFile && voters.length === 0)}
                className="w-full bg-green-600 hover:bg-green-700"
                data-testid="generate-tokens-button"
              >
                {generating ? 'Génération...' : 'Générer les tokens'}
              </Button>
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
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Nom Complet</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Éligible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voters.map((voter) => {
                      const keyId = voter.id ?? voter.uid ?? voter.email;
                      return (
                        <tr key={keyId} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`voter-row-${keyId}`}>
                          <td className="py-3 px-4 text-slate-700" data-testid={`voter-email-${keyId}`}>{voter.email}</td>
                          <td className="py-3 px-4 text-slate-700" data-testid={`voter-name-${keyId}`}>{voter.full_name}</td>
                          <td className="py-3 px-4 text-center">
                            {voter.eligible ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium" data-testid={`voter-eligible-${keyId}`}>
                                Oui
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                Non
                              </span>
                            )}
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
      </div>
    </AdminLayout>
  );
};

export default AdminVoters;
