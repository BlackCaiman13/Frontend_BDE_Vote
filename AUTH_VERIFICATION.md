# ✅ Vérification de l'authentification Basic Auth

## 🔍 Configuration actuelle

### Backend URL
- **Adresse:** `192.168.111.236`
- **Configurée dans:** `.env` → `REACT_APP_BACKEND_URL=http://192.168.111.236`
- **API Base:** `http://192.168.111.236/api/v1`

---

## 📋 Implémentation vérifiée

### 1. **`src/lib/api.js`** ✅
```javascript
const API_BASE = `${BACKEND_URL.replace(/\/+$/,'')}/api/v1`;

export const createBasicAuthApi = (username, password) => {
  const credentials = btoa(`${username}:${password}`);
  const authedApi = axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
  });
  return authedApi;
};
```

**Vérification:** 
- ✅ Encode correctement `username:password` en Base64
- ✅ Ajoute header `Authorization: Basic <credentials>`
- ✅ Utilise le `API_BASE` avec `/api/v1`

---

### 2. **`src/contexts/AdminContext.js`** ✅
```javascript
const login = (username, password) => {
  localStorage.setItem('admin_username', username);
  localStorage.setItem('admin_password', password);
  setAdminUsername(username);
  setAdminPassword(password);
  setIsAuthenticated(true);
};

const getAuthApi = () => {
  if (!adminUsername || !adminPassword) {
    throw new Error('User not authenticated');
  }
  return createBasicAuthApi(adminUsername, adminPassword);
};
```

**Vérification:**
- ✅ Stocke credentials dans localStorage
- ✅ Méthode `getAuthApi()` retourne une instance avec Basic Auth
- ✅ Vérifie que les credentials existent avant de les utiliser

---

### 3. **`src/pages/AdminLogin.js`** ✅
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Test Basic Auth by attempting a simple request
    const testApi = createBasicAuthApi(formData.username, formData.password);
    await testApi.get('/admin/elections');
    
    // If successful, login
    login(formData.username, formData.password);
    toast.success('Connexion réussie');
    navigate('/admin');
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Identifiants invalides');
  } finally {
    setLoading(false);
  }
};
```

**Vérification:**
- ✅ Test les credentials en appelant `/admin/elections`
- ✅ N'utilise que `username` et `password` (pas d'email)
- ✅ Affiche le message d'erreur approprié

---

### 4. **Pages Admin** ✅
Toutes les pages admin utilisent `getAuthApi()`:
- ✅ `AdminDashboard.js` → `const authApi = getAuthApi();`
- ✅ `AdminCandidates.js` → `const authApi = getAuthApi();`
- ✅ `AdminVoters.js` → `const authApi = getAuthApi();`

Exemple d'utilisation:
```javascript
const authApi = getAuthApi();
await authApi.get('/admin/elections');
```

---

## 🧪 Diagnostic & Test

### Accéder au Diagnostic
**URL:** `http://localhost:3000/diagnostic`

Cette page temporaire vous permet de:
1. ✅ Tester la connectivité avec `192.168.111.236`
2. ✅ Vérifier l'authentification Basic Auth
3. ✅ Voir les détails d'erreur si problème

### Fichiers de Test
- `src/lib/authTest.js` - Fonctions de diagnostic
- `src/pages/DiagnosticPage.js` - Interface de test

---

## ⚙️ Configuration vérifiée

| Paramètre | Valeur | Statut |
|-----------|--------|--------|
| Backend URL | `http://192.168.111.236` | ✅ |
| API Base | `http://192.168.111.236/api/v1` | ✅ |
| Auth Type | Basic Auth (Base64) | ✅ |
| Header | `Authorization: Basic <credentials>` | ✅ |
| Identifiants par défaut | admin / admin123 | ✅ |

---

## 🚀 Prochaines étapes

### Pour tester:
1. Lancez le frontend: `npm start`
2. Allez à `http://localhost:3000/diagnostic`
3. Entrez `admin` / `admin123`
4. Cliquez "Diagnostic Complet"

### Résultats attendus:
- ✅ Backend réachable
- ✅ Authentification réussie
- ✅ Peut récupérer la liste des élections

### Si erreur:
- ❌ Vérifiez que le backend Flask tourne sur `192.168.111.236:5000`
- ❌ Vérifiez le firewall (port 5000 ouvert)
- ❌ Vérifiez que les identifiants (admin/admin123) existent dans la BD backend
- ❌ Activez les CORS côté backend si nécessaire

---

## 📝 Notes importantes

1. **Basic Auth est stateless** - Pas besoin de token JWT, chaque requête inclut les credentials
2. **localStorage stocke les credentials** - Attention en production (utiliser HTTPS)
3. **Page DiagnosticPage.js est temporaire** - À supprimer après vérification
4. **Le backend doit supporter Basic Auth** selon la doc Flask fournie
