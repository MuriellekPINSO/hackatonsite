# Tamebi Challenge 2026 — site (Next.js)

Site vitrine one-page pour le Tamebi Challenge 2026, organisé et financé par Tamebi. Converti depuis la version HTML statique vers Next.js (App Router) pour que ce soit plus simple à faire évoluer (composants, déploiement Vercel, etc.).

## Démarrer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000

## Structure

```
app/
  layout.js       → metadata (titre, description) + import du CSS global
  page.js         → toute la page, découpée en composants (Nav, Hero, Faq, ...)
  globals.css     → tout le design (variables de couleurs, cards, animations...)
public/
  gpu-assemble.mp4   → vidéo hero (fallback Safari/iOS, H.264)
  gpu-assemble.webm  → vidéo hero (Chrome/Firefox, plus léger)
```

## Points à personnaliser en priorité

- **Logo Tamebi** : dans `app/page.js`, composant `Nav`, remplacer le `<span className="mark">TC</span>` par un vrai logo (`<Image src="/logo-tamebi.svg" .../>` après avoir mis le fichier dans `public/`).
- **Couleurs de marque** : tout en haut de `app/globals.css`, bloc `:root { ... }` — changer `--cream`, `--green`, `--gold`, etc.
- **Dates, lieu, jauge** : dans `Hero` (app/page.js) — actuellement provisoires (19–20 sept. 2026, Cotonou), marquées d'un `*`.
- **Modèle hébergé (Kimi K2/K3)** : sections `Défi` et `Faq` — à mettre à jour selon les tests de faisabilité mémoire réels sur le cluster 8×H200/B200.
- **Formulaire d'inscription** : composant `Inscription` — le `<form>` ne fait qu'afficher un message de confirmation local pour l'instant (`onSubmit`). Brancher sur un vrai service (Google Form, Tally, Airtable, ou une route API Next.js `app/api/...`).
- **Dossier de sponsoring / règlement** : composant `Ressources` — actuellement des cartes "à venir", à remplacer par de vrais liens de téléchargement une fois les documents prêts.

## Vidéo hero (scroll-scrub)

Le composant `Hero` fait défiler la vidéo `gpu-assemble.mp4`/`.webm` image par image en fonction du scroll (comme les pages produit Apple), au lieu de la jouer en autoplay. La logique est dans le `useEffect` en haut de `app/page.js`. Si tu remplaces la vidéo, garde les deux formats (webm + mp4) pour la compatibilité Safari/iOS.

## Déploiement

Le plus simple : [Vercel](https://vercel.com) (créateur de Next.js) — `vercel` en CLI, ou connecter le repo Git directement sur vercel.com. Fonctionne aussi sur Netlify ou tout hébergeur Node.
