// Procedural 3D Model Factory for Three.js
// Creates detailed 3D models for Heroes, Nexus, Enemies, Bosses, and Projectiles.

class ModelFactory {
  constructor() {
    this.materials = this.initMaterials()
  }

  initMaterials() {
    return {
      stone: new THREE.MeshStandardMaterial({
        color: 0x4a4f5c,
        roughness: 0.85,
        metalness: 0.1
      }),
      darkStone: new THREE.MeshStandardMaterial({
        color: 0x22242b,
        roughness: 0.9,
        metalness: 0.2
      }),
      marble: new THREE.MeshStandardMaterial({
        color: 0xdde2ea,
        roughness: 0.4,
        metalness: 0.1
      }),
      gold: new THREE.MeshStandardMaterial({
        color: 0xe6b800,
        roughness: 0.35,
        metalness: 0.85
      }),
      iron: new THREE.MeshStandardMaterial({
        color: 0x6e7685,
        roughness: 0.5,
        metalness: 0.7
      }),
      wood: new THREE.MeshStandardMaterial({
        color: 0x5a3d28,
        roughness: 0.8,
        metalness: 0.05
      }),
      fireRuby: new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff4400,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.3
      }),
      frostCrystal: new THREE.MeshStandardMaterial({
        color: 0x55ccff,
        emissive: 0x0088cc,
        emissiveIntensity: 0.7,
        roughness: 0.15,
        metalness: 0.4,
        transparent: true,
        opacity: 0.9
      }),
      stormElectric: new THREE.MeshStandardMaterial({
        color: 0xffea00,
        emissive: 0xffbb00,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.6
      }),
      voidPurple: new THREE.MeshStandardMaterial({
        color: 0x7700cc,
        emissive: 0x550099,
        emissiveIntensity: 0.85,
        roughness: 0.3,
        metalness: 0.5
      }),
      nexusShield: new THREE.MeshStandardMaterial({
        color: 0x00d0ff,
        emissive: 0x0077aa,
        emissiveIntensity: 0.5,
        roughness: 0.1,
        transparent: true,
        opacity: 0.35,
        wireframe: true
      })
    }
  }

  // ==========================================
  // THE ARCANE NEXUS (CHECKPOINT WITH 3 LIVES)
  // ==========================================
  createNexus() {
    const nexusGroup = new THREE.Group()
    nexusGroup.name = "Nexus"

    // Base podium with carved steps
    const baseGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.4, 16)
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.marble)
    baseMesh.position.y = 0.2
    baseMesh.castShadow = true
    baseMesh.receiveShadow = true
    nexusGroup.add(baseMesh)

    // Glowing runic circle on the floor
    const runeTex = TextureGenerator.getRunicCircle('#00d0ff', '#7b42ff')
    const runeGeo = new THREE.PlaneGeometry(4.4, 4.4)
    const runeMat = new THREE.MeshBasicMaterial({
      map: runeTex,
      transparent: true,
      depthWrite: false
    })
    const runeMesh = new THREE.Mesh(runeGeo, runeMat)
    runeMesh.rotation.x = -Math.PI / 2
    runeMesh.position.y = 0.41
    nexusGroup.add(runeMesh)

    // 4 Corner Sanctuary Obelisks
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4
      const px = Math.cos(angle) * 1.8
      const pz = Math.sin(angle) * 1.8

      const pillarGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.8, 6)
      const pillar = new THREE.Mesh(pillarGeo, this.materials.stone)
      pillar.position.set(px, 1.1, pz)
      pillar.castShadow = true

      // Glowing capstone
      const capGeo = new THREE.OctahedronGeometry(0.15)
      const cap = new THREE.Mesh(capGeo, this.materials.frostCrystal)
      cap.position.set(px, 2.1, pz)
      nexusGroup.add(pillar)
      nexusGroup.add(cap)
    }

    // Central Archon Crystal Monolith
    const monolithGeo = new THREE.OctahedronGeometry(0.85, 0)
    monolithGeo.scale(1, 1.8, 1)
    const monolith = new THREE.Mesh(monolithGeo, this.materials.frostCrystal)
    monolith.position.y = 2.2
    monolith.castShadow = true
    nexusGroup.add(monolith)
    nexusGroup.crystalMesh = monolith

    // 3 FLOATING NEXUS LIFE ORBS (REPRESENTING 3 LIVES)
    const lifeOrbs = []
    for (let i = 0; i < 3; i++) {
      const orbGroup = new THREE.Group()
      const orbGeo = new THREE.SphereGeometry(0.24, 16, 16)
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00d0ff,
        emissiveIntensity: 1.0,
        roughness: 0.1
      })
      const orbMesh = new THREE.Mesh(orbGeo, orbMat)
      orbGroup.add(orbMesh)

      // Orbiting ring around each life orb
      const ringGeo = new THREE.TorusGeometry(0.35, 0.03, 8, 24)
      const ringMesh = new THREE.Mesh(ringGeo, this.materials.gold)
      ringMesh.rotation.x = Math.PI / 3
      orbGroup.add(ringMesh)

      nexusGroup.add(orbGroup)
      lifeOrbs.push(orbGroup)
    }
    nexusGroup.lifeOrbs = lifeOrbs

    // Protective Dome
    const domeGeo = new THREE.SphereGeometry(2.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const domeMesh = new THREE.Mesh(domeGeo, this.materials.nexusShield)
    domeMesh.position.y = 0.4
    nexusGroup.add(domeMesh)
    nexusGroup.domeMesh = domeMesh

    return nexusGroup
  }

  // ==========================================
  // HEROES / TOWERS
  // ==========================================

  // 1. IGNIS, THE PYROMANCER (Fire Mage)
  createPyromancer() {
    const group = new THREE.Group()

    // Stone Dias
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.35, 8), this.materials.darkStone)
    base.position.y = 0.175
    base.castShadow = true
    group.add(base)

    // Runic plate
    const rune = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 8), this.materials.gold)
    rune.position.y = 0.38
    group.add(rune)

    // Wizard Robe / Body
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 8), new THREE.MeshStandardMaterial({
      color: 0x8b1a1a,
      roughness: 0.7
    }))
    robe.position.y = 0.95
    robe.castShadow = true
    group.add(robe)

    // Wizard Hood / Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshStandardMaterial({
      color: 0x221111,
      roughness: 0.8
    }))
    head.position.y = 1.6
    group.add(head)

    // Glowing Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.04), eyeMat)
    eye1.position.set(0.08, 1.62, 0.18)
    const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.04), eyeMat)
    eye2.position.set(-0.08, 1.62, 0.18)
    group.add(eye1)
    group.add(eye2)

    // Magic Staff
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 8), this.materials.wood)
    staff.position.set(0.38, 1.1, 0.2)
    staff.rotation.z = -0.1
    group.add(staff)

    // Flame Core Crystal on staff head
    const flameCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), this.materials.fireRuby)
    flameCore.position.set(0.42, 2.0, 0.2)
    group.add(flameCore)
    group.coreCrystal = flameCore

    // 3 Orbiting mini flame motes
    const sparks = []
    for (let i = 0; i < 3; i++) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), this.materials.fireRuby)
      group.add(spark)
      sparks.push(spark)
    }
    group.sparks = sparks

    return group
  }

  // 2. IRON PIERCER (Siege Ballista)
  createBallista() {
    const group = new THREE.Group()

    // Timber tripod base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.25, 6), this.materials.wood)
    base.position.y = 0.125
    group.add(base)

    // Iron turntable gear
    const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.15, 12), this.materials.iron)
    gear.position.y = 0.3
    group.add(gear)

    // Ballista Turret Housing (rotates towards target)
    const turret = new THREE.Group()
    turret.position.y = 0.5

    // Main stock beam
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 1.4), this.materials.wood)
    stock.position.z = 0.1
    stock.castShadow = true
    turret.add(stock)

    // Recurve Bow Arms (Horizontal)
    const bowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.15), this.materials.iron)
    bowLeft.position.set(-0.4, 0.08, 0.5)
    bowLeft.rotation.y = 0.35
    turret.add(bowLeft)

    const bowRight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.15), this.materials.iron)
    bowRight.position.set(0.4, 0.08, 0.5)
    bowRight.rotation.y = -0.35
    turret.add(bowRight)

    // Heavy Bolt / Spear ready to fire
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), this.materials.wood)
    bolt.rotation.x = Math.PI / 2
    bolt.position.set(0, 0.14, 0.3)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 6), this.materials.iron)
    tip.rotation.x = Math.PI / 2
    tip.position.set(0, 0.14, 0.95)
    turret.add(bolt)
    turret.add(tip)
    group.boltMesh = bolt

    group.add(turret)
    group.turret = turret

    return group
  }

  // 3. GLACIAL SPIRE (Frost Pylon)
  createFrostPylon() {
    const group = new THREE.Group()

    // Tiered frosted stone base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.35, 6), this.materials.darkStone)
    base.position.y = 0.175
    group.add(base)

    // Runic ice disc
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.1, 6), this.materials.frostCrystal)
    disc.position.y = 0.38
    group.add(disc)

    // Floating Central Ice Spire
    const spireGeo = new THREE.OctahedronGeometry(0.65, 0)
    spireGeo.scale(0.8, 2.2, 0.8)
    const spire = new THREE.Mesh(spireGeo, this.materials.frostCrystal)
    spire.position.y = 1.6
    spire.castShadow = true
    group.add(spire)
    group.spire = spire

    // 4 Orbiting Ice Shards
    const shards = []
    for (let i = 0; i < 4; i++) {
      const shardGeo = new THREE.ConeGeometry(0.12, 0.5, 4)
      const shard = new THREE.Mesh(shardGeo, this.materials.frostCrystal)
      group.add(shard)
      shards.push(shard)
    }
    group.shards = shards

    return group
  }

  // 4. TEMPEST MONOLITH (Storm Tower)
  createStormMonolith() {
    const group = new THREE.Group()

    // Metallic Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.3, 8), this.materials.darkStone)
    base.position.y = 0.15
    group.add(base)

    // Twin Prongs / Conductors
    for (const offset of [-0.3, 0.3]) {
      const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.7, 6), this.materials.iron)
      prong.position.set(offset, 1.0, 0)
      group.add(prong)

      // Copper coils
      for (let c = 0; c < 3; c++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 12), this.materials.gold)
        coil.position.set(offset, 0.6 + c * 0.35, 0)
        coil.rotation.x = Math.PI / 2
        group.add(coil)
      }
    }

    // High-voltage lightning orb between the tines
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), this.materials.stormElectric)
    orb.position.set(0, 1.6, 0)
    group.add(orb)
    group.orb = orb

    return group
  }

  // 5. SHADOW WARDEN (Void Reaper)
  createVoidReaper() {
    const group = new THREE.Group()

    // Void portal ring at base
    const portal = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 8, 24), this.materials.voidPurple)
    portal.rotation.x = Math.PI / 2
    portal.position.y = 0.08
    group.add(portal)

    // Floating Hooded Spectre (no feet)
    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 8), new THREE.MeshStandardMaterial({
      color: 0x110c1f,
      roughness: 0.9
    }))
    cowl.position.y = 1.1
    group.add(cowl)

    // Spectral Void Orb in Hood
    const voidSoul = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), this.materials.voidPurple)
    voidSoul.position.set(0, 1.4, 0.05)
    group.add(voidSoul)

    // Dual Floating Scythes
    const scythe1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16, Math.PI), this.materials.voidPurple)
    scythe1.position.set(0.55, 1.3, 0)
    scythe1.rotation.z = Math.PI / 3
    const scythe2 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16, Math.PI), this.materials.voidPurple)
    scythe2.position.set(-0.55, 1.3, 0)
    scythe2.rotation.z = -Math.PI / 3

    group.add(scythe1)
    group.add(scythe2)
    group.scythes = [scythe1, scythe2]

    return group
  }

  // ==========================================
  // ENEMIES & BOSS TITANS
  // ==========================================

  // 1. Goblin Skitterer (Fast Swarm Scout)
  createGoblin() {
    const group = new THREE.Group()

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({
      color: 0x3d6b2c, // Goblin green
      roughness: 0.8
    }))
    body.position.y = 0.35
    group.add(body)

    // Head with pointy ears
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({
      color: 0x4a8035
    }))
    head.position.set(0, 0.6, 0.1)
    group.add(head)

    // Daggers
    const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), this.materials.iron)
    dagger.position.set(0.35, 0.4, 0.2)
    dagger.rotation.x = Math.PI / 4
    group.add(dagger)

    return group
  }

  // 2. Corrupted Footman (Soldier with Shield & Blade)
  createFootman() {
    const group = new THREE.Group()

    // Armored Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.3), this.materials.darkStone)
    torso.position.y = 0.55
    torso.castShadow = true
    group.add(torso)

    // Iron Helm
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.35, 8), this.materials.iron)
    helm.position.y = 1.05
    group.add(helm)

    // Red glowing visor slit
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.08), new THREE.MeshBasicMaterial({ color: 0xff1100 }))
    visor.position.set(0, 1.05, 0.18)
    group.add(visor)

    // Shield
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.4), this.materials.iron)
    shield.position.set(-0.35, 0.6, 0.1)
    group.add(shield)

    // Sword
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.08), this.materials.iron)
    sword.position.set(0.35, 0.65, 0.1)
    sword.rotation.x = Math.PI / 6
    group.add(sword)

    return group
  }

  // 3. Canyon Ogre (Armored Tank)
  createOgre() {
    const group = new THREE.Group()
    group.scale.set(1.4, 1.4, 1.4)

    // Hulking Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.6), new THREE.MeshStandardMaterial({
      color: 0x5a4a3e,
      roughness: 0.9
    }))
    body.position.y = 0.65
    body.castShadow = true
    group.add(body)

    // Heavy shoulder armor plate
    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.45), this.materials.iron)
    shoulderL.position.set(-0.55, 1.0, 0)
    const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.45), this.materials.iron)
    shoulderR.position.set(0.55, 1.0, 0)
    group.add(shoulderL)
    group.add(shoulderR)

    // Brutal Spiked Club
    const club = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 1.1, 6), this.materials.wood)
    club.position.set(0.65, 0.7, 0.3)
    club.rotation.x = Math.PI / 5
    group.add(club)

    return group
  }

  // 4. Spectral Banshee (Ethereal Ghost)
  createBanshee() {
    const group = new THREE.Group()

    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      emissive: 0x0088cc,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.75,
      roughness: 0.3
    })

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 8), ghostMat)
    body.position.y = 0.8
    body.rotation.x = Math.PI
    group.add(body)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), ghostMat)
    head.position.y = 1.1
    group.add(head)

    return group
  }

  // ==========================================
  // BOSS TITANS
  // ==========================================

  // Wave 5 Boss: Bone Golem Colossus
  createBossBoneGolem() {
    const group = new THREE.Group()
    group.scale.set(2.2, 2.2, 2.2)

    // Ribcage torso with fiery heart
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.7), this.materials.marble)
    torso.position.y = 1.0
    torso.castShadow = true
    group.add(torso)

    // Flaming soul furnace inside ribcage
    const soulHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), this.materials.fireRuby)
    soulHeart.position.set(0, 1.0, 0.2)
    group.add(soulHeart)
    group.soulHeart = soulHeart

    // Horned Skull
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), this.materials.marble)
    skull.position.set(0, 1.85, 0.1)
    group.add(skull)

    // Giant Spiked Mace Arms
    const maceL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), this.materials.iron)
    maceL.position.set(-0.85, 0.7, 0.2)
    const maceR = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), this.materials.iron)
    maceR.position.set(0.85, 0.7, 0.2)
    group.add(maceL)
    group.add(maceR)

    return group
  }

  // Wave 10 Boss: Dread Dragon Ignis
  createBossDragon() {
    const group = new THREE.Group()
    group.scale.set(2.4, 2.4, 2.4)

    // Scaled dragon body
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.0, 8), new THREE.MeshStandardMaterial({
      color: 0x8a1c14,
      roughness: 0.7
    }))
    body.rotation.x = Math.PI / 2.3
    body.position.set(0, 1.0, 0)
    group.add(body)

    // Head with horn crest
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.9), new THREE.MeshStandardMaterial({
      color: 0xaa2218
    }))
    head.position.set(0, 1.4, 0.9)
    group.add(head)

    // Fiery Maw
    const maw = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.materials.fireRuby)
    maw.position.set(0, 1.35, 1.3)
    group.add(maw)

    // Massive Wings (Left & Right)
    const wingGeo = new THREE.BoxGeometry(1.6, 0.08, 0.9)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x550e09 })

    const wingL = new THREE.Mesh(wingGeo, wingMat)
    wingL.position.set(-1.0, 1.4, -0.2)
    wingL.rotation.z = 0.35

    const wingR = new THREE.Mesh(wingGeo, wingMat)
    wingR.position.set(1.0, 1.4, -0.2)
    wingR.rotation.z = -0.35

    group.add(wingL)
    group.add(wingR)
    group.wingL = wingL
    group.wingR = wingR

    return group
  }

  // Wave 15 Boss: Malakor the Void Archon
  createBossVoidArchon() {
    const group = new THREE.Group()
    group.scale.set(2.6, 2.6, 2.6)

    // Floating Obsidian Core
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), this.materials.voidPurple)
    core.position.y = 1.6
    group.add(core)
    group.core = core

    // Void Crown
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 12), this.materials.darkStone)
    crown.position.set(0, 2.4, 0)
    crown.rotation.x = Math.PI / 2
    group.add(crown)

    // 4 Floating Void Blades / Wings
    const blades = []
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.4, 0.08), this.materials.darkStone)
      blade.position.set(Math.cos(angle) * 1.1, 1.6, Math.sin(angle) * 1.1)
      blade.rotation.y = angle
      group.add(blade)
      blades.push(blade)
    }
    group.blades = blades

    return group
  }

  // Add Elite Visual Embellishments (Crown & Glowing Aura)
  makeElite(modelGroup, affixType = 'Swift') {
    modelGroup.scale.multiplyScalar(1.3)

    // Elite Runic Crown
    const crownGeo = new THREE.ConeGeometry(0.35, 0.3, 5)
    let crownColor = 0xffcc00
    if (affixType === 'Shielded') crownColor = 0x00d0ff
    else if (affixType === 'Juggernaut') crownColor = 0xff2222
    else if (affixType === 'Vampiric') crownColor = 0xcc00ff

    const crownMat = new THREE.MeshBasicMaterial({ color: crownColor, wireframe: true })
    const crown = new THREE.Mesh(crownGeo, crownMat)
    crown.position.y = 1.65
    modelGroup.add(crown)

    // Glowing Aura Ring at feet
    const ringGeo = new THREE.TorusGeometry(0.6, 0.06, 6, 16)
    const ringMat = new THREE.MeshBasicMaterial({ color: crownColor })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.1
    modelGroup.add(ring)
    modelGroup.eliteRing = ring
  }
}

window.ModelFactory = ModelFactory
window.modelFactory = new ModelFactory()
