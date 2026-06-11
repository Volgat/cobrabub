"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './dashboard.module.css';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [plan, setPlan] = useState('pro');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEmail(searchParams.get('email') || 'developpeur@example.com');
    setLicenseKey(searchParams.get('key') || 'Clé_non_générée');
    setPlan(searchParams.get('plan') || 'pro');
  }, [searchParams]);

  const handleCopy = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.dashboardCard}>
      <div className={styles.header}>
        <Image src="/logo.png" alt="CobraBub logo" width={48} height={48} className={styles.logo} />
        <h2>Licence Activée avec Succès !</h2>
        <p>Merci pour votre confiance en AmeForge</p>
      </div>

      <div className={styles.statusBox}>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Statut de l'abonnement</span>
          <span className={`${styles.statusValue} ${plan !== 'free' ? styles.proBadge : styles.freeBadge}`}>
            {plan === 'free' ? 'FREE TRIAL' : plan === 'annual' ? 'PRO ANNUEL' : 'PRO MENSUEL'}
          </span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Adresse e-mail liée</span>
          <span className={styles.statusValue}>{email}</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Date d'expiration</span>
          <span className={styles.statusValue}>
            {new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      <div className={styles.licenseBox}>
        <label className={styles.licenseLabel}>Votre clé de licence CobraBub :</label>
        <div className={styles.licenseRow}>
          <input 
            type="text" 
            readOnly 
            value={licenseKey} 
            className={styles.licenseInput}
            onClick={(e) => e.target.select()}
          />
          <button onClick={handleCopy} className={styles.copyBtn}>
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>
        <p className={styles.licenseHint}>Conservez cette clé précieusement. Vous devrez la coller dans votre application desktop.</p>
      </div>

      <div className={styles.instructions}>
        <h3>Comment l'activer dans CobraBub IDE :</h3>
        <ol>
          <li>Téléchargez et installez <strong>CobraBub IDE</strong> sur votre ordinateur.</li>
          <li>Lancez l'application.</li>
          <li>Cliquez sur ⚙️ <strong>Paramètres</strong> dans le panneau de l'Agent.</li>
          <li>Allez dans l'onglet <strong>Apparence & Licence</strong> (ou coller dans le champ Clé).</li>
          <li>Collez la clé ci-dessus et cliquez sur 💾 <strong>Sauvegarder</strong>.</li>
        </ol>
      </div>

      <Link href="/" className={styles.homeBtn}>Retour à l'accueil</Link>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<div className={styles.loadingState}>Chargement du tableau de bord...</div>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
