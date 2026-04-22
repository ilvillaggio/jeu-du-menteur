const { onValueCreated } = require("firebase-functions/v2/database");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const webpush = require("web-push");
const Anthropic = require("@anthropic-ai/sdk");
const { TOOL_DEFINITIONS, executeTool, MENU } = require("./claude-tools");

initializeApp();

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const CAISSE_PIN = defineSecret("CAISSE_PIN");

// VAPID keys for Web Push notifications
const VAPID_PUBLIC = "BIdPHUlKf0lK8SE_3rxdLRqXlj6G_Lnwiqd3a5-YZtC5BNw_Mr0epYF2izphe_JILBq4nvr6ArthVWD84qAoPQE";
const VAPID_PRIVATE = "cas6dBahxPW71IBqbbUlXl-ODeReVOzv8NPLlqxWBlM";

webpush.setVapidDetails(
  "mailto:contact@ilvillaggiolanta.com",
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

/**
 * Cloud Function v2: envoie une notification push à la caisse
 * quand une nouvelle commande est créée dans /orders/{orderId}
 */
exports.notifyNewOrder = onValueCreated(
  {
    ref: "/orders/{orderId}",
    region: "europe-west1",
    instance: "appli-pizzeria-default-rtdb",
  },
  async (event) => {
    const order = event.data.val();
    if (!order) return null;

    // Récupérer les subscriptions push de la caisse
    const db = getDatabase();
    const subsSnap = await db.ref("push_subscriptions").once("value");
    const subs = subsSnap.val();

    if (!subs) {
      console.log("Aucune subscription push enregistrée");
      return null;
    }

    const pizzaCount = order.pizzaCount || 0;
    const total = order.total || 0;
    const totalStr = Number.isInteger(total) ? total + "€" : total.toFixed(2).replace(".", ",") + "€";

    const payload = JSON.stringify({
      title: `🍕 Nouvelle commande #${order.shortId}`,
      body: `${order.name} · ${order.slot} · ${pizzaCount} pizza${pizzaCount > 1 ? "s" : ""} · ${totalStr}`,
      url: "/caisse.html",
    });

    // Envoyer à toutes les subscriptions enregistrées
    const promises = [];
    for (const [key, sub] of Object.entries(subs)) {
      if (!sub || !sub.endpoint) continue;

      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh || sub.p256dh,
          auth: sub.keys_auth || sub.auth,
        },
      };

      promises.push(
        webpush.sendNotification(pushSub, payload).catch((err) => {
          console.error(`Push failed for ${key}:`, err.statusCode);
          // Supprimer les subscriptions expirées (410 Gone)
          if (err.statusCode === 410 || err.statusCode === 404) {
            return db.ref("push_subscriptions/" + key).remove();
          }
        })
      );
    }

    await Promise.all(promises);
    console.log(`Notifications envoyées pour commande #${order.shortId}`);
    return null;
  }
);

// ============================================================
// CLAUDE CHAT — assistant vocal / texte pour la caisse
// ============================================================

function buildSystemPrompt() {
  const menuList = MENU.map(i => `- ${i.id} : ${i.name} (${i.type})`).join("\n");
  return `Tu es l'assistant intelligent de la caisse de la pizzeria Il Villaggio.

Ton rôle : aider le patron en service à gérer ses commandes, son stock et ses réservations via des commandes vocales ou textuelles courtes.

Tes réponses peuvent être **lues à voix haute** (TTS). Garde-les :
- **Très courtes** (1 phrase, max 2)
- **Sans markdown** (pas de **gras**, pas de listes à puces, pas de backticks)
- **Sans symboles** (pas de ★, ✓, —, • ni d'emoji)
- **En français naturel**, prononçable facilement
- Si tu listes des éléments, utilise des virgules ou "et"

STYLE DE RÉPONSE :
- Confirmation CONCISE. Ex: "Curry mis en rupture." / "3 commandes pending aujourd'hui."
- Pas de formules de politesse, pas de "bien sûr", "avec plaisir", etc.
- Si l'utilisateur te demande quelque chose de flou, demande une clarification courte.
- N'invente JAMAIS d'article, d'ID ou de statut. Utilise toujours les tools.

VOCABULAIRE IMPORTANT :
- **Pâtons** = la base de pâte à pizza (commune à toutes les pizzas)
- **Pizzas** (curry, marga, burger, calzone, etc.) = les garnitures qu'on met sur les pâtons
- Quand tu parles de stock ou de disponibilité, ne confonds pas les deux.

ACTIONS :
- Quand l'utilisateur demande une action (rupture, fermeture, libération, confirmation, refus), exécute le tool approprié SANS demander de confirmation — le patron a un bouton "annuler" pour revenir en arrière.
- Si plusieurs articles sont mentionnés, exécute plusieurs tools en parallèle.

MENU (IDs à utiliser pour tous les tools articles) :
${menuList}

CRÉNEAUX : horaires au format HHMM (ex: 1900, 1915, 1930...).

STATUTS DES COMMANDES :
- pending : nouvelle, pas encore confirmée par la caisse
- confirmed : confirmée et imprimée
- ready : prête
- done : terminée
- rejected : refusée
- cancelled : annulée par le client

Date d'aujourd'hui : ${new Date().toISOString().slice(0,10)}.`;
}

exports.claudeChat = onRequest(
  {
    region: "europe-west1",
    secrets: [ANTHROPIC_API_KEY, CAISSE_PIN],
    cors: true,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "POST only" });
      return;
    }

    const { pin, message, history } = req.body || {};

    if (pin !== CAISSE_PIN.value()) {
      res.status(401).json({ error: "PIN invalide" });
      return;
    }
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "message requis" });
      return;
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const messages = Array.isArray(history) ? [...history] : [];
    messages.push({ role: "user", content: message });

    const actions = [];
    let finalText = "";
    let iterations = 0;
    const MAX_ITERATIONS = 8;

    try {
      while (iterations < MAX_ITERATIONS) {
        iterations++;
        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: [{
            type: "text",
            text: buildSystemPrompt(),
            cache_control: { type: "ephemeral" },
          }],
          tools: TOOL_DEFINITIONS,
          messages,
        });

        messages.push({ role: "assistant", content: response.content });

        if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
          finalText = response.content
            .filter(b => b.type === "text")
            .map(b => b.text)
            .join("\n")
            .trim();
          break;
        }

        if (response.stop_reason === "tool_use") {
          const toolUses = response.content.filter(b => b.type === "tool_use");
          const toolResults = [];
          for (const tu of toolUses) {
            try {
              const out = await executeTool(tu.name, tu.input || {});
              if (out.action) actions.push(out.action);
              toolResults.push({
                type: "tool_result",
                tool_use_id: tu.id,
                content: JSON.stringify(out.result),
              });
            } catch (err) {
              console.error(`Tool ${tu.name} failed:`, err);
              toolResults.push({
                type: "tool_result",
                tool_use_id: tu.id,
                content: `Erreur: ${err.message}`,
                is_error: true,
              });
            }
          }
          messages.push({ role: "user", content: toolResults });
          continue;
        }

        // max_tokens, refusal, etc.
        finalText = response.content
          .filter(b => b.type === "text")
          .map(b => b.text)
          .join("\n")
          .trim() || `(arrêt: ${response.stop_reason})`;
        break;
      }

      res.json({
        success: true,
        response: finalText || "(pas de réponse)",
        actions,
        history: messages,
      });
    } catch (err) {
      console.error("claudeChat error:", err);
      res.status(500).json({ error: err.message || "erreur interne" });
    }
  }
);
