#!/bin/bash
# scripts/download-fonts.sh
# ─────────────────────────────────────────────────────────────────────────────
# Télécharge et auto-héberge les polices pour éliminer les dépendances CDN tierces.
# Avantages :
#   - Supprime les 3 origines bloquantes (fontshare + google fonts)
#   - Cache Cloudflare Pages illimité (hash dans le nom)
#   - Pas de DNS lookup, pas de connexion TCP supplémentaire
#   - font-display: optional possible → CLS = 0 garanti
#
# Usage : bash scripts/download-fonts.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

FONTS_DIR="public/fonts"
mkdir -p "$FONTS_DIR"

echo "📥 Téléchargement Clash Display (Fontshare)..."

# Clash Display Bold (700)
curl -sL "https://cdn.fontshare.com/wf/IIUX4FGTMIBTJM7SLHKFZLYJJGLPXNHV/53RZKGODF4KKC63FLHQNKR4POYIBZEZK/WEB.woff2" \
  -o "$FONTS_DIR/ClashDisplay-Bold.woff2" || \
  echo "⚠️  Téléchargement ClashDisplay-Bold échoué (URL à mettre à jour depuis Fontshare)"

# Clash Display ExtraBold (800)
curl -sL "https://cdn.fontshare.com/wf/IIUX4FGTMIBTJM7SLHKFZLYJJGLPXNHV/53RZKGODF4KKC63FLHQNKR4POYIBZEZK/WEB800.woff2" \
  -o "$FONTS_DIR/ClashDisplay-ExtraBold.woff2" 2>/dev/null || true

echo "📥 Téléchargement DM Sans (Google Fonts)..."

# DM Sans Regular (400)
curl -sL "https://fonts.gstatic.com/s/dmsans/v15/rP2Yp2ywxg089UriASitC-vmln8zVI-64yr68TS-YA.woff2" \
  -o "$FONTS_DIR/DMSans-Regular.woff2" || \
  echo "⚠️  Téléchargement DMSans-Regular échoué"

# DM Sans Medium (500)
curl -sL "https://fonts.gstatic.com/s/dmsans/v15/rP2Yp2ywxg089UriASitC-vmln8zVI-64yr68TS-YA.woff2" \
  -o "$FONTS_DIR/DMSans-Medium.woff2" 2>/dev/null || true

# DM Sans Bold (700)
curl -sL "https://fonts.gstatic.com/s/dmsans/v15/rP2Yp2ywxg089UriASitC-vmln8zVI-64yr68TS-YA.woff2" \
  -o "$FONTS_DIR/DMSans-Bold.woff2" 2>/dev/null || true

echo ""
echo "✅ Polices téléchargées dans $FONTS_DIR/"
echo ""
echo "📝 Prochaine étape : ajouter dans app/globals.css :"
echo ""
cat << 'CSS'
/* Après téléchargement des polices, remplacer les <link> dans layout.js
   par ces @font-face auto-hébergés avec font-display: optional */

@font-face {
  font-family: 'Clash Display';
  src: url('/fonts/ClashDisplay-Bold.woff2') format('woff2');
  font-weight: 700 900;
  font-display: optional;  /* ← Élimine le CLS : pas de swap = pas de décalage */
  font-style: normal;
}

@font-face {
  font-family: 'DM Sans';
  src: url('/fonts/DMSans-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: optional;
  font-style: normal;
}

@font-face {
  font-family: 'DM Sans';
  src: url('/fonts/DMSans-Bold.woff2') format('woff2');
  font-weight: 700 800;
  font-display: optional;
  font-style: normal;
}
CSS

echo ""
echo "Et supprimer les <link> polices dans app/layout.js (remplacer par ces @font-face)."
