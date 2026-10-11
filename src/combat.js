// Realistic Damage & Combat Mechanics Engine
// Implements armor curves, elemental damage types, status effects, and hero leveling.

const DAMAGE_TYPES = {
  PHYSICAL: 'physical',
  FIRE: 'fire',
  FROST: 'frost',
  LIGHTNING: 'lightning',
  VOID: 'void'
}

class CombatEngine {
  constructor() {
    this.floatingTexts = []
  }

  // Calculate realistic damage considering armor, elemental resistances, crits, and vulnerability
  calculateDamage(attacker, target, rawDamage, type = DAMAGE_TYPES.PHYSICAL, armorPen = 0) {
    let damage = rawDamage
    let isCrit = false

    // Check critical strike (rare and balanced)
    const critChance = attacker.critChance !== undefined ? attacker.critChance : 0.05
    if (Math.random() < critChance) {
      isCrit = true
      const critMult = attacker.critMult || 1.35
      damage *= critMult
    }

    let isResisted = false
    let isVulnerable = false

    // Counter Negation / Immunity Check
    if (target.resistsType === type || target.counterType === type) {
      isResisted = true
      damage *= 0.18 // Negates 82% of damage
    } else if (target.weakToType === type) {
      isVulnerable = true
      damage *= 2.5 // Deals 250% damage when using the countering tower
    }

    // Brittle status modifier (frost vulnerability)
    if (target.brittle > 0) {
      damage *= (1 + (target.brittleMult || 1.3))
    }

    // Damage mitigation by defense type
    let finalDamage = damage

    if (type === DAMAGE_TYPES.PHYSICAL) {
      // Armor curve: DamageReduction = Armor / (Armor + 100)
      const effectiveArmor = Math.max(0, (target.armor || 0) * (1 - armorPen))
      const mitigation = effectiveArmor / (effectiveArmor + 100)
      finalDamage = damage * (1 - mitigation)
    } else {
      // Elemental / Magic Resistance: MagicResist / (MagicResist + 100)
      const effectiveMR = Math.max(0, target.magicResist || 0)
      const mitigation = effectiveMR / (effectiveMR + 100)
      finalDamage = damage * (1 - mitigation)
    }

    // Void execution bonus against low-health targets
    if (type === DAMAGE_TYPES.VOID && (target.hp / target.maxHp) <= 0.35 && !target.immuneVoid) {
      finalDamage *= 1.75
    }

    finalDamage = Math.max(1, Math.round(finalDamage))
    return {
      amount: finalDamage,
      isCrit,
      isResisted,
      isVulnerable,
      type
    }
  }

  // Apply damage and handle shields, burn, freeze, and death
  applyDamage(attacker, target, result, soundSys) {
    let remaining = result.amount

    // Absorb through magical shield first
    if (target.shield > 0) {
      if (target.shield >= remaining) {
        target.shield -= remaining
        this.spawnFloatingText(target.position, `${remaining}`, '#6be5ff', false, 'SHIELD')
        return { killed: false, overkill: 0 }
      } else {
        remaining -= target.shield
        this.spawnFloatingText(target.position, `SHIELD BROKE`, '#00d0ff', true)
        target.shield = 0
      }
    }

    target.hp -= remaining
    if (soundSys) soundSys.playHit(result.isCrit)

    // Visual combat number
    let textColor = '#ffffff'
    let prefix = ''

    if (result.isResisted) {
      textColor = '#8c95a6'
      prefix = 'RESISTED (-80%) '
    } else if (result.isVulnerable) {
      textColor = '#ffd000'
      prefix = 'WEAKNESS 2.5x! '
    } else if (result.type === DAMAGE_TYPES.FIRE) textColor = '#ff7733'
    else if (result.type === DAMAGE_TYPES.FROST) textColor = '#7ce6ff'
    else if (result.type === DAMAGE_TYPES.LIGHTNING) textColor = '#ffea6c'
    else if (result.type === DAMAGE_TYPES.VOID) textColor = '#d280ff'
    else textColor = result.isCrit ? '#ff3b30' : '#e0e0e0'

    if (result.isCrit && !result.isResisted) prefix = 'CRIT! ' + prefix
    this.spawnFloatingText(target.position, `${prefix}${result.amount}`, textColor, result.isCrit || result.isVulnerable)

    // Grant attacker XP for combat participation
    if (attacker && attacker.grantXp) {
      attacker.grantXp(Math.max(1, Math.round(result.amount * 0.15)))
    }

    if (target.hp <= 0) {
      if (attacker && attacker.grantXp) {
        attacker.grantXp(target.xpReward || 20)
        attacker.kills = (attacker.kills || 0) + 1
      }
      return { killed: true, overkill: Math.abs(target.hp) }
    }

    return { killed: false, overkill: 0 }
  }

  // Apply status effects
  applyStatus(target, effect) {
    if (effect.type === 'burn') {
      // Fire-resistant enemies are immune to burn DOT
      if (!target.immuneBurn && target.resistsType !== DAMAGE_TYPES.FIRE && target.counterType !== DAMAGE_TYPES.FIRE) {
        target.burnDps = Math.max(target.burnDps || 0, effect.dps)
        target.burnDuration = Math.max(target.burnDuration || 0, effect.duration)
      }
    } else if (effect.type === 'slow') {
      // Frost-resistant and juggernauts are immune to slow
      if (!target.immuneSlow && target.resistsType !== DAMAGE_TYPES.FROST && target.counterType !== DAMAGE_TYPES.FROST) {
        target.slowFactor = Math.min(0.75, Math.max(target.slowFactor || 0, effect.amount))
        target.slowDuration = Math.max(target.slowDuration || 0, effect.duration)
      }
    } else if (effect.type === 'brittle') {
      if (target.resistsType !== DAMAGE_TYPES.FROST) {
        target.brittle = Math.max(target.brittle || 0, effect.duration)
        target.brittleMult = effect.mult || 1.3
      }
    } else if (effect.type === 'stun') {
      if (!target.immuneStun && target.resistsType !== DAMAGE_TYPES.LIGHTNING) {
        target.stunDuration = Math.max(target.stunDuration || 0, effect.duration)
      }
    }
  }

  // Update status effects per frame
  updateStatuses(target, dt, onBurnTick) {
    // Burn DOT
    if (target.burnDuration > 0) {
      target.burnDuration -= dt
      target.burnTickTimer = (target.burnTickTimer || 0) + dt
      if (target.burnTickTimer >= 0.5) {
        target.burnTickTimer = 0
        const burnDmg = Math.round((target.burnDps || 10) * 0.5)
        target.hp -= burnDmg
        this.spawnFloatingText(target.position, `${burnDmg}`, '#ff5722', false)
        if (onBurnTick) onBurnTick(burnDmg)
      }
    }

    // Slow decay
    if (target.slowDuration > 0) {
      target.slowDuration -= dt
      if (target.slowDuration <= 0) {
        target.slowFactor = 0
      }
    }

    // Brittle decay
    if (target.brittle > 0) {
      target.brittle -= dt
    }

    // Stun decay
    if (target.stunDuration > 0) {
      target.stunDuration -= dt
    }
  }

  // Spawn a floating 3D combat text that floats upward
  spawnFloatingText(pos3d, text, color = '#ffffff', isCrit = false, label = '') {
    this.floatingTexts.push({
      text: label ? `${label}: ${text}` : text,
      pos: { x: pos3d.x, y: pos3d.y + 1.2, z: pos3d.z },
      color,
      isCrit,
      life: 0.85,
      maxLife: 0.85,
      vy: 1.8 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 0.6
    })
  }

  updateFloatingTexts(dt, camera, containerEl) {
    if (!containerEl) return
    containerEl.innerHTML = ''

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.life -= dt
      ft.pos.y += ft.vy * dt
      ft.pos.x += ft.vx * dt

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1)
        continue
      }

      // Project 3D coordinate to 2D screen coordinate
      const vector = new THREE.Vector3(ft.pos.x, ft.pos.y, ft.pos.z)
      vector.project(camera)

      // Check if within screen bounds and in front of camera
      if (vector.z < 1) {
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth
        const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight

        const alpha = Math.min(1, ft.life / 0.3)
        const scale = ft.isCrit ? 1.4 : 1.0

        const el = document.createElement('div')
        el.className = 'damage-number'
        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.style.color = ft.color
        el.style.opacity = alpha
        el.style.transform = `translate(-50%, -50%) scale(${scale})`
        if (ft.isCrit) el.classList.add('crit')
        el.textContent = ft.text
        containerEl.appendChild(el)
      }
    }
  }
}

// Hero Progression Definition
const HERO_LEVEL_DATA = {
  1: { xpRequired: 50, damageMult: 1.0, rangeMult: 1.0, speedMult: 1.0, title: 'Novice' },
  2: { xpRequired: 130, damageMult: 1.25, rangeMult: 1.08, speedMult: 1.1, title: 'Adept' },
  3: { xpRequired: 280, damageMult: 1.6, rangeMult: 1.15, speedMult: 1.2, title: 'Arcane Master' },
  4: { xpRequired: 550, damageMult: 2.05, rangeMult: 1.22, speedMult: 1.3, title: 'Grand Magus' },
  5: { xpRequired: 999999, damageMult: 2.7, rangeMult: 1.35, speedMult: 1.45, title: 'Archon Ascendant' }
}

window.CombatEngine = CombatEngine
window.DAMAGE_TYPES = DAMAGE_TYPES
window.HERO_LEVEL_DATA = HERO_LEVEL_DATA
window.combatEngine = new CombatEngine()
