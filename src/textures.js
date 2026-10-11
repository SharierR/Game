// Procedural Texture Generator for Three.js
// Generates PBR-ready canvas textures without requiring external image assets.

const TextureGenerator = {
  cache: {},
  loader: new THREE.TextureLoader(),

  loadAssetTexture(path, repeatX = 1, repeatY = 1) {
    if (this.cache[path]) return this.cache[path]
    const tex = this.loader.load(path, (loaded) => {
      loaded.wrapS = THREE.RepeatWrapping
      loaded.wrapT = THREE.RepeatWrapping
      loaded.repeat.set(repeatX, repeatY)
      loaded.needsUpdate = true
      if (window.game && window.game.groundMesh) {
        window.game.groundMesh.material.needsUpdate = true
      }
      if (window.game && window.game.pathMeshes) {
        window.game.pathMeshes.forEach(m => { m.material.needsUpdate = true })
      }
    })
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeatX, repeatY)
    this.cache[path] = tex
    return tex
  },

  createCanvas(width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  },

  // Radial soft glow sprite for particles and projectile halos
  getGlowSprite(colorStr = '#ffffff') {
    const key = `glow_${colorStr}`
    if (this.cache[key]) return this.cache[key]

    const size = 128
    const canvas = this.createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, colorStr)
    grad.addColorStop(0.3, colorStr)
    grad.addColorStop(0.7, 'rgba(255,255,255,0.2)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    this.cache[key] = texture
    return texture
  },

  // Arcane Runic Circle for tower pedestals and the Nexus sanctuary
  getRunicCircle(coreColor = '#7b42ff', secondaryColor = '#00ffff') {
    const key = `runic_${coreColor}_${secondaryColor}`
    if (this.cache[key]) return this.cache[key]

    const size = 512
    const canvas = this.createCanvas(size, size)
    const ctx = canvas.getContext('2d')
    const c = size / 2

    // Background transparency
    ctx.clearRect(0, 0, size, size)

    // Outer glow ring
    ctx.strokeStyle = coreColor
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.arc(c, c, 230, 0, Math.PI * 2)
    ctx.stroke()

    // Thin outer ring
    ctx.strokeStyle = secondaryColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(c, c, 215, 0, Math.PI * 2)
    ctx.stroke()

    // Inner patterned star / octagram
    ctx.lineWidth = 4
    ctx.strokeStyle = coreColor
    const points = 8
    const outerR = 210
    const innerR = 120
    ctx.beginPath()
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR
      const angle = (i * Math.PI) / points
      const x = c + Math.cos(angle) * r
      const y = c + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()

    // Middle concentric circle
    ctx.strokeStyle = secondaryColor
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(c, c, 130, 0, Math.PI * 2)
    ctx.stroke()

    // Runic glyph marks along the rim
    ctx.fillStyle = secondaryColor
    ctx.font = 'bold 20px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const runes = ['ᚦ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛋ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ']
    for (let i = 0; i < runes.length; i++) {
      const angle = (i * (Math.PI * 2)) / runes.length
      const rx = c + Math.cos(angle) * 170
      const ry = c + Math.sin(angle) * 170
      ctx.save()
      ctx.translate(rx, ry)
      ctx.rotate(angle + Math.PI / 2)
      ctx.fillText(runes[i], 0, 0)
      ctx.restore()
    }

    // Central glowing arcane eye
    const centerGrad = ctx.createRadialGradient(c, c, 10, c, c, 70)
    centerGrad.addColorStop(0, secondaryColor)
    centerGrad.addColorStop(0.6, coreColor)
    centerGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = centerGrad
    ctx.beginPath()
    ctx.arc(c, c, 70, 0, Math.PI * 2)
    ctx.fill()

    const texture = new THREE.CanvasTexture(canvas)
    this.cache[key] = texture
    return texture
  },

  // Ground Terrain Texture (Dark Fantasy / Mossy Stone / Volcanic)
  getGroundTexture(biome = 'forest') {
    const key = `ground_${biome}`
    if (this.cache[key]) return this.cache[key]

    try {
      let textureFile = 'assets/textures/Grass/Grass_01-256x256.png'
      if (biome === 'crypt') textureFile = 'assets/textures/Tile/Tile_12-256x256.png'
      else if (biome === 'volcano') textureFile = 'assets/textures/Bricks/Bricks_08-256x256.png'
      return this.loadAssetTexture(textureFile, 12, 12)
    } catch (e) {
      console.warn("Asset texture load error, fallback to procedural:", e)
    }

    const size = 512
    const canvas = this.createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    let baseR, baseG, baseB, altR, altG, altB
    if (biome === 'forest') {
      baseR = 28; baseG = 42; baseB = 26 // Deep moss green/earth
      altR = 48; altG = 64; altB = 40
    } else if (biome === 'crypt') {
      baseR = 24; baseG = 26; baseB = 34 // Dark tomb stone
      altR = 40; altG = 45; altB = 58
    } else {
      baseR = 38; baseG = 18; baseB = 18 // Volcanic scorched earth
      altR = 65; altG = 28; altB = 20
    }

    ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`
    ctx.fillRect(0, 0, size, size)

    // Noise specks and stone variation
    const imgData = ctx.getImageData(0, 0, size, size)
    const d = imgData.data
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35
      d[i] = Math.min(255, Math.max(0, d[i] + noise))
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise))
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise))
    }
    ctx.putImageData(imgData, 0, 0)

    // Subtly paint organic patches
    for (let i = 0; i < 40; i++) {
      const px = Math.random() * size
      const py = Math.random() * size
      const pr = 15 + Math.random() * 45
      const grad = ctx.createRadialGradient(px, py, 2, px, py, pr)
      grad.addColorStop(0, `rgba(${altR}, ${altG}, ${altB}, 0.4)`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(8, 8)
    this.cache[key] = texture
    return texture
  },

  // Stone Flagstone Path Texture
  getPathTexture(biome = 'forest') {
    const key = `path_${biome}`
    if (this.cache[key]) return this.cache[key]

    try {
      let pathFile = 'assets/textures/Tile/Tile_01-256x256.png'
      if (biome === 'crypt') pathFile = 'assets/textures/Bricks/Bricks_01-256x256.png'
      else if (biome === 'volcano') pathFile = 'assets/textures/Tile/Tile_19-256x256.png'
      return this.loadAssetTexture(pathFile, 6, 6)
    } catch (e) {
      console.warn("Path asset texture load error, fallback to procedural:", e)
    }

    const size = 512
    const canvas = this.createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#1c1f24'
    ctx.fillRect(0, 0, size, size)

    const cols = 8
    const rows = 8
    const tileW = size / cols
    const tileH = size / rows

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const offset = (y % 2) * (tileW * 0.4)
        const px = (x * tileW + offset) % size
        const py = y * tileH

        let stoneTone = 70 + Math.floor(Math.random() * 40)
        let r = stoneTone
        let g = stoneTone
        let b = stoneTone + 8

        if (biome === 'crypt') {
          b += 18 // colder slate
        } else if (biome === 'volcano') {
          r += 25; g -= 5; b -= 10 // warmer ash
        }

        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.strokeStyle = '#121316'
        ctx.lineWidth = 3

        ctx.beginPath()
        ctx.rect(px + 2, py + 2, tileW - 4, tileH - 4)
        ctx.fill()
        ctx.stroke()

        // Surface micro-cracks
        if (Math.random() > 0.5) {
          ctx.strokeStyle = 'rgba(20,20,25,0.45)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(px + 8, py + 10)
          ctx.lineTo(px + tileW * 0.5, py + tileH * 0.6)
          ctx.lineTo(px + tileW - 6, py + tileH * 0.4)
          ctx.stroke()
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    this.cache[key] = texture
    return texture
  },

  // Wood Texture for Ballista catapult arms and timber
  getWoodTexture() {
    const key = 'wood'
    if (this.cache[key]) return this.cache[key]

    const size = 256
    const canvas = this.createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#5c381e'
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = '#442713'
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * size
      const h = 2 + Math.random() * 6
      ctx.fillRect(0, y, size, h)
    }

    const texture = new THREE.CanvasTexture(canvas)
    this.cache[key] = texture
    return texture
  },

  // Metal Texture for armor plates and blade edges
  getMetalTexture(colorStr = '#8892a0') {
    const key = `metal_${colorStr}`
    if (this.cache[key]) return this.cache[key]

    const size = 256
    const canvas = this.createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = colorStr
    ctx.fillRect(0, 0, size, size)

    // Brushed scratches
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * size
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y + (Math.random() - 0.5) * 8)
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    this.cache[key] = texture
    return texture
  }
}

window.TextureGenerator = TextureGenerator
