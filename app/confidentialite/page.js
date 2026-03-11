'use client';
import { useT, LanguageSwitcher } from '../../lib/i18n';

const C = { bg:'#01020A', card:'rgba(1,6,18,0.96)', border:'rgba(0,200,240,0.10)', text:'#DDE6F2', muted:'rgba(140,180,220,0.55)', cyan:'#00C8E4' };

export default function PrivacyPage() {
  const { t } = useT();

  const sections = [
    { sectionTitle: t('priv_s1_title'), content: t('priv_s1') },
    { sectionTitle: t('priv_s2_title'), content: t('priv_s2') },
    { sectionTitle: t('priv_s3_title'), content: t('priv_s3') },
    { sectionTitle: t('priv_s4_title'), content: t('priv_s4') },
    { sectionTitle: t('priv_s5_title'), content: t('priv_s5') },
    { sectionTitle: t('priv_s6_title'), content: t('priv_s6') },
    { sectionTitle: t('priv_s7_title'), content: t('priv_s7') },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", color: C.text }}>
      <style>{`*{box-sizing:border-box} a{text-decoration:none}`}</style>
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,2,10,0.98)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ fontSize: 13, letterSpacing: '0.25em', color: C.cyan, fontWeight: 700 }}>AdsMostFair</a>
          <span style={{ color: C.muted, fontSize: 12 }}>/ {t('nav_privacy')}</span>
        </div>
        <LanguageSwitcher compact />
      </nav>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 10px' }}>{t('priv_title')}</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 40px' }}>{t('priv_updated')} : {new Date().toLocaleDateString()}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sections.map(({ sectionTitle, content }, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '22px 24px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.cyan, margin: '0 0 10px' }}>{sectionTitle}</h2>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, margin: 0 }}>{content}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, padding: '16px 20px', background: 'rgba(0,200,240,0.04)', border: `1px solid rgba(0,200,240,0.10)`, borderRadius: 8, fontSize: 12, color: C.muted }}>
          DPO : privacy@adsmostfair.com
        </div>
      </div>
    </div>
  );
}
