"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

const TRANSLATIONS = {
  en: {
    navFeatures: "Features",
    navPricing: "Pricing",
    navDownloads: "Downloads",
    navDocumentation: "Help & Docs",
    navClientArea: "Client Space",
    badge: "Version v1.0.5 Now Available",
    heroTitle: "The Code Editor Augmented by an Autonomous AI Agent",
    heroSubtitle: "CobraBub IDE is an ultra-lightweight and premium development environment developed by AmeForge. Run system commands in the integrated terminal, manage Git repositories, and let the AI agent code autonomously in a safe, loop-locked environment.",
    ctaDownload: "Get CobraBub",
    ctaPricing: "View Pricing",
    featuresTitle: "Engineered for Productive Developers",
    featuresSubtitle: "All essential development tools integrated into a fast, fluid, and secure workstation.",
    feature1Title: "Autonomous AI Agent",
    feature1Desc: "The AI agent can traverse directories, read/edit files, and run tests or compile code inside the built-in terminal synchronously, performing multi-turn autonomous coding tasks.",
    feature2Title: "Integrated Terminal",
    feature2Desc: "Run system commands (Bash, CMD, PowerShell) directly in a responsive, non-blocking integrated terminal with asynchronous real-time feedback.",
    feature3Title: "Git & GitHub Integration",
    feature3Desc: "Perform commits, pulls, and pushes seamlessly. CobraBub authenticates securely using your Personal Access Token (PAT).",
    feature4Title: "Polished Themes",
    feature4Desc: "Instantly switch between gorgeous pre-configured developer themes (Cyber Purple, Midnight Blue, Emerald Synth, Amber Cyber) with live syntax highlighting.",
    pricingTitle: "Flexible Licensing Plans",
    pricingSubtitle: "Get started for free, or unlock the full power of the AI Agent with our premium subscription plans.",
    planFree: "Free Trial",
    planFreePrice: "$0",
    planFreeSub: "forever free",
    planFreeDesc: "Explore the IDE interface and test basic AI operations.",
    planFreeBtn: "Get Started",
    planFreeF1: "Unlimited editor & terminal",
    planFreeF2: "Git & Emulator integrations",
    planFreeF3: "10 AI Agent requests per day",
    planFreeF4: "Limited to base AI models",
    
    planProMonthly: "Pro Monthly",
    planProMonthlyPrice: "$5",
    planProMonthlySub: "/ month",
    planProMonthlyDesc: "Designed for professional developers looking for maximum productivity.",
    planProMonthlyBtn: "Subscribe Now",
    planProMonthlyF1: "Unlimited AI Agent requests",
    planProMonthlyF2: "Access to advanced models (Claude 3.5, GPT-4o)",
    planProMonthlyF3: "Priority support by AmeForge",
    planProMonthlyF4: "Extended autonomous loops (up to 30 tours)",

    planProAnnual: "Pro Annual",
    planProAnnualPrice: "$48",
    planProAnnualSub: "/ year",
    planProAnnualDesc: "Save 20% compared to monthly billing with our annual plan.",
    planProAnnualBtn: "Subscribe & Save",
    planProAnnualF1: "Everything included in Pro Monthly",
    planProAnnualF2: "Annual license key",
    planProAnnualF3: "Single consolidated invoice",
    planProAnnualF4: "20% permanent discount",

    downloadsTitle: "Supported Operating Systems",
    downloadsSubtitle: "Download CobraBub IDE for your platform. The desktop app connects to this site to validate your license key.",
    winDownload: "Windows (10 / 11)",
    winDownloadMeta: "Installer .exe • ~77 MB",
    macDownload: "macOS (Intel / Apple Silicon)",
    macDownloadMeta: "Package .dmg • Coming Soon",
    linuxDownload: "Linux (Debian / RedHat / AppImage)",
    linuxDownloadMeta: "AppImage package • Coming Soon",

    docsTitle: "Help & Professional Documentation",
    docsSubtitle: "Get started quickly with CobraBub IDE. Learn how to configure your workspace, connect the AI agent, and manage license keys.",
    docsQ1: "How do I get started with CobraBub?",
    docsA1: "After downloading and installing the executable for your OS, open the application. You can immediately use it as a standard code editor. To open your codebase, click 'Open Folder' in the sidebar explorer.",
    docsQ2: "How does the AI Agent request limit work?",
    docsA2: "In the Free Trial, you can make up to 10 AI Agent requests per day. Once reached, you will be prompted to paste a Pro license key. Pro plans ($5/month or $48/year) provide unlimited requests to models like Claude 3.5 Sonnet and GPT-4o.",
    docsQ3: "How do I activate my Pro license key?",
    docsA3: "Log in or subscribe to a Pro plan on this website. Go to your Client Dashboard and copy your unique license key. In the CobraBub desktop application, click the Settings gear icon (or the 'FREE' status badge in the footer), navigate to the 'License' tab, paste your key, and click 'Save'. The interface will instantly update to 'PRO'.",
    docsQ4: "Is my code secure with the AI Agent?",
    docsA4: "Yes. CobraBub runs all commands and file operations locally on your system, and only sends the specific file contexts to the LLM provider (Anthropic or OpenAI) for completion. No telemetry or code is sent to AmeForge servers, and the licensing system is fully cryptographic and validated offline.",

    footerText: "CobraBub IDE by AmeForge. All rights reserved.",
    footerAmeForgeLink: "AmeForge Official",
    featuredBadge: "RECOMMENDED"
  },
  fr: {
    navFeatures: "Fonctionnalités",
    navPricing: "Tarifs",
    navDownloads: "Téléchargements",
    navDocumentation: "Aide & Docs",
    navClientArea: "Espace Client",
    badge: "Version v1.0.5 Disponible",
    heroTitle: "L'éditeur de code augmenté par un Agent IA autonome",
    heroSubtitle: "CobraBub IDE est un environnement de développement ultra-léger et premium conçu par AmeForge. Exécutez vos commandes dans le terminal intégré, gérez vos dépôts Git, et laissez l'Agent IA coder de façon autonome en toute sécurité.",
    ctaDownload: "Télécharger CobraBub",
    ctaPricing: "Voir les Tarifs",
    featuresTitle: "Conçu pour les Développeurs Productifs",
    featuresSubtitle: "Toutes les fonctionnalités indispensables réunies dans une interface de travail fluide, rapide et sécurisée.",
    feature1Title: "Agent IA Autonome",
    feature1Desc: "L'Agent IA peut parcourir vos dossiers, lire/modifier vos fichiers et exécuter vos tests dans le terminal en boucle autonome et sécurisée.",
    feature2Title: "Terminal Intégré",
    feature2Desc: "Exécutez vos commandes système (Bash, CMD, PowerShell) directement dans le terminal réactif avec retour asynchrone en temps réel.",
    feature3Title: "Intégration Git & GitHub",
    feature3Desc: "Réalisez vos commits, pulls et pushes en un clic. CobraBub s'authentifie en toute sécurité via votre Personal Access Token (PAT).",
    feature4Title: "Thèmes Soignés",
    feature4Desc: "Basculez instantanément entre nos thèmes premium (Cyber Purple, Midnight Blue, Emerald Synth, Amber Cyber) avec coloration syntaxique adaptative.",
    pricingTitle: "Plans de Licence Flexibles",
    pricingSubtitle: "Commencez gratuitement, puis déverrouillez la puissance totale de l'Agent IA avec nos forfaits Pro.",
    planFree: "Plan Gratuit",
    planFreePrice: "0 €",
    planFreeSub: "gratuit à vie",
    planFreeDesc: "Pour découvrir l'éditeur et tester l'intégration de base avec l'IA.",
    planFreeBtn: "Commencer",
    planFreeF1: "Éditeur & terminal illimités",
    planFreeF2: "Intégrations Git & Émulateurs",
    planFreeF3: "10 requêtes Agent IA par jour",
    planFreeF4: "Limité aux modèles de base",

    planProMonthly: "Pro Mensuel",
    planProMonthlyPrice: "5 €",
    planProMonthlySub: "/ mois",
    planProMonthlyDesc: "Idéal pour les développeurs professionnels cherchant une productivité maximale.",
    planProMonthlyBtn: "S'abonner",
    planProMonthlyF1: "Requêtes Agent IA illimitées",
    planProMonthlyF2: "Accès aux modèles avancés (Claude 3.5, GPT-4o)",
    planProMonthlyF3: "Support prioritaire AmeForge",
    planProMonthlyF4: "Boucles autonomes étendues (jusqu'à 30 tours)",

    planProAnnual: "Pro Annuel",
    planProAnnualPrice: "48 €",
    planProAnnualSub: "/ an",
    planProAnnualDesc: "Économisez 20% par rapport à l'abonnement mensuel.",
    planProAnnualBtn: "S'abonner & Économiser",
    planProAnnualF1: "Tout ce qui est inclus dans le Plan Pro mensuel",
    planProAnnualF2: "Clé de licence annuelle",
    planProAnnualF3: "Facturation simplifiée sur l'année",
    planProAnnualF4: "Remise permanente de 20%",

    downloadsTitle: "Systèmes d'Exploitation Supportés",
    downloadsSubtitle: "Téléchargez CobraBub IDE pour votre plateforme. L'application se connecte au site pour valider votre clé de licence.",
    winDownload: "Windows (10 / 11)",
    winDownloadMeta: "Installateur .exe • ~77 Mo",
    macDownload: "macOS (Intel / Apple Silicon)",
    macDownloadMeta: "Package .dmg • Bientôt disponible",
    linuxDownload: "Linux (Debian / RedHat / AppImage)",
    linuxDownloadMeta: "Format AppImage • Bientôt disponible",

    docsTitle: "Aide & Documentation Professionnelle",
    docsSubtitle: "Prenez en main rapidement CobraBub IDE. Apprenez à configurer votre espace, connecter l'agent IA, et gérer votre licence.",
    docsQ1: "Comment commencer avec CobraBub ?",
    docsA1: "Après avoir téléchargé et installé l'exécutable pour votre système, ouvrez l'application. Vous pouvez immédiatement commencer à éditer vos fichiers. Pour ouvrir un projet, cliquez sur 'Open Folder' dans la barre latérale.",
    docsQ2: "Comment fonctionne la limite gratuite de l'Agent IA ?",
    docsA2: "En version gratuite, vous pouvez effectuer jusqu'à 10 requêtes par jour. Une fois la limite atteinte, vous devrez entrer une clé de licence Pro. Les abonnements Pro (5$/mois ou 48$/an) débloquent les requêtes illimitées.",
    docsQ3: "Comment activer ma clé de licence Pro ?",
    docsA3: "Connectez-vous ou souscrivez à un plan Pro sur ce site. Copiez votre clé de licence depuis votre Espace Client. Dans l'application CobraBub, ouvrez les configurations (icône engrenage ou badge 'FREE' en bas), allez dans l'onglet 'Licence', collez votre clé et cliquez sur 'Enregistrer'.",
    docsQ4: "Mes fichiers de code sont-ils sécurisés ?",
    docsA4: "Absolument. CobraBub fonctionne entièrement en local sur votre machine et n'envoie que les portions de code nécessaires aux serveurs LLM (Anthropic/OpenAI). Aucune donnée ou code source n'est stocké sur les serveurs d'AmeForge. Les licences sont vérifiées de manière cryptographique et locale.",

    footerText: "CobraBub IDE par AmeForge. Tous droits réservés.",
    footerAmeForgeLink: "Site AmeForge",
    featuredBadge: "RECOMMANDÉ"
  }
};

export default function Home() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [activeDoc, setActiveDoc] = useState(null);

  const t = TRANSLATIONS[lang];

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'fr' : 'en');
  };

  const toggleAccordion = (index) => {
    setActiveDoc(activeDoc === index ? null : index);
  };

  return (
    <div className={styles.container} data-theme={theme}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image 
            src="/logo.png" 
            alt="CobraBub" 
            width={44} 
            height={44} 
            className={styles.logoImg} 
            priority
          />
          <span className={styles.brandName}>CobraBub IDE</span>
        </div>
        <nav className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>{t.navFeatures}</a>
          <a href="#downloads" className={styles.navLink}>{t.navDownloads}</a>
          <a href="#pricing" className={styles.navLink}>{t.navPricing}</a>
          <a href="#documentation" className={styles.navLink}>{t.navDocumentation}</a>
          <Link href="/login" className={styles.navLink}>{t.navClientArea}</Link>
          
          <div className={styles.controlGroup}>
            <button onClick={toggleLang} className={styles.toggleBtn}>
              {lang.toUpperCase()}
            </button>
            <button onClick={toggleTheme} className={styles.toggleBtn}>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
          <Link href="/login" className={styles.btnPrimary}>{t.navClientArea}</Link>
        </nav>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.badge}>{t.badge}</div>
        <Image 
          src="/logo.png" 
          alt="CobraBub Logo Large" 
          width={120} 
          height={120} 
          style={{ 
            borderRadius: '24px', 
            marginBottom: '28px',
            boxShadow: '0 0 30px var(--primary-glow)',
            border: '2px solid var(--primary)'
          }}
          priority
        />
        <h1 className={styles.title}>{t.heroTitle}</h1>
        <p className={styles.subtitle}>{t.heroSubtitle}</p>
        <div className={styles.heroButtons}>
          <a href="#downloads" className={`${styles.btnPrimary} ${styles.btnHuge}`}>
            {t.ctaDownload}
          </a>
          <a href="#pricing" className={`${styles.btnSecondary} ${styles.btnHuge}`}>
            {t.ctaPricing}
          </a>
        </div>
      </section>

      {/* ── Mockup Preview Section (Middle) ─────────────────────────────────── */}
      <div className={styles.mockupContainer}>
        <div className={styles.previewMockup}>
          <div className={styles.mockupHeader}>
            <div className={styles.mockupDots}>
              <span className={`${styles.mockupDot} ${styles.dotRed}`}></span>
              <span className={`${styles.mockupDot} ${styles.dotYellow}`}></span>
              <span className={`${styles.mockupDot} ${styles.dotGreen}`}></span>
            </div>
            <div className={styles.mockupTitle}>CobraBub IDE — main.js</div>
          </div>
          <div className={styles.mockupContent}>
            {/* Sidebar */}
            <div className={styles.mockupSidebar}>
              <div className={styles.sidebarSection}>WORKSPACE</div>
              <div className={styles.sidebarFileActive}>src/main.js</div>
              <div className={styles.sidebarFile}>src/renderer.js</div>
              <div className={styles.sidebarFile}>website/app/page.js</div>
              <div className={styles.sidebarFile}>package.json</div>
            </div>
            {/* Editor */}
            <div className={styles.mockupEditor}>
              <pre style={{ margin: 0 }}>
                <code>
                  <span className={styles.codeKeyword}>const</span> crypto = <span className={styles.codeBuiltin}>require</span>(<span className={styles.codeString}>'crypto'</span>);{"\n"}
                  <span className={styles.codeKeyword}>const</span> SECRET = <span className={styles.codeString}>"obsidian-golden-green-secret-2026"</span>;{"\n\n"}
                  <span className={styles.codeComment}>// Local cryptographic licensing system</span>{"\n"}
                  <span className={styles.codeKeyword}>function</span> <span className={styles.codeFunction}>verifyLicenseKeyLocal</span>(key) {"{"}{"\n"}
                  {"  "}<span className={styles.codeKeyword}>if</span> (!key) <span className={styles.codeKeyword}>return</span> {"{"} valid: <span className={styles.codeKeyword}>false</span> {"}"};{"\n"}
                  {"  "}<span className={styles.codeKeyword}>const</span> [payload, signature] = key.<span className={styles.codeProperty}>split</span>(<span className={styles.codeString}>'.'</span>);{"\n"}
                  {"  "}<span className={styles.codeKeyword}>const</span> hmac = crypto.<span className={styles.codeFunction}>createHmac</span>(<span className={styles.codeString}>'sha256'</span>, SECRET);{"\n"}
                  {"  "}hmac.<span className={styles.codeFunction}>update</span>(payload);{"\n"}
                  {"  "}<span className={styles.codeKeyword}>const</span> expected = hmac.<span className={styles.codeFunction}>digest</span>(<span className={styles.codeString}>'hex'</span>);{"\n"}
                  {"  "}<span className={styles.codeKeyword}>return</span> {"{"} valid: signature === expected, plan: <span className={styles.codeString}>'pro'</span> {"}"};{"\n"}
                  {"}"}
                </code>
              </pre>
            </div>
            {/* Agent Panel */}
            <div className={styles.mockupAgent}>
              <div className={styles.agentTitle}>COBRABUB AGENT</div>
              <div className={styles.agentBubble}>
                <span className={styles.agentText}>
                  I analyzed the codebase. The offline signature validation is complete and correctly integrated with the daily limit throttle.
                </span>
              </div>
              <div className={styles.agentPrompt}>
                <input type="text" readOnly placeholder="Ask the agent to edit or build..." className={styles.mockupInput} />
                <button className={styles.mockupBtn}>Run</button>
              </div>
            </div>
          </div>
          {/* Terminal */}
          <div className={styles.mockupTerminal}>
            <div className={styles.terminalHeader}>INTEGRATED TERMINAL</div>
            <div className={styles.terminalBody}>
              <span className={styles.terminalPrompt}>$</span> node verify.js --key=payloadBase64.signatureHex{"\n"}
              <span className={styles.terminalSuccess}>✓ License verified successfully! Pro Plan Active (Offline Verification)</span>{"\n"}
              <span className={styles.terminalPrompt}>$</span> npm run build{"\n"}
              <span>✓ Compiled successfully. Output: dist/CobraBub Setup 1.0.5.exe</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Middle Downloads Section ───────────────────────────────────────── */}
      <section id="downloads" className={styles.middleDownloads}>
        <h2 className={styles.sectionTitle}>{t.downloadsTitle}</h2>
        <p className={styles.sectionSubtitle}>{t.downloadsSubtitle}</p>
        <div className={styles.downloadGrid}>
          {/* Windows */}
          <a href="https://github.com/Volgat/cobrabub/releases/download/v1.0.5/CobraBub-Setup-1.0.5.exe" className={styles.downloadOption}>
            <div className={styles.downloadIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.55v-8.1zM10.8 1.95L24 0v11.55H10.8V1.95zM10.8 12.45H24v11.55l-13.2-1.95v-9.6z" />
              </svg>
            </div>
            <div className={styles.downloadInfo}>
              <span className={styles.downloadOS}>{t.winDownload}</span>
              <span className={styles.downloadMeta}>{t.winDownloadMeta}</span>
            </div>
          </a>

          {/* macOS */}
          <a href="#" onClick={(e) => { e.preventDefault(); alert("Mac version coming soon!"); }} className={styles.downloadOption}>
            <div className={styles.downloadIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.52-.64.74-1.2 1.88-1.05 2.99 1.11.09 2.24-.55 3-1.45z" />
              </svg>
            </div>
            <div className={styles.downloadInfo}>
              <span className={styles.downloadOS}>{t.macDownload}</span>
              <span className={styles.downloadMeta}>{t.macDownloadMeta}</span>
            </div>
          </a>

          {/* Linux */}
          <a href="#" onClick={(e) => { e.preventDefault(); alert("Linux version coming soon!"); }} className={styles.downloadOption}>
            <div className={styles.downloadIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <div className={styles.downloadInfo}>
              <span className={styles.downloadOS}>{t.linuxDownload}</span>
              <span className={styles.downloadMeta}>{t.linuxDownloadMeta}</span>
            </div>
          </a>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────────────── */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>{t.featuresTitle}</h2>
        <p className={styles.sectionSubtitle}>{t.featuresSubtitle}</p>
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 7.54 16.59l-1.42-1.42A8 8 0 1 0 5.88 15.17l-1.42 1.42A10 10 0 0 1 12 2z" />
                <path d="M12 6a6 6 0 0 1 4.54 9.93l-1.42-1.42A4 4 0 1 0 8.88 13.1l-1.42 1.42A6 6 0 0 1 12 6z" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <h3 className={styles.cardTitle}>{t.feature1Title}</h3>
            <p className={styles.cardText}>{t.feature1Desc}</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h3 className={styles.cardTitle}>{t.feature2Title}</h3>
            <p className={styles.cardText}>{t.feature2Desc}</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </div>
            <h3 className={styles.cardTitle}>{t.feature3Title}</h3>
            <p className={styles.cardText}>{t.feature3Desc}</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className={styles.cardTitle}>{t.feature4Title}</h3>
            <p className={styles.cardText}>{t.feature4Desc}</p>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ─────────────────────────────────────────────────── */}
      <section id="pricing" className={styles.pricing}>
        <h2 className={styles.sectionTitle}>{t.pricingTitle}</h2>
        <p className={styles.sectionSubtitle}>{t.pricingSubtitle}</p>
        <div className={styles.pricingGrid}>
          {/* Plan Trial */}
          <div className={styles.priceCard}>
            <h3 className={styles.planName}>{t.planFree}</h3>
            <div className={styles.planPrice}>{t.planFreePrice} <span>{t.planFreeSub}</span></div>
            <p className={styles.planDesc}>{t.planFreeDesc}</p>
            <Link href="/login?plan=free" className={`${styles.btnSecondary} ${styles.priceButton}`}>
              {t.planFreeBtn}
            </Link>
            <ul className={styles.featuresList}>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planFreeF1}
              </li>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planFreeF2}
              </li>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planFreeF3}
              </li>
              <li className={styles.featureItem} style={{ opacity: 0.4 }}>
                ✗ {t.planFreeF4}
              </li>
            </ul>
          </div>

          {/* Plan Pro Monthly */}
          <div className={`${styles.priceCard} ${styles.priceCardFeatured}`} data-badge={t.featuredBadge}>
            <h3 className={styles.planName}>{t.planProMonthly}</h3>
            <div className={styles.planPrice}>{t.planProMonthlyPrice} <span>{t.planProMonthlySub}</span></div>
            <p className={styles.planDesc}>{t.planProMonthlyDesc}</p>
            <Link href="/login?plan=pro" className={`${styles.btnPrimary} ${styles.priceButton}`}>
              {t.planProMonthlyBtn}
            </Link>
            <ul className={styles.featuresList}>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planProMonthlyF1}
              </li>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planProMonthlyF2}
              </li>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planProMonthlyF3}
              </li>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planProMonthlyF4}
              </li>
            </ul>
          </div>

          {/* Plan Pro Annual */}
          <div className={styles.priceCard}>
            <h3 className={styles.planName}>{t.planProAnnual}</h3>
            <div className={styles.planPrice}>{t.planProAnnualPrice} <span>{t.planProAnnualSub}</span></div>
            <p className={styles.planDesc}>{t.planProAnnualDesc}</p>
            <Link href="/login?plan=annual" className={`${styles.btnSecondary} ${styles.priceButton}`}>
              {t.planProAnnualBtn}
            </Link>
            <ul className={styles.featuresList}>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planProAnnualF1}
              </li>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planProAnnualF2}
              </li>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planProAnnualF3}
              </li>
              <li className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span> {t.planProAnnualF4}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Documentation / Help Section ─────────────────────────────────────── */}
      <section id="documentation" className={styles.documentation}>
        <h2 className={styles.sectionTitle}>{t.docsTitle}</h2>
        <p className={styles.sectionSubtitle}>{t.docsSubtitle}</p>
        <div className={styles.accordion}>
          {[
            { q: t.docsQ1, a: t.docsA1 },
            { q: t.docsQ2, a: t.docsA2 },
            { q: t.docsQ3, a: t.docsA3 },
            { q: t.docsQ4, a: t.docsA4 }
          ].map((item, idx) => (
            <div className={styles.accordionItem} key={idx}>
              <button className={styles.accordionHeader} onClick={() => toggleAccordion(idx)}>
                <span>{item.q}</span>
                <span className={`${styles.accordionIcon} ${activeDoc === idx ? styles.accordionIconActive : ''}`}>
                  ▼
                </span>
              </button>
              {activeDoc === idx && (
                <div className={styles.accordionContent}>
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <Image 
            src="/logo.png" 
            alt="CobraBub" 
            width={24} 
            height={24} 
            className={styles.footerLogoImg} 
          />
          <span>CobraBub IDE</span>
        </div>
        
        {/* Social Media Links */}
        <div className={styles.socialLinks}>
          <a href="https://www.youtube.com/@ameforge1" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="YouTube">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
          <a href="https://www.facebook.com/search/top?q=ameforge" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Facebook">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
            </svg>
          </a>
        </div>

        <p>© 2026 CobraBub IDE. {t.footerText}</p>
        <div className={styles.footerLinks}>
          <a href="https://github.com/Volgat/cobrabub" className={styles.footerLink}>GitHub</a>
          <a href="https://ameforge.tech" className={styles.footerLink}>{t.footerAmeForgeLink}</a>
        </div>
      </footer>
    </div>
  );
}
