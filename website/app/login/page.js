"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './login.module.css';

const LOGIN_TRANSLATIONS = {
  en: {
    backHome: "Back to Home",
    title: "AmeForge Client Portal",
    subtitle: "Generate and manage your CobraBub IDE license",
    emailLabel: "Your Email Address",
    planLabel: "Selected Plan",
    planFree: "Free Trial (Limit: 10 AI Requests/Day)",
    planPro: "Pro Monthly ($5 / month)",
    planAnnual: "Pro Annual ($48 / year)",
    stripeHeader: "Stripe Payment Portal (Simulated)",
    stripeTestMode: "Test Mode",
    cardNum: "Card Number",
    cardExpiry: "Expiry Date",
    cardCvc: "CVC",
    stripeHint: "Use fake testing card numbers. No real charge will be made.",
    btnActivateFree: "Activate Free Trial",
    btnActivatePro: "Confirm Payment & Activate Pro",
    loading: "Processing payment...",
    errorEmail: "Please enter your email address.",
    apiError: "Error generating license. Please try again."
  },
  fr: {
    backHome: "Retour à l'accueil",
    title: "Espace Client AmeForge",
    subtitle: "Générez et gérez votre licence CobraBub IDE",
    emailLabel: "Votre adresse e-mail",
    planLabel: "Formule choisie",
    planFree: "Essai Gratuit (Limite : 10 requêtes IA/jour)",
    planPro: "Pro Mensuel (5$ / mois)",
    planAnnual: "Pro Annuel (48$ / an)",
    stripeHeader: "Portail de Paiement Stripe (Simulé)",
    stripeTestMode: "Mode Test",
    cardNum: "Numéro de carte",
    cardExpiry: "Date d'expiration",
    cardCvc: "CVC",
    stripeHint: "Utilisez des numéros de test. Aucun débit réel ne sera effectué.",
    btnActivateFree: "Activer l'essai gratuit",
    btnActivatePro: "Confirmer le paiement & Activer Pro",
    loading: "Traitement en cours...",
    errorEmail: "Veuillez saisir votre adresse e-mail.",
    apiError: "Erreur lors de la génération de la licence."
  }
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [lang, setLang] = useState('en');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('pro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Simulation states
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam === 'free' || planParam === 'pro' || planParam === 'annual') {
      setPlan(planParam);
    }
    const langParam = searchParams.get('lang');
    if (langParam === 'fr' || langParam === 'en') {
      setLang(langParam);
    }
  }, [searchParams]);

  const t = LOGIN_TRANSLATIONS[lang];

  const toggleLang = () => {
    setLang(lang === 'en' ? 'fr' : 'en');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError(t.errorEmail);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // Simulate Stripe processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const res = await fetch('/api/license/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan })
      });

      const data = await res.json();
      if (data.success) {
        // Redirect to dashboard with details
        router.push(`/dashboard?email=${encodeURIComponent(data.email)}&key=${encodeURIComponent(data.licenseKey)}&plan=${encodeURIComponent(data.plan)}&lang=${lang}`);
      } else {
        setError(data.error || t.apiError);
      }
    } catch (err) {
      setError("Network error. Unable to contact license server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link href="/" className={styles.backLink}>{t.backHome}</Link>
        <button onClick={toggleLang} className={styles.backLink} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          {lang.toUpperCase()}
        </button>
      </div>
      
      <div className={styles.logoHeader}>
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

      {error && <div className={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label>{t.emailLabel}</label>
          <input 
            type="email" 
            placeholder="developer@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label>{t.planLabel}</label>
          <select 
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className={styles.select}
          >
            <option value="free">{t.planFree}</option>
            <option value="pro">{t.planPro}</option>
            <option value="annual">{t.planAnnual}</option>
          </select>
        </div>

        {plan !== 'free' && (
          <div className={styles.stripeMock}>
            <div className={styles.stripeHeader}>
              <span>{t.stripeHeader}</span>
              <span className={styles.testBadge}>{t.stripeTestMode}</span>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: 2 }}>
                <label>{t.cardNum}</label>
                <input 
                  type="text" 
                  value={cardNumber} 
                  onChange={(e) => setCardNumber(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>{t.cardExpiry}</label>
                <input 
                  type="text" 
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/YY"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>{t.cardCvc}</label>
                <input 
                  type="password" 
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
            <small className={styles.stripeHint}>{t.stripeHint}</small>
          </div>
        )}

        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? t.loading : plan === 'free' ? t.btnActivateFree : t.btnActivatePro}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<div className={styles.loadingState}>Loading Client Session...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
