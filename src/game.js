// Arcane Nexus - Main 3D Game Controller (Three.js)

class GameController {
  constructor() {
    this.container = document.getElementById('canvas-container')
    this.damageContainer = document.getElementById('damage-numbers')
    this.speed = 1
    this.paused = false
    this.timeScale = 1.0

    // Game State
    this.state = {
      wave: 1,
      lives: 3,
      maxLives: 3,
      gold: 240,
      score: 0,
      totalKills: 0,
      heroSouls: 0,
      heroSoulsRequired: 20,
      relics: {},
      selectedHeroType: 'pyromancer',
      selectedTower: null,
      onLivesChanged: (l) => this.updateLivesUI(l)
    }

    // Hero Tower Definitions
    this.heroCatalog = {
      pyromancer: {
        name: 'Ignis, The Pyromancer',
        cost: 80,
        range: 6.5,
        fireRate: 1.1,
        damage: 42,
        damageType: DAMAGE_TYPES.FIRE,
        critChance: 0.15,
        desc: 'Launches exploding fireballs that scorch targets with persistent Burn damage.'
      },
      ballista: {
        name: 'Iron Piercer (Ballista)',
        cost: 95,
        range: 8.5,
        fireRate: 0.8,
        damage: 85,
        damageType: DAMAGE_TYPES.PHYSICAL,
        armorPen: 0.35,
        critChance: 0.25,
        desc: 'Heavy kinetic bolt thrower with armor penetration and piercing damage.'
      },
      frostPylon: {
        name: 'Glacial Spire',
        cost: 75,
        range: 6.0,
        fireRate: 2.5,
        damage: 18,
        damageType: DAMAGE_TYPES.FROST,
        critChance: 0.05,
        desc: 'Channels freezing ice beams that slow enemies and make them Brittle to all damage.'
      },
      stormMonolith: {
        name: 'Tempest Monolith',
        cost: 110,
        range: 7.0,
        fireRate: 0.9,
        damage: 64,
        damageType: DAMAGE_TYPES.LIGHTNING,
        critChance: 0.20,
        desc: 'Electrocutes targets with high-voltage chain lightning that stuns foes.'
      },
      voidReaper: {
        name: 'Shadow Warden',
        cost: 130,
        range: 5.5,
        fireRate: 1.2,
        damage: 75,
        damageType: DAMAGE_TYPES.VOID,
        critChance: 0.30,
        desc: 'Deals true void damage, executing wounded foes and siphoning extra gold.'
      }
    }

    // Waypoints for the 3D winding path
    this.waypoints = [
      new THREE.Vector3(-14, 0, -10),
      new THREE.Vector3(-6, 0, -10),
      new THREE.Vector3(-6, 0, -3),
      new THREE.Vector3(6, 0, -3),
      new THREE.Vector3(6, 0, 5),
      new THREE.Vector3(-4, 0, 5),
      new THREE.Vector3(-4, 0, 11),
      new THREE.Vector3(12, 0, 11),
      new THREE.Vector3(12, 0, 0) // The Nexus Checkpoint
    ]

    this.enemies = []
    this.towers = []
    this.projectiles = []
    this.particles = []

    this.waveManager = new WaveManager(this.state)
    this.currentWaveConfig = null
    this.waveActive = false
    this.spawnTimer = 0
    this.spawnIndex = 0

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

    this.initThree()
    this.initMap()
    this.initNexus()
    this.initGhostPreview()
    this.initEventListeners()
    this.updateHUD()

    // Clock
    this.clock = new THREE.Clock()
    this.animate = this.animate.bind(this)
    requestAnimationFrame(this.animate)
  }

  initThree() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x111622)
    this.scene.fog = new THREE.FogExp2(0x111622, 0.015)

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.set(0, 32, 28)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)

    // OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.minDistance = 12
    this.controls.maxDistance = 65
    this.controls.target.set(0, 0, 0)

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0xdde5ff, 0.65)
    this.scene.add(this.ambientLight)

    this.dirLight = new THREE.DirectionalLight(0xfff3db, 1.2)
    this.dirLight.position.set(20, 35, 15)
    this.dirLight.castShadow = true
    this.dirLight.shadow.mapSize.width = 2048
    this.dirLight.shadow.mapSize.height = 2048
    this.dirLight.shadow.camera.near = 0.5
    this.dirLight.shadow.camera.far = 120
    const d = 26
    this.dirLight.shadow.camera.left = -d
    this.dirLight.shadow.camera.right = d
    this.dirLight.shadow.camera.top = d
    this.dirLight.shadow.camera.bottom = -d
    this.scene.add(this.dirLight)

    // Secondary colored rim light
    this.rimLight = new THREE.DirectionalLight(0x7733ff, 0.45)
    this.rimLight.position.set(-20, 15, -15)
    this.scene.add(this.rimLight)
  }

  initMap() {
    // Ground Terrain Plane
    const groundGeo = new THREE.PlaneGeometry(70, 70)
    const groundMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.getGroundTexture('forest'),
      roughness: 0.9,
      metalness: 0.1
    })
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat)
    this.groundMesh.rotation.x = -Math.PI / 2
    this.groundMesh.position.y = -0.01
    this.groundMesh.receiveShadow = true
    this.scene.add(this.groundMesh)

    // Build 3D Flagstone Path Mesh along Waypoints
    this.pathMeshes = []
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const p1 = this.waypoints[i]
      const p2 = this.waypoints[i + 1]
      const dist = p1.distanceTo(p2)
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)

      const roadGeo = new THREE.BoxGeometry(2.4, 0.1, dist + 2.4)
      const roadMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.getPathTexture('forest'),
        roughness: 0.8
      })
      const road = new THREE.Mesh(roadGeo, roadMat)
      road.position.set(mid.x, 0.05, mid.z)
      road.lookAt(new THREE.Vector3(p2.x, 0.05, p2.z))
      road.receiveShadow = true
      this.scene.add(road)
      this.pathMeshes.push(road)
    }

    // Portal Spawner Arch at Start
    const archGroup = new THREE.Group()
    const p0 = this.waypoints[0]
    archGroup.position.set(p0.x, 0, p0.z)

    const archPillar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), modelFactory.materials.stone)
    archPillar1.position.set(-1.4, 1.5, 0)
    const archPillar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), modelFactory.materials.stone)
    archPillar2.position.set(1.4, 1.5, 0)

    const archTop = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.8), modelFactory.materials.stone)
    archTop.position.set(0, 3.1, 0)

    // Portal vortex disc
    const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16), new THREE.MeshBasicMaterial({
      color: 0x9900ff,
      side: THREE.DoubleSide
    }))
    portalDisc.position.set(0, 1.5, 0)
    portalDisc.rotation.y = Math.PI / 2

    archGroup.add(archPillar1)
    archGroup.add(archPillar2)
    archGroup.add(archTop)
    archGroup.add(portalDisc)
    this.scene.add(archGroup)

    // Plant 3D scenery props (trees, rocks, bushes) around map borders
    setTimeout(() => {
      modelFactory.spawnSceneryDecorations(this.scene, this.waypoints)
    }, 150)
  }

  initNexus() {
    this.nexus = modelFactory.createNexus()
    const endpoint = this.waypoints[this.waypoints.length - 1]
    this.nexus.position.set(endpoint.x, 0, endpoint.z)
    this.scene.add(this.nexus)
  }

  initGhostPreview() {
    this.ghostGroup = new THREE.Group()
    this.ghostGroup.visible = false

    // Range preview circle
    const rangeGeo = new THREE.RingGeometry(0.1, 6.0, 32)
    this.ghostRangeMat = new THREE.MeshBasicMaterial({
      color: 0x00d0ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    })
    this.ghostRangeMesh = new THREE.Mesh(rangeGeo, this.ghostRangeMat)
    this.ghostRangeMesh.rotation.x = -Math.PI / 2
    this.ghostRangeMesh.position.y = 0.08
    this.ghostGroup.add(this.ghostRangeMesh)

    // Placement ring base
    const ringGeo = new THREE.RingGeometry(0.9, 1.15, 24)
    this.ghostRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    })
    this.ghostRingMesh = new THREE.Mesh(ringGeo, this.ghostRingMat)
    this.ghostRingMesh.rotation.x = -Math.PI / 2
    this.ghostRingMesh.position.y = 0.1
    this.ghostGroup.add(this.ghostRingMesh)

    this.scene.add(this.ghostGroup)
  }

  // ==========================================
  // INPUT & PLACEMENT LOGIC
  // ==========================================
  initEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
      this.updatePlacementGhost()
    })

    window.addEventListener('click', (e) => {
      // Ignore clicks on UI overlay
      if (e.target.closest('#ui-layer') || e.target.closest('.modal-backdrop')) return

      this.raycaster.setFromCamera(this.mouse, this.camera)
      const worldPos = new THREE.Vector3()
      this.raycaster.ray.intersectPlane(this.plane, worldPos)

      if (worldPos) {
        // Check if clicking on an existing tower
        const clickedTower = this.findTowerAt(worldPos)
        if (clickedTower) {
          this.selectTower(clickedTower)
          return
        }

        // Otherwise attempt placing a new tower
        if (this.state.selectedHeroType) {
          this.tryPlaceHero(worldPos)
        }
      }
    })

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === '1') this.selectHeroCatalog('pyromancer')
      if (e.key === '2') this.selectHeroCatalog('ballista')
      if (e.key === '3') this.selectHeroCatalog('frostPylon')
      if (e.key === '4') this.selectHeroCatalog('stormMonolith')
      if (e.key === '5') this.selectHeroCatalog('voidReaper')
      if (e.key === 'h' || e.key === 'H') this.callLegendaryHero()
      if (e.key === ' ' || e.key === 'Spacebar') {
        if (!this.waveActive) this.startNextWave()
      }
    })
  }

  findTowerAt(pos) {
    for (const t of this.towers) {
      if (t.position.distanceTo(pos) < 1.4) return t
    }
    return null
  }

  selectHeroCatalog(type) {
    this.state.selectedHeroType = type
    document.querySelectorAll('.hero-card').forEach(c => {
      c.classList.toggle('active', c.dataset.hero === type)
    })
    this.updateGhostRange()
  }

  updateGhostRange() {
    const heroInfo = this.heroCatalog[this.state.selectedHeroType]
    if (!heroInfo) return
    const range = heroInfo.range * (1 + (this.state.relics.globalRangeBonus || 0))
    this.ghostRangeMesh.geometry.dispose()
    this.ghostRangeMesh.geometry = new THREE.RingGeometry(0.1, range, 32)
  }

  updatePlacementGhost() {
    if (!this.state.selectedHeroType) {
      this.ghostGroup.visible = false
      return
    }

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const worldPos = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(this.plane, worldPos)

    if (worldPos) {
      this.ghostGroup.position.set(worldPos.x, 0, worldPos.z)
      this.ghostGroup.visible = true

      const valid = this.isPlacementValid(worldPos)
      const color = valid ? 0x00ff88 : 0xff3333
      this.ghostRingMat.color.setHex(color)
      this.ghostRangeMat.color.setHex(valid ? 0x00d0ff : 0xff3333)
    }
  }

  isPlacementValid(pos) {
    // Check map bounds
    if (Math.abs(pos.x) > 28 || Math.abs(pos.z) > 28) return false

    // Check distance to Nexus
    const nexusPos = this.waypoints[this.waypoints.length - 1]
    if (pos.distanceTo(nexusPos) < 3.2) return false

    // Check distance to Spawn Arch
    if (pos.distanceTo(this.waypoints[0]) < 2.5) return false

    // Check distance to Path segments
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const p1 = this.waypoints[i]
      const p2 = this.waypoints[i + 1]
      const distToSegment = this.pointToSegmentDistance(pos, p1, p2)
      if (distToSegment < 1.8) return false
    }

    // Check distance to other towers
    for (const t of this.towers) {
      if (pos.distanceTo(t.position) < 2.0) return false
    }

    return true
  }

  pointToSegmentDistance(p, a, b) {
    const ab = new THREE.Vector3().subVectors(b, a)
    const ap = new THREE.Vector3().subVectors(p, a)
    const lenSq = ab.lengthSq()
    if (lenSq === 0) return ap.length()

    const t = Math.max(0, Math.min(1, ap.dot(ab) / lenSq))
    const proj = new THREE.Vector3().copy(a).add(ab.multiplyScalar(t))
    return p.distanceTo(proj)
  }

  tryPlaceHero(pos) {
    const heroInfo = this.heroCatalog[this.state.selectedHeroType]
    if (!heroInfo) return

    if (this.state.gold < heroInfo.cost) {
      this.showNotification("Not enough Arcane Gold!", '#ff5555')
      return
    }

    if (!this.isPlacementValid(pos)) {
      this.showNotification("Cannot place here!", '#ffaa33')
      return
    }

    // Spend gold
    this.state.gold -= heroInfo.cost
    this.updateHUD()

    // Instantiate 3D Model
    let model = null
    switch (this.state.selectedHeroType) {
      case 'pyromancer': model = modelFactory.createPyromancer(); break
      case 'ballista': model = modelFactory.createBallista(); break
      case 'frostPylon': model = modelFactory.createFrostPylon(); break
      case 'stormMonolith': model = modelFactory.createStormMonolith(); break
      case 'voidReaper': model = modelFactory.createVoidReaper(); break
    }

    model.position.set(pos.x, 0, pos.z)
    this.scene.add(model)

    // Tower instance logic
    const tower = {
      type: this.state.selectedHeroType,
      name: heroInfo.name,
      model,
      position: new THREE.Vector3(pos.x, 0, pos.z),
      level: 1,
      xp: 0,
      kills: 0,
      totalDamage: 0,
      cooldown: 0,
      baseDamage: heroInfo.damage,
      baseRange: heroInfo.range,
      baseFireRate: heroInfo.fireRate,
      damageType: heroInfo.damageType,
      armorPen: heroInfo.armorPen || 0,
      critChance: heroInfo.critChance || 0.1,
      critMult: 1.8,
      grantXp: (amount) => this.grantHeroXp(tower, amount)
    }

    this.towers.push(tower)
    soundSystem.playTone(520, 'sine', 0.25, 800)
    this.showNotification(`${heroInfo.name} summoned!`, '#00ff88')
    this.selectTower(tower)
  }

  // Hero Leveling Logic
  grantHeroXp(tower, amount) {
    tower.xp += amount
    const lvlInfo = HERO_LEVEL_DATA[tower.level]
    if (lvlInfo && tower.xp >= lvlInfo.xpRequired && tower.level < 5) {
      tower.level++
      tower.xp -= lvlInfo.xpRequired
      soundSystem.playLevelUp()
      combatEngine.spawnFloatingText(tower.position, `LEVEL UP! Lv.${tower.level}`, '#ffdd00', true)
      this.showNotification(`${tower.name} reached Level ${tower.level}!`, '#ffea00')

      // Visual upgrade aura
      const lvlAura = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1.2, 16),
        new THREE.MeshBasicMaterial({ color: 0xffea00, side: THREE.DoubleSide })
      )
      lvlAura.rotation.x = -Math.PI / 2
      lvlAura.position.set(tower.position.x, 0.15, tower.position.z)
      this.scene.add(lvlAura)
      setTimeout(() => this.scene.remove(lvlAura), 1500)

      this.updateInspectPanel()
    }
  }

  selectTower(tower) {
    this.state.selectedTower = tower
    this.updateInspectPanel()
  }

  // ==========================================
  // WAVE EXECUTION & ENEMY SPAWNING
  // ==========================================
  startNextWave() {
    if (this.waveActive) return
    this.waveActive = true
    this.currentWaveConfig = this.waveManager.generateWaveConfig(this.state.wave)
    this.spawnTimer = 0
    this.spawnIndex = 0

    if (this.currentWaveConfig.isBossWave) {
      soundSystem.playBossRoar()
      this.showNotification(`⚠️ BOSS ENCOUNTER: ${this.currentWaveConfig.bossType}!`, '#ff3333')
    } else {
      this.showNotification(`Wave ${this.state.wave} Commenced!`, '#00d0ff')
    }

    this.updateHUD()
  }

  spawnEnemy(queueItem) {
    const enemyData = this.waveManager.createEnemyData(queueItem, this.currentWaveConfig.difficultyScale)

    // Create 3D Model
    let model = null
    if (queueItem.type === 'boss') {
      if (queueItem.bossType === 'BoneGolem') model = modelFactory.createBossBoneGolem()
      else if (queueItem.bossType === 'Dragon') model = modelFactory.createBossDragon()
      else model = modelFactory.createBossVoidArchon()
    } else {
      switch (queueItem.type) {
        case 'goblin': model = modelFactory.createGoblin(); break
        case 'footman': model = modelFactory.createFootman(); break
        case 'imp_magma': model = modelFactory.createImp(0xff4411); break
        case 'imp_grounded': model = modelFactory.createImp(0xaa9944); break
        case 'puglin_ironclad': model = modelFactory.createPuglin(); break
        case 'banshee': model = modelFactory.createBanshee(); break
      }
    }
    if (!model) model = modelFactory.createGoblin()

    if (queueItem.isElite) {
      modelFactory.makeElite(model, queueItem.affix?.name)
    }

    const startPos = this.waypoints[0]
    model.position.set(startPos.x, 0, startPos.z)
    this.scene.add(model)

    const enemy = {
      ...enemyData,
      model,
      position: new THREE.Vector3(startPos.x, 0, startPos.z),
      currentWaypointIndex: 0,
      tParam: 0,
      alive: true
    }

    this.enemies.push(enemy)
  }

  // ==========================================
  // COMBAT & PROJECTILE ACTIONS
  // ==========================================
  updateTowers(dt) {
    for (const tower of this.towers) {
      tower.cooldown -= dt

      // Calculate effective range and fire rate with relics
      const rangeBonus = 1 + (this.state.relics.globalRangeBonus || 0)
      const effectiveRange = tower.baseRange * rangeBonus * (HERO_LEVEL_DATA[tower.level].rangeMult)
      const speedBonus = 1 + (this.state.relics.globalAttackSpeed || 0)
      const effectiveFireRate = tower.baseFireRate * speedBonus * (HERO_LEVEL_DATA[tower.level].speedMult)

      // Animate tower idle components
      if (tower.type === 'pyromancer' && tower.model.sparks) {
        const t = performance.now() * 0.003
        tower.model.sparks.forEach((s, idx) => {
          const ang = t + (idx * Math.PI * 2) / 3
          s.position.set(Math.cos(ang) * 0.6, 1.8 + Math.sin(t * 2 + idx) * 0.15, Math.sin(ang) * 0.6)
        })
      } else if (tower.type === 'frostPylon' && tower.model.shards) {
        const t = performance.now() * 0.002
        tower.model.spire.rotation.y = t
        tower.model.spire.position.y = 1.6 + Math.sin(t * 3) * 0.1
        tower.model.shards.forEach((sh, idx) => {
          const ang = -t * 1.5 + (idx * Math.PI) / 2
          sh.position.set(Math.cos(ang) * 0.9, 1.4 + Math.cos(t * 2 + idx) * 0.2, Math.sin(ang) * 0.9)
          sh.rotation.y = ang
        })
      }

      if (tower.cooldown > 0) continue

      // Target Selection: Enemy furthest along path within range
      let bestTarget = null
      let maxDistTraveled = -1
      for (const e of this.enemies) {
        if (!e.alive) continue
        const dist = tower.position.distanceTo(e.position)
        if (dist <= effectiveRange && e.distanceTraveled > maxDistTraveled) {
          bestTarget = e
          maxDistTraveled = e.distanceTraveled
        }
      }

      if (bestTarget) {
        tower.cooldown = 1.0 / effectiveFireRate
        this.fireTower(tower, bestTarget)
      }
    }
  }

  fireTower(tower, target) {
    const lvlData = HERO_LEVEL_DATA[tower.level]
    const damageMult = lvlData.damageMult
    const rawDamage = tower.baseDamage * damageMult

    // Ballista aim turret
    if (tower.type === 'ballista' && tower.model.turret) {
      tower.model.turret.lookAt(target.position.x, 0.5, target.position.z)
    }

    if (tower.type === 'pyromancer') {
      soundSystem.playFireball()
      this.spawnFireball(tower, target, rawDamage)
    } else if (tower.type === 'ballista') {
      soundSystem.playBallista()
      this.spawnBallistaBolt(tower, target, rawDamage)
    } else if (tower.type === 'frostPylon') {
      soundSystem.playFrostBeam()
      this.channelFrostBeam(tower, target, rawDamage)
    } else if (tower.type === 'stormMonolith') {
      soundSystem.playLightning()
      this.channelChainLightning(tower, target, rawDamage)
    } else if (tower.type === 'voidReaper') {
      soundSystem.playVoidStrike()
      this.strikeVoid(tower, target, rawDamage)
    }
  }

  // 1. Fireball Projectile (Homing + AoE Explosion)
  spawnFireball(tower, target, damage) {
    const geo = new THREE.SphereGeometry(0.25, 8, 8)
    const mat = modelFactory.materials.fireRuby
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(tower.position.x, 1.8, tower.position.z)
    this.scene.add(mesh)

    this.projectiles.push({
      mesh,
      target,
      speed: 16,
      type: 'fireball',
      damage,
      tower,
      update: (dt) => {
        if (!target.alive) {
          this.destroyProjectile(mesh)
          return false
        }
        const dir = new THREE.Vector3().subVectors(target.position, mesh.position)
        const dist = dir.length()
        if (dist < 0.6) {
          // Detonate explosion
          const radius = 2.6 * (1 + (this.state.relics.pyroRadiusBonus || 0))
          for (const e of this.enemies) {
            if (!e.alive) continue
            if (e.position.distanceTo(mesh.position) <= radius) {
              const res = combatEngine.calculateDamage(tower, e, damage, DAMAGE_TYPES.FIRE)
              combatEngine.applyDamage(tower, e, res, soundSystem)
              combatEngine.applyStatus(e, {
                type: 'burn',
                dps: 18 * (1 + (this.state.relics.pyroBurnBonus || 0)),
                duration: 3.5
              })
              tower.totalDamage += res.amount
              if (e.hp <= 0) this.killEnemy(e, tower)
            }
          }
          this.spawnExplosionEffect(mesh.position, 0xff4400, radius)
          this.destroyProjectile(mesh)
          return false
        }
        dir.normalize().multiplyScalar(16 * dt)
        mesh.position.add(dir)
        return true
      }
    })
  }

  // 2. Ballista Piercing Bolt
  spawnBallistaBolt(tower, target, damage) {
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6)
    const mat = modelFactory.materials.iron
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(tower.position.x, 0.9, tower.position.z)
    mesh.lookAt(target.position.x, 0.9, target.position.z)
    mesh.rotateX(Math.PI / 2)
    this.scene.add(mesh)

    const dir = new THREE.Vector3().subVectors(target.position, mesh.position).normalize()
    const pierceLimit = 1 + (this.state.relics.ballistaPierceBonus || 0)
    const hitEnemies = new Set()

    this.projectiles.push({
      mesh,
      speed: 32,
      update: (dt) => {
        mesh.position.addScaledVector(dir, 32 * dt)

        for (const e of this.enemies) {
          if (!e.alive || hitEnemies.has(e)) continue
          if (mesh.position.distanceTo(e.position) < 1.0) {
            hitEnemies.add(e)
            const pen = tower.armorPen + (this.state.relics.ballistaArmorPen || 0)
            const res = combatEngine.calculateDamage(tower, e, damage, DAMAGE_TYPES.PHYSICAL, pen)
            combatEngine.applyDamage(tower, e, res, soundSystem)
            tower.totalDamage += res.amount
            if (e.hp <= 0) this.killEnemy(e, tower)

            if (hitEnemies.size >= pierceLimit) {
              this.destroyProjectile(mesh)
              return false
            }
          }
        }

        if (mesh.position.length() > 45) {
          this.destroyProjectile(mesh)
          return false
        }
        return true
      }
    })
  }

  // 3. Frost Beam (Continuous Beam Channel)
  channelFrostBeam(tower, target, damage) {
    const points = [
      new THREE.Vector3(tower.position.x, 1.6, tower.position.z),
      new THREE.Vector3(target.position.x, 0.8, target.position.z)
    ]
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 8, 0.12, 6, false)
    const mat = modelFactory.materials.frostCrystal
    const beam = new THREE.Mesh(geo, mat)
    this.scene.add(beam)
    setTimeout(() => this.scene.remove(beam), 120)

    const res = combatEngine.calculateDamage(tower, target, damage, DAMAGE_TYPES.FROST)
    combatEngine.applyDamage(tower, target, res, soundSystem)
    combatEngine.applyStatus(target, {
      type: 'slow',
      amount: 0.45 + (this.state.relics.frostSlowBonus || 0),
      duration: 2.0
    })
    combatEngine.applyStatus(target, {
      type: 'brittle',
      mult: 1.35 + (this.state.relics.frostBrittleBonus || 0),
      duration: 2.5
    })
    tower.totalDamage += res.amount
    if (target.hp <= 0) this.killEnemy(target, tower)
  }

  // 4. Chain Lightning
  channelChainLightning(tower, target, damage) {
    let current = target
    let hops = 3 + (this.state.relics.stormChainBonus || 0)
    let currentDmg = damage
    const hitList = new Set([target])

    let prevPos = new THREE.Vector3(tower.position.x, 1.7, tower.position.z)

    while (current && hops > 0) {
      // Draw lightning line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        prevPos,
        new THREE.Vector3(current.position.x, 0.7, current.position.z)
      ])
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffea00, linewidth: 2 })
      const line = new THREE.Line(lineGeo, lineMat)
      this.scene.add(line)
      setTimeout(() => this.scene.remove(line), 100)

      const res = combatEngine.calculateDamage(tower, current, currentDmg, DAMAGE_TYPES.LIGHTNING)
      combatEngine.applyDamage(tower, current, res, soundSystem)
      if (Math.random() < (0.25 + (this.state.relics.stormStunBonus || 0))) {
        combatEngine.applyStatus(current, { type: 'stun', duration: 0.8 })
        combatEngine.spawnFloatingText(current.position, 'STUNNED', '#ffea00', false)
      }
      tower.totalDamage += res.amount
      if (current.hp <= 0) this.killEnemy(current, tower)

      prevPos = new THREE.Vector3(current.position.x, 0.7, current.position.z)
      hops--
      currentDmg *= 0.82

      // Find next chain target
      let nextTarget = null
      let closestDist = 5.5
      for (const e of this.enemies) {
        if (!e.alive || hitList.has(e)) continue
        const d = current.position.distanceTo(e.position)
        if (d < closestDist) {
          closestDist = d
          nextTarget = e
        }
      }
      if (nextTarget) {
        hitList.add(nextTarget)
        current = nextTarget
      } else {
        break
      }
    }
  }

  // 5. Void Reaper Execution
  strikeVoid(tower, target, damage) {
    const res = combatEngine.calculateDamage(tower, target, damage, DAMAGE_TYPES.VOID)
    combatEngine.applyDamage(tower, target, res, soundSystem)
    tower.totalDamage += res.amount

    // Soul slash effect
    const ringGeo = new THREE.RingGeometry(0.3, 0.8, 16)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x9900ff, side: THREE.DoubleSide })
    const slash = new THREE.Mesh(ringGeo, ringMat)
    slash.position.set(target.position.x, 0.8, target.position.z)
    slash.rotation.x = Math.PI / 2
    this.scene.add(slash)
    setTimeout(() => this.scene.remove(slash), 150)

    if (target.hp <= 0) {
      this.state.gold += (this.state.relics.voidGoldBonus || 0)
      this.killEnemy(target, tower)
    }
  }

  destroyProjectile(mesh) {
    this.scene.remove(mesh)
  }

  spawnExplosionEffect(pos, color, radius) {
    const geo = new THREE.RingGeometry(0.2, radius, 24)
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    const ring = new THREE.Mesh(geo, mat)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(pos.x, 0.12, pos.z)
    this.scene.add(ring)

    let scale = 1.0
    const interval = setInterval(() => {
      scale += 0.2
      mat.opacity -= 0.15
      ring.scale.set(scale, scale, 1)
      if (mat.opacity <= 0) {
        clearInterval(interval)
        this.scene.remove(ring)
      }
    }, 30)
  }

  killEnemy(enemy, killerTower) {
    if (!enemy.alive) return
    enemy.alive = false
    this.scene.remove(enemy.model)

    // Gold reward calculation
    const goldMultiplier = this.state.relics.goldMultiplier || 1.0
    const goldEarned = Math.round(enemy.goldReward * goldMultiplier)
    this.state.gold += goldEarned
    this.state.score += goldEarned * 10
    this.state.totalKills++

    // Increment Hero Call-in Gauge
    this.state.heroSouls++
    this.updateHeroSoulUI()

    soundSystem.playGold()
    combatEngine.spawnFloatingText(enemy.position, `+${goldEarned}g`, '#ffd700', false)

    this.updateHUD()
  }

  // ==========================================
  // NEXUS BREACH & 3 LIVES MECHANIC
  // ==========================================
  handleEnemyReachedNexus(enemy) {
    enemy.alive = false
    this.scene.remove(enemy.model)

    // Decrement Life
    this.state.lives--
    soundSystem.playNexusDamage()
    this.triggerScreenShake()
    this.flashRedVignette()

    // Shatter 1 of the 3 Nexus Life Orbs
    const orbIdx = this.state.lives
    if (this.nexus.lifeOrbs && this.nexus.lifeOrbs[orbIdx]) {
      this.scene.remove(this.nexus.lifeOrbs[orbIdx])
      this.nexus.lifeOrbs[orbIdx] = null
    }

    this.updateLivesUI(this.state.lives)
    this.showNotification(`⚠️ NEXUS BREACHED! Lives remaining: ${this.state.lives}`, '#ff2222')

    if (this.state.lives <= 0) {
      this.triggerGameOver()
    }
  }

  triggerScreenShake() {
    let shakeCount = 8
    const origY = this.camera.position.y
    const timer = setInterval(() => {
      this.camera.position.y = origY + (Math.random() - 0.5) * 1.4
      shakeCount--
      if (shakeCount <= 0) {
        clearInterval(timer)
        this.camera.position.y = origY
      }
    }, 40)
  }

  flashRedVignette() {
    const flashEl = document.getElementById('screen-flash')
    if (flashEl) {
      flashEl.style.opacity = '0.5'
      setTimeout(() => { flashEl.style.opacity = '0' }, 350)
    }
  }

  triggerGameOver() {
    this.paused = true
    const modal = document.getElementById('game-over-modal')
    if (modal) {
      document.getElementById('stat-waves').textContent = `${this.state.wave}`
      document.getElementById('stat-kills').textContent = `${this.state.totalKills}`
      document.getElementById('stat-score').textContent = `${this.state.score}`
      modal.style.display = 'flex'
    }
  }

  // Wave Completion & Roguelike Relic Draft
  checkWaveEnd() {
    if (!this.waveActive) return
    const allSpawned = this.spawnIndex >= this.currentWaveConfig.totalEnemies
    const anyAlive = this.enemies.some(e => e.alive)

    if (allSpawned && !anyAlive) {
      this.waveActive = false
      this.enemies = []
      this.state.wave++
      this.state.gold += 35 + this.state.wave * 5
      soundSystem.playDraftOpen()
      this.showNotification(`Wave Cleared! Arcane Draft Available.`, '#00ff88')
      this.openRelicDraft()
    }
  }

  openRelicDraft() {
    const options = this.waveManager.drawRelicOptions()
    const container = document.getElementById('relic-cards')
    container.innerHTML = ''

    options.forEach(relic => {
      const card = document.createElement('div')
      card.className = 'relic-card'
      card.innerHTML = `
        <div class="relic-category">${relic.category}</div>
        <div class="relic-title">${relic.title}</div>
        <div class="relic-desc">${relic.desc}</div>
      `
      card.addEventListener('click', () => {
        relic.apply(this.state)
        document.getElementById('draft-modal').style.display = 'none'
        this.showNotification(`Acquired: ${relic.title}!`, '#00d0ff')
        this.updateHUD()
        this.checkBiomeTransition()
      })
      container.appendChild(card)
    })

    document.getElementById('draft-modal').style.display = 'flex'
  }

  checkBiomeTransition() {
    const levelInfo = this.waveManager.getCurrentLevel(this.state.wave)
    if (levelInfo.biome) {
      this.groundMesh.material.map = TextureGenerator.getGroundTexture(levelInfo.biome)
      this.groundMesh.material.needsUpdate = true
      this.scene.fog.color.setHex(levelInfo.fogColor)
      this.scene.background.setHex(levelInfo.fogColor)
    }
  }

  // ==========================================
  // MAIN ANIMATION LOOP
  // ==========================================
  animate() {
    requestAnimationFrame(this.animate)

    const rawDt = this.clock.getDelta()
    const dt = this.paused ? 0 : Math.min(rawDt, 0.1) * this.speed

    if (dt > 0) {
      // Wave Spawning
      if (this.waveActive && this.currentWaveConfig) {
        this.spawnTimer += dt
        const queue = this.currentWaveConfig.spawnQueue
        while (this.spawnIndex < queue.length && queue[this.spawnIndex].delay <= this.spawnTimer) {
          this.spawnEnemy(queue[this.spawnIndex])
          this.spawnIndex++
        }
      }

      // Update Enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]
        if (!e.alive) {
          this.enemies.splice(i, 1)
          continue
        }

        // Status effects (burn ticks, slow, etc.)
        combatEngine.updateStatuses(e, dt, (burnDmg) => {
          if (e.hp <= 0) this.killEnemy(e, null)
        })

        if (!e.alive) continue

        // Movement along waypoints if not stunned
        if ((e.stunDuration || 0) <= 0) {
          const effectiveSpeed = e.speed * (1 - (e.slowFactor || 0))
          const currentTargetPoint = this.waypoints[e.currentWaypointIndex + 1]

          if (currentTargetPoint) {
            const dir = new THREE.Vector3().subVectors(currentTargetPoint, e.position)
            const dist = dir.length()
            const step = effectiveSpeed * dt

            if (dist <= step) {
              e.currentWaypointIndex++
              e.position.copy(currentTargetPoint)

              // Check if reached Nexus Checkpoint
              if (e.currentWaypointIndex >= this.waypoints.length - 1) {
                this.handleEnemyReachedNexus(e)
                continue
              }
            } else {
              dir.normalize().multiplyScalar(step)
              e.position.add(dir)
              e.distanceTraveled += step
              e.model.lookAt(currentTargetPoint.x, e.position.y, currentTargetPoint.z)
            }
            e.model.position.copy(e.position)
          }
        }
      }

      // Update Projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i]
        if (!p.update(dt)) {
          this.projectiles.splice(i, 1)
        }
      }

      // Update Towers
      this.updateTowers(dt)

      // Animate Nexus floating crystal & dome
      if (this.nexus) {
        const t = performance.now() * 0.0015
        if (this.nexus.crystalMesh) {
          this.nexus.crystalMesh.rotation.y = t
          this.nexus.crystalMesh.position.y = 2.2 + Math.sin(t * 2) * 0.2
        }
        if (this.nexus.lifeOrbs) {
          this.nexus.lifeOrbs.forEach((orb, idx) => {
            if (!orb) return
            const angle = t + (idx * Math.PI * 2) / 3
            orb.position.set(Math.cos(angle) * 1.5, 2.2 + Math.sin(t * 3 + idx) * 0.15, Math.sin(angle) * 1.5)
          })
        }
      }

      this.checkWaveEnd()
    }

    // Render Floating Damage Numbers Overlay
    combatEngine.updateFloatingTexts(rawDt, this.camera, this.damageContainer)

    // Render 3D Enemy Health Bars & Counter Badges
    this.renderEnemyOverlays()

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  renderEnemyOverlays() {
    let container = document.getElementById('enemy-bars-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'enemy-bars-container'
      document.body.appendChild(container)
    }
    container.innerHTML = ''

    for (const e of this.enemies) {
      if (!e.alive) continue
      const vector = new THREE.Vector3(e.position.x, e.position.y + 1.6, e.position.z)
      vector.project(this.camera)

      if (vector.z < 1) {
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth
        const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight

        const bar = document.createElement('div')
        bar.className = 'enemy-hp-overlay'
        bar.style.left = `${x}px`
        bar.style.top = `${y}px`

        const hpPct = Math.max(0, Math.min(100, Math.round((e.hp / e.maxHp) * 100)))
        let tagHtml = ''
        if (e.counterName) {
          tagHtml = `<div class="counter-badge">${e.counterName}</div>`
        }

        bar.innerHTML = `
          ${tagHtml}
          <div class="hp-bar-bg">
            <div class="hp-bar-fill" style="width: ${hpPct}%"></div>
          </div>
        `
        container.appendChild(bar)
      }
    }
  }

  updateHeroSoulUI() {
    const pct = Math.min(100, Math.round((this.state.heroSouls / this.state.heroSoulsRequired) * 100))
    const fill = document.getElementById('hero-soul-fill')
    const text = document.getElementById('hero-soul-text')
    const btn = document.getElementById('btn-call-hero')

    if (fill) fill.style.width = `${pct}%`
    if (text) text.textContent = `${this.state.heroSouls} / ${this.state.heroSoulsRequired}`

    if (btn) {
      const ready = this.state.heroSouls >= this.state.heroSoulsRequired
      btn.disabled = !ready
      btn.classList.toggle('ready-pulse', ready)
      if (ready) btn.textContent = 'SUMMON [H] (READY!)'
      else btn.textContent = 'SUMMON [H]'
    }
  }

  callLegendaryHero() {
    if (this.state.heroSouls < this.state.heroSoulsRequired) {
      this.showNotification(`Hero Call-in charging: (${this.state.heroSouls}/${this.state.heroSoulsRequired} kills)`, '#ffaa00')
      return
    }

    this.state.heroSouls = 0
    this.updateHeroSoulUI()

    soundSystem.playTone(880, 'triangle', 0.6, 1320)
    soundSystem.playLevelUp()
    this.showNotification("👑 CELESTIAL ARCHON DESCENDS! Heavenly Judgement unleashed!", "#ffd700")

    // Spawn celestial archon in center
    const archon = modelFactory.createCelestialArchon()
    archon.position.set(0, 6, 0)
    this.scene.add(archon)

    // Screen shockwave
    this.spawnExplosionEffect(new THREE.Vector3(0, 0.1, 0), 0xffd700, 22)
    this.triggerScreenShake()

    // Strike ALL enemies currently alive for 750 true damage
    for (const e of this.enemies) {
      if (!e.alive) continue
      const res = { amount: 750, isCrit: true, type: DAMAGE_TYPES.LIGHTNING }
      combatEngine.applyDamage(null, e, res, soundSystem)
      combatEngine.spawnFloatingText(e.position, "HOLY WRATH! 750", "#ffd700", true)
      if (e.hp <= 0) this.killEnemy(e, null)
    }

    // Grant all player towers a Holy Frenzy buff (+60% attack speed, +25% crit) for 15 seconds
    this.state.relics.globalAttackSpeed = (this.state.relics.globalAttackSpeed || 0) + 0.60
    this.state.relics.globalCritChance = (this.state.relics.globalCritChance || 0) + 0.25

    setTimeout(() => {
      this.state.relics.globalAttackSpeed = Math.max(0, (this.state.relics.globalAttackSpeed || 0) - 0.60)
      this.state.relics.globalCritChance = Math.max(0, (this.state.relics.globalCritChance || 0) - 0.25)
      this.showNotification("Celestial Archon's blessing faded.", "#94a3b8")
    }, 15000)

    // Animate archon descending and ascending
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 0.05
      if (archon) {
        if (elapsed < 1.0) {
          archon.position.y = Math.max(1.2, 6 - elapsed * 4.8)
        } else if (elapsed > 4.5) {
          archon.position.y += 0.2
          archon.scale.multiplyScalar(0.95)
        }
      }
      if (elapsed > 6.0) {
        clearInterval(interval)
        this.scene.remove(archon)
      }
    }, 50)
  }

  // ==========================================
  // UI & HUD METHODS
  // ==========================================
  updateHUD() {
    document.getElementById('hud-gold').textContent = `${this.state.gold}`
    document.getElementById('hud-wave').textContent = `${this.state.wave}`
    document.getElementById('hud-enemies').textContent = `${this.enemies.filter(e => e.alive).length}`
    const btn = document.getElementById('btn-wave-start')
    if (btn) {
      btn.disabled = this.waveActive
      btn.textContent = this.waveActive ? 'Wave in Progress...' : 'Start Next Wave [Space]'
    }
  }

  updateLivesUI(lives) {
    const container = document.getElementById('nexus-lives')
    if (!container) return
    container.innerHTML = ''
    for (let i = 0; i < this.state.maxLives; i++) {
      const orb = document.createElement('div')
      orb.className = `life-orb ${i < lives ? 'active' : 'depleted'}`
      container.appendChild(orb)
    }
  }

  updateInspectPanel() {
    const panel = document.getElementById('tower-inspect-panel')
    const t = this.state.selectedTower
    if (!t) {
      panel.style.display = 'none'
      return
    }

    panel.style.display = 'block'
    document.getElementById('inspect-name').textContent = t.name
    document.getElementById('inspect-level').textContent = `Level ${t.level} (${HERO_LEVEL_DATA[t.level].title})`
    document.getElementById('inspect-kills').textContent = `${t.kills}`
    document.getElementById('inspect-damage').textContent = `${Math.round(t.totalDamage)}`

    const nextLvl = HERO_LEVEL_DATA[t.level]
    const xpPercent = Math.min(100, Math.round((t.xp / nextLvl.xpRequired) * 100))
    document.getElementById('inspect-xp-fill').style.width = `${xpPercent}%`
    document.getElementById('inspect-xp-text').textContent = `${t.xp} / ${nextLvl.xpRequired} XP`

    const upgradeBtn = document.getElementById('btn-inspect-upgrade')
    const upgradeCost = t.level * 60
    upgradeBtn.textContent = t.level >= 5 ? 'Max Level' : `Empower (+Level) [${upgradeCost}g]`
    upgradeBtn.disabled = t.level >= 5 || this.state.gold < upgradeCost
  }

  showNotification(text, color = '#00d0ff') {
    const banner = document.getElementById('notification-banner')
    if (!banner) return
    banner.textContent = text
    banner.style.color = color
    banner.style.opacity = '1'
    clearTimeout(this.notifTimeout)
    this.notifTimeout = setTimeout(() => { banner.style.opacity = '0' }, 2200)
  }
}

// Global Launcher
window.addEventListener('DOMContentLoaded', () => {
  window.game = new GameController()
})
