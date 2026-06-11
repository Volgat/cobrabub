# CobraBub IDE — Professional Documentation / Documentation Professionnelle
> Developed by **AmeForge** / Développé par **AmeForge**

Welcome to the official documentation for **CobraBub IDE**, a premium, lightweight, AI-augmented code editor designed to streamline software engineering workflows.

Bienvenue dans la documentation officielle de **CobraBub IDE**, un éditeur de code léger, moderne et augmenté par intelligence artificielle, conçu pour optimiser le flux de travail des développeurs.

---

## Table of Contents / Table des Matières
1. [English Version](#english-version)
   - [Overview](#overview)
   - [Key Features](#key-features)
   - [AI Agent Integration](#ai-agent-integration)
   - [Git & GitHub Integration](#git--github-integration)
   - [Android Emulator Support (AVD)](#android-emulator-support-avd)
   - [Visual Themes & Customization](#visual-themes--customization)
   - [Keyboard Shortcuts](#keyboard-shortcuts)
2. [Version Française](#version-française)
   - [Présentation](#présentation)
   - [Fonctionnalités Clés](#fonctionnalités-clés)
   - [Intégration de l'Agent AI](#intégration-de-lagent-ai)
   - [Intégration Git & GitHub](#intégration-git--github)
   - [Gestionnaire d'Émulateur Android (AVD)](#gestionnaire-démulateur-android-avd)
   - [Thèmes Visuels & Personnalisation](#thèmes-visuels--personnalisation)
   - [Raccourcis Clavier](#raccourcis-clavier)

---

# English Version

## Overview
**CobraBub IDE** is a state-of-the-art desktop code editor developed by **AmeForge**. By blending a sleek web-tech UI (powered by Electron) with robust, non-blocking background utilities and an autonomous AI Agent, CobraBub IDE lets you write, test, debug, and push code without leaving the application.

## Key Features
- **File Explorer & Search**: Browse your workspace with an elegant tree view featuring custom extension-aware Lucide icons and instant search (Ctrl+P).
- **Asynchronous Modals**: Actions like file creation, deletion, or custom confirmation prompts run asynchronously, ensuring that the editor and AI chat are never blocked.
- **Embedded Terminal**: Run CMD or Bash commands in a responsive panel with styled streaming stdout/stderr outputs.
- **Contextual Media Attachments**: Attach reference images or capture screens/windows in real time to feed visual context to the AI agent.

## AI Agent Integration
CobraBub IDE features a dedicated AI panel capable of interacting with multiple model providers:
- **Supported Providers**: Anthropic (Claude), OpenAI (GPT), Google Gemini, Alibaba Qwen, or local offline servers (Ollama, LM Studio, vLLM).
- **Agent Modes**:
  - **Standard**: The AI answers queries, reads files, and proposes file writes or command runs. You review and confirm every action with the custom overlay dialog.
  - **Autonomous**: The AI Agent runs in a self-governing multi-turn loop, writing code and executing commands automatically up to a configurable turn limit.

## Git & GitHub Integration
Set up your credentials directly within the parameters modal under the **GitHub** tab:
- **PAT (Personal Access Token)**: CobraBub automatically authenticates your repository pushes and pulls without prompting for passwords.
- **Commits Configuration**: Automatically sets local `git config user.name` and `git config user.email` upon opening a project.
- **Toolbar Quick Actions**:
  - **Git Pull**: Download recent repository changes.
  - **Git Push**: Automatically stages all changes, prompts for a commit message, and pushes safely.

## Android Emulator Support (AVD)
For mobile developers, CobraBub IDE provides integrated Android tools:
- **Auto-Detection**: Scans the project directory up to 3 levels deep for Android configuration files (like `build.gradle`, `AndroidManifest.xml`, or `local.properties`).
- **Always Show**: An optional settings toggle forces the AVD dropdown menu to be visible regardless of the project contents.
- **Background Execution**: Spawn emulator virtual devices in detached background processes (`android emulator start <name>`) that run asynchronously and never block the IDE.

## Visual Themes & Customization
Tailor the workspace to your preference with custom theme values that change the editor backgrounds dynamically:
- **Cyber Purple**: Neon violet and magenta tones on deep glassmorphism panels.
- **Midnight Blue**: A space-inspired slate and electric blue workspace.
- **Emerald Synth**: Retro terminal vibes with deep forest-green accents.
- **Amber Cyber**: Silicon-warm amber/orange coding viewport.
- **Light Mode**: High-contrast slate-blue light theme.
- **Multilingual Support**: Switch seamlessly between English, French, and Spanish.

## Keyboard Shortcuts
- **Ctrl + S**: Save the active file.
- **Ctrl + `**: Toggle the collapsible embedded terminal.
- **Ctrl + P**: Focus the file search filter.

---

# Version Française

## Présentation
**CobraBub IDE** est un éditeur de code de bureau de pointe développé par **AmeForge**. En associant une interface web épurée et moderne (propulsée par Electron) à des utilitaires d'arrière-plan non-bloquants et un Agent AI autonome, CobraBub IDE vous permet d'écrire, tester, déboguer et pousser votre code sans jamais quitter l'application.

## Fonctionnalités Clés
- **Explorateur & Recherche de Fichiers** : Naviguez dans votre espace de travail avec une arborescence élégante arborant des icônes vectorielles Lucide intelligentes et un filtre de recherche instantané (Ctrl+P).
- **Boîtes de Saisie Asynchrones** : La création de fichiers, dossiers et validations se fait via des fenêtres asynchrones personnalisées qui ne figent jamais la saisie clavier dans l'éditeur ou le chat.
- **Terminal Intégré** : Exécutez des commandes système (CMD ou Bash) directement dans un panneau inférieur réactif affichant les flux stdout/stderr en temps réel.
- **Pièces Jointes Médias & Captures d'Écran** : Attachez des captures d'écran de fenêtres actives ou des images pour fournir un contexte visuel clair à l'Agent AI.

## Intégration de l'Agent AI
CobraBub IDE intègre un panneau latéral d'intelligence artificielle flexible connecté aux plus grands modèles :
- **Fournisseurs Supportés** : Anthropic (Claude), OpenAI (GPT), Google Gemini, Alibaba Qwen, ou vos instances locales hors-ligne (Ollama, LM Studio, vLLM).
- **Modes de l'Agent** :
  - **Standard** : L'IA répond à vos consignes, lit les fichiers du projet et vous propose des écritures ou des commandes. Vous contrôlez et validez chaque action grâce au modal de confirmation.
  - **Autonome** : L'Agent s'exécute dans une boucle itérative (jusqu'à 10 tours). Il écrit le code, lance les compilations/tests et observe les retours du terminal de manière autonome.

## Intégration Git & GitHub
Configurez vos identifiants de dépôt dans l'onglet **GitHub** du modal Paramètres :
- **Authentification Transparente (PAT)** : CobraBub configure les URL de vos dépôts distants pour réaliser des pushes et pulls automatiques sans demande récurrente de mot de passe.
- **Configuration locale** : Initialise à la volée `git config user.name` et `git config user.email` à l'ouverture du projet.
- **Actions rapides** :
  - **Git Pull** : Téléchargez les dernières modifications.
  - **Git Push** : Indexe tous les fichiers, demande un message de commit et pousse en ligne de façon sécurisée.

## Gestionnaire d'Émulateur Android (AVD)
Pour les développeurs d'applications Android, CobraBub intègre des raccourcis efficaces :
- **Détection Automatique** : Analyse le projet ouvert à la recherche de fichiers Android (comme `AndroidManifest.xml` ou `build.gradle`) jusqu'à 3 niveaux de profondeur.
- **Affichage Permanent** : Un paramètre permet de forcer la présence du bouton AVD dans la barre d'outils même sur des projets non-mobiles.
- **Exécution Arrière-plan (Detached)** : Lance l'émulateur choisi (`android emulator start <name>`) de façon asynchrone détachée, empêchant tout blocage du processus principal de l'IDE.

## Thèmes Visuels & Personnalisation
Personnalisez votre espace de travail avec un fond d'éditeur qui s'adapte en direct à chaque thème :
- **Cyber Purple** : Nuances de violet néon et magenta sur panneaux de verre.
- **Midnight Blue** : Espace de travail inspiré de l'espace profond aux accents bleus électriques.
- **Emerald Synth** : Ambiance rétro-futuriste verte émeraude de terminal vintage.
- **Amber Cyber** : Environnement chaud aux accents orangés/ambre.
- **Light Mode** : Thème clair épuré (Slate-Blue) adapté au travail diurne.
- **Langues disponibles** : Basculez l'interface instantanément en Français, Anglais ou Espagnol.

## Raccourcis Clavier
- **Ctrl + S** : Sauvegarder le fichier actif.
- **Ctrl + `** : Afficher/masquer le terminal intégré.
- **Ctrl + P** : Activer le filtre de recherche de fichiers dans la barre latérale.
