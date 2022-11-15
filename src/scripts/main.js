import * as THREE from "three"
import { BoxGeometry, MeshNormalMaterial, Vector3 } from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader"
import gsap, { Back } from "gsap"

import getRandomIntFromInterval from "../utils/getRandomIntFromInterval"
import getRandomFromArray from "../utils/getRandomFromArray"
import mapValueBetween from "../utils/mapValueBetween"

// import { shape2 } from "../shapes.js"
import { COVID_DATA, MONTHS_WORDING } from "../data"
import { THEMES } from "../themes"
import { MODELS } from "../models.js"
import { SHAPES } from "../shapes.js"

import "../styles/style.scss"

/**
 * TODO :
 * - Mouse lerp
 * - Scroll lerp
 * - Add tiles
 * - Add UI
 */

// Three objects
let scene = null
let camera = null
let renderer = null
let canvas = null
let ambiantLight = null
let environmentSphere = null

// Experience objects
let scroll = 0
let cameraX = 0
let cameraY = 0
let currentMonthIndex = 0

const MONTHS_ARRAY = []
const COLLIDERS_ARRAY = []
const TREES_ARRAY = []

const DARK_COLORS = THEMES.dark.gradient
const HAPPY_COLORS = THEMES.happy.gradient.reverse()

const sizes = {
  width: 0,
  height: 0,
}

class Month {

  constructor({ month, year, description, deaths, position }) {

    this.month = month
    this.year = year
    this.description = description
    this.deaths = deaths
    this.position = position

    this.height = this.deaths / 1000
    this.scale = 5
    this.thickness = 0.025
    this.active = false

    // Tableau contenant tous les plans de l'île
    this.layers = []

    // Tableau contenant les modèles 3D
    this.models = []

    this.setupLayers()
    this.setupModels()
    this.setupCollider()
  }

  setupLayers() {

    const islandSize = Math.floor(mapValueBetween(this.deaths, 0, 20000, 6, 10)) * 0.01
    const islandShape = getRandomFromArray(SHAPES)
    const geometry = getGeometryFromSVG(islandShape)

    for (let i = 0; i < this.height; i++) {

      let offset = i / 400

      let size = islandSize - offset

      const material = new THREE.MeshBasicMaterial({
        color: DARK_COLORS[i],
        transparent: true,
      })

      const mesh = new THREE.Mesh(geometry, material)

      mesh.position.y = this.position.y
      mesh.position.x = -7 + offset * 100
      mesh.position.z = i * 0.5 + 0.1

      mesh.scale.set(size, size, this.thickness)

      scene.add(mesh)

      this.layers.push(mesh)
    }

    MONTHS_ARRAY.push(this)
  }

  setupModels() {
    const topLayer = this.layers[this.layers.length - 1]

    for (let i = 0; i < 2; i++) {
      let model = getRandomFromArray(TREES_ARRAY)
      let clone = model.clone()

      clone.position.x = 2 - i * 4
      clone.position.y = this.position.y + 3
      clone.position.z = topLayer?.position.z - 2

      clone.rotation.x = 1.5

      clone.scale.set(0, 0, 0)

      scene.add(clone)

      this.models.push({
        z: topLayer?.position.z + this.thickness * 30,
        element: clone,
      })
    }
  }

  setupCollider() {
    const geometry = new BoxGeometry(15, 15, this.height / 1.5)
    const material = new MeshNormalMaterial({
      color: "red",
      wireframe: true,
      visible: false,
    })

    this.collider = new THREE.Mesh(geometry, material)

    this.collider.position.x = 1
    this.collider.position.y = this.position.y + 6
    this.collider.position.z = this.height / 3

    COLLIDERS_ARRAY.push(this.collider)

    scene.add(this.collider)
  }
  
  setTheme(theme) {

    // Animation des layers des îles
    let i = 0
    for (let layer of this.layers) {
      i++
      gsap.to(layer.position, { z: i * 0.5, duration: 0.1, ease: Back.easeOut })
      layer.material.color.setHex(`0x${THEMES[theme].gradient[i]?.replace("#", "")}`)
    }

  }

  reveal() {

    this.setTheme('happy')

    // Animation des models
    for (let model of this.models) {
      let tl = gsap.timeline()
      tl.addLabel("treeAppear")
      tl.to(
        model.element.scale,
        { x: 1, y: 1, z: 1, duration: 0.5, ease: Back.easeOut },
        "treeAppear"
      )
      tl.to(
        model.element.position,
        { z: model.z, duration: 0.25, ease: Back.easeOut },
        "treeAppear"
      )
      tl.to(
        model.element.rotation,
        { y: 5, duration: 0.25, ease: Back.easeOut },
        "treeAppear"
      )
    }

  }

  darken() {

    this.setTheme('dark')

    for (let model of this.models) {
      let tl = gsap.timeline()
      tl.addLabel("treeHide")
      tl.to(model.element.scale, {x: 0, y: 0, z: 0, duration: .5, ease: Back.easeIn}, 'treeHide')
      tl.to(model.element.position, {z: model.z - 5, duration: .5, ease: Back.easeIn}, "treeHide")
      tl.to(model.element.rotation, {y: 5, duration: 0.25, ease: Back.easeIn}, "treeHide")
    }

  }

}

const updateSizes = () => {

  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  canvas.width = sizes.width
  canvas.height = sizes.height

  canvas.style.width = sizes.width
  canvas.style.height = sizes.height

  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

}

const setupCanvas = () => {
  canvas = document.getElementById("webgl")
}

const setupRenderer = () => {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  })
  renderer.setClearColor(THEMES.dark.background, 1)
}

const setupScene = () => {
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 200)
  scene.add(camera)

  camera.position.x = 10
  camera.position.z = 12
  camera.rotation.x = 1

  // new OrbitControls(camera, canvas);
}

const setupLights = () => {
  ambiantLight = new THREE.AmbientLight(THEMES.dark.background)
  scene.add(ambiantLight)
}

const changeEnvironment = (theme) => {

  const targetColor = new THREE.Color(THEMES[theme].background);

  gsap.to(environmentSphere.material.color, {r: targetColor.r, g: targetColor.g, b: targetColor.b, duration: .5});

}

const setupEnvironment = () => {

  const geometry = new THREE.SphereGeometry(175, 100)
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    side: THREE.BackSide
  })
  environmentSphere = new THREE.Mesh(geometry, material)

  scene.add(environmentSphere);

}

const setupWorld = () => {

  let index = 0

  for (const year in COVID_DATA) {
    for (const month in COVID_DATA[year]) {
      new Month({
        month: MONTHS_WORDING[month],
        year: year,
        deaths: COVID_DATA[year][month],
        position: {
          x: 0,
          y: index * 50
        },
      })

      index++
    }
  }

}

const getGeometryFromSVG = (shape) => {

  let shapes = []

  const loader = new SVGLoader()
  const svgData = loader.parse(shape)

  svgData.paths.forEach((path, i) => {
    shapes = path.toShapes(true)
  })

  const geometry = new THREE.ExtrudeGeometry(shapes[0], {
    depth: 20,
    bevelEnabled: false,
  })

  return geometry

}

const tick = () => {

  renderer.render(scene, camera)

  //camera.position.x = cameraX
  camera.position.y = cameraY
  
  environmentSphere.position.x = cameraX
  environmentSphere.position.y = cameraY

  requestAnimationFrame(tick)
  
}

const loadModel = (model) => {

  const loader = new GLTFLoader()

  loader.load(
    `./models/${model.filename}.gltf`,
    function (gltf) {
      TREES_ARRAY.push(gltf.scene)
      model.loaded = true

      if (MODELS.filter((el) => !el.loaded).length === 0) {
        startExperience()
      }
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded")
    },
    function (error) {
      console.log("An error happened")
    }
  )

}

const loadExperience = () => {
  for (const model of MODELS) {
    loadModel(model)
  }
}

const startExperience = () => {

  setupCanvas()
  setupRenderer()
  setupScene()
  setupLights()
  setupEnvironment();
  setupWorld()

  updateSizes()
  tick()

}

loadExperience()

const monthObserver = () => {

  for(let month of MONTHS_ARRAY) {
    if(cameraY > month.position.y - 25 && cameraY < month.position.y) {
      month.reveal()
      month.active = true
      changeEnvironment('happy')
      document.querySelector('.infos .month').innerHTML = month.month + ' ' + month.year
      document.querySelector('.infos .covid-cases').innerHTML = month.deaths
      document.querySelector('.infos .description').innerHTML = month.description
    } else if(month.active) {
      month.active = false
      month.darken();
      changeEnvironment('dark')
    }
  }

  MONTHS_ARRAY[currentMonthIndex]?.reveal()

}

const cursor = document.querySelector('.timeline .cursor')

window.addEventListener('scroll', () => {

  scroll = window.scrollY / (document.body.offsetHeight - window.innerHeight)

  cursor.style.left = `${scroll*100}%`
  
  //cameraX = Math.cos(scroll * 100) * 20
  cameraY = scroll * MONTHS_ARRAY[MONTHS_ARRAY.length-1]?.position.y
  monthObserver()
  
});

window.addEventListener("resize", updateSizes)
