# PulseAnime – Solution d’art interactif

<div align="center">
  <br/>
  <a href="https://vitejs.dev/">
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  </a>
  <a href="https://p5js.org/">
    <img src="https://img.shields.io/badge/p5.js-ED225D?style=for-the-badge&logo=p5dotjs&logoColor=white" alt="p5.js" />
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  </a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API">
    <img src="https://img.shields.io/badge/Web_Audio_API-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="Web Audio API" />
  </a>
</div>

## 📋 À propos du projet

**PulseAnime** est une application web d'art génératif qui permet la création d'animations dynamiques pilotées en temps réel par le son. Inspiré par l'essor des outils comme *Open Processing*, ce projet fusionne art numérique, traitement du signal audio et développement web pour offrir une expérience synesthésique immersive.

L'utilisateur peut connecter un microphone ou jouer un fichier audio pour voir apparaître des formes, des flux de particules et des distorsions graphiques qui réagissent instantanément aux fréquences (basses, médiums, aigus) et à l'intensité du son.

### 🎯 Objectifs

Ce projet pluridisciplinaire (Majeure 3TD - Année 2025/2026) vise à :

* **Développer une application web** accessible via navigateur (type "Open Processing").
* **Intégrer la capture audio temps réel** (Microphone USB/Intégré) via la Web Audio API.
* **Analyser le signal** : Découpage spectral précis (FFT 4096), détection de transitoires (attaques) et séparation des bandes de fréquences.
* **Générer des visuels réactifs** : Utilisation de **p5.js** et **WebGL** pour des rendus haute performance (2D & 3D).
* **Fonctionnalités avancées** :
    * Upload d'images/vidéos pour les intégrer aux animations (texture mapping, clipping).
    * Interface utilisateur (UI) intuitive pour les créateurs (artistes, designers).
    * Compatibilité Cross-plateformes (PC, Tablette, Smartphone).

---

## 🚀 Fonctionnalités Clés

* **Moteur Audio Pro** : Analyse logarithmique du spectre, Auto-Gain Control (AGC) et détection intelligente des *Beats*.
* **Bibliothèque de Sketches** :
    * *Cicatrices d'Or* : Tracés nets sur piano, flux continu sur basses lourdes.
    * *Jardin Botanique* : Plantes procédurales (L-Systems) qui dansent avec le vent sonore.
    * *Flux de Particules* : Champs de vecteurs fluides réagissant aux médiums.
    * *Voyage* : Shader WebGL déformant l'espace-temps selon l'énergie sonore.
* **Visualiseur de Spectre** : Affichage temps réel haute précision (64 bandes) avec physique des pics ("Ghost Peaks").
* **Personnalisation** : Interface de contrôle complète (Couleurs, Vitesse, Sensibilité, Seuils) et système de Presets.

---

## 🛠️ Stack Technique

### Pré-requis Programmation
* **Langage** : TypeScript / JavaScript (Maîtrise du DOM, Canvas API).
* **Rendu Graphique** : p5.js (Mode P2D & WEBGL).
* **Traitement Audio** : API Web Audio native (AnalyserNode, GainNode, DynamicsCompressor).
* **Interface** : HTML5 / CSS3 (TailwindCSS).
* **Build Tool** : Vite.

### Matériel Requis
* Ordinateur ou smartphone avec navigateur compatible Web Audio API (Chrome, Firefox, Safari).
* Microphone USB (classe-compliant) ou microphone intégré.
* *(Optionnel)* Tablette graphique ou contrôleur MIDI.

---

## 📦 Installation et Lancement

1.  **Cloner le dépôt**
    ```bash
    git clone [https://github.com/VOTRE_USERNAME/PulseAnime.git](https://github.com/VOTRE_USERNAME/PulseAnime.git)
    cd PulseAnime
    ```

2.  **Installer les dépendances**
    ```bash
    npm install
    ```

3.  **Lancer le serveur de développement**
    ```bash
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:3000` (ou le port indiqué).

---

## 📂 Architecture du Projet

Le projet suit une architecture modulaire stricte dans le dossier `src/` :

```text
src/
├── components/         # Composants UI (Visualiseur, Debug...)
├── services/           # Moteur Audio (audio.ts)
├── sketches/           # Logique des animations p5.js
│   ├── GoldenScars.ts
│   ├── Botanical.ts
│   ├── ...
│   └── index.ts        # Point d'entrée des exports
├── utils/              # Fonctions mathématiques & géométrie
├── types.ts            # Définitions TypeScript partagées
├── i18n.ts             # Gestion des langues (FR/EN)
└── index.tsx           # Point d'entrée principal de l'application
