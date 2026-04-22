// ============================================================
// PRINT SERVER — Il Villaggio — POS-80C Thermal Printer
// ============================================================
// Usage: node server.js
// Écoute sur http://localhost:3005/print
// Envoie les tickets ESC/POS via TCP vers l'imprimante
// ============================================================

const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');

// === CONFIG ===
const PRINTER_IP = '192.168.1.220';
const PRINTER_PORT = 9100;
const SERVER_PORT = 3005;
const SERVER_PORT_HTTPS = 3006;
const FIREBASE_DB_HOST = 'appli-pizzeria-default-rtdb.europe-west1.firebasedatabase.app';

// === ESC/POS COMMANDS ===
const ESC = 0x1B;
const GS = 0x1D;
const CMD = {
  INIT:        Buffer.from([ESC, 0x40]),                    // Initialize printer
  CENTER:      Buffer.from([ESC, 0x61, 0x01]),              // Center align
  LEFT:        Buffer.from([ESC, 0x61, 0x00]),              // Left align
  RIGHT:       Buffer.from([ESC, 0x61, 0x02]),              // Right align
  BOLD_ON:     Buffer.from([ESC, 0x45, 0x01]),              // Bold on
  BOLD_OFF:    Buffer.from([ESC, 0x45, 0x00]),              // Bold off
  DOUBLE_ON:   Buffer.from([GS, 0x21, 0x11]),               // Double width+height
  DOUBLE_OFF:  Buffer.from([GS, 0x21, 0x00]),               // Normal size
  WIDE_ON:     Buffer.from([GS, 0x21, 0x10]),               // Double width only
  WIDE_OFF:    Buffer.from([GS, 0x21, 0x00]),               // Normal size
  CUT:         Buffer.from([GS, 0x56, 0x00]),               // Full cut
  PARTIAL_CUT: Buffer.from([GS, 0x56, 0x01]),               // Partial cut
  FEED3:       Buffer.from([ESC, 0x64, 0x03]),              // Feed 3 lines
  FEED5:       Buffer.from([ESC, 0x64, 0x05]),              // Feed 5 lines
  LINE:        Buffer.from('------------------------------------------------\n', 'latin1'),
  DLINE:       Buffer.from('================================================\n', 'latin1'),
};

// Encode text for ESC/POS (codepage 437/858 compatible)
// The POS-80C uses CP437 by default — map French accents to CP437 codes
const ACCENT_MAP = {
  'à': 0x85, 'â': 0x83, 'ä': 0x84,
  'é': 0x82, 'è': 0x8A, 'ê': 0x88, 'ë': 0x89,
  'î': 0x8C, 'ï': 0x8B,
  'ô': 0x93, 'ö': 0x94,
  'ù': 0x97, 'û': 0x96, 'ü': 0x81,
  'ç': 0x87,
  'À': 0x41, 'Â': 0x41, 'Ä': 0x8E,
  'É': 0x90, 'È': 0x45, 'Ê': 0x45, 'Ë': 0x45,
  'Î': 0x49, 'Ï': 0x49,
  'Ô': 0x4F, 'Ö': 0x99,
  'Ù': 0x55, 'Û': 0x55, 'Ü': 0x9A,
  'Ç': 0x80,
  '€': 0x45, // E fallback
  '°': 0xF8,
};

function txt(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = ch.charCodeAt(0);
    if (ACCENT_MAP[ch] !== undefined) {
      bytes.push(ACCENT_MAP[ch]);
    } else if (code < 128) {
      bytes.push(code);
    } else {
      bytes.push(0x3F); // '?' fallback
    }
  }
  return Buffer.from(bytes);
}

// Pad/truncate to fixed width
function pad(str, len, alignRight) {
  str = str || '';
  if (str.length > len) str = str.substring(0, len);
  if (alignRight) return str.padStart(len, ' ');
  return str.padEnd(len, ' ');
}

// Format a line: left text + right text (48 char width for 80mm)
function lineLeftRight(left, right, width) {
  width = width || 48;
  left = left || '';
  right = right || '';
  const space = width - left.length - right.length;
  if (space < 1) return left.substring(0, width - right.length - 1) + ' ' + right;
  return left + ' '.repeat(space) + right;
}

// Tri des items : grouper par nom (mêmes pizzas se suivent), desserts en dernier, boissons à la fin
const DESSERT_IDS = ['nutella'];
function sortItems(items) {
  if (!items || items.length === 0) return [];
  const copy = [...items];
  copy.sort((a, b) => {
    const aIsDessert = DESSERT_IDS.includes(a.productId) || (a.name && a.name.toLowerCase().includes('nutella'));
    const bIsDessert = DESSERT_IDS.includes(b.productId) || (b.name && b.name.toLowerCase().includes('nutella'));
    const aIsDrink = a.type === 'drink';
    const bIsDrink = b.type === 'drink';
    // Drinks last
    if (aIsDrink && !bIsDrink) return 1;
    if (!aIsDrink && bIsDrink) return -1;
    // Desserts before drinks but after other pizzas
    if (aIsDessert && !bIsDessert && !bIsDrink) return 1;
    if (!aIsDessert && !aIsDrink && bIsDessert) return -1;
    // Group by name (same pizza names stay together)
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
  return copy;
}

// Build CAISSE ticket — essentiel uniquement pour l'employé
function buildTicket(order) {
  const parts = [];

  parts.push(CMD.INIT);

  // Commande # + Heure
  parts.push(CMD.CENTER);
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_ON);
  parts.push(txt(`#${order.shortId}  ${order.slot || ''}\n`));
  parts.push(CMD.DOUBLE_OFF);
  parts.push(CMD.BOLD_OFF);
  parts.push(txt('\n'));

  // Client
  parts.push(CMD.LEFT);
  parts.push(CMD.BOLD_ON);
  parts.push(txt(`${order.name || 'Sur place'}${order.phone ? '  ' + order.phone : ''}\n`));
  parts.push(CMD.BOLD_OFF);
  parts.push(CMD.LINE);

  // Items (triés : mêmes pizzas groupées, desserts en dernier, boissons à la fin)
  sortItems(order.items || []).forEach(item => {
    const unitPrice = item.finalUnitPrice || item.basePrice || item.price || 0;
    const lineTotal = item.totalPrice || (unitPrice * item.qty);
    const priceStr = lineTotal.toFixed(2).replace('.', ',') + 'E';

    parts.push(txt(lineLeftRight(`${item.qty}x ${item.name}`, priceStr) + '\n'));

    if (item.baseChange) {
      parts.push(txt(`   > Base ${item.baseChange}\n`));
    }
    if (item.removals && item.removals.length > 0) {
      item.removals.forEach(r => { parts.push(txt(`   - sans ${r}\n`)); });
    }
    if (item.additions && item.additions.length > 0) {
      item.additions.forEach(a => { parts.push(txt(`   + ${a.name}\n`)); });
    }
  });

  parts.push(CMD.LINE);

  // Total — taille normale, gras
  parts.push(CMD.BOLD_ON);
  const totalStr = (order.total || 0).toFixed(2).replace('.', ',') + 'E';
  parts.push(txt('\n'));
  parts.push(txt(lineLeftRight('TOTAL', totalStr, 48) + '\n'));
  parts.push(CMD.BOLD_OFF);
  parts.push(txt('\n'));

  // Comment
  if (order.comment) {
    parts.push(CMD.BOLD_ON);
    parts.push(txt(`NOTE: ${order.comment}\n`));
    parts.push(CMD.BOLD_OFF);
  }

  // Feed large avant coupe pour ne rien couper
  parts.push(Buffer.from([ESC, 0x64, 0x08])); // feed 8 lines
  parts.push(CMD.PARTIAL_CUT);

  return Buffer.concat(parts);
}

// Build KITCHEN ticket — gros texte, pas de prix, focus pizzas + modifs
function buildKitchenTicket(order) {
  const parts = [];

  parts.push(CMD.INIT);

  // Header cuisine
  parts.push(CMD.CENTER);
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_ON);
  parts.push(txt('--- CUISINE ---\n'));
  parts.push(CMD.DOUBLE_OFF);
  parts.push(CMD.BOLD_OFF);
  parts.push(txt('\n'));

  // Commande # + Heure (TRES GROS)
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_ON);
  parts.push(txt(`#${order.shortId}  ${order.slot || ''}\n`));
  parts.push(CMD.DOUBLE_OFF);
  parts.push(CMD.BOLD_OFF);
  parts.push(txt('\n'));

  // Client name
  parts.push(CMD.CENTER);
  parts.push(CMD.WIDE_ON);
  parts.push(txt(`${order.name || 'Sur place'}\n`));
  parts.push(CMD.WIDE_OFF);
  parts.push(txt('\n'));

  parts.push(CMD.LEFT);
  parts.push(CMD.DLINE);
  parts.push(txt('\n'));

  // Pizzas uniquement — triées, groupées, desserts en dernier
  const pizzas = sortItems((order.items || []).filter(item => item.type === 'pizza'));
  pizzas.forEach(item => {
    parts.push(CMD.BOLD_ON);
    parts.push(CMD.DOUBLE_ON);
    parts.push(txt(`${item.qty}x ${item.name}\n`));
    parts.push(CMD.DOUBLE_OFF);
    parts.push(CMD.BOLD_OFF);

    if (item.baseChange) {
      parts.push(CMD.BOLD_ON);
      parts.push(txt(`   >> BASE ${item.baseChange.toUpperCase()}\n`));
      parts.push(CMD.BOLD_OFF);
    }
    if (item.removals && item.removals.length > 0) {
      item.removals.forEach(r => {
        parts.push(CMD.BOLD_ON);
        parts.push(CMD.WIDE_ON);
        parts.push(txt(`  SANS ${r}\n`));
        parts.push(CMD.WIDE_OFF);
        parts.push(CMD.BOLD_OFF);
      });
    }
    if (item.additions && item.additions.length > 0) {
      item.additions.forEach(a => {
        parts.push(CMD.BOLD_ON);
        parts.push(CMD.WIDE_ON);
        parts.push(txt(`  + ${a.name}\n`));
        parts.push(CMD.WIDE_OFF);
        parts.push(CMD.BOLD_OFF);
      });
    }

    parts.push(txt('\n'));
  });

  parts.push(CMD.DLINE);

  // Comment
  if (order.comment) {
    parts.push(CMD.LEFT);
    parts.push(CMD.BOLD_ON);
    parts.push(CMD.WIDE_ON);
    parts.push(txt(`NOTE: ${order.comment}\n`));
    parts.push(CMD.WIDE_OFF);
    parts.push(CMD.BOLD_OFF);
    parts.push(CMD.DLINE);
  }

  // Pizza count + heure retrait en bas
  parts.push(CMD.CENTER);
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_ON);
  parts.push(txt(`${order.pizzaCount || 0} PIZZA(S)\n`));
  parts.push(txt(`${order.slot || ''}\n`));
  parts.push(CMD.DOUBLE_OFF);
  parts.push(CMD.BOLD_OFF);

  // Feed large avant coupe
  parts.push(Buffer.from([ESC, 0x64, 0x08])); // feed 8 lines
  parts.push(CMD.PARTIAL_CUT);

  return Buffer.concat(parts);
}

// Send buffer to printer via TCP — wait for socket to fully close
function sendToPrinter(buffer) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.connect(PRINTER_PORT, PRINTER_IP, () => {
      socket.write(buffer, () => {
        socket.end();
      });
    });

    socket.on('close', () => {
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connexion imprimante timeout (5s)'));
    });

    socket.on('error', (err) => {
      reject(new Error('Erreur imprimante: ' + err.message));
    });
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// === HTTP SERVER ===
const server = http.createServer(async (req, res) => {
  // CORS headers (caisse runs on different port/origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Print both tickets (caisse + cuisine) in one call
  if (req.method === 'POST' && req.url === '/print/both') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const order = JSON.parse(body);
        console.log(`[PRINT BOTH] Commande #${order.shortId} — ${order.name} — ${order.slot}`);

        const ticketCaisse = buildTicket(order);
        await sendToPrinter(ticketCaisse);
        console.log(`[OK] Ticket caisse imprime`);

        await delay(3000); // attendre que l'imprimante finisse + coupe

        const ticketCuisine = buildKitchenTicket(order);
        await sendToPrinter(ticketCuisine);
        console.log(`[OK] Ticket cuisine imprime`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Tickets caisse + cuisine imprimés' }));
      } catch (err) {
        console.error(`[ERREUR] ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Print single ticket (caisse or cuisine)
  if (req.method === 'POST' && (req.url === '/print' || req.url === '/print/caisse' || req.url === '/print/cuisine')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const order = JSON.parse(body);
        const type = req.url.includes('/cuisine') ? 'cuisine' : 'caisse';
        console.log(`[PRINT ${type.toUpperCase()}] Commande #${order.shortId} — ${order.name} — ${order.slot}`);

        const ticket = type === 'cuisine' ? buildKitchenTicket(order) : buildTicket(order);
        await sendToPrinter(ticket);

        console.log(`[OK] Ticket ${type} imprime`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Ticket ${type} imprimé` }));
      } catch (err) {
        console.error(`[ERREUR] ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', printer: `${PRINTER_IP}:${PRINTER_PORT}` }));
    return;
  }

  // Test print
  if (req.method === 'GET' && req.url === '/test') {
    try {
      const testOrder = {
        shortId: '0000',
        name: 'TEST',
        phone: '',
        slot: '20:00',
        source: 'sur_place',
        total: 15,
        pizzaCount: 1,
        comment: 'Ceci est un test d\'impression',
        items: [{ qty: 1, name: 'Marga (TEST)', basePrice: 11, finalUnitPrice: 11, totalPrice: 11, type: 'pizza' },
                { qty: 1, name: 'Coca Cola 33CL (TEST)', basePrice: 2.5, finalUnitPrice: 2.5, totalPrice: 2.5, type: 'drink' }]
      };
      const ticket = buildTicket(testOrder);
      await sendToPrinter(ticket);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Test imprime' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Servir caisse.html directement (pour iPhone — évite mixed content HTTPS→HTTP)
  if (req.method === 'GET' && (req.url === '/' || req.url === '/caisse')) {
    try {
      const caisseHtml = fs.readFileSync(__dirname + '/../caisse.html', 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(caisseHtml);
    } catch(e) {
      res.writeHead(500);
      res.end('caisse.html introuvable');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// ============================================================
// FIREBASE PRINT JOBS LISTENER
// ============================================================
const FIREBASE_DB_URL = 'https://' + FIREBASE_DB_HOST;
const processingJobs = new Set();

function deleteFirebaseNode(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: FIREBASE_DB_HOST,
      path: path + '.json',
      method: 'DELETE'
    }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', reject);
    req.end();
  });
}

async function handlePrintJob(key, job) {
  if (processingJobs.has(key)) return;
  processingJobs.add(key);
  try {
    await deleteFirebaseNode('/print_jobs/' + key);
    const order = job.order;
    console.log(`[PRINT JOB] #${order.shortId} — ${order.name} — ${order.slot}`);
    const ticketCaisse = buildTicket(order);
    await sendToPrinter(ticketCaisse);
    await delay(1500);
    const ticketCuisine = buildKitchenTicket(order);
    await sendToPrinter(ticketCuisine);
    console.log(`[PRINT JOB OK] #${order.shortId}`);
  } catch(err) {
    console.error('[PRINT JOB ERROR]', err.message);
  } finally {
    processingJobs.delete(key);
  }
}

function watchPrintJobs() {
  const req = https.request({
    hostname: FIREBASE_DB_HOST,
    path: '/print_jobs.json',
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Accept-Encoding': 'identity'
    }
  }, (res) => {
    let buffer = '';
    let currentEvent = '';
    console.log('[FIREBASE] Ecoute print_jobs...');

    res.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.replace(/\r$/, '');
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim();
        } else if (trimmed.startsWith('data:') && (currentEvent === 'put' || currentEvent === 'patch')) {
          try {
            const payload = JSON.parse(trimmed.slice(5).trim());
            if (payload && payload.data) {
              if (payload.path === '/' || payload.path === '') {
                // Données initiales à la connexion — traiter tous les jobs existants
                if (typeof payload.data === 'object') {
                  Object.entries(payload.data).forEach(([key, job]) => {
                    if (job && job.order) handlePrintJob(key, job);
                  });
                }
              } else {
                // Nouveau job individuel ajouté (path = "/-Nabc123")
                const key = payload.path.replace(/^\//, '');
                const job = payload.data;
                if (job && job.order) handlePrintJob(key, job);
              }
            }
          } catch(e) { console.error('[FIREBASE PARSE ERROR]', e.message); }
          currentEvent = '';
        }
      }
    });

    res.on('end', () => {
      console.log('[FIREBASE] Connexion perdue, reconnexion dans 5s...');
      setTimeout(watchPrintJobs, 5000);
    });
    res.on('error', (e) => {
      console.error('[FIREBASE RES ERROR]', e.message);
      setTimeout(watchPrintJobs, 5000);
    });
  });
  req.on('error', (e) => {
    console.log('[FIREBASE] Erreur connexion:', e.message, '— reconnexion dans 5s...');
    setTimeout(watchPrintJobs, 5000);
  });
  req.setTimeout(0); // pas de timeout sur le stream
  req.end();
}
watchPrintJobs();

// ============================================================
// AUTO-PRINT à 17h — Commandes futures du jour
// ============================================================
const AUTO_PRINT_HOUR = 17;
let autoPrintDoneToday = null; // date string of last auto-print

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fetchOrdersFromFirebase(dateKey) {
  return new Promise((resolve, reject) => {
    const url = `${FIREBASE_DB_URL}/orders.json?orderBy="date"&equalTo="${dateKey}"`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) || {});
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function autoPrintCheck() {
  const now = new Date();
  const todayKey = getTodayKey();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Trigger at 17h00-17h01, once per day
  if (hour === AUTO_PRINT_HOUR && minute <= 1 && autoPrintDoneToday !== todayKey) {
    autoPrintDoneToday = todayKey;
    console.log(`[AUTO-PRINT 17h] Recherche des commandes du ${todayKey}...`);

    try {
      const orders = await fetchOrdersFromFirebase(todayKey);
      const entries = Object.entries(orders);
      // Filter: only confirmed orders that were booked in advance (createdAt before today)
      const todayStart = new Date(todayKey + 'T00:00:00').getTime();
      const futureOrders = entries.filter(([, o]) => {
        return o.status === 'confirmed' && o.createdAt && o.createdAt < todayStart;
      });

      if (futureOrders.length === 0) {
        console.log('[AUTO-PRINT 17h] Aucune commande future a imprimer');
        return;
      }

      console.log(`[AUTO-PRINT 17h] ${futureOrders.length} commande(s) a imprimer`);

      for (const [id, order] of futureOrders) {
        console.log(`[AUTO-PRINT] #${order.shortId} — ${order.name} — ${order.slot}`);
        const ticketCaisse = buildTicket(order);
        await sendToPrinter(ticketCaisse);
        await delay(3000);
        const ticketCuisine = buildKitchenTicket(order);
        await sendToPrinter(ticketCuisine);
        await delay(3000);
        console.log(`[AUTO-PRINT OK] #${order.shortId} imprime`);
      }

      console.log(`[AUTO-PRINT 17h] Termine — ${futureOrders.length} commande(s) imprimee(s)`);
    } catch (err) {
      console.error('[AUTO-PRINT ERREUR]', err.message);
    }
  }
}

// Schedule auto-print at exactly 17h00 each day (no polling)
function scheduleAutoPrint() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(AUTO_PRINT_HOUR, 0, 0, 0);
  // If 17h is already passed today, schedule for tomorrow
  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }
  const ms = target.getTime() - now.getTime();
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  console.log(`[AUTO-PRINT] Prochaine impression programmee dans ${hours}h${String(mins).padStart(2,'0')} (a ${AUTO_PRINT_HOUR}h00)`);
  setTimeout(async () => {
    await autoPrintCheck();
    // Re-schedule for tomorrow
    scheduleAutoPrint();
  }, ms);
}
scheduleAutoPrint();

// Never crash on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[CRASH EVITE]', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('[REJECTION EVITEE]', err);
});

server.listen(SERVER_PORT, () => {
  console.log('');
  console.log('============================================');
  console.log('  IL VILLAGGIO — Print Server');
  console.log('============================================');
  console.log(`  HTTP local:  http://localhost:${SERVER_PORT}`);
  console.log(`  Imprimante:  ${PRINTER_IP}:${PRINTER_PORT}`);
  console.log(`  Firebase:    print_jobs en ecoute`);
  console.log('============================================');
  console.log('');
});
