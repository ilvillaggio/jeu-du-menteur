// Génère une affiche imprimable A4 avec le QR code de l'application + design.
// Usage : node scripts/generate-qr.js
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')

const APP_URL = 'https://jeu-du-menteur-production.up.railway.app'
const OUTPUT_HTML = path.join(__dirname, '..', 'print', 'qr-jeu-du-menteur.html')

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_HTML), { recursive: true })

  // 1) Génère le QR code en SVG (haute correction d'erreur "H" pour autoriser un logo au centre si on veut)
  const qrSvgRaw = await QRCode.toString(APP_URL, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 0,
    color: { dark: '#0a0a0f', light: '#ffffff' },
  })

  // Le SVG retourné contient un <svg viewBox="0 0 N N">...<rect.../>... — on en extrait le contenu
  const innerMatch = qrSvgRaw.match(/<svg[^>]*viewBox="0 0 (\d+) (\d+)"[^>]*>([\s\S]*)<\/svg>/)
  if (!innerMatch) throw new Error('QR SVG parse failed')
  const qrSize = parseInt(innerMatch[1], 10)
  const qrInner = innerMatch[3]

  // 2) Construit l'affiche A4 (210 × 297 mm). On travaille en unités SVG = 1mm.
  const POSTER_W = 210
  const POSTER_H = 297

  // QR centré, taille 130mm (assez gros pour scan facile)
  const QR_SIZE_MM = 130
  const QR_X = (POSTER_W - QR_SIZE_MM) / 2
  const QR_Y = 92

  // Échelle pour passer du système du QR (qrSize unités) à QR_SIZE_MM
  const qrScale = QR_SIZE_MM / qrSize

  const poster = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_W}mm" height="${POSTER_H}mm" viewBox="0 0 ${POSTER_W} ${POSTER_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a22"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8e89c"/>
      <stop offset="50%" stop-color="#d4a43d"/>
      <stop offset="100%" stop-color="#8a6a1f"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5">
      <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.5)"/>
    </radialGradient>
  </defs>

  <!-- Fond -->
  <rect width="${POSTER_W}" height="${POSTER_H}" fill="url(#bg)"/>
  <rect width="${POSTER_W}" height="${POSTER_H}" fill="url(#vignette)"/>

  <!-- Cadre doré décoratif extérieur -->
  <rect x="6" y="6" width="${POSTER_W - 12}" height="${POSTER_H - 12}" fill="none" stroke="url(#gold)" stroke-width="0.6"/>
  <rect x="9" y="9" width="${POSTER_W - 18}" height="${POSTER_H - 18}" fill="none" stroke="url(#gold)" stroke-width="0.3" opacity="0.5"/>

  <!-- Coins ornementaux -->
  ${cornerOrnament(10, 10, 0)}
  ${cornerOrnament(POSTER_W - 10, 10, 90)}
  ${cornerOrnament(POSTER_W - 10, POSTER_H - 10, 180)}
  ${cornerOrnament(10, POSTER_H - 10, 270)}

  <!-- Titre -->
  <g transform="translate(${POSTER_W / 2}, 38)" text-anchor="middle">
    <text font-family="Georgia, 'Times New Roman', serif" font-size="13" font-weight="bold"
          fill="url(#gold)" letter-spacing="2">LE JEU DU</text>
    <text y="14" font-family="Georgia, 'Times New Roman', serif" font-style="italic"
          font-size="22" font-weight="bold" fill="url(#gold)" letter-spacing="3">MENTEUR</text>
  </g>

  <!-- Sous-titre -->
  <text x="${POSTER_W / 2}" y="68" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-style="italic"
        font-size="5" fill="#d4a43d" opacity="0.85" letter-spacing="2">
    Trahis. Coopère. Survis.
  </text>

  <!-- Ligne décorative séparatrice avec losange central -->
  <g transform="translate(${POSTER_W / 2}, 80)">
    <line x1="-30" y1="0" x2="-4" y2="0" stroke="url(#gold)" stroke-width="0.4"/>
    <polygon points="-3,0 0,-2 3,0 0,2" fill="url(#gold)"/>
    <line x1="4" y1="0" x2="30" y2="0" stroke="url(#gold)" stroke-width="0.4"/>
  </g>

  <!-- QR code sur fond blanc avec liseré doré -->
  <g transform="translate(${QR_X}, ${QR_Y})">
    <!-- Halo doré derrière le QR -->
    <rect x="-3" y="-3" width="${QR_SIZE_MM + 6}" height="${QR_SIZE_MM + 6}"
          fill="url(#gold)" rx="2"/>
    <!-- Fond blanc du QR -->
    <rect x="0" y="0" width="${QR_SIZE_MM}" height="${QR_SIZE_MM}" fill="#ffffff"/>
    <!-- Le QR lui-même, redimensionné -->
    <g transform="scale(${qrScale})">
      ${qrInner}
    </g>

    <!-- Logo masque au centre du QR (correction H supporte un logo de ~25% du QR) -->
    <g transform="translate(${QR_SIZE_MM / 2}, ${QR_SIZE_MM / 2})">
      <circle r="11" fill="#0a0a0f" stroke="url(#gold)" stroke-width="0.7"/>
      <!-- Petit masque de carnaval -->
      <path d="M -7 -2 Q 0 -5 7 -2 Q 6 2 3 2.5 Q 1 2.7 0 1.5 Q -1 2.7 -3 2.5 Q -6 2 -7 -2 Z"
            fill="url(#gold)"/>
      <ellipse cx="-3.2" cy="-1" rx="1.3" ry="0.8" fill="#0a0a0f"/>
      <ellipse cx="3.2"  cy="-1" rx="1.3" ry="0.8" fill="#0a0a0f"/>
    </g>
  </g>

  <!-- Instruction sous le QR -->
  <g transform="translate(${POSTER_W / 2}, ${QR_Y + QR_SIZE_MM + 18})" text-anchor="middle">
    <text font-family="Georgia, serif" font-size="6" fill="#f8e89c" letter-spacing="3">
      SCANNE POUR JOUER
    </text>
    <text y="9" font-family="'Courier New', monospace" font-size="3.2" fill="#d4a43d" opacity="0.7">
      ${APP_URL.replace('https://', '')}
    </text>
  </g>

  <!-- Texte d'ambiance en bas -->
  <g transform="translate(${POSTER_W / 2}, ${POSTER_H - 30})" text-anchor="middle">
    <text font-family="Georgia, serif" font-style="italic" font-size="3.6" fill="#7a6038">
      Choisis tes alliés. Devine leurs trahisons.
    </text>
    <text y="6" font-family="Georgia, serif" font-style="italic" font-size="3.6" fill="#7a6038">
      Le dernier debout remporte tout.
    </text>
  </g>
</svg>`

  // Wrapper HTML pour impression sans marges (zero-bleed A4 pleine page).
  // Quand on ouvre ce HTML dans Chrome → Ctrl+P → l'affiche remplit toute la feuille.
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>QR · Le Jeu du Menteur — A4 imprimable</title>
  <style>
    /* Format A4 sans marge — l'affiche remplit toute la feuille à l'impression */
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; background: #1a1a22; }
    body { display: flex; flex-direction: column; align-items: center; min-height: 100vh; }

    /* Conteneur SVG : exactement A4 sans débordement */
    .poster {
      width: 210mm;
      height: 297mm;
      display: block;
      box-shadow: 0 4px 30px rgba(0,0,0,0.6);
      margin: 24px 0;
    }
    .poster svg { display: block; width: 100%; height: 100%; }

    /* Barre d'instructions au-dessus de l'affiche (cachée à l'impression) */
    .toolbar {
      position: sticky; top: 0; z-index: 10;
      width: 100%;
      background: rgba(20,20,30,0.96);
      color: #f8e89c;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid rgba(212,164,61,0.3);
    }
    .toolbar p { margin: 0; font-size: 13px; opacity: 0.85; }
    .toolbar button {
      background: linear-gradient(180deg, #f8e89c 0%, #d4a43d 100%);
      color: #1a1410; border: 0; padding: 10px 18px;
      border-radius: 8px; font-weight: 700; font-size: 14px;
      cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    .toolbar button:hover { filter: brightness(1.05); }

    /* À l'impression : on ne montre QUE l'affiche, plein cadre, sans rien d'autre */
    @media print {
      html, body { background: white; }
      .toolbar { display: none !important; }
      .poster {
        width: 210mm; height: 297mm;
        box-shadow: none; margin: 0;
        page-break-after: avoid; page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <p>📄 Affiche A4 sans marge — clique sur le bouton et choisis <strong>Marges : Aucune</strong> dans Chrome pour imprimer pleine page.</p>
    <button onclick="window.print()">🖨️ Imprimer maintenant</button>
  </div>
  <div class="poster">
${poster.replace(/^<\?xml[^>]*\?>\s*/, '').replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')}
  </div>
</body>
</html>`

  fs.writeFileSync(OUTPUT_HTML, html, 'utf8')
  console.log(`[ok] Page imprimable HTML : ${OUTPUT_HTML}`)
  console.log(`     Ouvre ce fichier dans Chrome puis Ctrl+P pour impression pleine page.`)
  console.log()
  console.log(`     QR pointe vers : ${APP_URL}`)
}

function cornerOrnament(cx, cy, rotation) {
  return `<g transform="translate(${cx}, ${cy}) rotate(${rotation})">
    <path d="M 0 0 L 12 0 M 0 0 L 0 12 M 0 0 L 6 6"
          stroke="url(#gold)" stroke-width="0.5" fill="none" opacity="0.7"/>
    <circle r="0.8" fill="url(#gold)"/>
  </g>`
}

main().catch((err) => {
  console.error('[error]', err)
  process.exit(1)
})
