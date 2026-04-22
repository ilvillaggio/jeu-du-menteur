const { getDatabase } = require("firebase-admin/database");

const MENU = [
  { id: "curry",        name: "Curry",         type: "pizza" },
  { id: "mielleuse",    name: "Mielleuse",     type: "pizza" },
  { id: "taleggio",     name: "Taleggio",      type: "pizza" },
  { id: "5fromages",    name: "5 Fromages",    type: "pizza" },
  { id: "burger",       name: "Burger",        type: "pizza" },
  { id: "kebab",        name: "Kebab",         type: "pizza" },
  { id: "lantanaise",   name: "Lantanaise",    type: "pizza" },
  { id: "marga",        name: "Marga",         type: "pizza" },
  { id: "regina",       name: "Regina",        type: "pizza" },
  { id: "calzone",      name: "Calzone",       type: "pizza" },
  { id: "thon",         name: "Thon",          type: "pizza" },
  { id: "carnivore",    name: "Carnivore",     type: "pizza" },
  { id: "stracciatella",name: "Stracciatella", type: "pizza" },
  { id: "nutella",      name: "Nutella Banane",type: "pizza" },
  { id: "gar-blonde-33",   name: "Garonette Blonde 33cl",  type: "drink" },
  { id: "gar-blanche-33",  name: "Garonette Blanche 33cl", type: "drink" },
  { id: "gar-ambree-33",   name: "Garonette Ambrée 33cl",  type: "drink" },
  { id: "gar-ipa-33",      name: "Garonette IPA 33cl",     type: "drink" },
  { id: "gar-blonde-75",   name: "Garonette Blonde 75cl",  type: "drink" },
  { id: "can-coca",        name: "Coca Cola 33CL",         type: "drink" },
  { id: "can-icetea",      name: "Ice Tea 33CL",           type: "drink" },
  { id: "can-fuzetea",     name: "Fuze Tea 33CL",          type: "drink" },
  { id: "can-perrier",     name: "Perrier 33CL",           type: "drink" },
  { id: "can-pepsi",       name: "Pepsi 33CL",             type: "drink" },
  { id: "can-coca-cherry", name: "Coca Cherry 33CL",       type: "drink" },
  { id: "can-fanta-dragon",name: "Fanta Fruit du Dragon",  type: "drink" },
  { id: "can-eau",         name: "Eau",                    type: "drink" },
  { id: "can-redbull",     name: "Red Bull 25CL",          type: "drink" },
  { id: "can-redbull-peche",name:"Red Bull Pêche Blanche 25CL", type: "drink" },
  { id: "can-redbull-pomme",name:"Red Bull Pomme Fuji 25CL",    type: "drink" },
  { id: "can-redbull-mure", name:"Red Bull Mûre Givrée 25CL",   type: "drink" },
  { id: "bot-coca",         name:"Coca Cola bouteille",    type: "drink" },
  { id: "bot-icetea",       name:"Ice Tea bouteille",      type: "drink" },
  { id: "bot-pepsi",        name:"Pepsi bouteille",        type: "drink" },
  { id: "vin-rouge",        name:"Uby Rouge 75cl",         type: "drink" },
  { id: "vin-rose",         name:"Uby Rosé 75cl",          type: "drink" },
  { id: "vin-blanc",        name:"Uby Blanc 75cl",         type: "drink" },
];

const MENU_BY_ID = Object.fromEntries(MENU.map(i => [i.id, i]));

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function resolveItemId(query) {
  if (!query) return null;
  const q = String(query).toLowerCase().trim();
  if (MENU_BY_ID[q]) return q;
  const byName = MENU.find(i => i.name.toLowerCase() === q);
  if (byName) return byName.id;
  const partial = MENU.find(i =>
    i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)
  );
  return partial ? partial.id : null;
}

async function findOrder(db, query) {
  const snap = await db.ref("orders").once("value");
  const all = snap.val() || {};
  if (all[query]) return { id: query, ...all[query] };
  for (const [id, order] of Object.entries(all)) {
    if (String(order.shortId) === String(query)) return { id, ...order };
  }
  return null;
}

const TOOL_DEFINITIONS = [
  {
    name: "lister_commandes",
    description: "Liste les commandes. Filtre optionnel par statut (pending/confirmed/ready/done/rejected/cancelled) et/ou date (YYYY-MM-DD). Sans filtre, retourne les commandes du jour.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Statut à filtrer", enum: ["pending","confirmed","ready","done","rejected","cancelled"] },
        date:   { type: "string", description: "Date YYYY-MM-DD. Si absent, aujourd'hui." },
      },
    },
  },
  {
    name: "info_commande",
    description: "Détails d'une commande (par ID Firebase ou shortId numérique).",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "ID Firebase ou shortId" } },
      required: ["id"],
    },
  },
  {
    name: "confirmer_commande",
    description: "Confirme une commande pending (status → confirmed). Déclenche l'impression.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "refuser_commande",
    description: "Refuse une commande. Rend les créneaux et restaure le stock.",
    input_schema: {
      type: "object",
      properties: {
        id:      { type: "string" },
        motif:   { type: "string", enum: ["slot_full","stock","other"] },
        item_id: { type: "string", description: "Requis si motif=stock : l'article en rupture" },
        raison:  { type: "string", description: "Message affiché au client" },
      },
      required: ["id","motif"],
    },
  },
  {
    name: "rupture_article",
    description: "Met un article en rupture (availability=false). Disparaît du menu client.",
    input_schema: {
      type: "object",
      properties: { item: { type: "string", description: "ID ou nom de l'article" } },
      required: ["item"],
    },
  },
  {
    name: "remettre_article",
    description: "Remet un article disponible (availability=true).",
    input_schema: {
      type: "object",
      properties: { item: { type: "string" } },
      required: ["item"],
    },
  },
  {
    name: "maj_stock",
    description: "Définit le stock d'un article (valeur absolue).",
    input_schema: {
      type: "object",
      properties: {
        item:      { type: "string" },
        quantite:  { type: "integer", minimum: 0 },
      },
      required: ["item","quantite"],
    },
  },
  {
    name: "ajuster_stock",
    description: "Ajoute ou retire au stock d'un article (delta). Ex: delta=+10 pour ajouter 10, delta=-3 pour retirer 3.",
    input_schema: {
      type: "object",
      properties: {
        item:  { type: "string" },
        delta: { type: "integer", description: "Nombre à ajouter (positif) ou retirer (négatif)" },
      },
      required: ["item","delta"],
    },
  },
  {
    name: "bloquer_creneau",
    description: "Bloque un créneau : les clients ne peuvent plus y réserver (même s'il reste de la place).",
    input_schema: {
      type: "object",
      properties: {
        slot: { type: "string", description: "Ex: '1930' ou '19:30'" },
        date: { type: "string", description: "YYYY-MM-DD. Si absent, aujourd'hui." },
      },
      required: ["slot"],
    },
  },
  {
    name: "debloquer_creneau",
    description: "Débloque un créneau précédemment bloqué.",
    input_schema: {
      type: "object",
      properties: {
        slot: { type: "string" },
        date: { type: "string" },
      },
      required: ["slot"],
    },
  },
  {
    name: "info_article",
    description: "Info sur un article : nom, stock, disponibilité.",
    input_schema: {
      type: "object",
      properties: { item: { type: "string" } },
      required: ["item"],
    },
  },
  {
    name: "fermer_reservations",
    description: "Ferme les réservations (reservationsOpen=false). Les clients voient 'Pizzeria fermée'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "ouvrir_reservations",
    description: "Ouvre les réservations en mode auto (reservationsOpen=true). Lundi-samedi 00:00-21:30.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "liberer_creneau",
    description: "Remet un créneau à zéro (count=0).",
    input_schema: {
      type: "object",
      properties: {
        slot: { type: "string", description: "Ex: '1930' ou '19:30'" },
        date: { type: "string", description: "YYYY-MM-DD. Si absent, aujourd'hui." },
      },
      required: ["slot"],
    },
  },
  {
    name: "liberer_tous_creneaux",
    description: "Remet TOUS les créneaux d'une date à zéro.",
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "YYYY-MM-DD. Si absent, aujourd'hui." } },
    },
  },
  {
    name: "stats_journee",
    description: "Stats du jour : CA, nombre de commandes, nombre de pizzas.",
    input_schema: {
      type: "object",
      properties: { date: { type: "string" } },
    },
  },
  {
    name: "etat_global",
    description: "Snapshot : réservations ouvertes ? articles en rupture ? commandes pending ? patons du jour ?",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "maj_patons",
    description: "Définit le nombre de pâtons disponibles pour une date.",
    input_schema: {
      type: "object",
      properties: {
        quantite: { type: "integer", minimum: 0 },
        date:     { type: "string" },
      },
      required: ["quantite"],
    },
  },
];

async function executeTool(name, input) {
  const db = getDatabase();
  const actionId = `a_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  const before = {};

  switch (name) {
    case "lister_commandes": {
      const date = input.date || todayKey();
      const snap = await db.ref("orders").once("value");
      const all = snap.val() || {};
      const filtered = Object.entries(all)
        .map(([id, o]) => ({ id, ...o }))
        .filter(o => {
          if (o.date !== date) return false;
          if (input.status && o.status !== input.status) return false;
          return true;
        })
        .map(o => ({
          shortId: o.shortId, name: o.name, slot: o.slot,
          status: o.status, pizzaCount: o.pizzaCount, total: o.total,
        }));
      return { result: { count: filtered.length, orders: filtered } };
    }

    case "info_commande": {
      const order = await findOrder(db, input.id);
      if (!order) return { result: { error: "commande introuvable" } };
      return { result: order };
    }

    case "confirmer_commande": {
      const order = await findOrder(db, input.id);
      if (!order) return { result: { error: "commande introuvable" } };
      if (order.status !== "pending") {
        return { result: { error: `statut actuel: ${order.status}, ne peut pas être confirmée` } };
      }
      before[`orders/${order.id}/status`] = order.status;
      await db.ref(`orders/${order.id}/status`).set("confirmed");
      await db.ref("print_jobs").push({ order: { ...order, status: "confirmed" }, timestamp: Date.now() });
      return {
        result: { ok: true, shortId: order.shortId },
        action: { id: actionId, tool: name, description: `Commande #${order.shortId} confirmée + imprimée`, before },
      };
    }

    case "refuser_commande": {
      const order = await findOrder(db, input.id);
      if (!order) return { result: { error: "commande introuvable" } };
      before[`orders/${order.id}`] = { status: order.status, rejectReason: order.rejectReason || null, rejectType: order.rejectType || null, rejectItemId: order.rejectItemId || null };

      const updates = {};
      updates[`orders/${order.id}/status`] = "rejected";
      updates[`orders/${order.id}/rejectType`] = input.motif;
      updates[`orders/${order.id}/rejectReason`] = input.raison || "Commande refusée";

      if (input.motif === "stock") {
        const itemId = resolveItemId(input.item_id);
        if (!itemId) return { result: { error: "item_id introuvable" } };
        const availSnap = await db.ref(`config/availability/${itemId}`).once("value");
        before[`config/availability/${itemId}`] = availSnap.val();
        updates[`orders/${order.id}/rejectItemId`] = itemId;
        updates[`config/availability/${itemId}`] = false;
      }

      const orderDate = order.date || todayKey();
      if (order.slotDistribution) {
        for (const [slotKey, count] of Object.entries(order.slotDistribution)) {
          const currentSnap = await db.ref(`slots/${orderDate}/${slotKey}/count`).once("value");
          const current = currentSnap.val() || 0;
          before[`slots/${orderDate}/${slotKey}/count`] = current;
          updates[`slots/${orderDate}/${slotKey}/count`] = Math.max(0, current - count);
        }
      } else if (order.slot && order.pizzaCount) {
        const slotKey = order.slot.replace(":", "");
        const currentSnap = await db.ref(`slots/${orderDate}/${slotKey}/count`).once("value");
        const current = currentSnap.val() || 0;
        before[`slots/${orderDate}/${slotKey}/count`] = current;
        updates[`slots/${orderDate}/${slotKey}/count`] = Math.max(0, current - order.pizzaCount);
      }

      if (order.items) {
        for (const item of order.items) {
          const stockSnap = await db.ref(`config/stock/${item.id}`).once("value");
          const stock = stockSnap.val();
          if (stock !== null && stock !== undefined) {
            before[`config/stock/${item.id}`] = stock;
            updates[`config/stock/${item.id}`] = stock + item.qty;
          }
        }
      }

      await db.ref().update(updates);
      return {
        result: { ok: true, shortId: order.shortId, motif: input.motif },
        action: { id: actionId, tool: name, description: `Commande #${order.shortId} refusée (${input.motif})`, before },
      };
    }

    case "rupture_article": {
      const itemId = resolveItemId(input.item);
      if (!itemId) return { result: { error: `article "${input.item}" introuvable` } };
      const snap = await db.ref(`config/availability/${itemId}`).once("value");
      before[`config/availability/${itemId}`] = snap.val();
      await db.ref(`config/availability/${itemId}`).set(false);
      return {
        result: { ok: true, item: MENU_BY_ID[itemId].name },
        action: { id: actionId, tool: name, description: `${MENU_BY_ID[itemId].name} mis en rupture`, before },
      };
    }

    case "remettre_article": {
      const itemId = resolveItemId(input.item);
      if (!itemId) return { result: { error: `article "${input.item}" introuvable` } };
      const snap = await db.ref(`config/availability/${itemId}`).once("value");
      before[`config/availability/${itemId}`] = snap.val();
      await db.ref(`config/availability/${itemId}`).set(true);
      return {
        result: { ok: true, item: MENU_BY_ID[itemId].name },
        action: { id: actionId, tool: name, description: `${MENU_BY_ID[itemId].name} remis disponible`, before },
      };
    }

    case "maj_stock": {
      const itemId = resolveItemId(input.item);
      if (!itemId) return { result: { error: `article "${input.item}" introuvable` } };
      const snap = await db.ref(`config/stock/${itemId}`).once("value");
      before[`config/stock/${itemId}`] = snap.val();
      await db.ref(`config/stock/${itemId}`).set(input.quantite);
      return {
        result: { ok: true, item: MENU_BY_ID[itemId].name, stock: input.quantite },
        action: { id: actionId, tool: name, description: `Stock ${MENU_BY_ID[itemId].name} = ${input.quantite}`, before },
      };
    }

    case "ajuster_stock": {
      const itemId = resolveItemId(input.item);
      if (!itemId) return { result: { error: `article "${input.item}" introuvable` } };
      const snap = await db.ref(`config/stock/${itemId}`).once("value");
      const current = Number(snap.val()) || 0;
      const delta = Number(input.delta) || 0;
      const next = Math.max(0, current + delta);
      before[`config/stock/${itemId}`] = snap.val();
      await db.ref(`config/stock/${itemId}`).set(next);
      const sign = delta >= 0 ? "+" : "";
      return {
        result: { ok: true, item: MENU_BY_ID[itemId].name, avant: current, apres: next },
        action: { id: actionId, tool: name, description: `Stock ${MENU_BY_ID[itemId].name} : ${current} → ${next} (${sign}${delta})`, before },
      };
    }

    case "bloquer_creneau": {
      const date = input.date || todayKey();
      const slotKey = String(input.slot).replace(":", "");
      const snap = await db.ref(`slots/${date}/${slotKey}/blocked`).once("value");
      before[`slots/${date}/${slotKey}/blocked`] = snap.val();
      await db.ref(`slots/${date}/${slotKey}/blocked`).set(true);
      return {
        result: { ok: true, slot: slotKey, date },
        action: { id: actionId, tool: name, description: `Créneau ${slotKey} (${date}) bloqué`, before },
      };
    }

    case "debloquer_creneau": {
      const date = input.date || todayKey();
      const slotKey = String(input.slot).replace(":", "");
      const snap = await db.ref(`slots/${date}/${slotKey}/blocked`).once("value");
      before[`slots/${date}/${slotKey}/blocked`] = snap.val();
      await db.ref(`slots/${date}/${slotKey}/blocked`).set(false);
      return {
        result: { ok: true, slot: slotKey, date },
        action: { id: actionId, tool: name, description: `Créneau ${slotKey} (${date}) débloqué`, before },
      };
    }

    case "info_article": {
      const itemId = resolveItemId(input.item);
      if (!itemId) return { result: { error: `article "${input.item}" introuvable` } };
      const [availSnap, stockSnap] = await Promise.all([
        db.ref(`config/availability/${itemId}`).once("value"),
        db.ref(`config/stock/${itemId}`).once("value"),
      ]);
      return {
        result: {
          id: itemId,
          nom: MENU_BY_ID[itemId].name,
          type: MENU_BY_ID[itemId].type,
          disponible: availSnap.val() !== false,
          stock: stockSnap.val(),
        },
      };
    }

    case "fermer_reservations": {
      const snap = await db.ref("config/reservationsOpen").once("value");
      before["config/reservationsOpen"] = snap.val();
      await db.ref("config/reservationsOpen").set(false);
      return {
        result: { ok: true, reservationsOpen: false },
        action: { id: actionId, tool: name, description: "Réservations fermées (mode OFF)", before },
      };
    }

    case "ouvrir_reservations": {
      const snap = await db.ref("config/reservationsOpen").once("value");
      before["config/reservationsOpen"] = snap.val();
      await db.ref("config/reservationsOpen").set(true);
      return {
        result: { ok: true, reservationsOpen: true },
        action: { id: actionId, tool: name, description: "Réservations ouvertes (mode AUTO)", before },
      };
    }

    case "liberer_creneau": {
      const date = input.date || todayKey();
      const slotKey = String(input.slot).replace(":", "");
      const snap = await db.ref(`slots/${date}/${slotKey}/count`).once("value");
      before[`slots/${date}/${slotKey}/count`] = snap.val();
      await db.ref(`slots/${date}/${slotKey}/count`).set(0);
      return {
        result: { ok: true, slot: slotKey, date },
        action: { id: actionId, tool: name, description: `Créneau ${slotKey} (${date}) libéré`, before },
      };
    }

    case "liberer_tous_creneaux": {
      const date = input.date || todayKey();
      const snap = await db.ref(`slots/${date}`).once("value");
      const slots = snap.val() || {};
      const updates = {};
      for (const slotKey of Object.keys(slots)) {
        before[`slots/${date}/${slotKey}/count`] = slots[slotKey]?.count || 0;
        updates[`slots/${date}/${slotKey}/count`] = 0;
      }
      await db.ref().update(updates);
      return {
        result: { ok: true, date, nbSlots: Object.keys(slots).length },
        action: { id: actionId, tool: name, description: `Tous les créneaux du ${date} libérés`, before },
      };
    }

    case "stats_journee": {
      const date = input.date || todayKey();
      const snap = await db.ref("orders").once("value");
      const all = snap.val() || {};
      let ca = 0, nbCommandes = 0, nbPizzas = 0;
      for (const o of Object.values(all)) {
        if (o.date !== date) continue;
        if (o.status === "rejected" || o.status === "cancelled") continue;
        nbCommandes++;
        ca += Number(o.total) || 0;
        nbPizzas += Number(o.pizzaCount) || 0;
      }
      return { result: { date, ca_euros: Math.round(ca*100)/100, nbCommandes, nbPizzas } };
    }

    case "etat_global": {
      const date = todayKey();
      const [resaSnap, availSnap, ordersSnap, patonsSnap] = await Promise.all([
        db.ref("config/reservationsOpen").once("value"),
        db.ref("config/availability").once("value"),
        db.ref("orders").once("value"),
        db.ref(`config/patons/${date}`).once("value"),
      ]);
      const avail = availSnap.val() || {};
      const ruptures = Object.entries(avail)
        .filter(([, v]) => v === false)
        .map(([id]) => MENU_BY_ID[id]?.name || id);
      const orders = ordersSnap.val() || {};
      const pending = Object.values(orders).filter(o => o.date === date && o.status === "pending").length;
      return {
        result: {
          date,
          reservationsOpen: resaSnap.val() === true,
          ruptures,
          commandesPending: pending,
          patons: patonsSnap.val(),
        },
      };
    }

    case "maj_patons": {
      const date = input.date || todayKey();
      const snap = await db.ref(`config/patons/${date}`).once("value");
      before[`config/patons/${date}`] = snap.val();
      await db.ref(`config/patons/${date}`).set(input.quantite);
      return {
        result: { ok: true, date, patons: input.quantite },
        action: { id: actionId, tool: name, description: `Pâtons ${date} = ${input.quantite}`, before },
      };
    }

    default:
      return { result: { error: `tool inconnu: ${name}` } };
  }
}

module.exports = { TOOL_DEFINITIONS, executeTool, MENU };
