# Garage Alpha – Vercel + MongoDB Atlas

## 1. MongoDB Atlas
Créez un cluster, un utilisateur de base de données, puis dans « Network Access » autorisez 0.0.0.0/0 (les IP de Vercel changent).

## 2. Installation et déploiement
```
npm install                     # installe mongodb
npm i -g vercel                 # ou utilisez : npx vercel
vercel link
vercel env add MONGODB_URI      # coller l'URI Atlas (Production, Preview, Development)
vercel env add MONGODB_DB       # facultatif, défaut : garage_alpha
vercel env add SESSION_SECRET   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
vercel env add ADMIN_SALT       # MagCXK5tmNzUsigNJsKUuQ==
vercel env add ADMIN_HASHES     # VvQIwfLFaUi+1roM2TJtoNgYh0BWvnGqHpX5LItkwQA=,fRhYlbjE9oaBEFLMjO2KaH0eTNkYWn97U2bSw1vp8/Q=
vercel --prod
```
Autre mot de passe : `node scripts/hash-password.js "Identifiant" "MotDePasse"` puis remplacer ADMIN_SALT et ADMIN_HASHES.

## 3. Reprendre les données du navigateur
- Méthode 1 (la plus simple) : ouvrez le site sur l'appareil qui contient les données, connectez-vous, cliquez sur « Importer ce navigateur » (ou acceptez la proposition au premier lancement).
- Méthode 2 (script) : sur l'ancien site, console du navigateur : `copy(localStorage.getItem("garage_alpha_v2"))`, collez dans `sauvegarde.json`, puis :
```
vercel env pull .env.local
node --env-file=.env.local scripts/import-json.js sauvegarde.json
```
(Le bouton « Sauvegarder » du site produit aussi un fichier compatible.)

## 4. Si la connexion affiche une erreur 404
Ouvrez `https://VOTRE-SITE.vercel.app/api/health` :
- **404 aussi** : le dossier `api/` n'est pas à la racine du projet déployé. Dans Vercel > Settings > General > **Root Directory**, choisissez le dossier qui contient `api/`, `index.html` et `package.json` (souvent `garage-alpha-vercel`), puis redéployez. Si vous utilisez GitHub, `api/` doit être visible à la racine du dépôt.
- **Page JSON** : l'API est en ligne ; vérifiez que `env` et `base` indiquent `true` / `ok`. Sinon ajoutez les variables manquantes (§2), autorisez 0.0.0.0/0 dans Atlas, puis **redéployez** (les variables ne s'appliquent qu'aux nouveaux déploiements).

## 5. Mot de passe
- Premier accès : les valeurs `ADMIN_SALT` / `ADMIN_HASHES` (§2).
- Menu gauche > **Mot de passe** : changer le mot de passe (et l'identifiant) et générer 8 **codes de secours**. Le mot de passe est alors stocké (haché) dans MongoDB et remplace celui des variables d'environnement ; les autres sessions sont fermées.
- **Mot de passe oublié ?** (écran de connexion) : réinitialisation avec un code de secours, à usage unique.
- Plus aucun code : `vercel env pull .env.local` puis `node --env-file=.env.local scripts/reset-password.js "Identifiant" "NouveauMotDePasse"`.

## 6. Pièces de rechange
Menu **Pièces** : catalogue, stock, seuils d'alerte, entrées/sorties/inventaire et historique. Dans un dossier en cours : « + Pièce de rechange » (vente, stock déduit, total ajouté au dossier et à la facture).

## 7. Tester la connexion MongoDB depuis votre ordinateur
```
npm install
vercel env pull .env.local
node --env-file=.env.local scripts/test-connexion.js
```
