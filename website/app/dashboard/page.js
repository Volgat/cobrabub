"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './dashboard.module.css';

const DASHBOARD_TRANSLATIONS = {
  en: {
    backHome: "Back to Home",
    title: "License Activated Successfully",
    subtitle: "Thank you for supporting AmeForge",
    planLabel: "Subscription Status",
    emailLabel: "Linked Email Address",
    expiryLabel: "Expiration Date",
    licenseLabel: "Your CobraBub License Key:",
    copyBtn: "Copy",
    copied: "Copied!",
    licenseHint: "Store this key securely. You must paste it inside your desktop application.",
    instructionTitle: "How to activate in CobraBub IDE:",
    instructionStep1: "Download and install CobraBub IDE on your computer.",
    instructionStep2: "Launch the application.",
    instructionStep3: "Open Settings in the Agent panel (or click the status badge in the footer).",
    instructionStep4: "Go to the License tab.",
    instructionStep5: "Paste the key above and click Save.",
    freeTrial: "FREE TRIAL",
    proMonthly: "PRO MONTHLY",
    proAnnual: "PRO ANNUAL"
  },
  fr: {
    backHome: "Retour à l'accueil",
    title: "Licence Activée avec Succès",
    subtitle: "Merci de votre confiance envers AmeForge",
    planLabel: "Statut de l'abonnement",
    emailLabel: "Adresse e-mail liée",
    expiryLabel: "Date d'expiration",
    licenseLabel: "Votre clé de licence CobraBub :",
    copyBtn: "Copier",
    copied: "Copié !",
    licenseHint: "Conservez cette clé précieusement. Vous devrez la coller dans votre application desktop.",
    instructionTitle: "Comment l'activer dans CobraBub IDE :",
    instructionStep1: "Téléchargez et installez CobraBub IDE sur votre ordinateur.",
    instructionStep2: "Lancez l'application.",
    instructionStep3: "Ouvrez les Paramètres dans le panneau Agent (ou cliquez sur le badge en bas).",
    instructionStep4: "Allez dans l'onglet Licence.",
    instructionStep5: "Collez la clé ci-dessus et cliquez sur Sauvegarder.",
    freeTrial: "ESSAI GRATUIT",
    proMonthly: "PRO MENSUEL",
    proAnnual: "PRO ANNUEL"
  }
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const [lang, setLang] = useState('en');
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [plan, setPlan] = useState('pro');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEmail(searchParams.get('email') || 'developer@example.com');
    setLicenseKey(searchParams.get('key') || 'License_not_generated');
    setPlan(searchParams.get('plan') || 'pro');
    const langParam = searchParams.get('lang');
    if (langParam === 'fr' || langParam === 'en') {
      setLang(langParam);
    }
  }, [searchParams]);

  const t = DASHBOARD_TRANSLATIONS[lang];

  const toggleLang = () => {
    setLang(lang === 'en' ? 'fr' : 'en');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.dashboardCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link href="/" className={styles.homeBtn} style={{ padding: '6px 16px', fontSize: '13px' }}>
          {t.backHome}
        </Link>
        <button onClick={toggleLang} className={styles.homeBtn} style={{ padding: '6px 16px', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          {lang.toUpperCase()}
        </button>
      </div>

      <div className={styles.header}>
        <Image 
          src="/logo.png" 
          alt="CobraBub" 
          width={64} 
          height={64} 
          className={styles.logo} 
          style={{
            borderRadius: '12px',
            border: '2px solid var(--primary)',
            boxShadow: '0 0 15px var(--primary-glow)'
          }}
          priority
        />
        <h2>{t.title}</h2>
        <p>{t.subtitle}</p>
      </div>

      <div className={styles.statusBox}>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>{t.planLabel}</span>
          <span className={`${styles.statusValue} ${plan !== 'free' ? styles.proBadge : styles.freeBadge}`}>
            {plan === 'free' ? t.freeTrial : plan === 'annual' ? t.proAnnual : t.proMonthly}
          </span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>{t.emailLabel}</span>
          <span className={styles.statusValue}>{email}</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>{t.expiryLabel}</span>
          <span className={styles.statusValue}>
            {new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      <div className={styles.licenseBox}>
        <label className={styles.licenseLabel}>{t.licenseLabel}</label>
        <div className={styles.licenseRow}>
          <input 
            type="text" 
            readOnly 
            value={licenseKey} 
            className={styles.licenseInput}
            onClick={(e) => e.target.select()}
          />
          <button onClick={handleCopy} className={styles.copyBtn}>
            {copied ? t.copied : t.copyBtn}
          </button>
        </div>
        <p className={styles.licenseHint}>{t.licenseHint}</p>
      </div>

      <div className={styles.instructions}>
        <h3>{t.instructionTitle}</h3>
        <ol>
          <li>{t.instructionStep1}</li>
          <li>{t.instructionStep2}</li>
          <li>{t.instructionStep3}</li>
          <li>{t.instructionStep4}</li>
          <li>{t.instructionStep5}</li>
        </ol>
      </div>

      <Link href="/" className={styles.homeBtn}>{t.backHome}</Link>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<div className={styles.loadingState}>Loading Dashboard...</div>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
