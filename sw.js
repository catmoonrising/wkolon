/* Hosted offline support adapted from pmcrwf. Each build caches the complete static app,
   themes, layouts, and bundled reviewed Saga rules. Updates wait for Reload.
   Only this site scope and the wkolon cache namespace are served or cleaned up. */
/* Stamped by .github/workflows/pages.yml with the commit being deployed. Left as the literal
   placeholder in the repo, which is correct for local use: a version that never changes is a
   service worker that never updates, and locally you want the server, not the cache - which is why
   src/offline.js doesn't register this at all on localhost. */
const SW_BUILD = "__BUILD__";
const CACHE = "wkolon-" + SW_BUILD;

const SHELL_HTML = "index.html";
const REFERENCE_PATH=/\/data\/(?:reference-index\.json|reference\/[a-f0-9]{64}\.json)$/;
// ES module dependencies and bundled reviewed Saga data are part of the same snapshot.
const EXTRA = ["./", "src/ability-profiles.js", "src/species-customization.js", "src/species-customization-ui.js", "src/attack-refs.js", "src/attack-abilities.js", "src/skill-abilities.js", "src/skill-applications.js", "src/crafting.js", "src/natural-weapons.js", "src/action-economy.js", "src/action-engine.js", "src/skill-actions.js", "src/condition-recovery.js", "src/actions-ui.js", "src/context-panel.js", "src/sheet-modules.js", "src/senses.js", "src/module-layout.js", "src/feature-views.js", "src/rules.js", "src/modifiers.js", "src/talent-activations.js", "src/turn-talents.js", "src/move-talent-effects.js", "src/defense-shifts.js", "src/triggered-defenses.js", "src/reaction-talents.js", "src/timed-talents.js", "src/self-power-effects.js", "src/movement-powers.js", "src/jump.js", "src/jump-ui.js", "src/power-effects.js", "src/rage-powers.js", "src/shield-powers.js", "src/resistance-powers.js", "src/negating-powers.js", "src/deflection.js", "src/damage-declarations.js", "src/maintained-powers.js", "src/surprise-round.js", "src/effect-duration.js", "src/bonus-hit-points.js", "src/turn-feat-effects.js", "src/vehicles.js", "src/vehicles-ui.js", "src/species-choices.js", "src/species-profiles.js", "src/species-profiles-ui.js", "src/level-plan.js", "src/level-plan-ui.js", "src/defense-abilities.js", "src/team-skills.js", "src/armor.js", "src/class-advancement.js", "src/class-advancement-ui.js", "src/energy-shields.js", "src/energy-shields-ui.js", "src/weapon-rules.js", "src/ammunition.js", "src/attack-techniques.js", "src/incoming-damage.js", "src/species-rules.js", "src/skill-substitutions.js", "src/skill-rerolls.js", "src/recovery.js", "src/recovery-ui.js", "src/species-actions.js", "src/feature-choices.js", "src/feature-status.js", "src/force-powers.js", "src/power-activation.js", "src/force-powers-ui.js", "src/starship-maneuvers.js", "src/starship-maneuvers-ui.js", "src/creation-options.js", "src/house-rules.js", "src/campaign-rules.js", "src/equipment.js", "src/droid-systems.js", "src/droid-installation.js", "src/droid-chassis.js", "src/droid-systems-ui.js", "src/persistence.js", "src/math-fields.js", "src/dice.js", "src/ability-generation.js", "src/creation-steps.js", "src/creation-issues.js", "src/rules-reference.js", "src/heroic-traits.js", "src/wiki-content.js", "src/list-sort.js", "src/species-browser.js", "src/feature-trees.js",
  "src/feature-layout.js", "src/rules-catalog.js", "src/reference-library.js", "src/roll-anim.js", "src/combat.js", "src/combat-ui.js", "src/full-attacks.js", "src/defensive-combat.js", "src/defensive-combat-ui.js", "src/charge.js", "src/charge-ui.js", "src/attack-targets.js", "src/attack-targets-ui.js", "src/opportunity.js", "src/opportunity-actions.js", "src/opportunity-ui.js", "src/combat-movement.js", "src/combat-movement-actions.js", "src/combat-movement-ui.js", "src/acrobatics-movement.js", "src/acrobatics-movement-actions.js", "src/acrobatics-movement-ui.js", "src/balance.js", "src/balance-ui.js", "src/escape-bonds.js", "src/escape-bonds-ui.js", "src/falling.js", "src/falling-ui.js", "src/attack-follow-ups.js", "src/attack-follow-up-actions.js", "src/attack-follow-up-ui.js", "src/routine-steps.js", "src/routine-progress.js", "src/stat-block.js", "src/stat-block-ui.js", "data/core.json", "data/rules.schema.json", "docs/rules-data.md", "docs/creation-interactions.md", "docs/shoto-focus.md", "docs/regenerative-healing.md", "docs/senses.md", "docs/modifiers.md", "docs/skill-actions.md", "docs/condition-recovery.md", "docs/turn-talents.md", "docs/skirmisher.md", "docs/rage-feats.md", "docs/shift-defense.md", "docs/triggered-defenses.md", "docs/sneak-attack.md", "docs/target-traits.md", "docs/conditional-awareness.md", "docs/force-item-commander.md", "docs/movement-sense-charge.md", "docs/talisman-trigger-followups.md","docs/designated-counted-targets.md", "docs/tradition-mount-mark.md", "docs/skill-applications.md", "docs/droid-smash.md", "docs/hidden-eyes.md", "docs/passive-defenses.md", "docs/matukai-defenses.md", "docs/encounter-buffs.md", "docs/timed-talents.md", "docs/self-power-effects.md", "docs/surge.md", "docs/rage-powers.md", "docs/shield-powers.md", "docs/resistance-powers.md", "docs/negating-powers.md", "docs/deflection-actions.md", "docs/lightsaber-styles.md", "docs/terrain-talents.md", "docs/attack-abilities.md", "docs/skill-abilities.md", "docs/optional-rules.md", "docs/campaign-rules.md", "docs/bonus-hit-points.md", "docs/turn-feat-effects.md", "docs/skill-rerolls.md", "docs/species-bodies.md", "docs/droid-chassis.md", "docs/starship-maneuvers.md", "docs/vehicles.md", "docs/import-review.md", "docs/combat.md", "docs/opportunity-bonuses.md", "docs/rifle-ranges.md", "docs/melee-damage-dice.md", "docs/weapon-feats.md", "docs/weapon-mode-talents.md", "docs/weapon-feat-extras.md", "docs/weapon-identity.md", "css/themes/index.json"];

/* Pulls every src="…"/href="…" out of the page. Deliberately a regex and not DOMParser: a service
   worker has no DOM. The page is ours and its tags are plain, so this is a fair trade - and the
   test harness runs this exact function against the real file so a hand-written tag that breaks it
   fails a test rather than an offline load six months later. */
function shellUrlsFromHtml(html) {
  const out = [];
  const re = /(?:src|href)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = m[1].trim();
    if (!u) continue;                              // <link id="theme-css" href=""> - filled in at runtime
    if (/^[a-z]+:/i.test(u) || u.startsWith("//")) continue;   // off-origin, data:, mailto:
    if (u.startsWith("#")) continue;
    out.push(u.replace(/^\.\//, ""));
  }
  return [...new Set(out)];
}

/* The theme files are chosen at runtime from a manifest, so no tag names them. Offline with only
   the theme you happened to be using would be a poor showing - they're a few KB each. */
async function themeUrls() {
  const res = await fetch("css/themes/index.json", { cache: "reload" });
  if (!res.ok) throw new Error("Theme manifest unavailable");
  return Object.values(await res.json()).filter(Boolean).map(f => "css/themes/" + f);
}

/* Layout presets are listed the same way, for the same reason. */
async function layoutUrls() {
  const res = await fetch("layouts/index.json", { cache: "reload" });
  if (!res.ok) throw new Error("Layout manifest unavailable");
  return ["layouts/index.json", ...Object.values(await res.json()).filter(Boolean).map(f => "layouts/" + f)];
}

async function precache() {
  const cache = await caches.open(CACHE);
  const res = await fetch(SHELL_HTML, { cache: "reload" });
  if (!res.ok) throw new Error("could not read " + SHELL_HTML + " (" + res.status + ")");
  const html = await res.text();
  const urls = [...new Set([SHELL_HTML, ...shellUrlsFromHtml(html), ...(await themeUrls()), ...(await layoutUrls()), ...EXTRA])];
  await cache.put(SHELL_HTML, new Response(html, { headers: res.headers }));
  /* addAll is all-or-nothing, which is what "a version exists entirely or not at all" asks for.
     A single 404 here fails the install and leaves the previous version serving - the right
     outcome, and a visible one in DevTools rather than a silent hole in the cache. */
  await cache.addAll(urls.filter(u => u !== SHELL_HTML));
  return urls.length;
}

self.addEventListener("install", e => {
  // No skipWaiting: see the header. The page decides when to swap.
  e.waitUntil(precache());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith("wkolon-") && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/* Sent by src/offline.js when the user takes the update. This is the only path to skipWaiting, so
   the swap can only ever happen because somebody clicked it. */
self.addEventListener("message", e => {
  if (e.data && e.data.type === "skip-waiting") self.skipWaiting();
  if(e.data?.type==='cache-reference'&&typeof e.data.path==='string'){
    const url=new URL(e.data.path,self.registration.scope);
    if(url.href.startsWith(self.registration.scope)&&REFERENCE_PATH.test(url.pathname))e.waitUntil((async()=>{
      const cache=await caches.open(CACHE);
      if(await cache.match(url.href))return;
      const response=await fetch(url.href);
      if(response.ok)await cache.put(url.href,response);
    })().catch(()=>{}));
  }
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // nothing off-origin is ours to serve

  if (!url.href.startsWith(self.registration.scope)) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response=await fetch(req);
      // Optional references download when opened; successful reads remain available offline.
      if(response.ok && REFERENCE_PATH.test(url.pathname))await cache.put(req,response.clone()).catch(()=>{});
      return response;
    }
    catch (err) {
      /* Offline and not in the cache. For a navigation that means a deep link or a stale bookmark;
         hand back the shell, which is the whole app anyway. For anything else, be honest. */
      if (req.mode === "navigate") {
        const shell = await cache.match(SHELL_HTML);
        if (shell) return shell;
      }
      return new Response("offline and not cached: " + url.pathname, { status: 504, statusText: "Offline" });
    }
  })());
});
