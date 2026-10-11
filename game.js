
    kaboom({
      width: 800,
      height: 600,
      background: [27, 35, 48],
      global: true,
      crisp: true,
    })

    const GAME_W = 800
    const GAME_H = 600
    const BASE_MAX_HP = 100
    const START_MONEY = 150
    const TOWER_COST = 50
    const PATH_WIDTH = 64
    const WAVE_DIFFICULTY_MULTIPLIER = 1.2
    const ENEMY_REWARD = 10
    const BASE_DAMAGE = 10
    const BASE_SIZE = 62
    const MAP_EDGE_PADDING = 20
    const PATH_PLACEMENT_BUFFER = 14
    const MIN_ENEMY_SPEED = 20
    const PATH_END_THRESHOLD = 1
    const EPSILON = 0.0001
    const SEGMENT_START_T = 0
    const BLIND_CONFUSION_DURATION = 1.5
    const LEG_DROP_SPEED = 2400
    const LEG_DROP_HEIGHT = 320
    const LEG_WIDTH = 42
    const LEG_HEIGHT = 230
    const LEG_FADE_RATE = 4.2
    const SHOCKWAVE_INITIAL_RADIUS = 24
    const SHOCKWAVE_EXPAND_RATE = 430
    const SHOCKWAVE_FADE_RATE = 2.5
    const DEAF_PULSE_BASE_RADIUS = 6
    const DEAF_PULSE_EXPAND_RATE = 250
    const DEAF_PULSE_FADE_RATE = 1.8

    // ---- roguelike block sprites ----
    loadSprite("path_tile", "sprites/path_tile.png")
    loadSprite("enemy", "sprites/enemy.png")
    loadSprite("tower_blind", "sprites/tower_blind.png")
    loadSprite("tower_legless", "sprites/tower_legless.png")
    loadSprite("tower_deaf", "sprites/tower_deaf.png")
    loadSprite("casino", "sprites/casino.png")
    loadSprite("pellet", "sprites/pellet.png")
    loadSprite("shockwave", "sprites/shockwave.png")
    loadSprite("pulse", "sprites/pulse.png")

    const WAYPOINTS = [
      vec2(40, 90),
      vec2(250, 90),
      vec2(250, 220),
      vec2(580, 220),
      vec2(580, 360),
      vec2(180, 360),
      vec2(180, 510),
      vec2(740, 510),
    ]

    const TOWER_DATA = {
      1: {
        name: "The Blind",
        color: rgb(55, 55, 60),
        range: 165,
        fireRate: 0.45,
      },
      2: {
        name: "The Legless",
        color: rgb(38, 145, 64),
        range: 210,
        fireRate: 3.0,
        aoeRadius: 110,
      },
      3: {
        name: "The Deaf",
        color: rgb(50, 120, 220),
        range: 135,
        fireRate: 0.18,
      },
    }

    const UPGRADE_POOL = [
      {
        title: "Greased Palms",
        desc: "+75 Bribes immediately.",
        apply: (s) => { s.money += 75 },
      },
      {
        title: "Sketchy Eyedrops",
        desc: "The Blind deals +4 damage.",
        apply: (s) => { s.upgrades.blindDamageBonus += 4 },
      },
      {
        title: "Unlicensed Acoustics",
        desc: "The Deaf slows 10% harder.",
        apply: (s) => { s.upgrades.deafSlowBonus += 0.1 },
      },
      {
        title: "Counterfeit Prosthetics",
        desc: "The Legless slam deals +25 damage.",
        apply: (s) => { s.upgrades.legDamageBonus += 25 },
      },
      {
        title: "Backroom Insurance",
        desc: "Base heals +10 HP (up to max).",
        apply: (s) => { s.baseHp = Math.min(BASE_MAX_HP, s.baseHp + 10) },
      },
    ]

    function makeInitialState() {
      return {
        wave: 1,
        completedWave: 0,
        money: START_MONEY,
        baseHp: BASE_MAX_HP,
        upgrades: {
          blindDamageBonus: 0,
          legDamageBonus: 0,
          deafSlowBonus: 0,
        },
      }
    }

    function lineDistToPoint(p, a, b) {
      const ab = b.sub(a)
      const ap = p.sub(a)
      const denom = ab.dot(ab)
      if (denom <= EPSILON) return p.dist(a)
      const t = Math.max(0, Math.min(1, ap.dot(ab) / denom))
      const proj = a.add(ab.scale(t))
      return p.dist(proj)
    }

    const SEGMENT_LENGTHS = []
    let TOTAL_PATH_LEN = 0
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const len = WAYPOINTS[i].dist(WAYPOINTS[i + 1])
      SEGMENT_LENGTHS.push(len)
      TOTAL_PATH_LEN += len
    }

    function pointOnPath(dist) {
      let remainingDist = Math.max(0, Math.min(TOTAL_PATH_LEN, dist))
      for (let i = 0; i < SEGMENT_LENGTHS.length; i++) {
        const seg = SEGMENT_LENGTHS[i]
        if (remainingDist <= seg) {
          const t = seg === 0 ? SEGMENT_START_T : remainingDist / seg
          return WAYPOINTS[i].lerp(WAYPOINTS[i + 1], t)
        }
        remainingDist -= seg
      }
      return WAYPOINTS[WAYPOINTS.length - 1]
    }

    function isOnPath(p) {
      for (let i = 0; i < WAYPOINTS.length - 1; i++) {
        if (lineDistToPoint(p, WAYPOINTS[i], WAYPOINTS[i + 1]) <= PATH_WIDTH * 0.5 + PATH_PLACEMENT_BUFFER) {
          return true
        }
      }
      return false
    }

    function pickRandomUpgrades(count) {
      const list = [...UPGRADE_POOL]
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = list[i]
        list[i] = list[j]
        list[j] = tmp
      }
      return list.slice(0, count)
    }

    function drawPath() {
      const TILE = 64
      for (let i = 0; i < WAYPOINTS.length - 1; i++) {
        const a = WAYPOINTS[i]
        const b = WAYPOINTS[i + 1]
        const d = b.sub(a)
        const len = d.len()
        const ang = d.angle()
        const count = Math.ceil(len / TILE)
        for (let j = 0; j < count; j++) {
          const t = (j * TILE + TILE / 2) / len
          add([
            pos(a.add(d.scale(t))),
            sprite("path_tile"),
            anchor("center"),
            rotate(ang),
            opacity(0.95),
            z(0),
          ])
        }
      }
    }

    scene("start", () => {
      add([
        text("STANDARD DEVIATIONS", { size: 42 }),
        pos(center().x, 200),
        anchor("center"),
        color(235, 235, 245),
      ])
      add([
        text("Defend the Illegal Underground Casino", { size: 20 }),
        pos(center().x, 255),
        anchor("center"),
        color(170, 190, 220),
      ])
      add([
        text("Press SPACE to Start", { size: 24 }),
        pos(center().x, 330),
        anchor("center"),
        color(255, 235, 120),
      ])
      onKeyPress("space", () => go("game", makeInitialState()))
    })

    scene("draft", (state) => {
      const options = pickRandomUpgrades(3)

      add([
        text(`Wave ${state.completedWave || Math.max(0, state.wave - 1)} Cleared`, { size: 36 }),
        pos(center().x, 90),
        anchor("center"),
        color(220, 245, 255),
      ])
      add([
        text("Draft an upgrade (Press 1 / 2 / 3)", { size: 20 }),
        pos(center().x, 130),
        anchor("center"),
        color(255, 220, 130),
      ])

      options.forEach((opt, i) => {
        const y = 210 + i * 120
        add([
          pos(90, y - 24),
          rect(620, 92),
          color(47, 58, 75),
          outline(3, rgb(95, 120, 155)),
        ])
        add([
          text(`${i + 1}. ${opt.title}`, { size: 24 }),
          pos(110, y),
          color(230, 240, 255),
        ])
        add([
          text(opt.desc, { size: 17 }),
          pos(112, y + 34),
          color(175, 195, 225),
        ])
      })

      function pick(idx) {
        if (!options[idx]) return
        options[idx].apply(state)
        go("game", state)
      }

      onKeyPress("1", () => pick(0))
      onKeyPress("2", () => pick(1))
      onKeyPress("3", () => pick(2))
    })

    scene("gameover", (data) => {
      add([
        text("CASINO BUSTED", { size: 54 }),
        pos(center().x, 210),
        anchor("center"),
        color(250, 110, 110),
      ])
      add([
        text(`You reached wave ${data.waveReached}`, { size: 28 }),
        pos(center().x, 290),
        anchor("center"),
        color(220, 235, 255),
      ])
      add([
        text("Press SPACE to Restart", { size: 24 }),
        pos(center().x, 360),
        anchor("center"),
        color(255, 235, 125),
      ])
      onKeyPress("space", () => go("start"))
    })

    scene("game", (state) => {
      drawPath()

      const base = add([
        pos(WAYPOINTS[WAYPOINTS.length - 1]),
        sprite("casino"),
        anchor("center"),
        z(3),
      ])

      add([
        text("CASINO", { size: 12 }),
        pos(base.pos.x, base.pos.y),
        anchor("center"),
        color(255, 224, 150),
        z(4),
      ])

      const ui = {
        money: add([text("", { size: 18 }), pos(16, 12), fixed(), z(100), color(245, 230, 130)]),
        hp: add([text("", { size: 18 }), pos(16, 36), fixed(), z(100), color(245, 165, 165)]),
        wave: add([text("", { size: 18 }), pos(16, 60), fixed(), z(100), color(185, 220, 255)]),
        tower: add([text("", { size: 18 }), pos(16, 84), fixed(), z(100), color(200, 220, 245)]),
        hint: add([text("", { size: 16 }), pos(16, 560), fixed(), z(100), color(255, 240, 185)]),
      }

      const enemies = []
      const towers = []
      let selectedTower = 1
      let spawnTimer = 0
      let spawned = 0
      let waveClearing = false

      const waveScale = Math.pow(WAVE_DIFFICULTY_MULTIPLIER, state.wave - 1)
      const waveCount = Math.max(1, Math.round(10 * waveScale))
      const enemyHp = Math.round(30 * waveScale)
      const spawnGap = Math.max(0.28, 0.75 - (state.wave - 1) * 0.02)

      function spawnEnemy() {
        const enemy = add([
          pos(pointOnPath(0)),
          sprite("enemy"),
          anchor("center"),
          area(),
          z(6),
          "enemy",
          {
            hp: enemyHp,
            baseSpeed: 66 + state.wave * 1.5,
            currentSpeed: 0,
            pathDist: 0,
            confusedUntil: 0,
          },
        ])
        enemies.push(enemy)
      }

      function killEnemy(enemy) {
        if (!enemy.exists()) return
        destroy(enemy)
        const idx = enemies.indexOf(enemy)
        if (idx >= 0) enemies.splice(idx, 1)
        state.money += ENEMY_REWARD
      }

      function removeEnemy(enemy) {
        if (!enemy.exists()) return
        destroy(enemy)
        const idx = enemies.indexOf(enemy)
        if (idx >= 0) enemies.splice(idx, 1)
      }

      function placeTower(worldPos) {
        if (
          worldPos.x < MAP_EDGE_PADDING ||
          worldPos.x > GAME_W - MAP_EDGE_PADDING ||
          worldPos.y < MAP_EDGE_PADDING ||
          worldPos.y > GAME_H - MAP_EDGE_PADDING
        ) {
          ui.hint.text = "Can't place outside map."
          return
        }
        if (worldPos.dist(base.pos) < BASE_SIZE) {
          ui.hint.text = "Too close to the casino."
          return
        }
        if (isOnPath(worldPos)) {
          ui.hint.text = "Towers can't be placed on the path."
          return
        }
        if (state.money < TOWER_COST) {
          ui.hint.text = "Not enough Bribes."
          return
        }

        const data = TOWER_DATA[selectedTower]
        state.money -= TOWER_COST
        ui.hint.text = `${data.name} deployed.`

        let towerSprite = "tower_blind"
        if (selectedTower === 2) towerSprite = "tower_legless"
        else if (selectedTower === 3) towerSprite = "tower_deaf"
        const body = add([
          pos(worldPos),
          sprite(towerSprite),
          anchor("center"),
          z(8),
        ])

        const dataT = TOWER_DATA[selectedTower]
        const rangeInd = add([
          pos(worldPos),
          circle(dataT.range),
          anchor("center"),
          color(255, 255, 255, 0),
          outline(1, rgba(200, 220, 255, 0.25)),
          opacity(0),
          z(5),
        ])
        towers.push({
          type: selectedTower,
          ent: body,
          range: rangeInd,
          cooldown: 0,
        })
      }

      onMousePress((btn) => {
        if (btn !== "left") return
        placeTower(mousePos())
      })

      onKeyPress("1", () => { selectedTower = 1; updateTowerUI() })
      onKeyPress("2", () => { selectedTower = 2; updateTowerUI() })
      onKeyPress("3", () => { selectedTower = 3; updateTowerUI() })

      function updateTowerUI() {
        towers.forEach((t) => {
          if (!t.ent.exists() || !t.range.exists()) return
          t.range.pos = t.ent.pos
          t.range.opacity = (selectedTower === t.type && mousePos().dist(t.ent.pos) < 40) ? 0.35 : 0
        })
      }

      onUpdate(() => {
        spawnTimer += dt()
        if (spawned < waveCount && spawnTimer >= spawnGap) {
          spawnTimer = 0
          spawned++
          spawnEnemy()
        }

        // Reset enemy speed before auras.
        enemies.forEach((e) => {
          if (!e.exists()) return
          e.currentSpeed = e.baseSpeed
        })

        // Deaf aura slows enemies while in range.
        towers.forEach((t) => {
          if (t.type !== 3 || !t.ent.exists()) return
          const d = TOWER_DATA[3]
          const slowAmount = Math.min(0.85, 0.4 + state.upgrades.deafSlowBonus)
          enemies.forEach((e) => {
            if (!e.exists()) return
            if (e.pos.dist(t.ent.pos) <= d.range) {
              e.currentSpeed = Math.max(MIN_ENEMY_SPEED, e.currentSpeed * (1 - slowAmount))
            }
          })
        })

        enemies.forEach((enemy) => {
          if (!enemy.exists()) return
          const confused = time() < enemy.confusedUntil
          const speed = confused ? enemy.baseSpeed : enemy.currentSpeed
          enemy.pathDist += (confused ? -1 : 1) * speed * dt()
          enemy.pathDist = Math.max(0, enemy.pathDist)
          let p = pointOnPath(enemy.pathDist)
          if (confused) {
            const t = time() * 40
            p = p.add(vec2(Math.sin(t) * 1.8, Math.cos(t * 1.3) * 1.8))
          }
          enemy.pos = p

          if (enemy.pathDist >= TOTAL_PATH_LEN - PATH_END_THRESHOLD) {
            removeEnemy(enemy)
            state.baseHp -= BASE_DAMAGE
            if (state.baseHp <= 0) {
              go("gameover", { waveReached: state.wave })
            }
          }
        })

        towers.forEach((tower) => {
          if (!tower.ent.exists()) return
          tower.cooldown -= dt()
          const pos0 = tower.ent.pos

          if (tower.type === 1) {
            const data = TOWER_DATA[1]
            if (tower.cooldown > 0) return
            let best = null
            let bestDist = Infinity
            enemies.forEach((e) => {
              if (!e.exists()) return
              const d = e.pos.dist(pos0)
              if (d <= data.range && d < bestDist) {
                best = e
                bestDist = d
              }
            })
            if (!best) return

            tower.cooldown = data.fireRate
            best.hp -= 8 + state.upgrades.blindDamageBonus
            best.confusedUntil = Math.max(best.confusedUntil, time() + BLIND_CONFUSION_DURATION)

            const delta = best.pos.sub(pos0)
            add([
              pos(pos0),
              sprite("pellet"),
              anchor("center"),
              rotate(delta.angle()),
              scale(vec2(Math.max(0.25, delta.len() / 32), 0.25)),
              opacity(0.9),
              z(20),
              lifespan(0.08),
            ])

            if (best.hp <= 0) killEnemy(best)
          }

          if (tower.type === 2) {
            const data = TOWER_DATA[2]
            if (tower.cooldown > 0) return
            let target = null
            let progress = -1
            enemies.forEach((e) => {
              if (!e.exists()) return
              const d = e.pos.dist(pos0)
              if (d <= data.range && e.pathDist > progress) {
                progress = e.pathDist
                target = e
              }
            })
            if (!target) return

            tower.cooldown = data.fireRate
            const strikePos = vec2(target.pos.x, target.pos.y)
            const aoe = data.aoeRadius
            const dmg = 70 + state.upgrades.legDamageBonus

            const leg = add([
              pos(strikePos.x, strikePos.y - LEG_DROP_HEIGHT),
              rect(LEG_WIDTH, LEG_HEIGHT),
              anchor("center"),
              color(195, 220, 175),
              opacity(0.75),
              z(25),
              {
                hit: false,
                floorY: strikePos.y,
              },
            ])

            leg.onUpdate(() => {
              leg.pos.y += LEG_DROP_SPEED * dt()
              if (!leg.hit && leg.pos.y >= leg.floorY) {
                leg.hit = true
                leg.pos.y = leg.floorY

                const wave = add([
                  pos(strikePos),
                  sprite("shockwave"),
                  anchor("center"),
                  opacity(0.7),
                  z(26),
                  {
                    r: SHOCKWAVE_INITIAL_RADIUS,
                  },
                ])

                wave.onUpdate(() => {
                  wave.r += SHOCKWAVE_EXPAND_RATE * dt()
                  wave.opacity -= SHOCKWAVE_FADE_RATE * dt()
                  wave.scale = vec2(
                    wave.r / SHOCKWAVE_INITIAL_RADIUS,
                    wave.r / SHOCKWAVE_INITIAL_RADIUS,
                  )
                  if (wave.opacity <= 0) destroy(wave)
                })

                enemies.slice().forEach((e) => {
                  if (!e.exists()) return
                  if (e.pos.dist(strikePos) <= aoe) {
                    e.hp -= dmg
                    if (e.hp <= 0) killEnemy(e)
                  }
                })
              }

              if (leg.hit) {
                leg.opacity -= LEG_FADE_RATE * dt()
                if (leg.opacity <= 0) destroy(leg)
              }
            })
          }

          if (tower.type === 3) {
            const data = TOWER_DATA[3]
            if (tower.cooldown > 0) return
            tower.cooldown = data.fireRate
            const pulse = add([
              pos(pos0),
              sprite("pulse"),
              anchor("center"),
              opacity(0.45),
              z(9),
              { r: DEAF_PULSE_BASE_RADIUS },
            ])
            pulse.onUpdate(() => {
              pulse.r += DEAF_PULSE_EXPAND_RATE * dt()
              pulse.scale = vec2(pulse.r / DEAF_PULSE_BASE_RADIUS, pulse.r / DEAF_PULSE_BASE_RADIUS)
              pulse.opacity -= DEAF_PULSE_FADE_RATE * dt()
              if (pulse.opacity <= 0) destroy(pulse)
            })
          }
        })

        if (!waveClearing && spawned >= waveCount && enemies.length === 0) {
          waveClearing = true
          state.completedWave = state.wave
          state.wave += 1
          wait(0.5, () => go("draft", state))
        }

        ui.money.text = `Bribes: ${state.money}`
        ui.hp.text = `Casino HP: ${Math.max(0, state.baseHp)}`
        ui.wave.text = `Wave: ${state.wave} (${spawned}/${waveCount})`
        ui.tower.text = `Selected: ${TOWER_DATA[selectedTower].name} [1/2/3] | Cost: ${TOWER_COST}`
        if (!ui.hint.text) ui.hint.text = "Click to place towers. Keep bureaucrats off the casino."
        updateTowerUI()
      })
    })

    go("start")
  