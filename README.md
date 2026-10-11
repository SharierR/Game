# ⚡ Arcane Nexus: 3D Roguelike Tower Defense

A full 3D Dark Fantasy Roguelike Tower Defense game built directly for the browser using **Three.js** and the **Web Audio API**. Defend the sacred Arcane Nexus against escalating hordes of corrupted creeps, elite champions, and apocalyptic titan bosses!

Playable directly with zero external installation, perfectly optimized for **GitHub Pages**.

---

## 🎮 Play Live Demo
👉 **[Play Arcane Nexus](https://sharierR.github.io/Game/)**

---

## 🌟 Key Features

### 🏰 The Arcane Nexus & 3 Lives System
* **3 Sanctuary Energy Cores:** Floating orbital life orbs protect the Archon Monolith.
* **Emergency Defense Shockwave:** If an enemy reaches the sanctuary, 1 Life Core shatters in a dramatic screen-shake blast, obliterating the breached enemy.
* At 0 lives, the sanctuary falls and the final run statistics are recorded.

### 🧙‍♂️ 5 Elemental Heroes / Towers
Each hero features custom procedural 3D models, animated mechanisms, distinct damage profiles, and leveling progression:
1. **Ignis, The Pyromancer** `[1]`: Launches homing fireballs inflicting explosive AoE splash damage and lingering Burn DOT ticks.
2. **Iron Piercer (Ballista)** `[2]`: Heavy kinetic siege weapon with animated recoil, penetrative bolt physics, and heavy armor shredding.
3. **Glacial Spire (Frost Pylon)** `[3]`: Channels continuous cryogenic beams slowing enemy movement and inflicting **Brittle** vulnerability (+35% damage from all attacks).
4. **Tempest Monolith (Storm Tower)** `[4]`: Twin conductor coils discharging multi-target chain lightning with a chance to stun and interrupt enemies.
5. **Shadow Warden (Void Reaper)** `[5]`: Hovering hooded specter wielding dual void scythes, dealing true void damage and executing wounded enemies (<35% HP) for bonus gold.

### ⚔️ Realistic Combat & Damage Mechanics
* **Armor & Resistance Mitigation:** Physical damage scales against enemy Armor curves; magical damage scales against Magic Resistance.
* **Critical Strikes:** Physics-based crits, floating combat text (`CRIT!`, `SHIELD`, `STUNNED`), and audible impact pings.
* **Hero Leveling:** Heroes gain XP from attacks and kills, advancing from Level 1 (*Novice*) to Level 5 (*Archon Ascendant*), gaining damage multipliers, range boosts, attack speed, and glowing runic auras. Players can also manually invest Arcane Gold to empower heroes.

### 👹 Enemy Categories, Elites & Boss Titans
* **Goblins & Skitterers:** High-speed swarm scouts.
* **Corrupted Footmen:** Balanced infantry carrying heavy shields and blades.
* **Canyon Ogres:** Hulking stone-skinned tanks with extreme physical armor.
* **Spectral Banshees:** Ethereal wraiths immune to physical armor reduction.
* **Elite Champions:** Spawn with randomized affixes:
  * **Swift:** +50% movement speed.
  * **Shielded:** Protected by an extra arcane shield barrier.
  * **Juggernaut:** Immune to Slow and Stun, fortified armor.
  * **Vampiric:** Rapidly regenerates health.
* **Epic Boss Encounters (Every 5 Waves):**
  * **Wave 5:** *Bone Golem Colossus*
  * **Wave 10:** *Dread Dragon Ignis*
  * **Wave 15:** *Malakor the Void Archon*

### 🃏 Roguelike Relic Draft System
Between waves, draft from randomized enchanted relics to permanently augment your run (e.g. *Dragon's Breath*, *Piercing Ballistics*, *Absolute Zero*, *Overcharged Conductor*, *Soul Harvester*, *Nexus Aegis*, *Alchemical Bounty*).

### 🗺️ Multi-Level Biomes
Dynamic environments shift as you survive deeper:
1. **Waves 1–5:** *Whispering Outskirts* (Mossy grove terrain)
2. **Waves 6–10:** *The Forsaken Crypts* (Obsidian flagstones, cold slate)
3. **Waves 11–15:** *Brimstone Chasm* (Scorched earth, volcanic ash)
4. **Wave 16+:** *Endless Cataclysm* (Nightmare scaling)

---

## 🕹️ Controls

| Action | Control |
| :--- | :--- |
| **Summon Hero** | Click on ground (when not on path/structures) |
| **Select Hero Class** | Keys `[1]`, `[2]`, `[3]`, `[4]`, `[5]` or click bottom cards |
| **Inspect / Empower Tower** | Click on any placed hero tower |
| **Start Next Wave** | `[Spacebar]` or click **Start Next Wave** |
| **Camera Orbit / Pan** | Left Click + Drag / Right Click + Drag |
| **Camera Zoom** | Mouse Scroll Wheel |
| **Game Speed** | Toggle `1x`, `2x`, `4x` buttons in top HUD |
| **Sound Toggle** | Click `🔊 SFX` |

---

## 💻 Running Locally

Simply serve with any local HTTP server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

Then navigate to `http://localhost:8000` in your web browser.