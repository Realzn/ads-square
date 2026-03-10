'use client';
// app/BugReportButton.jsx — Bouton flottant "Signaler un bug"
// Rendu dans layout.js, visible sur TOUTES les pages.

import { useState } from 'react';
import { useLang } from '../lib/lang-context';

const LABELS = {
  fr: {
    tooltip:    'Signaler un bug',
    title:      'Signaler un bug',
    email:      'Votre email',
    emailPh:    'votre@email.com',
    desc:       'Description du bug',
    descPh:     'Décrivez le problème rencontré, sur quelle page, ce qui s\'est passé…',
    page:       'Page concernée (optionnel)',
    pagePh:     '/exemple/page',
    send:       'Envoyer →',
    sending:    'Envoi…',
    success:    'Rapport envoyé — merci !',
    error:      'Erreur lors de l\'envoi.',
    cancel:     'Annuler',
    required:   'Email et description requis.',
  },
  en: {
    tooltip:    'Report a bug',
    title:      'Report a bug',
    email:      'Your email',
    emailPh:    'you@email.com',
    desc:       'Bug description',
    descPh:     'Describe the issue, which page, what happened…',
    page:       'Affected page (optional)',
    pagePh:     '/example/page',
    send:       'Send →',
    sending:    'Sending…',
    success:    'Report sent — thank you!',
    error:      'Error while sending.',
    cancel:     'Cancel',
    required:   'Email and description are required.',
  },
};

const U = {
  bg:     '#01020A',
  border: 'rgba(0,200,240,0.18)',
  text:   '#DDE6F2',
  muted:  'rgba(140,180,220,0.60)',
  accent: '#E8A020',
  err:    '#D02848',
  green:  '#00D880',
  card:   'rgba(1,6,18,0.97)',
};

export default function BugReportButton() {
  const lang = useLang();
  const L = LABELS[lang] || LABELS.fr;

  const [open, setOpen]       = useState(false);
  const [email, setEmail]     = useState('');
  const [desc, setDesc]       = useState('');
  const [page, setPage]       = useState('');
  const [status, setStatus]   = useState('idle'); // idle | sending | success | error
  const [valErr, setValErr]   = useState('');

  const reset = () => { setEmail(''); setDesc(''); setPage(''); setStatus('idle'); setValErr(''); };

  const handleSend = async () => {
    if (!email.trim() || !desc.trim()) { setValErr(L.required); return; }
    setValErr('');
    setStatus('sending');
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), description: desc.trim(), page: page.trim(), lang }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setTimeout(() => { setOpen(false); reset(); }, 2400);
    } catch {
      setStatus('error');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    background: 'rgba(0,4,16,0.80)',
    border: `0.5px solid ${U.border}`,
    color: U.text,
    fontSize: 12,
    outline: 'none',
    fontFamily: "'JetBrains Mono','Fira Code',monospace",
    boxSizing: 'border-box',
    borderRadius: 2,
    resize: 'vertical',
  };

  return (
    <>
      {/* Floating Bug Button */}
      <button
        onClick={() => { setOpen(true); reset(); }}
        title={L.tooltip}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9000,
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: 'rgba(1,6,18,0.92)',
          border: `1px solid rgba(208,40,72,0.45)`,
          color: '#D02848',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(208,40,72,0.25)',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          backdropFilter: 'blur(8px)',
        }}
        aria-label={L.tooltip}
      >
        🐛
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); reset(); } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{
            background: U.card,
            border: `1px solid rgba(208,40,72,0.28)`,
            padding: '28px 28px 24px',
            maxWidth: 440,
            width: '100%',
            boxShadow: '0 0 60px rgba(208,40,72,0.12)',
            clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)',
          }}>
            {/* Header */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🐛</span>
              <span style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '.12em',
                color: U.text,
              }}>{L.title.toUpperCase()}</span>
            </div>

            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: U.green, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, letterSpacing: '.08em' }}>
                ✓ {L.success}
              </div>
            ) : (
              <>
                {/* Email */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '.1em', marginBottom: 6 }}>{L.email.toUpperCase()}</div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={L.emailPh}
                    style={inputStyle}
                  />
                </div>

                {/* Page */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '.1em', marginBottom: 6 }}>{L.page.toUpperCase()}</div>
                  <input
                    type="text"
                    value={page}
                    onChange={e => setPage(e.target.value)}
                    placeholder={L.pagePh}
                    style={inputStyle}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '.1em', marginBottom: 6 }}>{L.desc.toUpperCase()}</div>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder={L.descPh}
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                {/* Errors */}
                {(valErr || status === 'error') && (
                  <div style={{ marginBottom: 12, color: U.err, fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
                    ✗ {valErr || L.error}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => { setOpen(false); reset(); }}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      background: 'transparent',
                      border: `0.5px solid ${U.border}`,
                      color: U.muted,
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono',monospace",
                      letterSpacing: '.08em',
                      cursor: 'pointer',
                      borderRadius: 2,
                    }}
                  >{L.cancel}</button>
                  <button
                    onClick={handleSend}
                    disabled={status === 'sending'}
                    style={{
                      flex: 2,
                      padding: '9px 0',
                      background: status === 'sending' ? 'rgba(208,40,72,0.3)' : '#D02848',
                      border: 'none',
                      color: '#fff',
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono',monospace",
                      letterSpacing: '.08em',
                      cursor: status === 'sending' ? 'wait' : 'pointer',
                      fontWeight: 700,
                      borderRadius: 2,
                    }}
                  >{status === 'sending' ? L.sending : L.send}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
