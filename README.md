# PulseAnime — Art génératif audio-réactif

<p align="center">
  <img src="image/README/1772632551530.png" alt="Aperçu de l'écran principal de PulseAnime" width="900" />
</p>

[Live demo](https://pulse-anime-demo.vercel.app)

## À propos

PulseAnime est une application web d’art génératif pilotée en temps réel par le son. Elle combine traitement du signal, Web Audio API, TypeScript, p5.js et WebGL pour transformer microphone ou fichier audio en visuels réactifs.

Le moteur analyse le spectre avec une FFT 4096, sépare les bandes de fréquences, détecte les transitoires et pilote plusieurs systèmes visuels : particules, L-Systems procéduraux, shaders et distorsions graphiques.

## Fonctionnalités

- Analyse audio temps réel avec Web Audio API.
- FFT 4096, spectre logarithmique, bandes de fréquences et détection de transitoires.
- Visualisations p5.js / WebGL réactives au son.
- L-Systems procéduraux, champs de particules et shaders.
- Contrôles de couleur, vitesse, sensibilité et seuils.
- Support microphone et fichiers audio.
- Interface TypeScript / Vite pensée pour le navigateur.

## Stack

- TypeScript / JavaScript
- Vite
- p5.js / WebGL
- Web Audio API
- HTML / CSS / Tailwind CSS

## Installation

```bash
git clone https://github.com/LeBoogiepop/PulseAnime.git
cd PulseAnime
npm install
npm run dev
```

L’application est ensuite accessible sur l’URL indiquée par Vite.

## Architecture

```text
src/
├── components/   # UI et visualiseur
├── services/     # moteur audio
├── sketches/     # animations p5.js / WebGL
├── utils/        # fonctions mathématiques et géométriques
├── types.ts
├── i18n.ts
└── index.tsx
```
