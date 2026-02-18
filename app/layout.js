import './globals.css'
export const metadata={title:'ADS-SQUARE — Digital Advertising Grid',description:'La première plateforme de blocs publicitaires en grille. Réservez votre espace, diffusez votre contenu à des millions de visiteurs/jour.'}
export default function R({children}){
  return(
    <html lang="fr">
      <head>
        {/* Non-blocking font preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link rel="preconnect" href="https://api.fontshare.com"/>
        {/* font-display:swap via &display=swap — prevents FOIT */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap"/>
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@700,800,900&display=swap"/>
      </head>
      <body style={{margin:0,overflow:'hidden'}}>{children}</body>
    </html>
  );
}
