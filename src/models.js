// Procedural & High-Poly GLTF 3D Model Factory for Three.js
// Creates detailed 3D models for Heroes, Nexus, Enemies, Bosses, and Projectiles.

class ModelFactory {
  constructor() {
    this.materials = this.initMaterials()
    this.gltfModels = {}
    this.charTextures = { imp: {}, puglin: {} }
    this.fbxTowers = {
      ballista: {},
      pyromancer: {},
      frostPylon: {},
      stormMonolith: {},
      voidReaper: {}
    }
    this.heroModel = null
    this.heroClips = []
    this.initCharacterTextures()
    this.initGLTFLoader()
    this.initTowerLoader()
    this.initAnimationLoader()
  }

  // Reliable SkinnedMesh hierarchy clone with bone rebinding
  cloneWithSkeleton(source) {
    if (!source) return null
    if (typeof THREE.SkeletonUtils !== 'undefined' && typeof THREE.SkeletonUtils.clone === 'function') {
      return THREE.SkeletonUtils.clone(source)
    }

    const sourceLookup = new Map()
    const cloneLookup = new Map()
    const clone = source.clone()

    function parallelTraverse(a, b, callback) {
      callback(a, b)
      for (let i = 0; i < a.children.length; i++) {
        if (b.children[i]) {
          parallelTraverse(a.children[i], b.children[i], callback)
        }
      }
    }

    parallelTraverse(source, clone, (sourceNode, clonedNode) => {
      sourceLookup.set(clonedNode, sourceNode)
      cloneLookup.set(sourceNode, clonedNode)
    })

    clone.traverse((node) => {
      if (!node.isSkinnedMesh) return
      const clonedMesh = node
      const sourceMesh = sourceLookup.get(node)
      if (sourceMesh && sourceMesh.skeleton) {
        const sourceBones = sourceMesh.skeleton.bones
        clonedMesh.skeleton = sourceMesh.skeleton.clone()
        clonedMesh.bindMatrix.copy(sourceMesh.bindMatrix)
        clonedMesh.skeleton.bones = sourceBones.map((bone) => cloneLookup.get(bone) || bone)
        clonedMesh.bind(clonedMesh.skeleton, clonedMesh.bindMatrix)
      }
    })
    return clone
  }

  initCharacterTextures() {
    const texLoader = new THREE.TextureLoader()
    const loadTex = (path) => {
      return texLoader.load(path, (t) => {
        t.flipY = false
        t.encoding = THREE.sRGBEncoding
        t.needsUpdate = true
        if (window.game && window.game.refreshEnemyModels) {
          window.game.refreshEnemyModels()
        }
      }, undefined, (e) => console.warn("Character texture load fallback:", path, e))
    }

    // Imp variations (1: Red Magma, 2: Green Earth, 3: Cyan Frost)
    this.charTextures.imp[1] = loadTex('assets/characters/Textures/T_Imp_BaseColor_1.png')
    this.charTextures.imp[2] = loadTex('assets/characters/Textures/T_Imp_BaseColor_2.png')
    this.charTextures.imp[3] = loadTex('assets/characters/Textures/T_Imp_BaseColor_3.png')

    // Puglin variations (1: Red Ironclad, 2: Green Swift, 3: Blue Striped Mystic)
    this.charTextures.puglin[1] = loadTex('assets/characters/Textures/T_Puglin_BaseColor_1.png')
    this.charTextures.puglin[2] = loadTex('assets/characters/Textures/T_Puglin_BaseColor_2.png')
    this.charTextures.puglin[3] = loadTex('assets/characters/Textures/T_Puglin_BaseColor_3.png')
  }

  initGLTFLoader() {
    if (typeof THREE.GLTFLoader === 'function') {
      const loader = new THREE.GLTFLoader()

      loader.load('assets/characters/Imp.glb', (gltf) => {
        this.gltfModels.imp = gltf.scene
        console.log("Imp.glb loaded successfully")
        if (window.game && window.game.refreshEnemyModels) {
          window.game.refreshEnemyModels('imp')
        }
      }, undefined, (e) => console.warn("Imp.glb load fallback:", e))

      loader.load('assets/characters/Puglin.glb', (gltf) => {
        this.gltfModels.puglin = gltf.scene
        console.log("Puglin.glb loaded successfully")
        if (window.game && window.game.refreshEnemyModels) {
          window.game.refreshEnemyModels('puglin')
        }
      }, undefined, (e) => console.warn("Puglin.glb load fallback:", e))

      loader.load('assets/models/scenery/Tree_1_A_Color1.gltf', (gltf) => {
        this.gltfModels.tree = gltf.scene
        if (window.game && window.game.scene) {
          this.spawnSceneryDecorations(window.game.scene, window.game.waypoints)
        }
      }, undefined, (e) => {})

      loader.load('assets/models/scenery/Rock_1_A_Color1.gltf', (gltf) => {
        this.gltfModels.rock = gltf.scene
        if (window.game && window.game.scene) {
          this.spawnSceneryDecorations(window.game.scene, window.game.waypoints)
        }
      }, undefined, (e) => {})

      loader.load('assets/models/scenery/Bush_1_A_Color1.gltf', (gltf) => {
        this.gltfModels.bush = gltf.scene
        if (window.game && window.game.scene) {
          this.spawnSceneryDecorations(window.game.scene, window.game.waypoints)
        }
      }, undefined, (e) => {})
    }
  }

  initTowerLoader() {
    if (typeof THREE.FBXLoader !== 'function') return
    const fbxLoader = new THREE.FBXLoader()
    const texLoader = new THREE.TextureLoader()
    const towerTex = texLoader.load('assets/tower/texture/Texture_MAp_fortress_elves.png', (tex) => {
      tex.encoding = THREE.sRGBEncoding
      tex.needsUpdate = true
    })

    const towerFiles = {
      ballista: (lvl) => `assets/tower/fbx/Full/_Ballista_tower_LVL_${lvl}.fbx`,
      pyromancer: (lvl) => `assets/tower/fbx/Full/_Cannon_tower_LVL_${lvl}.fbx`,
      frostPylon: (lvl) => `assets/tower/fbx/Full/_archer_tower_LVL_${lvl}.fbx`,
      stormMonolith: (lvl) => `assets/tower/fbx/Full/_Wizard_tower_LVL_${lvl}.fbx`,
      voidReaper: (lvl) => `assets/tower/fbx/Full/_Poison_tower_LVL_${lvl}.fbx`
    }

    Object.entries(towerFiles).forEach(([type, getPath]) => {
      for (let lvl = 1; lvl <= 4; lvl++) {
        const path = getPath(lvl)
        fbxLoader.load(path, (fbx) => {
          const box = new THREE.Box3().setFromObject(fbx)
          const size = box.getSize(new THREE.Vector3())
          const targetHeight = 2.9 + lvl * 0.25
          const s = size.y > 0 ? (targetHeight / size.y) : 0.015
          fbx.scale.set(s, s, s)
          fbx.position.y = -box.min.y * s

          fbx.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true
              child.receiveShadow = true
              child.material = new THREE.MeshStandardMaterial({
                map: towerTex,
                roughness: 0.7,
                metalness: 0.15
              })
            }
          })

          this.fbxTowers[type][lvl] = fbx
          if (window.game && window.game.refreshTowerModels) {
            window.game.refreshTowerModels(type)
          }
        }, undefined, (e) => console.warn(`Tower FBX load fallback ${path}:`, e))
      }
    })
  }

  initAnimationLoader() {
    if (typeof THREE.GLTFLoader !== 'function') return
    const loader = new THREE.GLTFLoader()

    // 1. Load Mannequin character for the summoned Legendary Hero
    loader.load('assets/animation/KayKit_Character_Animations_1.1/Mannequin Character/characters/Mannequin_Medium.glb', (gltf) => {
      this.heroModel = gltf.scene
      console.log("Hero Mannequin character loaded successfully")
      if (window.game && window.game.refreshHeroModel) {
        window.game.refreshHeroModel()
      }
    }, undefined, (e) => console.warn("Hero character load fallback:", e))

    // 2. Load KayKit skeletal animation clips (spellcasting, attacks, idle)
    loader.load('assets/animation/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_CombatRanged.glb', (gltf) => {
      if (gltf.animations) this.heroClips.push(...gltf.animations)
    }, undefined, (e) => {})

    loader.load('assets/animation/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_CombatMelee.glb', (gltf) => {
      if (gltf.animations) this.heroClips.push(...gltf.animations)
    }, undefined, (e) => {})

    loader.load('assets/animation/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb', (gltf) => {
      if (gltf.animations) this.heroClips.push(...gltf.animations)
    }, undefined, (e) => {})
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
  // HEROES / TOWERS (3D FBX MODELS + LEVELS)
  // ==========================================

  // Universal Tower Creator with Level-based model selection
  createTowerModel(type, level = 1) {
    const lvl = Math.min(4, Math.max(1, level))
    switch (type) {
      case 'ballista': return this.createBallista(lvl)
      case 'pyromancer': return this.createPyromancer(lvl)
      case 'frostPylon': return this.createFrostPylon(lvl)
      case 'stormMonolith': return this.createStormMonolith(lvl)
      case 'voidReaper': return this.createVoidReaper(lvl)
      default: return this.createPyromancer(lvl)
    }
  }

  // 1. IGNIS, THE PYROMANCER (Cannon Tower from assets)
  createPyromancer(level = 1) {
    const group = new THREE.Group()
    const lvl = Math.min(4, Math.max(1, level))

    if (this.fbxTowers.pyromancer && this.fbxTowers.pyromancer[lvl]) {
      const fbxClone = this.fbxTowers.pyromancer[lvl].clone(true)
      group.add(fbxClone)

      // Crown with fiery furnace core & 3 orbiting flame motes
      const flameCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), this.materials.fireRuby)
      flameCore.position.set(0, 3.2 + lvl * 0.22, 0)
      group.add(flameCore)
      group.coreCrystal = flameCore

      const sparks = []
      for (let i = 0; i < 3; i++) {
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), this.materials.fireRuby)
        group.add(spark)
        sparks.push(spark)
      }
      group.sparks = sparks
      group.modelType = 'pyromancer'
      group.level = lvl
      return group
    }

    // Procedural Fallback
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.35, 8), this.materials.darkStone)
    base.position.y = 0.175
    base.castShadow = true
    group.add(base)
    const rune = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 8), this.materials.gold)
    rune.position.y = 0.38
    group.add(rune)
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.7 }))
    robe.position.y = 0.95
    robe.castShadow = true
    group.add(robe)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshStandardMaterial({ color: 0x221111, roughness: 0.8 }))
    head.position.y = 1.6
    group.add(head)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.04), eyeMat)
    eye1.position.set(0.08, 1.62, 0.18)
    const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.04), eyeMat)
    eye2.position.set(-0.08, 1.62, 0.18)
    group.add(eye1)
    group.add(eye2)
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 8), this.materials.wood)
    staff.position.set(0.38, 1.1, 0.2)
    staff.rotation.z = -0.1
    group.add(staff)
    const flameCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), this.materials.fireRuby)
    flameCore.position.set(0.42, 2.0, 0.2)
    group.add(flameCore)
    group.coreCrystal = flameCore
    const sparks = []
    for (let i = 0; i < 3; i++) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), this.materials.fireRuby)
      group.add(spark)
      sparks.push(spark)
    }
    group.sparks = sparks
    return group
  }

  // 2. IRON PIERCER (Ballista Tower from assets)
  createBallista(level = 1) {
    const group = new THREE.Group()
    const lvl = Math.min(4, Math.max(1, level))

    if (this.fbxTowers.ballista && this.fbxTowers.ballista[lvl]) {
      const fbxClone = this.fbxTowers.ballista[lvl].clone(true)
      group.add(fbxClone)
      group.turret = fbxClone
      group.modelType = 'ballista'
      group.level = lvl
      return group
    }

    // Procedural Fallback
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.25, 6), this.materials.wood)
    base.position.y = 0.125
    group.add(base)
    const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.15, 12), this.materials.iron)
    gear.position.y = 0.3
    group.add(gear)
    const turret = new THREE.Group()
    turret.position.y = 0.5
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 1.4), this.materials.wood)
    stock.position.z = 0.1
    stock.castShadow = true
    turret.add(stock)
    const bowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.15), this.materials.iron)
    bowLeft.position.set(-0.4, 0.08, 0.5)
    bowLeft.rotation.y = 0.35
    turret.add(bowLeft)
    const bowRight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.15), this.materials.iron)
    bowRight.position.set(0.4, 0.08, 0.5)
    bowRight.rotation.y = -0.35
    turret.add(bowRight)
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

  // 3. GLACIAL SPIRE (Archer Watchtower from assets)
  createFrostPylon(level = 1) {
    const group = new THREE.Group()
    const lvl = Math.min(4, Math.max(1, level))

    if (this.fbxTowers.frostPylon && this.fbxTowers.frostPylon[lvl]) {
      const fbxClone = this.fbxTowers.frostPylon[lvl].clone(true)
      group.add(fbxClone)

      // Crown with floating glacial spire & orbiting shards
      const spireGeo = new THREE.OctahedronGeometry(0.45, 0)
      spireGeo.scale(0.8, 2.0, 0.8)
      const spire = new THREE.Mesh(spireGeo, this.materials.frostCrystal)
      spire.position.y = 3.3 + lvl * 0.22
      spire.castShadow = true
      group.add(spire)
      group.spire = spire

      const shards = []
      for (let i = 0; i < 4; i++) {
        const shardGeo = new THREE.ConeGeometry(0.12, 0.45, 4)
        const shard = new THREE.Mesh(shardGeo, this.materials.frostCrystal)
        group.add(shard)
        shards.push(shard)
      }
      group.shards = shards
      group.modelType = 'frostPylon'
      group.level = lvl
      return group
    }

    // Procedural Fallback
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.35, 6), this.materials.darkStone)
    base.position.y = 0.175
    group.add(base)
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.1, 6), this.materials.frostCrystal)
    disc.position.y = 0.38
    group.add(disc)
    const spireGeo = new THREE.OctahedronGeometry(0.65, 0)
    spireGeo.scale(0.8, 2.2, 0.8)
    const spire = new THREE.Mesh(spireGeo, this.materials.frostCrystal)
    spire.position.y = 1.6
    spire.castShadow = true
    group.add(spire)
    group.spire = spire
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

  // 4. TEMPEST MONOLITH (Wizard Tower from assets)
  createStormMonolith(level = 1) {
    const group = new THREE.Group()
    const lvl = Math.min(4, Math.max(1, level))

    if (this.fbxTowers.stormMonolith && this.fbxTowers.stormMonolith[lvl]) {
      const fbxClone = this.fbxTowers.stormMonolith[lvl].clone(true)
      group.add(fbxClone)

      // High-voltage lightning orb crowning wizard tower
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), this.materials.stormElectric)
      orb.position.set(0, 3.4 + lvl * 0.22, 0)
      group.add(orb)
      group.orb = orb
      group.modelType = 'stormMonolith'
      group.level = lvl
      return group
    }

    // Procedural Fallback
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.3, 8), this.materials.darkStone)
    base.position.y = 0.15
    group.add(base)
    for (const offset of [-0.3, 0.3]) {
      const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.7, 6), this.materials.iron)
      prong.position.set(offset, 1.0, 0)
      group.add(prong)
      for (let c = 0; c < 3; c++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 12), this.materials.gold)
        coil.position.set(offset, 0.6 + c * 0.35, 0)
        coil.rotation.x = Math.PI / 2
        group.add(coil)
      }
    }
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), this.materials.stormElectric)
    orb.position.set(0, 1.6, 0)
    group.add(orb)
    group.orb = orb
    return group
  }

  // 5. SHADOW WARDEN (Poison Spire Tower from assets)
  createVoidReaper(level = 1) {
    const group = new THREE.Group()
    const lvl = Math.min(4, Math.max(1, level))

    if (this.fbxTowers.voidReaper && this.fbxTowers.voidReaper[lvl]) {
      const fbxClone = this.fbxTowers.voidReaper[lvl].clone(true)
      group.add(fbxClone)

      // Void portal ring at base
      const portal = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 24), this.materials.voidPurple)
      portal.rotation.x = Math.PI / 2
      portal.position.y = 0.08
      group.add(portal)

      // Dual floating void scythes orbiting pinnacle
      const scythe1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16, Math.PI), this.materials.voidPurple)
      scythe1.position.set(0.65, 3.2 + lvl * 0.22, 0)
      scythe1.rotation.z = Math.PI / 3

      const scythe2 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16, Math.PI), this.materials.voidPurple)
      scythe2.position.set(-0.65, 3.2 + lvl * 0.22, 0)
      scythe2.rotation.z = -Math.PI / 3

      group.add(scythe1)
      group.add(scythe2)
      group.scythes = [scythe1, scythe2]
      group.modelType = 'voidReaper'
      group.level = lvl
      return group
    }

    // Procedural Fallback
    const portal = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 8, 24), this.materials.voidPurple)
    portal.rotation.x = Math.PI / 2
    portal.position.y = 0.08
    group.add(portal)
    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x110c1f, roughness: 0.9 }))
    cowl.position.y = 1.1
    group.add(cowl)
    const voidSoul = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), this.materials.voidPurple)
    voidSoul.position.set(0, 1.4, 0.05)
    group.add(voidSoul)
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

  // ==========================================
  // DESKTOP GLTF/GLB MONSTER & SCENERY ASSETS
  // ==========================================

  // Imp Monster (3 Visual Texture Variations from desktop pack)
  // variant: 1 (Red Magma), 2 (Green Earth/Forest), 3 (Blue/Cyan Frost/Spectral)
  createImp(variant = 1) {
    if (this.gltfModels.imp) {
      const clone = this.cloneWithSkeleton(this.gltfModels.imp)
      clone.scale.set(0.65, 0.65, 0.65)

      const texture = this.charTextures.imp[variant] || this.charTextures.imp[1]

      clone.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (child.material) {
            child.material = child.material.clone()
            if (texture) {
              child.material.map = texture
            }
            child.material.skinning = true
            child.material.needsUpdate = true
          }
        }
      })
      const wrapper = new THREE.Group()
      wrapper.add(clone)
      wrapper.innerModel = clone
      wrapper.modelType = 'imp'
      wrapper.variant = variant
      return wrapper
    }
    // Fallback procedural imp
    return this.createGoblin()
  }

  // Puglin Monster (3 Visual Texture Variations from desktop pack)
  // variant: 1 (Red Ironclad), 2 (Green Swift/Toxic), 3 (Blue Striped Mystic)
  createPuglin(variant = 1) {
    if (this.gltfModels.puglin) {
      const clone = this.cloneWithSkeleton(this.gltfModels.puglin)
      clone.scale.set(0.75, 0.75, 0.75)

      const texture = this.charTextures.puglin[variant] || this.charTextures.puglin[1]

      clone.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (child.material) {
            child.material = child.material.clone()
            if (texture) {
              child.material.map = texture
            }
            child.material.skinning = true
            child.material.needsUpdate = true
          }
        }
      })
      const wrapper = new THREE.Group()
      wrapper.add(clone)
      wrapper.innerModel = clone
      wrapper.modelType = 'puglin'
      wrapper.variant = variant
      return wrapper
    }
    // Fallback procedural ogre
    return this.createOgre()
  }

  // Wave 5 Boss: Colossal Puglin Warmaster
  createBossPuglinChieftain() {
    if (this.gltfModels.puglin) {
      const boss = this.createPuglin(1)
      boss.scale.set(1.9, 1.9, 1.9)
      this.makeElite(boss, 'Juggernaut')
      return boss
    }
    return this.createBossBoneGolem()
  }

  // Wave 10 Boss: Arch-Demon Imp Fiendlord
  createBossImpFiendlord() {
    if (this.gltfModels.imp) {
      const boss = this.createImp(1)
      boss.scale.set(1.85, 1.85, 1.85)
      this.makeElite(boss, 'Vampiric')
      return boss
    }
    return this.createBossDragon()
  }

  // Wave 15 Boss: Malakor the Void Titan Puglin
  createBossVoidBehemoth() {
    if (this.gltfModels.puglin) {
      const boss = this.createPuglin(3)
      boss.scale.set(2.4, 2.4, 2.4)
      this.makeElite(boss, 'Shielded')
      return boss
    }
    return this.createBossVoidArchon()
  }

  // LEGENDARY SUMMONED HERO: CELESTIAL ARCHON (ANIMATED 3D CHARACTER)
  createCelestialArchon() {
    const group = new THREE.Group()
    group.scale.set(1.5, 1.5, 1.5)

    if (this.heroModel) {
      const heroClone = this.cloneWithSkeleton(this.heroModel)
      heroClone.scale.set(1.2, 1.2, 1.2)
      heroClone.position.y = 0

      // Radiant Celestial Gold Shader
      heroClone.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          child.material = this.materials.gold
        }
      })
      group.add(heroClone)

      // Play skeletal animation from KayKit animation pack!
      if (this.heroClips && this.heroClips.length > 0) {
        const mixer = new THREE.AnimationMixer(heroClone)
        const spellClip = this.heroClips.find(c =>
          c.name.includes('Spellcasting') ||
          c.name.includes('Magic') ||
          c.name.includes('Spin') ||
          c.name.includes('Attack')
        ) || this.heroClips[0]

        if (spellClip) {
          const action = mixer.clipAction(spellClip)
          action.play()
          group.mixer = mixer
          if (window.game && window.game.animationMixers) {
            window.game.animationMixers.push(mixer)
          }
        }
      }
    } else {
      // Fallback procedural cylinder body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.4, 8), this.materials.gold)
      body.position.y = 1.0
      body.castShadow = true
      group.add(body)
    }

    // Halo
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16), new THREE.MeshBasicMaterial({ color: 0xffea00 }))
    halo.position.set(0, 2.3, 0)
    halo.rotation.x = Math.PI / 2
    group.add(halo)

    // Glowing Golden Wings (Left & Right)
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffea55,
      emissive: 0xffbb00,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.85
    })
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), wingMat)
    wingL.position.set(-0.75, 1.5, -0.2)
    wingL.rotation.z = 0.45

    const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), wingMat)
    wingR.position.set(0.75, 1.5, -0.2)
    wingR.rotation.z = -0.45
    group.add(wingL)
    group.add(wingR)

    // Giant Holy Sun Blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff }))
    blade.position.set(0.65, 1.3, 0.3)
    blade.rotation.x = Math.PI / 8
    group.add(blade)

    // Sacred Light Column Aura
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 12, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffea00,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide
      })
    )
    beam.position.y = 5.5
    group.add(beam)
    group.beam = beam

    return group
  }

  createPineTree() {
    const group = new THREE.Group()
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6), this.materials.wood)
    trunk.position.y = 0.7
    trunk.castShadow = true
    group.add(trunk)
    for (let t = 0; t < 3; t++) {
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(1.3 - t * 0.3, 1.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x1d4726, roughness: 0.85 })
      )
      foliage.position.y = 1.5 + t * 0.85
      foliage.castShadow = true
      group.add(foliage)
    }
    return group
  }

  createRockProp() {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.75 + Math.random() * 0.4),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
    )
    rock.position.y = 0.4
    rock.castShadow = true
    return rock
  }

  // SCENERY DECORATOR (TREES, ROCKS, BUSHES FROM ASSETS)
  spawnSceneryDecorations(scene, waypoints) {
    if (!scene) return

    // If already populated with procedural, clean them up for GLTF upgrade
    if (this.sceneryGroup) {
      scene.remove(this.sceneryGroup)
    }
    this.sceneryGroup = new THREE.Group()
    scene.add(this.sceneryGroup)

    const bounds = 28
    const numProps = 36

    for (let i = 0; i < numProps; i++) {
      const rx = (Math.random() - 0.5) * (bounds * 2)
      const rz = (Math.random() - 0.5) * (bounds * 2)
      const p = new THREE.Vector3(rx, 0, rz)

      // Skip if too close to path waypoints
      let nearPath = false
      for (const wp of waypoints) {
        if (p.distanceTo(wp) < 3.2) {
          nearPath = true
          break
        }
      }
      if (nearPath) continue

      let propModel = null
      const pick = Math.random()
      if (pick < 0.5) {
        if (this.gltfModels.tree) {
          propModel = this.gltfModels.tree.clone(true)
          const scale = 0.85 + Math.random() * 0.5
          propModel.scale.set(scale, scale, scale)
        } else {
          propModel = this.createPineTree()
        }
      } else if (pick < 0.8) {
        if (this.gltfModels.rock) {
          propModel = this.gltfModels.rock.clone(true)
          const scale = 0.65 + Math.random() * 0.6
          propModel.scale.set(scale, scale, scale)
        } else {
          propModel = this.createRockProp()
        }
      } else {
        if (this.gltfModels.bush) {
          propModel = this.gltfModels.bush.clone(true)
          const scale = 0.55 + Math.random() * 0.4
          propModel.scale.set(scale, scale, scale)
        } else {
          propModel = this.createRockProp()
        }
      }

      if (propModel) {
        propModel.position.set(rx, 0, rz)
        propModel.rotation.y = Math.random() * Math.PI * 2
        propModel.traverse(c => {
          if (c.isMesh) {
            c.castShadow = true
            c.receiveShadow = true
          }
        })
        this.sceneryGroup.add(propModel)
      }
    }
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
