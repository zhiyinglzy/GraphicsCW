import * as THREE from 'three';

import { PointerLockControls } from 'https://unpkg.com/three@0.123.0/examples/jsm/controls/PointerLockControls.js';

import { GLTFLoader } from 'https://unpkg.com/three@0.123.0/examples/jsm/loaders/GLTFLoader.js'

import { rotclamp } from './utils.js'

let camera, scene, renderer, controls, timer;

const objects = [];
const walls = [];

let raycaster;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let onstart = 1;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();
const gltfLoader = new GLTFLoader();
const introTimeout = 7000

init();
animate();

function init() {

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 11;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const ambiLight = new THREE.AmbientLight( 0x404040 ); 
    scene.add( ambiLight );

    timer = new THREE.Clock();

    gltfLoader.load(
        '/mazegamefixed/res/goblin.gltf',
        function (gltf) {
            gltf.scene.position.set(0,6,-5)
            gltf.scene.scale.set(4,3,4)
            gltf.scene.rotateX(Math.PI)

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


    const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
    light.position.set(0, 0, 0);
    scene.add(light);

    controls = new PointerLockControls(camera, document.body);

    window.player = { theta : Math.PI * 1.5 }

    document.addEventListener("mousemove", (event) => {
        const movementX = event.movementX || event.mozMovementX || 0;
        window.player.theta -= movementX * 0.02;
        window.player.theta = rotclamp(window.player.theta);
    })


    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    const winScreen = document.getElementById("win-screen")

    instructions.addEventListener('click', function () {

        controls.lock();
        onstart = 0
        start()
        if (onstart === 0) {
            var text = document.getElementById("intro")
            text.innerHTML = "Jimmy has hidden your gold somewhere high up. <br/> Jump from block to block to reach the glowing ball and reclaim your gold. <br/> (Hint: You can double jump when standing on a block)"
    
            if (window.introTimeoutReference) {
                clearTimeout(window.introTimeoutReference)
            }
    
            window.introTimeoutReference = setTimeout(() => {
                document.getElementById("intro").innerText = ``
            }, introTimeout)
    
            onstart = 0
        }
    });

    winScreen.addEventListener('click', () => {
        window.location.replace('./index.html')
    })

    controls.addEventListener('lock', function () {
        winScreen.style.display = "none"
        instructions.style.display = 'none';
        blocker.style.display = 'none';

    });

    controls.addEventListener('unlock', function () {
        if (window.won) {
            winScreen.style.display = 'flex'
        } else {
            blocker.style.display = 'block';
            instructions.style.display = '';
    
        }

        window.won = false
    });

    scene.add(controls.getObject());

    const onKeyDown = function (event) {
        switch (event.code) {

            case 'ArrowUp':
            case 'KeyW':
                // if (!collideWalls(new THREE.Vector3(1, 0, 1), Math.abs(velocity.y))) {
                    moveForward = true;
                // }
                break;

            case 'ArrowLeft':
            case 'KeyA':
                // if (!collideWalls(new THREE.Vector3(1, 0, 1), Math.abs(velocity.y))) {
                    moveLeft = true;
                // }
                break;

            case 'ArrowDown':
            case 'KeyS':
                // if (!collideWalls(new THREE.Vector3(1, 0, 1), Math.abs(velocity.y))) {
                    moveBackward = true;
                // }
                break;

            case 'ArrowRight':
            case 'KeyD':
                // if (!collideWalls(new THREE.Vector3(1, 0, 1), Math.abs(velocity.y))) {
                    moveRight = true;
                // }
                break;

            case 'Space':
                if (canJump === true) velocity.y += 350;
                canJump = false;
                break;
        }

    };

    const onKeyUp = function (event) {

        switch (event.code) {

            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;

            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;

            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;

        }

    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0), 0, 10);

    // floor

    const floorSize = 100;

    let floorGeometry = new THREE.PlaneGeometry(floorSize * 2, floorSize * 2, 1000, 1000);
    floorGeometry.rotateX(- Math.PI / 2);

    const textureLoader = new THREE.TextureLoader();

    // const lavaTexture = textureLoader.load('/mazegamefixed/res/lavatile.jpg')

    // lavaTexture.wrapS = lavaTexture.wrapT = THREE.RepeatWrapping
    // lavaTexture.encoding = THREE.sRGBEncoding;

    const floorBumpMap = textureLoader.load('/mazegamefixed/res/floor_bump.png')
    floorBumpMap.wrapT = floorBumpMap.wrapS = THREE.RepeatWrapping;
    floorBumpMap.repeat.set(100, 100);

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b3636,
        bumpMap: floorBumpMap,
        bumpScale: 0.64,
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial)

    scene.add(floorMesh)

    // WALLS

    const wallBump = textureLoader.load('/mazegamefixed/res/bump.png')

    wallBump.wrapT = wallBump.wrapS = THREE.RepeatWrapping;
    wallBump.repeat.set(100, 100);

    let wall1Geom = new THREE.PlaneGeometry(2000, 2000, 1, 1)
    wall1Geom.rotateY(Math.PI)
    wall1Geom.verticesNeedUpdate = true;
    wall1Geom.translate(0, 0, floorSize + 10)
    wall1Geom.vertices

    const wallMaterial = new THREE.MeshPhongMaterial( { 
        color: 0x6e6b6b, 
        bumpMap: wallBump, 
        shininess: 12,
        side: THREE.FrontSide 
    })

    const wall1Mesh = new THREE.Mesh(wall1Geom, wallMaterial)
    
    scene.add(wall1Mesh);

    let wall2Geom = new THREE.PlaneGeometry(2000, 2000, 1, 1)
    wall2Geom.verticesNeedUpdate = true;
    wall2Geom.rotateY(Math.PI * 2)
    wall2Geom.translate(0, 0, -floorSize - 10)

    const wall2Mesh = new THREE.Mesh(wall2Geom, wallMaterial)

    scene.add(wall2Mesh);

    let wall3Geom = new THREE.PlaneGeometry(2000, 2000, 1, 1)
    wall3Geom.verticesNeedUpdate = true;
    wall3Geom.rotateY(Math.PI * 1.5)
    wall3Geom.translate(floorSize + 10, 0, 0)

    const wall3Mesh = new THREE.Mesh(wall3Geom, wallMaterial)

    scene.add(wall3Mesh);

    let wall4Geom = new THREE.PlaneGeometry(2000, 2000, 1, 1)
    wall4Geom.verticesNeedUpdate = true;
    wall4Geom.rotateY(Math.PI * 0.5)
    wall4Geom.translate(-floorSize - 10, 0, 0)

    const wall4Mesh = new THREE.Mesh(wall4Geom, wallMaterial)

    scene.add(wall4Mesh);

    walls.push(wall1Mesh, wall2Mesh, wall3Mesh, wall4Mesh);

    // WALLS END

    // vertex displacement =

    let position = floorGeometry.attributes.position;

    for (let i = 0, l = position.count; i < l; i++) {

        vertex.fromBufferAttribute(position, i);

        vertex.x += Math.random() * 20 - 10;
        vertex.y += Math.random() * 2;
        vertex.z += Math.random() * 20 - 10;

        position.setXYZ(i, vertex.x, vertex.y, vertex.z);

    }

    const boxGeometry = new THREE.BoxGeometry(20, 20, 20).toNonIndexed();

    position = boxGeometry.attributes.position;
    const colorsBox = [];

    for (let i = 0, l = position.count; i < l; i++) {
        color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
        colorsBox.push(color.r, color.g, color.b);
    }

    boxGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsBox, 3));

    const boxPositions = [];

    for (let i = 0; i < 500; i++) {

        const [x, y, z] = [Math.floor(Math.random() * 20 - 10) * 20, Math.floor(Math.random() * 20) * 20 + 10, Math.floor(Math.random() * 20 - 10) * 20]

        if (x > floorSize || x < -floorSize || z > floorSize || z < -floorSize) {
            continue
        }



        const boxMaterial = new THREE.MeshPhongMaterial({ 
            specular: 0xffffff, 
            flatShading: true, 
            vertexColors: true 
        });
        // boxMaterial.color.setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
        boxMaterial.color.setHSL(360, 0.6, 0.21);

        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.x = x
        box.position.y = y
        box.position.z = z
        boxPositions.push([x, y, z])
        scene.add(box);
        objects.push(box);
    }

    boxPositions.sort((a, b) => b[1] - a[1])

    // const randPosition = Math.floor(Math.random() * boxPositions.length * 0.8)
    
    // GOAL
    const goalPosition = boxPositions[0];

    const goalGeom = new THREE.SphereGeometry(5, 32, 16)
    const goalMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
    const goalSphere = new THREE.Mesh( goalGeom, goalMaterial );
    const goalLight = new THREE.PointLight( 0xFF6600, 5, 0, 0 );
    goalSphere.position.x = goalPosition[0]
    goalSphere.position.y = goalPosition[1] + 20
    goalSphere.position.z = goalPosition[2]

    goalLight.position.set(goalPosition[0], goalPosition[1] + 20, goalPosition[2])

    window.goalPosition = goalPosition;
    window.goal = goalSphere;
    scene.add(goalSphere)
    scene.add(goalLight)
    //

    renderer = new THREE.WebGLRenderer({ antialias: true });
    // renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('wrapper').appendChild(renderer.domElement);

    //

    window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function collideWalls(dir, amount) {
    const raycaster = new THREE.Raycaster(new THREE.Vector3(
        controls.getObject().position.x,
        controls.getObject().position.y - 10,
        controls.getObject().position.z), dir, 0, amount + 5)
    const intersectWalls = raycaster.intersectObjects(walls, false)
    return intersectWalls.length > 0 && intersectWalls[0].distance - 5 < amount
}

function collideGoal(dir, amount) {
    const raycaster = new THREE.Raycaster(new THREE.Vector3(
        controls.getObject().position.x,
        controls.getObject().position.y - 10,
        controls.getObject().position.z), dir, 0, amount + 10)

    const intersectGoal = raycaster.intersectObjects([window.goal], false)
    return intersectGoal.length > 0
}


function animate() {

    requestAnimationFrame(animate);

    const time = performance.now();

    if (controls.isLocked === true) {
        raycaster.ray.origin.copy(controls.getObject().position);
        raycaster.ray.origin.y -= 10;


        const intersections = raycaster.intersectObjects(objects, false);

        const onObject = intersections.length > 0;

        const delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // this ensures consistent movements in all directions


        const cTheta = Math.cos(window.player.theta);
        const sTheta = Math.sin(window.player.theta);
        const dir = new THREE.Vector3(-1.0 * sTheta, 0, -1.0 * cTheta);
        const moveSpeed = 50.0 * delta 
        const xProd = new THREE.Vector3();
        xProd.crossVectors(dir, new THREE.Vector3(0, 1.0, 0));

        if (collideGoal(dir, moveSpeed) || collideGoal(new THREE.Vector3(-dir.x, -dir.y, -dir.z), moveSpeed) 
            || collideGoal(new THREE.Vector3(-xProd.x, -xProd.y, -xProd.z), moveSpeed) || collideGoal(xProd, moveSpeed)) {
                controls.unlock()
                window.won = true;
                prevTime = time;
                renderer.render(scene, camera);
            return 
        }

        if ((moveForward && collideWalls(dir, moveSpeed)) || 
            (moveBackward && collideWalls(new THREE.Vector3(-dir.x, -dir.y, -dir.z), moveSpeed)) || 
            (moveLeft && collideWalls(new THREE.Vector3(-xProd.x, -xProd.y, -xProd.z), moveSpeed)) || 
            (moveRight && collideWalls(xProd, moveSpeed))) {
                prevTime = time;

                renderer.render(scene, camera);
            return 
        }


        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

        if (onObject === true) {

            velocity.y = Math.max(0, velocity.y);
            canJump = true;

        }

        controls.moveRight(- velocity.x * delta);
        controls.moveForward(- velocity.z * delta);

        controls.getObject().position.y += (velocity.y * delta); // new behavior

        if (controls.getObject().position.y < 10) {

            velocity.y = 0;
            controls.getObject().position.y = 10;

            canJump = true;

        }

    }

    prevTime = time;

    renderer.render(scene, camera);

}

const start = function () {
    timer.start();
};