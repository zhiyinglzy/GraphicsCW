import * as THREE from 'three'

import Game from './mazegame.js'

import InputManager from './inputmanager.js'

import { GLTFLoader } from 'https://unpkg.com/three@0.123.0/examples/jsm/loaders/GLTFLoader.js'

let g, timer, camera, renderer;

window.torchCount = 0;
window.totalTorches = 5;
window.torchTimeout = 10000; // in milliseconds
window.introTimeout = 5000;
window.start = 0;
window.inputmanager = new InputManager();
window.geometries = [];
window.materials = [];
window.textures = []

document.getElementById("torch-count").innerText = `Torches Left: ${window.totalTorches}`

var init = function () {
    const scene = new THREE.Scene();
    const gltfLoader = new GLTFLoader();
    window.scene = scene
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    window.camera = camera;
    scene.add(camera);

    timer = new THREE.Clock();

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("wrapper").appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xff0000, 0.1));

    gltfLoader.load(
        '/mazegamefixed/res/medieval_door/scene.gltf',
        function (gltf) {
            const door = gltf.scene.children[0]
            door.position.set(1.75, -1.78, 1.65)
            door.scale.set(0.3, 0.3, 0.3);

            scene.add(door);
            renderer.render(scene, camera)
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100));
        },
        function (error) {
            console.log(error);
        }
    )

    gltfLoader.load(
        '/mazegamefixed/res/goblin.gltf',
        function (gltf) {
            gltf.scene.position.set(2.2, -0.2, 2)
            gltf.scene.scale.set(0.3, 0.2, 0.3)
            gltf.scene.rotateX(Math.PI)
            gltf.scene.rotateY(Math.PI/2)

            scene.add(gltf.scene)
            renderer.render(scene, camera)
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100));
        },
        function (error) {
            console.log(error);
        }
    )

    window.addEventListener("resize", onWindowResize, false);
};

var onWindowResize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
};

var start = function () {
    timer.start();
};

var animate = function () {
    requestAnimationFrame(animate);
    
    var delta = timer.getDelta();

    g.update(delta);

    if (g.mustRender()) {
        renderer.render(scene, camera);
    }

    renderer.render(scene, camera);
};

document.getElementById("start-menu").addEventListener("click", function () {
    document.getElementById("start-menu").style.display = 'none'
    init();
    g = new Game({ width: 6, height: 6 });
    window.g = g
    start();
    animate();
})

export {}
