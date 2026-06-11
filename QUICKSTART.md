# 🐍 CobraBub - Guide de Démarrage Rapide

## Installation et Lancement en 5 minutes

### Étape 1: Installer les dépendances Node.js

```bash
cd /workspace/cobrabub
npm install
```

### Étape 2: Installer les dépendances Python

```bash
cd agent-server
pip install -r requirements.txt
```

Ou individuellement:
```bash
pip install websockets openai anthropic aiohttp
```

### Étape 3: Lancer le serveur d'agent (Terminal 1)

```bash
cd agent-server
python server.py
```

Vous devriez voir:
```
🚀 CobraBub Agent Server starting on ws://localhost:8765
✓ Server ready at ws://localhost:8765
```

### Étape 4: Lancer l'application Electron (Terminal 2)

```bash
cd /workspace/cobrabub
npm start
```

Ou en mode développement:
```bash
npm run dev
```

## 🎯 Première Utilisation

### 1. Configurer un modèle

**Sans clé API (pour tester):**
- Laissez les champs vides pour l'instant
- Vous pourrez configurer plus tard

**Avec OpenAI:**
1. Cliquez sur ⚙️ (Settings)
2. Type: `OpenAI API`
3. API Key: `sk-votre-clé-ici`
4. Model Name: `gpt-4` ou `gpt-3.5-turbo`
5. Agent Server URL: `ws://localhost:8765`
6. Save Configuration

**Avec Ollama (local et gratuit):**
1. Installez Ollama: https://ollama.ai
2. Téléchargez un modèle: `ollama pull llama2`
3. Dans CobraBub:
   - Type: `Local Model`
   - Base URL: `http://localhost:11434`
   - Model Name: `llama2`
   - Agent Server URL: `ws://localhost:8765`

### 2. Ouvrir un projet

1. Cliquez sur **📁 Open Folder**
2. Sélectionnez un dossier contenant du code
3. L'arborescence s'affiche dans la sidebar

### 3. Poser une question à l'IA

1. Ouvrez un fichier en cliquant dessus
2. Dans le panneau de droite, tapez:
   ```
   Explique ce que fait ce code
   ```
3. Cliquez sur **Send**

### 4. Lancer un agent

1. Demandez une tâche complexe:
   ```
   Analyse ce projet et trouve les bugs potentiels
   ```
2. Cliquez sur **Run Agent**
3. L'IA analyse tous les fichiers ouverts

## 🔧 Dépannage

### Le serveur ne démarre pas?

**Erreur: module 'websockets' not found**
```bash
pip install websockets
```

**Erreur: port already in use**
```bash
# Tuer le processus utilisant le port 8765
lsof -ti:8765 | xargs kill -9
```

### L'application Electron ne se lance pas?

**Erreur: electron not found**
```bash
npm install
```

**Erreur: Cannot find module**
```bash
rm -rf node_modules
npm install
```

### La connexion à l'agent échoue?

1. Vérifiez que le serveur Python tourne
2. Vérifiez l'URL: `ws://localhost:8765`
3. Redémarrez les deux services

## 📚 Exemples de Commandes

### Chat simple
```
"Comment améliorer cette fonction?"
"Qu'est-ce que cette classe?"
"Génère des commentaires pour ce code"
```

### Tâches agentiques
```
"Refactorise ce code pour suivre les bonnes pratiques"
"Trouve les vulnérabilités de sécurité"
"Crée des tests unitaires pour ces fonctions"
"Optimise les performances de ce module"
"Documente toute cette classe"
```

### Analyse de projet
```
"Quelle est l'architecture de ce projet?"
"Y a-t-il du code dupliqué?"
"Propose une structure de dossiers améliorée"
"Quelles dépendances sont inutilisées?"
```

## 🎨 Personnalisation

### Changer le thème

Modifiez `src/styles.css`:
```css
:root {
    --accent-color: #votre-couleur;
    --bg-primary: #votre-fond;
}
```

### Ajouter des raccourcis

Dans `src/renderer.js`:
```javascript
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        // Votre action ici
    }
});
```

## 📖 Prochaines Étapes

1. **Explorer les fonctionnalités**
   - Multi-fichiers avec onglets
   - Sauvegarde automatique
   - Chat contextuel

2. **Configurer votre modèle préféré**
   - OpenAI pour la qualité
   - Ollama pour la confidentialité
   - LM Studio pour la flexibilité

3. **Personnaliser l'IDE**
   - Thèmes
   - Raccourcis
   - Extensions (à venir)

4. **Contribuer au projet**
   - Fork sur GitHub
   - Proposer des features
   - Corriger des bugs

---

**Besoin d'aide?** Consultez le README.md complet ou ouvrez une issue.

**Bon coding avec CobraBub! 🚀**
