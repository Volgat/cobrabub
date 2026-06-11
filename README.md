# CobraBub - AI-Powered Desktop IDE

🚀 **CobraBub** est un environnement de développement intégré (IDE) desktop complet avec un système d'agent IA, similaire à Cursor et Antigravity de Google. Il permet de travailler sur des fichiers de projets complexes tout en bénéficiant de l'assistance d'intelligences artificielles locales ou via API.

## ✨ Fonctionnalités Principales

### 🎯 Système Agentique Avancé
- **Multi-modèles**: Supporte OpenAI, Anthropic Claude, et modèles locaux (Ollama, LM Studio)
- **Agent autonome**: Exécute des tâches complexes sur vos projets
- **Chat contextuel**: Discussions avec l'IA en contexte de vos fichiers ouverts
- **Tâches en temps réel**: Suivi de l'état des tâches agentiques

### 📁 Gestion de Projets Complexes
- Explorateur de fichiers intégré
- Édition multi-fichiers avec onglets
- Détection automatique du langage
- Sauvegarde automatique
- Navigation rapide dans l'arborescence

### 🔧 Configuration Flexible
- **API Cloud**: OpenAI GPT-4, Anthropic Claude
- **Modèles Locaux**: Ollama, LM Studio, serveurs compatibles OpenAI
- **API Custom**: N'importe quelle API compatible OpenAI
- Configuration via interface graphique

### 💻 Interface Moderne
- Thème sombre professionnel
- Panneau d'agent rétractable
- Barre d'état informative
- Raccourcis clavier intuitifs
- Indicateurs de statut en temps réel

## 📦 Installation

### Prérequis
- Node.js 18+ 
- Python 3.9+
- npm ou yarn

### 1. Cloner le projet

```bash
cd cobrabub
```

### 2. Installer les dépendances Electron

```bash
npm install
```

### 3. Installer les dépendances Python pour le serveur d'agent

```bash
cd agent-server
pip install websockets openai anthropic aiohttp
```

Ou utiliser le fichier requirements.txt:

```bash
pip install -r requirements.txt
```

## 🚀 Démarrage

### Option 1: Lancement séparé

**Terminal 1 - Serveur d'agent:**
```bash
cd agent-server
python server.py --host localhost --port 8765
```

**Terminal 2 - Application Electron:**
```bash
npm start
```

### Option 2: Mode développement

```bash
npm run dev
```

## ⚙️ Configuration

### Configurer un modèle

1. Cliquez sur ⚙️ dans le panneau Agent
2. Sélectionnez le type de modèle:
   - **OpenAI API**: Entrez votre clé API OpenAI
   - **Anthropic API**: Entrez votre clé API Anthropic
   - **Local Model**: URL de votre serveur local (ex: http://localhost:11434)
   - **Custom API**: URL et clé pour API compatible OpenAI

3. Configurez le nom du modèle (ex: `gpt-4`, `claude-3-sonnet-20240229`, `llama2`)
4. Entrez l'URL du serveur d'agent: `ws://localhost:8765`
5. Cliquez sur **Save Configuration**

### Exemples de configuration

#### OpenAI
```
Type: OpenAI API
API Key: sk-...
Model Name: gpt-4
Agent Server URL: ws://localhost:8765
```

#### Ollama (Local)
```
Type: Local Model
Base URL: http://localhost:11434
Model Name: llama2
Agent Server URL: ws://localhost:8765
```

#### LM Studio (Local)
```
Type: Local Model
Base URL: http://localhost:1234/v1
Model Name: local-model
Agent Server URL: ws://localhost:8765
```

## 🎮 Utilisation

### Ouvrir un projet
1. Cliquez sur **📁 Open Folder**
2. Sélectionnez le dossier de votre projet
3. L'explorateur de fichiers affiche l'arborescence

### Travailler avec l'IA

#### Chat simple
```
1. Tapez votre question dans le champ de chat
2. Cliquez sur **Send** ou appuyez sur Entrée
3. L'IA répond en contexte de vos fichiers ouverts
```

#### Tâche agentique
```
1. Décrivez la tâche à accomplir
2. Cliquez sur **Run Agent**
3. L'IA analyse le projet et fournit des recommandations
```

#### Exemples de prompts
- "Analyse ce code et trouve les bugs potentiels"
- "Refactorise cette fonction pour améliorer les performances"
- "Génère des tests unitaires pour ce module"
- "Explique comment fonctionne ce fichier"
- "Ajoute la gestion d'erreur dans ce code"

### Raccourcis clavier
- **Ctrl+S / Cmd+S**: Sauvegarder le fichier courant
- **Ctrl+P / Cmd+P**: Recherche rapide de fichier
- **Ctrl+`**: Basculer le terminal (à implémenter)

## 🏗️ Architecture

```
cobrabub/
├── src/                    # Code Electron (Frontend)
│   ├── main.js            # Processus principal Electron
│   ├── index.html         # Interface utilisateur
│   ├── styles.css         # Styles CSS
│   └── renderer.js        # Logique frontend
├── agent-server/          # Serveur Python (Backend IA)
│   ├── server.py          # Serveur WebSocket principal
│   └── agents/            # Agents spécialisés (à venir)
├── models/                # Modèles locaux (optionnel)
├── projects/              # Projets utilisateurs
└── package.json           # Configuration npm
```

### Flux de communication

```
┌─────────────┐     WebSocket     ┌──────────────┐
│   Electron  │ ◄──────────────► │ Agent Server │
│   (UI/IDE)  │                   │   (Python)   │
└─────────────┘                   └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  LLM Models  │
                                   │ (Local/API)  │
                                   └──────────────┘
```

## 🔌 Support des modèles

### APIs Cloud
- ✅ OpenAI (GPT-3.5, GPT-4, GPT-4 Turbo)
- ✅ Anthropic (Claude 2, Claude 3)
- ✅ Compatible OpenAI (vLLM, FastChat, etc.)

### Modèles Locaux
- ✅ Ollama
- ✅ LM Studio
- ✅ Text Generation WebUI
- ✅ Tout serveur compatible OpenAI API

## 🛠️ Développement

### Ajouter un nouvel agent

1. Créez un nouveau fichier dans `agent-server/agents/`
2. Implémentez la logique de l'agent
3. Enregistrez l'agent dans le serveur

### Compiler pour production

```bash
npm run build
```

Les binaires seront générés dans le dossier `dist/`.

## 📝 Roadmap

- [ ] Support du streaming des réponses
- [ ] Terminal intégré
- [ ] Git integration
- [ ] Debugging avec IA
- [ ] Multi-agents collaboratifs
- [ ] Plugins et extensions
- [ ] Syntax highlighting avancé
- [ ] IntelliSense avec IA
- [ ] Historique des conversations
- [ ] Export de configurations

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment aider:

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Committez vos changements (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 📄 License

MIT License - Voir LICENSE pour plus de détails

## 🙏 Remerciements

Inspiré par:
- Cursor - IDE intelligent
- Google Antigravity - Concepts d'IDE futuriste
- VS Code - Excellente expérience développeur

---

**Développé avec ❤️ par l'équipe CobraBub**

*Codez intelligemment, pas durement.*
