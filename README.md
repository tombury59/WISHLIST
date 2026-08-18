# 🎁 Liste de souhaits — Famille

Petite appli web où chaque membre de la famille ajoute ses souhaits
(nom de l'objet + lien facultatif). Protégée par un code PIN partagé.

Membres : **Lilou, Sam, Tom, Théo, Maman, Papa**
(modifiable dans `app/lib/members.js`).

---

## 🚀 Déployer sur Vercel (≈ 5 minutes)

### 1. Mettre le code sur GitHub
- Crée un dépôt (repo) sur https://github.com (ex: `wishlist-famille`).
- Envoie ces fichiers dedans (glisser-déposer via le bouton *Add file → Upload files*,
  ou avec Git si tu connais).

### 2. Importer dans Vercel
- Va sur https://vercel.com → connecte-toi avec GitHub.
- **Add New → Project** → choisis ton repo → **Deploy**.
- (Le premier déploiement va marcher, mais la liste ne se sauvegardera pas
  tant que l'étape 3 n'est pas faite.)

### 3. Ajouter la base de données (pour partager la liste)
- Dans ton projet Vercel : onglet **Storage** → **Create Database** → choisis
  **KV / Upstash for Redis** (offre gratuite) → **Create**.
- Clique **Connect** pour la relier à ton projet.
  ➜ Vercel ajoute tout seul les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN`.

### 4. Choisir le code PIN de la famille
- Onglet **Settings → Environment Variables**.
- Ajoute : nom `FAMILY_PIN`, valeur = le code que vous voulez (ex: `2580`).
- Onglet **Deployments** → sur le dernier déploiement, bouton **⋯ → Redeploy**.

C'est prêt ! 🎉 Partage l'adresse `https://ton-projet.vercel.app` et le code
à toute la famille.

---

## 🧪 Tester sur ton PC (facultatif)

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:3000
(La sauvegarde ne marche en local que si tu renseignes les variables `KV_...`
dans un fichier `.env.local` — voir `.env.local.example`.)

---

## ✏️ Personnaliser

- **Ajouter/enlever un membre** ou changer un emoji → `app/lib/members.js`
- **Changer le code PIN** → variable `FAMILY_PIN` sur Vercel
- **Couleurs** → variables en haut de `app/globals.css`
