# Karlstad City – Creative Gameplay Roadmap

**Status:** Creative north star / gameplay roadmap  
**Created:** 2026-09-29  
**Current reference build:** `playcanvas-karlstad-next v2.4.0`

## Implementation checkpoint — 2026-09-29 / Gameplay 2.4

Implemented on the existing PlayCanvas game:

- A1/A2: Chaos Director and panic meter (2.3), with a tested survival breather and pause-aware blackout (2.4).
- B1: Zombie bus, balance controls, arrival/crash and XP (2.2), now with direct friend-challenge replay and automatic result postcard (2.4).
- A3: Coffee scent thresholds, stronger pursuit, horde risk and scent recovery (2.4).
- B2: Moving sunlight, recovery, slower zombies, double zombie XP and a follow-the-sun bonus (2.4).
- D1/D2: Four daily modifiers, Stockholm date/seed, equal isolated starting resources, local records and PNG challenge postcards with replay links (2.4).

The walking/camera core and six-active-city-zombie budget are retained. No online leaderboard or real-time multiplayer is claimed. Next unbuilt gameplay pillars remain interactive street objects, zombie-after-death, extended survival and Hell Rounds; Halloween systems follow the roadmap below.

## 1. Creative North Star

Karlstad City should create stories players want to tell someone else.

Every new feature should answer at least one of these questions:

- Does it create chaos or surprise?
- Does it make the city feel more alive?
- Does it create risk/reward?
- Does it increase replayability?
- Does it create a moment worth sharing?
- Does it strengthen Karlstad as a unique game world?
- Can it become a sponsor mechanic instead of ordinary advertising?

The city walk is the base world. Special missions are spikes of focused gameplay. The space between missions must never feel like empty transport.

## 2. Core Design Rules

1. Protect the current smooth walking/FPS feel.
2. Prefer gameplay rules, triggers and reused systems over heavy assets.
3. Mobile first, especially iPhone 11-class hardware.
4. Avoid complex two-hand control requirements where possible.
5. Build short loops with strong replay value: roughly 1–3 minute bursts.
6. Failure should often create more gameplay instead of only a Game Over screen.
7. Karlstad-specific identity must be a gameplay advantage, not decoration.
8. Sponsors should appear as missions, mechanics and locations—not passive banners.
9. Every major mission should support score, personal best and friend challenge.
10. Seasonal content should reuse the same systems instead of becoming separate games.

---

# PHASE A – Make the City Unpredictable

## A1. CHAOS DIRECTOR

Add a lightweight system that continuously selects small events while the player explores Karlstad.

Target cadence: something unexpected can happen roughly every 20–45 seconds, without making the experience exhausting.

Possible events:

- A zombie suddenly exits a side street.
- A lone thermos is bait for an ambush.
- Street lights fail for 20 seconds.
- Church bells attract zombies toward Domkyrkan.
- A zombie runs past carrying a package.
- Several zombies freeze and stare at the player, then charge together.
- Zombies chase another zombie.
- A golden thermos appears and must be carried slowly to safety.
- A bus arrives at a nearby stop.
- A temporary safe zone appears.
- A street becomes blocked and forces a detour.
- A mini-horde crosses the player's route.

Goal: no two city walks should produce exactly the same story.

## A2. KARLSTAD PANIC METER

City-wide escalation meter:

**KARLSTAD PANIK 0–100%**

Player actions such as sprinting, firing, alarms, repeated combat and coffee collection can raise panic.

Suggested thresholds:

- **25%** – more zombies appear.
- **50%** – lights flicker, shops close, stranger events begin.
- **75%** – hordes, zombie buses and stronger enemies can trigger.
- **100% – KARLSTAD HAR FALLIT** – automatic survival phase begins.

At 100%, trigger a 1–2 minute city-wide event:

> ÖVERLEV TILLS SOLEN KOMMER.

After survival, panic partially resets.

This becomes the long-term pressure system connecting the city walk and combat.

## A3. KAFFEDOFT

Thermoses should not only be free points.

Add a second meter:

**KAFFEDOFT 0–100%**

Example thresholds:

- **20%** – no major effect.
- **40%** – zombies detect the player from farther away.
- **60%** – faster enemies begin spawning.
- **80%** – side-street ambushes become likely.
- **100% – KAFFEKATASTROF** – short horde attack.

This turns thermos collection into a real risk/reward decision:

> Vågar jag ta en termos till?

---

# PHASE B – Signature Gameplay

## B1. ZOMBIEBUSSEN

High-priority signature feature.

A bus stops at a normal bus stop and offers fast travel.

The driver is a zombie.

The trip becomes a 30–45 second mini-game:

- The bus swerves violently through Karlstad.
- The player uses a simple one-thumb balance control.
- Zombies and coffee cups bounce around inside.
- The player tries to keep the bus on the road.
- Successful trip = fast travel + XP/reward.
- Failure = crash and player is dropped somewhere unexpected.

The bus should be funny, instantly understandable and highly shareable.

Later variations:

- No brakes.
- Horde on the roof.
- Night bus.
- Christmas bus.
- Daily challenge version.

## B2. SOLA ÖVER KARLSTAD

Turn Karlstad's sun identity into gameplay.

Random event:

> SOLA ÄR FRAMME!

A moving cone/zone of strong sunlight sweeps through the city.

Inside the light:

- solar energy refills,
- zombies weaken,
- some enemies may retreat,
- score multiplier can increase.

The player must move with the light while under pressure.

This is a uniquely Karlstad mechanic that should become one of the game's recognizable systems.

## B3. PLAY AS A ZOMBIE AFTER DEATH

Do not always end the run when the player dies.

Possible flow:

1. Fade to black.
2. Message: **DU ÄR SMITTAD.**
3. Player gets 20–30 seconds as a zombie.
4. Cause as much chaos as possible:
   - chase NPCs,
   - knock over objects,
   - jump onto a bus,
   - steal a thermos,
   - infect targets.
5. Player respawns afterward.

Failure becomes content.

## B4. INTERACTIVE STREET OBJECTS

Use everyday Karlstad objects as lightweight gameplay tools.

Examples:

- Bicycle → knockback / quick escape.
- Shopping cart → zombie bowling.
- Café chair → melee hit.
- Trash bin → chain hit.
- Street sign → shield.
- Large thermos → special weapon.
- Market stall → temporary barricade.

Use context-sensitive interaction rather than adding many buttons.

---

# PHASE C – Game Modes

## C1. STORY / STADSVANDRING

Keep the city walk as the main connective world.

Features:

- mission destinations,
- local landmarks,
- thermoses,
- secrets,
- random events,
- panic,
- coffee scent,
- sponsor missions,
- daily events.

## C2. ZOMBIE SURVIVAL

Same city, different rules.

No destination. No story route.

Single question:

> HUR LÄNGE ÖVERLEVER DU KARLSTAD?

Suggested structure:

- Start at Stora Torget.
- Difficulty rises every 60–90 seconds.
- Players move between locations for energy, coffee and safe zones.
- Panic rises faster.
- Different districts can become temporarily unsafe.
- Score + survival time + streaks.
- One-tap rematch.

Reuse existing city assets and AI.

## C3. VÅGAR DU? / HELL ROUNDS

Reuse existing missions with modifiers.

Examples:

- 2× zombies.
- Less solar energy.
- No SUPER.
- Faster boss.
- Dark mode / blackout.
- One life.
- Double XP.
- Thermoses attract hordes immediately.

Cheap to build, high replay value.

---

# PHASE D – Viral & Social Systems

## D1. KARLSTAD-VYKORTET

Automatically create a shareable result/moment card after remarkable events.

Examples:

> ÖVERLEVDE ZOMBIEBUSSEN  
> 3% LIV KVAR

> KAFFEKATASTROF  
> 47 ZOMBIES · 2:13

> DU BLEV UPPÄTEN UTANFÖR O'LEARYS

Each card should include:

- score/time,
- challenge seed,
- mission/event,
- one-tap **UTMANA EN VÄN**.

Friend opens the same challenge setup.

## D2. DAILY KARLSTAD

One shared challenge per day.

Examples:

- Överlev 3 minuter utan SUPER.
- 30 zombies. En termos.
- Zombiebussen – inga bromsar.
- Blackout at Mitt i City.
- Reach Sandgrund with maximum panic.
- One-hit mode.

Daily challenge should create a shared conversation around the game.

## D3. GHOST RUNS

Later phase.

When a friend opens a challenge, show a lightweight transparent ghost of the original player's route.

Example:

> MAURITZ · 14 SEK FÖRE DIG

This creates asynchronous multiplayer without requiring full real-time multiplayer.

---

# PHASE E – Sponsor Gameplay

Sponsors should become mechanics.

## E1. LÖFBERGS – NATTROSTNINGEN

Mission concept:

Something has gone wrong with the nighttime coffee production.

Objectives:

- shut down three machines/valves,
- each objective releases more coffee scent,
- zombie pressure increases after every step,
- final escape carrying an oversized thermos.

Ending:

> KAFFET ÄR KLART.  
> KARLSTAD ÄR INTE DET.

## E2. O'LEARYS – ÖVERTID FRÅN HELVETET

Expand the current Sista rundan idea.

Scoreboard:

> KARLSTAD 3 – ZOMBIES 3

Enemies pushed into HEMGÅNG count as goals.

Final 15 seconds:

> SUDDEN DEATH

Kapten Övertid enters.

## E3. KARLSTADS ENERGI – BLACKOUT

Entire playable city goes dark.

Player must restore three power stations while enemies become visible mainly through:

- flickering lights,
- muzzle/solar flashes,
- emergency lighting.

Final station triggers a city-wide light-up and massive solar pulse.

## E4. NWT – BREAKING NEWS

A phone/news alert starts a timed delivery mission.

Deliver news/packages to locations across Karlstad while absurd breaking-news updates appear during the run.

Can also be used as a narrative device between missions.

---

# PHASE F – Halloween 2026

Launch focus: zombies.

Working seasonal identity:

# KARLSTAD CITY: EFTER STÄNGNING – HALLOWEEN

Core seasonal pillars:

## F1. 13 FÖRBANNADE TERMOSAR

Hide 13 special cursed thermoses across the city.

Each one:

- reveals a clue,
- increases a hidden boss meter,
- can trigger a small supernatural event.

Finding all 13 unlocks:

# MIDNATT PÅ TORGET

Final Halloween boss/event.

## F2. NIGHTLY CHAOS

Halloween should modify the Chaos Director:

- more darkness,
- more ambushes,
- rare monster variants,
- special city events,
- Halloween-only rewards.

## F3. DAILY HALLOWEEN CHALLENGES

One challenge shared by everyone each day.

Keep runs short and replayable.

## F4. TEMPORARY MONSTER HUNTS

Rare named enemies can appear in specific locations.

Examples:

- Torgets väktare
- Domkyrkans skugga
- Sprint-Steffes storebror
- Zombie-Lerin special encounter
- Kapten Övertid

---

# PHASE G – December Transition

Do not build a separate Christmas game.

On **1 December**, reuse the same systems and transform the season into:

# KARLSTAD CITY: JULKLAPPSJAKTEN

## G1. ZOMBIES STOLE THE PRESENTS

Main collectibles become Christmas presents.

Zombies can carry presents and run away with them.

Stronger zombies can carry multiple packages.

## G2. JULBUSSEN

Reuse Zombie Bus mechanics.

Christmas variation:

- presents bounce around the bus,
- player must keep the bus on the road,
- lost packages reduce score,
- bonus for delivering all presents.

## G3. 24 DAYS – 24 SECRETS

December 1–24:

- one new secret/challenge unlocks each day,
- locations across Karlstad are reused,
- December 24 unlocks the seasonal finale at Stora Torget.

## G4. CHRISTMAS CHAOS DIRECTOR

Swap Halloween events for winter/Christmas events while retaining the same underlying system.

---

# Existing Missions – Keep and Expand

Current v2.1.0 foundations:

1. **Sista rundan – O'Learys**
2. **Fikapanik – Stora Torget**
3. **Rädda fikat – Torget → Mitt i City**
4. **Dödens akvarell / Vernissage från graven – Sandgrund**
5. **City Journey / Kaffejakten**

These are the base, not throwaway prototypes.

Future work should deepen them with:

- alternate rules,
- daily variants,
- Hell Round versions,
- friend challenges,
- better event integration,
- sponsor-specific mechanics.

---

# Priority Order

## NOW – Highest Creative ROI

1. **Chaos Director**
2. **Karlstad Panic Meter**
3. **Zombie Bus prototype**
4. **Coffee Scent risk/reward**
5. **Daily Karlstad**
6. **Automatic challenge postcard**

## NEXT

7. **Sola över Karlstad**
8. **Blackout**
9. **Interactive street objects**
10. **Zombie-after-death mode**
11. **Zombie Survival**
12. **Hell Rounds**

## HALLOWEEN CONTENT PUSH

13. 13 cursed thermoses
14. Midnight at Stora Torget
15. Halloween Chaos Director events
16. Named monster hunts
17. Daily Halloween challenges

## AFTER HALLOWEEN

18. Ghost Runs
19. More sponsor missions
20. December reskin to Julklappsjakten
21. 24 Days / 24 Secrets
22. Julbussen

---

# Performance Guardrail

Creative ambition must not destroy the smooth core.

Before shipping any feature:

- no noticeable regression to walking feel,
- no long blocking loads,
- avoid large initial audio/texture downloads,
- keep dynamic entities controlled,
- prefer object pooling,
- reuse AI/navigation systems,
- retain adaptive rendering,
- test mobile controls first,
- maintain strong performance on iPhone 11-class devices.

The current walking/FPS core is an asset. Build on top of it rather than replacing it.

---

# Final Product Principle

Karlstad City should not feel like:

> walk → collect → walk → shoot → walk.

It should feel like:

> I was walking to Sandgrund, a zombie bus stopped, we crashed near Torget, I grabbed coffee, triggered a horde, the whole city blacked out, I survived with 3% health and then my friend tried the same seed.

That is the target experience.

**Make Karlstad unpredictable, local, replayable, funny, dangerous and shareable.**
