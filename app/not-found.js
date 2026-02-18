export default function NotFound() {
  return (
    <html lang="fr">
      <head>
        <title>404 — Page introuvable · ADS-SQUARE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0;}
          body{background:#020609;color:#dde8ff;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;}
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;900&display=swap');
          @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
          .wrap{animation:fadeUp 0.6s ease forwards;max-width:480px;}
          a{color:#00d9f5;text-decoration:none;font-weight:700;}
          a:hover{text-decoration:underline;}
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <div style={{fontSize:72,marginBottom:16,lineHeight:1}}>□</div>
          <div style={{color:"#00d9f5",fontWeight:900,fontSize:48,letterSpacing:-2,marginBottom:8}}>404</div>
          <div style={{color:"#dde8ff",fontSize:20,fontWeight:700,marginBottom:12}}>Ce bloc n'existe pas</div>
          <p style={{color:"rgba(185,205,255,0.48)",fontSize:14,lineHeight:1.7,marginBottom:28}}>
            La page que vous cherchez a peut-être été déplacée ou n'existe plus.<br/>
            Mais il reste plein de blocs disponibles sur la grille !
          </p>
          <a href="/" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 24px",borderRadius:12,background:"rgba(0,217,245,0.1)",border:"2px solid rgba(0,217,245,0.4)",color:"#00d9f5",fontWeight:900,fontSize:14}}>
            ← Retour à ADS-SQUARE
          </a>
        </div>
      </body>
    </html>
  );
}
