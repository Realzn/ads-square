'use client';
import { useState } from 'react';
import { useT, LanguageSwitcher } from '../../lib/i18n/index';

const C = { bg:'#01020A', card:'rgba(1,6,18,0.96)', border:'rgba(0,200,240,0.10)', border2:'rgba(0,200,240,0.22)', text:'#DDE6F2', muted:'rgba(140,180,220,0.55)', cyan:'#00C8E4' };

function Accordion({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${open ? C.border2 : C.border}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color .2s', marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: open ? 'rgba(0,200,240,0.06)' : C.card, border: 'none', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', gap: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: open ? C.cyan : C.text, lineHeight: 1.4, flex: 1 }}>{q}</span>
        <span style={{ fontSize: 20, color: C.muted, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 22px 20px', background: 'rgba(0,200,240,0.03)' }}>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, margin: 0 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { t } = useT();
  const questions = t('faq_questions') || [];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", color: C.text }}>
      <style>{`*{box-sizing:border-box} a{text-decoration:none}`}</style>

      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,2,10,0.98)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ fontSize: 13, letterSpacing: '0.25em', color: C.cyan, fontWeight: 700 }}>AdsMostFair</a>
          <span style={{ color: C.muted, fontSize: 12 }}>/ {t('nav_faq')}</span>
        </div>
        <LanguageSwitcher compact />
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <h1 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 12px', background: 'linear-gradient(135deg,#DDE6F2,#00C8E4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('faq_title')}
          </h1>
          <p style={{ fontSize: 16, color: C.muted, margin: 0 }}>{t('faq_sub')}</p>
        </div>

        <div>
          {questions.map((item, i) => (
            <Accordion key={i} q={item.q} a={item.a} />
          ))}
        </div>

        <div style={{ marginTop: 48, textAlign: 'center', padding: 32, background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>
            Une autre question ?
          </div>
          <a href="mailto:contact@adsmostfair.com"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: C.cyan, color: '#01020A', borderRadius: 8, fontSize: 13, fontWeight: 800, letterSpacing: '0.08em' }}>
            contact@adsmostfair.com
          </a>
        </div>
      </div>
    </div>
  );
}
