// Wave System, Multi-Level Progression, Elite Modifiers, and Roguelike Relics

const LEVEL_BIOMES = {
  1: { name: 'Whispering Outskirts', biome: 'forest', fogColor: 0x18241c, lightColor: 0xebffec, maxWaves: 5 },
  2: { name: 'The Forsaken Crypts', biome: 'crypt', fogColor: 0x121524, lightColor: 0xc8ddff, maxWaves: 10 },
  3: { name: 'Brimstone Chasm', biome: 'volcano', fogColor: 0x2e1111, lightColor: 0xffd2c4, maxWaves: 15 },
  4: { name: 'Endless Cataclysm', biome: 'crypt', fogColor: 0x1f0f29, lightColor: 0xeed6ff, maxWaves: 999 }
}

const ELITE_AFFIXES = [
  { name: 'Swift', color: '#ffea00', desc: '+50% Movement Speed', apply: (e) => { e.speed *= 1.5 } },
  { name: 'Shielded', color: '#00d0ff', desc: 'Protected by Arcane Shield Barrier', apply: (e) => { e.shield = Math.round(e.maxHp * 0.6) } },
  { name: 'Juggernaut', color: '#ff3333', desc: 'Immune to Slow/Stun, +40 Armor', apply: (e) => { e.immuneSlow = true; e.immuneStun = true; e.armor += 40 } },
  { name: 'Vampiric', color: '#d200ff', desc: 'Soul Regeneration', apply: (e) => { e.regenRate = Math.round(e.maxHp * 0.08) } }
]

const ROGUELIKE_RELICS = [
  {
    id: 'dragons_breath',
    title: "Dragon's Breath",
    category: 'Pyromancer',
    desc: 'Ignis deals +45% Burn damage, and fireball explosion radius increases by 35%.',
    apply: (gameState) => {
      gameState.relics.pyroBurnBonus = (gameState.relics.pyroBurnBonus || 0) + 0.45
      gameState.relics.pyroRadiusBonus = (gameState.relics.pyroRadiusBonus || 0) + 0.35
    }
  },
  {
    id: 'piercing_ballistics',
    title: 'Piercing Ballistics',
    category: 'Ballista',
    desc: 'Iron Piercer penetrates +2 additional targets and ignores 35% enemy armor.',
    apply: (gameState) => {
      gameState.relics.ballistaPierceBonus = (gameState.relics.ballistaPierceBonus || 0) + 2
      gameState.relics.ballistaArmorPen = (gameState.relics.ballistaArmorPen || 0) + 0.35
    }
  },
  {
    id: 'absolute_zero',
    title: 'Absolute Zero',
    category: 'Glacial Spire',
    desc: 'Frost Pylon slows enemies by an additional +15%, and brittle vulnerability deals +25% bonus damage.',
    apply: (gameState) => {
      gameState.relics.frostSlowBonus = (gameState.relics.frostSlowBonus || 0) + 0.15
      gameState.relics.frostBrittleBonus = (gameState.relics.frostBrittleBonus || 0) + 0.25
    }
  },
  {
    id: 'overcharged_conductor',
    title: 'Overcharged Conductor',
    category: 'Tempest Monolith',
    desc: 'Chain lightning strikes +2 additional enemies and gains +15% stun chance.',
    apply: (gameState) => {
      gameState.relics.stormChainBonus = (gameState.relics.stormChainBonus || 0) + 2
      gameState.relics.stormStunBonus = (gameState.relics.stormStunBonus || 0) + 0.15
    }
  },
  {
    id: 'soul_harvest',
    title: 'Soul Harvester',
    category: 'Void Reaper',
    desc: 'Void Reaper executes enemies under 45% HP and yields +4 bonus gold per kill.',
    apply: (gameState) => {
      gameState.relics.voidExecuteThreshold = 0.45
      gameState.relics.voidGoldBonus = (gameState.relics.voidGoldBonus || 0) + 4
    }
  },
  {
    id: 'nexus_aegis',
    title: 'Nexus Aegis',
    category: 'Sanctuary',
    desc: 'Restores 1 lost Nexus life (up to 3 max lives) and fortifies tower ranges by +12%.',
    apply: (gameState) => {
      if (gameState.lives < 3) {
        gameState.lives = Math.min(3, gameState.lives + 1)
        if (gameState.onLivesChanged) gameState.onLivesChanged(gameState.lives)
      }
      gameState.relics.globalRangeBonus = (gameState.relics.globalRangeBonus || 0) + 0.12
    }
  },
  {
    id: 'alchemical_bounty',
    title: 'Alchemical Bounty',
    category: 'Economy',
    desc: '+85 Gold immediately, plus +20% bonus gold earned from all future defeated enemies.',
    apply: (gameState) => {
      gameState.gold += 85
      gameState.relics.goldMultiplier = (gameState.relics.goldMultiplier || 1.0) + 0.20
    }
  },
  {
    id: 'war_drums',
    title: 'War Drums of Haste',
    category: 'Universal',
    desc: 'All summoned heroes gain +20% attack speed.',
    apply: (gameState) => {
      gameState.relics.globalAttackSpeed = (gameState.relics.globalAttackSpeed || 0) + 0.20
    }
  },
  {
    id: 'deadly_precision',
    title: 'Deadly Precision',
    category: 'Universal',
    desc: 'All heroes gain +15% Critical Strike chance and +40% Critical Strike damage.',
    apply: (gameState) => {
      gameState.relics.globalCritChance = (gameState.relics.globalCritChance || 0) + 0.15
      gameState.relics.globalCritMult = (gameState.relics.globalCritMult || 0) + 0.40
    }
  }
]

class WaveManager {
  constructor(gameState) {
    this.gameState = gameState
  }

  // Get current Level / Biome based on current wave number
  getCurrentLevel(wave) {
    if (wave <= 5) return { level: 1, ...LEVEL_BIOMES[1] }
    if (wave <= 10) return { level: 2, ...LEVEL_BIOMES[2] }
    if (wave <= 15) return { level: 3, ...LEVEL_BIOMES[3] }
    return { level: 4, ...LEVEL_BIOMES[4] }
  }

  // Generate wave configuration with realistic scaling
  generateWaveConfig(wave) {
    const isBossWave = (wave % 5 === 0)
    let bossType = null
    if (isBossWave) {
      if (wave === 5) bossType = 'BoneGolem'
      else if (wave === 10) bossType = 'Dragon'
      else bossType = 'VoidArchon'
    }

    // Exponential-linear difficulty scaling
    const difficultyScale = Math.pow(1.18, wave - 1) * (1 + wave * 0.05)

    // Calculate enemy composition
    const spawnQueue = []

    if (isBossWave) {
      // Boss waves have minor escort minions + 1 massive Boss
      const minionCount = 6 + Math.floor(wave * 0.8)
      for (let i = 0; i < minionCount; i++) {
        spawnQueue.push({
          type: (i % 2 === 0) ? 'goblin' : 'footman',
          isElite: false,
          delay: i * 0.7
        })
      }
      // Boss spawns with dramatic delay
      spawnQueue.push({
        type: 'boss',
        bossType,
        isElite: false,
        delay: (minionCount + 1) * 0.7 + 1.0
      })
    } else {
      // Normal waves: Scaling count of goblins, footmen, ogres, and banshees
      const totalCount = Math.min(45, Math.round(8 + wave * 2.2))
      const eliteChance = Math.min(0.4, Math.max(0, (wave - 2) * 0.05))

      for (let i = 0; i < totalCount; i++) {
        let type = 'goblin'
        const r = Math.random()

        if (wave >= 8 && r < 0.25) {
          type = 'banshee'
        } else if (wave >= 4 && r < 0.5) {
          type = 'ogre'
        } else if (wave >= 2 && r < 0.75) {
          type = 'footman'
        } else {
          type = 'goblin'
        }

        const isElite = (wave >= 3) && (Math.random() < eliteChance)
        const affix = isElite ? ELITE_AFFIXES[Math.floor(Math.random() * ELITE_AFFIXES.length)] : null

        spawnQueue.push({
          type,
          isElite,
          affix,
          delay: i * Math.max(0.35, 1.1 - wave * 0.035)
        })
      }
    }

    return {
      wave,
      isBossWave,
      bossType,
      difficultyScale,
      spawnQueue,
      totalEnemies: spawnQueue.length
    }
  }

  // Create an enemy instance data based on its type and current difficulty
  createEnemyData(config, difficultyScale) {
    let baseHp = 45
    let baseSpeed = 2.4
    let armor = 5
    let magicResist = 5
    let xpReward = 15
    let goldReward = 8

    switch (config.type) {
      case 'goblin':
        baseHp = 35
        baseSpeed = 3.6
        armor = 2
        magicResist = 2
        goldReward = 6
        xpReward = 12
        break
      case 'footman':
        baseHp = 70
        baseSpeed = 2.2
        armor = 25
        magicResist = 10
        goldReward = 10
        xpReward = 20
        break
      case 'ogre':
        baseHp = 180
        baseSpeed = 1.4
        armor = 45
        magicResist = 15
        goldReward = 22
        xpReward = 45
        break
      case 'banshee':
        baseHp = 90
        baseSpeed = 2.8
        armor = 0 // Immune to physical armor
        magicResist = 35
        goldReward = 16
        xpReward = 32
        break
      case 'boss':
        baseHp = 1200
        baseSpeed = 1.1
        armor = 50
        magicResist = 40
        goldReward = 120
        xpReward = 250
        break
    }

    const scaledHp = Math.round(baseHp * difficultyScale)
    const enemyData = {
      type: config.type,
      bossType: config.bossType,
      maxHp: scaledHp,
      hp: scaledHp,
      speed: baseSpeed,
      armor: Math.round(armor * (1 + (difficultyScale - 1) * 0.25)),
      magicResist: Math.round(magicResist * (1 + (difficultyScale - 1) * 0.25)),
      shield: 0,
      goldReward: Math.round(goldReward * (1 + (difficultyScale - 1) * 0.15)),
      xpReward: Math.round(xpReward * (1 + (difficultyScale - 1) * 0.2)),
      isElite: config.isElite,
      affix: config.affix,
      distanceTraveled: 0,
      pathIndex: 0
    }

    // Apply Elite Affix if present
    if (config.isElite && config.affix) {
      config.affix.apply(enemyData)
      enemyData.maxHp = Math.round(enemyData.maxHp * 1.4)
      enemyData.hp = enemyData.maxHp
      enemyData.goldReward = Math.round(enemyData.goldReward * 1.7)
      enemyData.xpReward = Math.round(enemyData.xpReward * 1.8)
    }

    return enemyData
  }

  // Draw 3 random distinct Relics for drafting
  drawRelicOptions() {
    const pool = [...ROGUELIKE_RELICS]
    const selected = []
    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      selected.push(pool.splice(idx, 1)[0])
    }
    return selected
  }
}

window.WaveManager = WaveManager
window.LEVEL_BIOMES = LEVEL_BIOMES
window.ROGUELIKE_RELICS = ROGUELIKE_RELICS
