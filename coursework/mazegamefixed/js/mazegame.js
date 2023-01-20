import * as THREE from 'three'

import Asset from './assetmanager.js'

import TorchBuilder from './torch.js';

import { Direction, DirectionToAngle, rotclamp } from './utils.js'

class Game {
    constructor(args) {
        const scene = window.scene
        const camera = window.camera
        this.hacks = !!args.hacks || false;
        window.player = { position: new THREE.Vector3(2, 0.1, 2), theta: Math.PI * 1.5, phi: 0 };

        document.onkeydown = function (evnt) {
            window.inputmanager.keyDown(evnt.keyCode);
        };

        document.onkeyup = function (evnt) {
            window.inputmanager.keyUp(evnt.keyCode);
        };

        Asset.init();

        const light = new THREE.AmbientLight(0x909090);
        scene.add(light);

        // init pointerlock
        if (requestPointerLock()) {
            new PointerLock();
        }

        window.player.light = new THREE.PointLight(0xffffff, 0.6, 1);
        scene.add(window.player.light);

        // Euler rotation order for camera movement
        camera.rotation.order = "ZYX";
        window.player.update = function () {
            this.light.position.copy(this.position);
            camera.position.copy(this.position);

            camera.rotation.y = this.theta;
            camera.rotation.x = this.phi;
        };

        window.player.update();

        const maze = generateMaze(args.width, args.height);
        const mazeWalls = [];

        console.log(maze)

        const torchBuilder = new TorchBuilder();

        // Gaps
        let walls = [];
        for (let x = 0; x < maze.width * 2 + 1; x++) {
            walls[x] = [];
            if (x % 2 === 0) {
                for (let y = 0; y < maze.height * 2 + 1; y++) {
                    walls[x].push((y % 2 === 0 || !(x > 0 && maze.vertical[x / 2 - 1][Math.floor(y / 2)])));
                }
            }
            else {
                for (let y = 0; y < maze.height * 2 + 1; y++) {
                    walls[x].push((y % 2 === 0 && !(y > 0 && maze.horizontal[(x - 1) / 2][y / 2 - 1])));
                }
            }
        }

        walls[0][1] = false; // start
        
        //increase the size of the plane
        const actualMazeWidth = walls.length + 7;
        const actualMazeHeight = walls[0].length + 3;

        //push the maze forwards to create a starting room
        const room = [Array(walls[0].length).fill(true), Array(walls[0].length).fill(true), Array(walls[0].length).fill(true)]

        room[2][1] = room[1][1] = room[2][2] = room[1][2] = false

        walls = room.concat(walls)

        console.log(walls);

        // ! WALLS ARE Z, X !

        const xw = []; // walls along x axis, first dimension is x, second z
        const zw = []; // walls along z axis, first dimension is z, second x

        // additional + 1 is for ez culling
        for (let x = 0; x < actualMazeWidth + 1; x++) {
            xw.push([]);
            for (let z = 0; z < actualMazeHeight + 1 + 1; z++) {
                xw[x].push(false);
            }
        }
        for (let z = 0; z < actualMazeHeight + 1; z++) {
            zw.push([]);
            for (let x = 0; x < actualMazeWidth + 1 + 1; x++) {
                zw[z].push(false);
            }
        }

        for (let x = 0; x < actualMazeWidth; x++) {
            for (let z = 0; z < actualMazeHeight; z++) {
                if (walls[z][x]) {
                    // remove size conditions, replace by unrolled loop
                    if (z <= 0 || !walls[z - 1][x]) {
                        // front
                        xw[x][z] = { flipped: 1 };
                    }
                    if (z >= actualMazeHeight - 1 || !walls[z + 1][x]) {
                        // back
                        xw[x][z + 1] = { flipped: 0 };
                    }
                    if (x <= 0 || !walls[z][x - 1]) {
                        // left
                        zw[z][x] = { flipped: 1 };
                    }
                    if (x >= actualMazeWidth - 1 || !walls[z][x + 1]) {
                        // right
                        zw[z][x + 1] = { flipped: 0 };
                    }
                }
            }
        }

        const matrix = new THREE.Matrix4();
        const tmpgeom = new THREE.Geometry();

        const SingleWallGeom = new THREE.PlaneBufferGeometry(1, 1);

        const SingleWallGeoms = {
            x: [
                new THREE.Geometry().fromBufferGeometry(
                    SingleWallGeom.clone()
                        .rotateY(Math.TAU / 4)
                ),
                new THREE.Geometry().fromBufferGeometry(
                    SingleWallGeom.clone()
                        .rotateY(Math.TAU * 3 / 4)
                )
            ],
            z: [
                new THREE.Geometry().fromBufferGeometry(SingleWallGeom),
                new THREE.Geometry().fromBufferGeometry(
                    SingleWallGeom.clone()
                        .rotateY(Math.PI)
                )
            ]
        }

        // Generate geometries and merge them
        // x axis
        for (let z = 0; z < xw[0].length; z++) {
            for (let x = 0; x < xw.length; x++) {
                const wall = xw[x][z];
                if (wall) {
                    matrix.makeTranslation(
                        z - 1 / 2,
                        0,
                        x
                    );

                    tmpgeom.merge(
                        SingleWallGeoms.x[wall.flipped],
                        matrix
                    );
                }
            }
        }

        // z axis
        for (let x = 0; x < zw[0].length; x++) {
            for (let z = 0; z < zw.length; z++) {
                const wall = zw[z][x];
                if (wall) {
                    matrix.makeTranslation(
                        z,
                        0,
                        x - 1 / 2
                    );

                    tmpgeom.merge(
                        SingleWallGeoms.z[wall.flipped],
                        matrix
                    );
                }
            }
        }

        const mazeGeom = new THREE.BufferGeometry().fromGeometry(tmpgeom);
        mazeGeom.computeBoundingSphere();

        window.geometries.push(mazeGeom)


        const CubeBumpMap = Asset.texture("bump.png");
        CubeBumpMap.wrapT = CubeBumpMap.wrapS = THREE.RepeatWrapping;
        CubeBumpMap.offset.set(0, 0);
        CubeBumpMap.repeat.set(1, 1); 


        const CubeMaterial = new THREE.MeshPhongMaterial({
            color: 0x5c5a5a,
            bumpMap: CubeBumpMap,
            bumpScale: 0.55,
            shininess: 12,
            side: THREE.DoubleSide
        });
        CubeMaterial.displacementMap = CubeBumpMap;
        CubeMaterial.displacementScale = 23;

        const mazeMesh = new THREE.Mesh(
            mazeGeom,
            CubeMaterial
        );
        scene.add(mazeMesh);

        function getRandomSubarray(arr, size) {
            const shuffled = arr.slice(0);
            let i = arr.length
            let temp, index;
            while (i--) {
                index = Math.floor((i + 1) * Math.random());
                temp = shuffled[index];
                shuffled[index] = shuffled[i];
                shuffled[i] = temp;
            }
            return shuffled.slice(0, size);
        }

        const wallPositions = []

        for (let x = 0; x < walls.length; x++) {
            for (let y = 0; y < walls[x].length; y++) {
                if (x >= 3 && y >= 3 && !walls[x][y]) {
                    wallPositions.push([x, y])
                }
            }
        }

        //radom torch generation
        this.torchPositions = [];
        getRandomSubarray(wallPositions, window.totalTorches - 1).forEach(e => {
            const [x, y] = e;
            const options = [];
            if (x > 0 && walls[x - 1][y])
                options.push(Direction.West);
            if (x < walls.length - 1 && walls[x + 1][y])
                options.push(Direction.East);

            if (y > 0 && walls[x][y - 1])
                options.push(Direction.South);
            if (y < walls[x].length - 1 && walls[x][y + 1])
                options.push(Direction.North);

            const ref = torchBuilder.addTorch(new THREE.Vector3(x, 0, y), DirectionToAngle(options.randomElement()));

            this.torchPositions.push({ x: x, y: 0, z: y, lit: true, ref: ref })
        })

        // Place a torch at the entrance of the maze
        const ref = torchBuilder.addTorch(new THREE.Vector3(1, 0, 2), DirectionToAngle(Direction.North));
        this.torchPositions.push({ x: 1, y: 0, z: 2, lit: true, ref: ref })
        torchBuilder.finish();

        mazeWalls.push(mazeMesh);
        this.walls = mazeWalls;

        const MazePlane = new THREE.PlaneGeometry(actualMazeWidth, actualMazeHeight);

        const CeilingBumpMap = Asset.texture("ceiling_bump.png");
        CeilingBumpMap.wrapT = CeilingBumpMap.wrapS = THREE.RepeatWrapping;
        CeilingBumpMap.repeat.set(actualMazeWidth, actualMazeHeight);

        const CeilingMaterial = new THREE.MeshPhongMaterial({
            color: 0x5c5a5a,
            bumpMap: CeilingBumpMap,
            bumpScale: 0.4,
            shininess: 11
        });

        const Ceiling = new THREE.Mesh(MazePlane, CeilingMaterial);
        Ceiling.position.set(maze.width, 1 / 2, maze.height);
        Ceiling.rotation.x = Math.TAU / 4;
        scene.add(Ceiling);


        const FloorBumpMap = Asset.texture("floor_bump.png");
        FloorBumpMap.wrapT = FloorBumpMap.wrapS = THREE.RepeatWrapping;
        FloorBumpMap.repeat.set(actualMazeWidth, actualMazeHeight);

        const FloorMaterial = new THREE.MeshPhongMaterial({
            color: 0x4d4c4c,
            bumpMap: FloorBumpMap,
            bumpScale: 0.64,
            shininess: 10
        });

        const Floor = new THREE.Mesh(MazePlane, FloorMaterial);
        Floor.position.set(maze.width, -1 / 2, maze.height);
        Floor.rotation.x = Math.TAU * 3 / 4;
        scene.add(Floor);

        window.geometries.push(MazePlane)
        window.materials.push(CeilingMaterial, FloorMaterial)
    }

    playerCollides(dir, amount) {
        console.log(dir);
        const ray = new THREE.Raycaster(window.player.position, dir, 0, amount + 0.14);

        const colliders = ray.intersectObjects(this.walls, false);

        return (colliders.length > 0 && colliders[0].distance - 0.5 < amount);
    };

    update(delta) {
        this.MoveSpeed = 1.5 * delta;
        const KeyRotateSpeed = 1.4 * delta;

        // debux hax
        // if (window.inputmanager.isKeyPressed(113 /*f2*/)) {
        //     this.hacks ^= true;
        // }

        // if (this.hacks) {
        //     if (window.inputmanager.isKeyDown(16 /*shift*/)) {
        //         this.MoveSpeed *= 4; // Go faster!
        //     }

        //     if (window.inputmanager.isKeyDown(32 /*space*/)) {
        //         window.player.position.y += this.MoveSpeed; // Go up
        //     }
        //     else if (window.inputmanager.isKeyDown(17 /*ctrl*/)) {
        //         window.player.position.y -= this.MoveSpeed; // Go down
        //     }
        // }

        if (window.start === 0) {
            var text = document.getElementById("intro")
            text.innerHTML = "Jimmy the goblin has stolen your gold. <br> Collect all the torches to escape the maze and reclaim your treasure."

            if (window.introTimeoutReference) {
                clearTimeout(window.introTimeoutReference)
            }

            window.introTimeoutReference = setTimeout(() => {
                document.getElementById("intro").innerText = ``
            }, introTimeout)

            window.start++
        }

        if (window.inputmanager.isKeyDown(81 /*q*/)) {
            window.player.theta += KeyRotateSpeed; /* turn left */
        }
        else if (window.inputmanager.isKeyDown(69 /*e*/)) {
            window.player.theta -= KeyRotateSpeed; /* turn right */
        }

        window.player.theta = rotclamp(window.player.theta);

        const cTheta = Math.cos(window.player.theta);
        const sTheta = Math.sin(window.player.theta);

        const dir = new THREE.Vector3(-1.0 * sTheta, 0, -1.0 * cTheta);

        if ((
            window.inputmanager.isKeyDown(87 /* w */) ||
            window.inputmanager.isKeyDown(38 /* arrow key up */)
        ) &&
            !this.playerCollides(dir, this.MoveSpeed)) {
            // Move forward
            console.log(dir)
            window.player.position.x += dir.x * this.MoveSpeed;
            window.player.position.z += dir.z * this.MoveSpeed;
        }
        else if ((
            window.inputmanager.isKeyDown(83 /* s */) ||
            window.inputmanager.isKeyDown(40 /* arrow key down */)
        ) &&
            !this.playerCollides(new THREE.Vector3(-dir.x, -dir.y, -dir.z), this.MoveSpeed)) {
            // Move backward
            window.player.position.x -= dir.x * this.MoveSpeed;
            window.player.position.z -= dir.z * this.MoveSpeed;
        }

        const xProd = new THREE.Vector3();
        xProd.crossVectors(dir, new THREE.Vector3(0, 1.0, 0));

        if ((
            window.inputmanager.isKeyDown(65 /* a */) ||
            window.inputmanager.isKeyDown(37 /* arrow key left */)
        ) &&
            !this.playerCollides(new THREE.Vector3(-xProd.x, -xProd.y, -xProd.z), this.MoveSpeed)) {
            // Move left
            window.player.position.x -= xProd.x * this.MoveSpeed;
            window.player.position.z -= xProd.z * this.MoveSpeed;
        }
        else if ((
            window.inputmanager.isKeyDown(68 /*d*/) ||
            window.inputmanager.isKeyDown(39 /* arrow key right */)
        ) &&
            !this.playerCollides(xProd, this.MoveSpeed)) {
            // Move right
            window.player.position.x += xProd.x * this.MoveSpeed;
            window.player.position.z += xProd.z * this.MoveSpeed;
        }

        //check if the player is near a torch
        const getNearbyTorch = () => {
            for (const torchPosition of this.torchPositions) {
                const dist = Math.sqrt(Math.pow(window.player.position.x - torchPosition.x, 2) + Math.pow(window.player.position.z - torchPosition.z, 2))
                if (dist <= 0.5) {
                    return torchPosition
                }
            }

            return null
        }

        //interaction with lit torches on the wall
        const lightPlayersTorch = () => {
            scene.remove(window.player.light)
            window.player.light = new THREE.PointLight(0xb31010, 1, 3);
            scene.add(window.player.light);

            window.torchCount++;

            const torchesLeft = window.totalTorches - window.torchCount

            document.getElementById("torch-count").innerText = `Torches Left: ${torchesLeft} ${torchesLeft == 0 ? ". Head to the door!" : ""}`

            if (window.torchTimeoutReference) {
                clearTimeout(window.torchTimeoutReference)
            }

            window.torchTimeoutReference = setTimeout(() => {
                //change the light source from the player
                scene.remove(window.player.light)
                document.getElementById("torch-hand").style.backgroundImage = `url(./res/unlit_torch.png)`;
                window.player.light = new THREE.PointLight(0xF5D576, 0.6, 1);
                scene.add(window.player.light);
            }, torchTimeout)
        }

        const nearbyTorch = getNearbyTorch()

        if (nearbyTorch) {
            if (nearbyTorch.lit) {
                document.getElementById('torch-hint').style.opacity = 1;
            }

            if (window.inputmanager.isKeyDown(84)) {
                if (nearbyTorch && nearbyTorch.lit) {
                    nearbyTorch.lit = false;
                    scene.remove(nearbyTorch.ref);
                    lightPlayersTorch()
                    document.getElementById("torch-hand").style.backgroundImage = `url(./res/lit_torch.png)`;
                    document.getElementById('torch-hint').style.opacity = 0;
                }

            }
        } else {
            document.getElementById('torch-hint').style.opacity = 0;
        }

        //level finish
        const nearbyDoor = Math.sqrt(Math.pow(window.player.position.x - 1, 2) + Math.pow(window.player.position.z - 1, 2)) <= 0.5
        const torchesLeft = window.totalTorches - window.torchCount

        if (nearbyDoor && torchesLeft === 0) {
            window.scene.children.forEach(s => {
                window.scene.remove(s)
            })
            window.location.replace('./second.html')
        }
        
        window.player.update();

        window.inputmanager.update();
    };

    mustRender() {
        return true; // huehuehue
    };
};

export default Game;
