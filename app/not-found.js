export default function NotFound() {
  return (
    <html lang="fr">
      <head>
        <title>404 — Ce bloc n'existe pas · AdsMostFair</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #020609;
            color: #e8f0f8;
            font-family: 'Rajdhani', system-ui, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            overflow: hidden;
          }
          @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
          @keyframes orbitA { to{transform:rotate(360deg)} }
          @keyframes orbitB { to{transform:rotate(-360deg)} }
          @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.3} }
          @keyframes scanDown { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
          .bg-grid {
            position: fixed; inset: 0; pointer-events: none;
            background-image: linear-gradient(rgba(0,180,220,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,220,0.025) 1px, transparent 1px);
            background-size: 48px 48px;
          }
          .scanline {
            position: fixed; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0,200,240,0.08), transparent);
            animation: scanDown 8s linear infinite; pointer-events: none;
          }
          .wrap {
            animation: fadeUp .5s ease;
            text-align: center;
            max-width: 480px;
            position: relative;
            z-index: 1;
          }
          .orbit-container {
            position: relative;
            width: 80px; height: 80px;
            margin: 0 auto 28px;
            display: flex; align-items: center; justify-content: center;
          }
          .orbit-a {
            position: absolute;
            width: 72px; height: 72px;
            border-radius: 50%;
            border: 1px solid rgba(0,200,240,0.20);
            animation: orbitA 6s linear infinite;
          }
          .orbit-a::before {
            content: '';
            position: absolute;
            top: -3px; left: 50%; transform: translateX(-50%);
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #00C8E4;
            box-shadow: 0 0 8px #00C8E4;
          }
          .orbit-b {
            position: absolute;
            width: 48px; height: 48px;
            border-radius: 50%;
            border: 1px solid rgba(232,160,32,0.18);
            animation: orbitB 4s linear infinite;
          }
          .orbit-b::before {
            content: '';
            position: absolute;
            bottom: -3px; left: 50%; transform: translateX(-50%);
            width: 5px; height: 5px;
            border-radius: 50%;
            background: #E8A020;
            box-shadow: 0 0 6px #E8A020;
          }
          .core {
            width: 16px; height: 16px;
            border-radius: 50%;
            background: radial-gradient(circle at 35% 35%, rgba(232,160,32,0.9), rgba(232,160,32,0.3));
            box-shadow: 0 0 16px rgba(232,160,32,0.5);
          }
          .code-404 {
            font-family: 'JetBrains Mono', monospace;
            font-size: 72px;
            font-weight: 700;
            color: #E8A020;
            line-height: 1;
            margin-bottom: 8px;
            letter-spacing: -.02em;
          }
          .title {
            font-size: 22px;
            font-weight: 700;
            color: #e8f0f8;
            margin-bottom: 12px;
            letter-spacing: .02em;
          }
          .desc {
            color: rgba(160,195,225,0.55);
            font-size: 15px;
            line-height: 1.7;
            margin-bottom: 32px;
          }
          .cta {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: rgba(0,180,220,0.10);
            border: 1px solid rgba(0,180,220,0.25);
            border-radius: 10px;
            color: #00C8E4;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 13px;
            text-decoration: none;
            letter-spacing: .08em;
            transition: all .15s;
          }
          .cta:hover {
            background: rgba(0,180,220,0.18);
            border-color: rgba(0,180,220,0.40);
          }
          .cta-gold {
            background: #E8A020;
            border-color: transparent;
            color: #0a0600;
            box-shadow: 0 0 20px rgba(232,160,32,0.35);
            font-size: 13px;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            letter-spacing: .08em;
          }
          .cta-gold:hover {
            background: #E8A020ee;
            border-color: transparent;
          }
          .actions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
          }
          .tag {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            background: rgba(232,160,32,0.10);
            border: 1px solid rgba(232,160,32,0.20);
            color: #E8A020;
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: .14em;
            margin-bottom: 20px;
          }
        `}</style>
      </head>
      <body>
        <div className="bg-grid" />
        <div className="scanline" />

        <div className="wrap">
          <div className="orbit-container">
            <div className="orbit-a" />
            <div className="orbit-b" />
            <div className="core" />
          </div>

          <div className="tag">◈ DYSON·COSMOS</div>
          <div className="code-404">404</div>
          <div className="title">Ce bloc n'existe pas</div>
          <p className="desc">
            La page que vous cherchez a été déplacée ou n'existe plus.<br />
            Il reste plein de blocs disponibles sur la Sphère !
          </p>

          <div className="actions">
            <a href="/" className="cta cta-gold">◈ Explorer la Sphère →</a>
            <a href="/dashboard" className="cta">Dashboard</a>
          </div>
        </div>
      </body>
    </html>
  );
}
