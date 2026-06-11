"use client";

import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image src="/logo.png" alt="CobraBub logo" width={32} height={32} className={styles.logoImg} />
          <span className={styles.brandName}>CobraBub IDE</span>
        </div>
        <nav className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Fonctionnalités</a>
          <a href="#pricing" className={styles.navLink}>Tarifs</a>
          <a href="#downloads" className={styles.navLink}>Téléchargements</a>
          <Link href="/login" className={styles.navLink}>Connexion</Link>
          <Link href="/login" className={styles.btnPrimary}>Espace Client</Link>
        </nav>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.badge}>Nouvelle Version v1.0.5 disponible</div>
        <h1 className={styles.title}>L'éditeur de code augmenté par l'Agent IA autonome</h1>
        <p className={styles.subtitle}>
          CobraBub IDE est un environnement de développement ultra-léger et premium conçu par AmeForge.
          Exécutez vos commandes dans le terminal intégré, gérez vos dépôts Git, et laissez l'Agent IA coder de façon autonome en toute sécurité.
        </p>
        <div className={styles.heroButtons}>
          <a href="#downloads" className={`${styles.btnPrimary} ${styles.btnHuge}`}>
            Télécharger CobraBub
          </a>
          <a href="#pricing" className={`${styles.btnSecondary} ${styles.btnHuge}`}>
            Voir les Plans
          </a>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────────────── */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Conçu pour les Développeurs Productifs</h2>
        <p className={styles.sectionSubtitle}>
          Toutes les fonctionnalités indispensables réunies dans une interface fluide, rapide et sécurisée.
        </p>
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🤖</div>
            <h3 className={styles.cardTitle}>Agent IA Autonome</h3>
            <p className={styles.cardText}>
              L'Agent IA peut explorer l'arborescence, lire et modifier les fichiers de code, et exécuter vos scripts de test dans le terminal dans une boucle autonome sécurisée.
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>📟</div>
            <h3 className={styles.cardTitle}>Terminal Intégré</h3>
            <p className={styles.cardText}>
              Exécutez vos commandes système (Bash, CMD, PowerShell) directement dans le volet inférieur réactif avec retour asynchrone non-bloquant.
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🐙</div>
            <h3 className={styles.cardTitle}>Intégration Git & GitHub</h3>
            <p className={styles.cardText}>
              Réalisez vos commits, pulls et pushes en un clic. CobraBub s'authentifie de façon transparente avec votre Personal Access Token (PAT).
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🎨</div>
            <h3 className={styles.cardTitle}>Thèmes Modernes</h3>
            <p className={styles.cardText}>
              Basculez instantanément entre nos thèmes premium (Cyber Purple, Midnight Blue, Emerald Synth, Amber Cyber) avec coloration syntaxique adaptative en direct.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ─────────────────────────────────────────────────── */}
      <section id="pricing" className={styles.pricing}>
        <h2 className={styles.sectionTitle}>Des forfaits adaptés à vos besoins</h2>
        <p className={styles.sectionSubtitle}>
          Commencez gratuitement, puis déverrouillez la puissance totale de l'Agent IA avec nos abonnements Pro.
        </p>
        <div className={styles.pricingGrid}>
          {/* Plan Trial */}
          <div className={styles.priceCard}>
            <h3 className={styles.planName}>Plan Free (Trial)</h3>
            <div className={styles.planPrice}>0$ <span>/ gratuit</span></div>
            <p className={styles.planDesc}>Pour découvrir l'éditeur et tester l'intégration IA de base.</p>
            <Link href="/login?plan=free" className={`${styles.btnSecondary} ${styles.priceButton}`}>
              Commencer
            </Link>
            <ul className={styles.featuresList}>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> Éditeur & Terminal illimités</li>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> Intégration Git & AVD</li>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> 10 requêtes Agent IA / jour</li>
              <li className={styles.featureItem} style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>✗ Accès aux modèles avancés</li>
            </ul>
          </div>

          {/* Plan Pro Monthly */}
          <div className={`${styles.priceCard} ${styles.priceCardFeatured}`}>
            <h3 className={styles.planName}>Plan Pro Mensuel</h3>
            <div className={styles.planPrice}>5$ <span>/ mois</span></div>
            <p className={styles.planDesc}>Idéal pour les développeurs professionnels cherchant une productivité maximale.</p>
            <Link href="/login?plan=pro" className={`${styles.btnPrimary} ${styles.priceButton}`}>
              S'abonner
            </Link>
            <ul className={styles.featuresList}>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> Requêtes Agent IA <strong>Illimitées</strong></li>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> Modèles avancés (Claude 3.5, GPT-4o)</li>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> Support prioritaire AmeForge</li>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> Mode autonome étendu (jusqu'à 30 tours)</li>
            </ul>
          </div>

          {/* Plan Pro Annual */}
          <div className={styles.priceCard}>
            <h3 className={styles.planName}>Plan Pro Annuel</h3>
            <div className={styles.planPrice}>48$ <span>/ an</span></div>
            <p className={styles.planDesc}>Économisez 20% sur votre abonnement avec le forfait annuel (soit 4$/mois).</p>
            <Link href="/login?plan=annual" className={`${styles.btnSecondary} ${styles.priceButton}`}>
              S'abonner
            </Link>
            <ul className={styles.featuresList}>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> Tout du Plan Pro mensuel</li>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> Clé de licence annuelle</li>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> Facture unique pour l'année</li>
              <li className={styles.featureItem}><span className={styles.checkIcon}>✓</span> Économie de 20% incluse</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Downloads Section ────────────────────────────────────────────────── */}
      <section id="downloads" className={styles.downloads}>
        <h2 className={styles.sectionTitle}>Télécharger CobraBub IDE</h2>
        <p className={styles.sectionSubtitle}>
          Compatible avec Windows, macOS et Linux. L'application se connecte au site pour valider votre abonnement.
        </p>
        <div className={styles.downloadGrid}>
          {/* Windows */}
          <a href="https://github.com/Volgat/cobrabub/releases/download/v1.0.5/CobraBub-Setup-1.0.5.exe" className={styles.downloadOption}>
            <div style={{ fontSize: '32px' }}>🪟</div>
            <div className={styles.downloadInfo}>
              <div className={styles.downloadOS}>Windows (10 / 11)</div>
              <div className={styles.downloadMeta}>Installer .exe • ~77 Mo</div>
            </div>
          </a>

          {/* macOS */}
          <a href="#" onClick={(e) => { e.preventDefault(); alert("Version Mac bientôt disponible !"); }} className={styles.downloadOption}>
            <div style={{ fontSize: '32px' }}>🍎</div>
            <div className={styles.downloadInfo}>
              <div className={styles.downloadOS}>macOS (Intel / M1/M2/M3)</div>
              <div className={styles.downloadMeta}>Package .dmg • Bientôt</div>
            </div>
          </a>

          {/* Linux */}
          <a href="#" onClick={(e) => { e.preventDefault(); alert("Version Linux bientôt disponible !"); }} className={styles.downloadOption}>
            <div style={{ fontSize: '32px' }}>🐧</div>
            <div className={styles.downloadInfo}>
              <div className={styles.downloadOS}>Linux (Debian / RedHat)</div>
              <div className={styles.downloadMeta}>Format .AppImage • Bientôt</div>
            </div>
          </a>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <Image src="/logo.png" alt="CobraBub logo" width={20} height={20} style={{ borderRadius: '20%' }} />
          <span>CobraBub IDE</span>
        </div>
        <p>© 2026 CobraBub IDE par **AmeForge**. Tous droits réservés.</p>
        <div className={styles.footerLinks}>
          <a href="https://github.com/Volgat/cobrabub" className={styles.footerLink}>GitHub</a>
          <a href="https://ameforge.tech" className={styles.footerLink}>AmeForge</a>
        </div>
      </footer>
    </div>
  );
}
