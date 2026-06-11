"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './login.module.css';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Veuillez saisir votre adresse e-mail.");
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
        router.push(`/dashboard?email=${encodeURIComponent(data.email)}&key=${encodeURIComponent(data.licenseKey)}&plan=${encodeURIComponent(data.plan)}`);
      } else {
        setError(data.error || "Une erreur est survenue lors de la création de la licence.");
      }
    } catch (err) {
      setError("Erreur réseau. Impossible de contacter le serveur de licence.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginCard}>
      <Link href="/" className={styles.backLink}>← Retour à l'accueil</Link>
      
      <div className={styles.logoHeader}>
        <Image src="/logo.png" alt="CobraBub logo" width={48} height={48} className={styles.logo} />
        <h2>Espace Client AmeForge</h2>
        <p>Générez et gérez votre licence CobraBub IDE</p>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label>Votre adresse e-mail</label>
          <input 
            type="email" 
            placeholder="developpeur@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Formule choisie</label>
          <select 
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className={styles.select}
          >
            <option value="free">Trial (Gratuit - Limité)</option>
            <option value="pro">Pro Mensuel (5$ / mois)</option>
            <option value="annual">Pro Annuel (48$ / an)</option>
          </select>
        </div>

        {plan !== 'free' && (
          <div className={styles.stripeMock}>
            <div className={styles.stripeHeader}>
              <span>💳 Passerelle de Paiement Stripe (Simulée)</span>
              <span className={styles.testBadge}>Test Mode</span>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: 2 }}>
                <label>Numéro de carte</label>
                <input 
                  type="text" 
                  value={cardNumber} 
                  onChange={(e) => setCardNumber(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>Date Expir.</label>
                <input 
                  type="text" 
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/AA"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>CVC</label>
                <input 
                  type="password" 
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
            <small className={styles.stripeHint}>Utilisez des numéros de test. Aucun débit réel ne sera effectué.</small>
          </div>
        )}

        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? "Traitement en cours..." : plan === 'free' ? "Activer l'essai gratuit" : "Confirmer le paiement & Activer Pro"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<div className={styles.loadingState}>Chargement de la session...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
