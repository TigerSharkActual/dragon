import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
window.start = start;

// This section of code builds the key listeners. It is outside of the start function to prevent them from being rebuilt every restart.
const direction = new THREE.Vector3(0, 0, -1);
const keys = {};

window.addEventListener('keydown', function(event) {
    keys[event.key] = true;
});

window.addEventListener('keyup', function(event) {
    keys[event.key] = false;
});

let renderer = null; // This is where the program can assess if this is the first time the game is being 
let scene = null;                    // played and if not line 23 will remove the old canvas.
let animationID = null;

// This is the nosie maker for creating terrain.
const noise = new ImprovedNoise();


function start() 
{
    document.getElementById('liveScore').style.display = 'none';
    document.getElementById('liveScore').style.display = 'block';
    document.getElementById('liveScore').textContent = 'Coin Count: 0';
    document.getElementById('gameOver').style.display = 'none';
    if (renderer != null)
    {
        scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });
        renderer.dispose();
        renderer.domElement.remove();
    }

    if (animationID != null) 
    {
        cancelAnimationFrame(animationID);
    }
    document.getElementById('startMenu').style.display = 'none';
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //camera
    scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 1, 3);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    // This randomly sets where the peaks and vallies will spawn.
    const seedX = Math.random() * 1000;
    const seedY = Math.random() * 1000;
    const seedZ = Math.random() * 1000;

    // This function is what makes the terrain and provides the data for the collision.
    const baseRadius = 1000;
    const maxPeak = 10;
    const maxVally = 500;
    const noiseScale = 5;

    // This provides the colors for the terrain.
    const valleyColer = new THREE.Color('#CD853F');
    const midColor = new THREE.Color('#228B22');
    const peakColor = new THREE.Color('#FFFAFA');

    function terrainRadius(direction)
    {
        const n = noise.noise
        (
            direction.x * noiseScale + seedX,
            direction.y * noiseScale + seedY,
            direction.z * noiseScale + seedZ,
        );
        return n >= 0 ? baseRadius - n * maxPeak : baseRadius - n * maxVally;
    }

    // The Sun's point light.
    const sun_point_light = new THREE.PointLight('#FFDEAD', 2, 0, 0); // color, intensity, no falloff distance.
    sun_point_light.position.set(0, 0, 0);
    sun_point_light.castShadow = true;
    sun_point_light.shadow.mapSize.set(1024, 1024);
    sun_point_light.shadow.camera.near = 1;
    sun_point_light.shadow.camera.far = 1100;
    scene.add(sun_point_light);

    // The Sun's ambient light.
    const sun_ambient = new THREE.AmbientLight(0xffffff, 0.5); // This fills the space with light.
    scene.add(sun_ambient);

    // This is the phyisical sun on the map.
    const sunRadius = 40;
    const geoSun = new THREE.IcosahedronGeometry(sunRadius, 52);
    const matSun = new THREE.MeshBasicMaterial({ 
        color: '#fff5cc'});
    const sunMesh = new THREE.Mesh(geoSun, matSun);
    sunMesh.position.set(0, 0, 0);
    scene.add(sunMesh);

    //top sphere
    const geoSphereTop = new THREE.SphereGeometry(baseRadius, 64, 64);
    const matSphereTop = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        vertexColors: true,
        side: THREE.BackSide,
        roughness: 0.8, metalness: 0.1,
        //map: mapTexture 
    });
    
    const sphereTop = new THREE.Mesh(geoSphereTop, matSphereTop);
    sphereTop.receiveShadow = true;
    sphereTop.castShadow = true;
    scene.add(sphereTop);

    
    // This makes the actual peaks and vallies.
    const posAttr = geoSphereTop.attributes.position;
    const vertex = new THREE.Vector3();
    
    const colors = new Float32Array(posAttr.count * 3); // Storage of the terrain colors.
    const vertexColer = new THREE.Color(); 
    
    for (let i = 0; i < posAttr.count; i++)
    {
        vertex.fromBufferAttribute(posAttr, i);
        const dir = vertex.clone().normalize();
        const r = terrainRadius(dir);
        vertex.copy(dir).multiplyScalar(r);
        posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);

        const delta = baseRadius - r; // This computes the colers per vertex.
        if (delta >= 0)
        {
            vertexColer.lerpColors(midColor, peakColor, delta / maxPeak);
        } else 
        {
            vertexColer.lerpColors(midColor, valleyColer, -delta / maxVally);
        }
        colors[i * 3] = vertexColer.r;
        colors[i * 3 + 1] = vertexColer.g;
        colors[i * 3 + 2] = vertexColer.b;
    
    }
    posAttr.needsUpdate = true;
    geoSphereTop.computeVertexNormals();
    geoSphereTop.setAttribute('color', new THREE.BufferAttribute(colors, 3));


    // Dragon head construction.
    const geometry = new THREE.ConeGeometry(2, 5, 9);
    const material = new THREE.MeshStandardMaterial({
        color: '#eb5eb0',
        roughness: 0.8, metalness: 0.1});
    const dragonHead = new THREE.Mesh(geometry, material);
    dragonHead.castShadow = true;
    dragonHead.rotation.x = Math.PI / 2;
    const group = new THREE.Group();
    group.add(dragonHead);
    scene.add(group);
    group.position.set(0, 0, -450);

    // Dragon Body.
    const posHistory = [];
    const quatHistory = [];
    const bodySegment = [];
    const localAlignQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    let Speed = 4;
    const maxSpeed = 10;
    const rate = 0.2;
    const bodyRadius = 3;
    let bodySegmentLag = Math.ceil(bodyRadius * 2 / Speed);

    function createBodySegment() {
        const bodyGeom = new THREE.OctahedronGeometry(bodyRadius, 0);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: '#a00b9d',
            roughness: 0.8, 
            metalness: 0.1});
        const dragonBody = new THREE.Mesh(bodyGeom, bodyMaterial);
        dragonBody.castShadow = true;
        scene.add(dragonBody);
        bodySegment.push(dragonBody);
    };
    for (let i = 0; i < 105; i++) {
        createBodySegment()
    };

    let coinScore = 0;

    // Coin creation
    const coinGeom = new THREE.CylinderGeometry(10, 10, 0.5);
    const coinMaterial = new THREE.MeshStandardMaterial({
        color: '#ffd700',
        roughness: 0.1,
        metalness: 0.9,
        emissive: '#ffd700',
        emissiveIntensity: 0.6
    });
    const coinBatchSize = 5;
    const coins = [];
    for (let i = 0; i < coinBatchSize; i++)
    {
        const coin = new THREE.Mesh(coinGeom, coinMaterial);
        scene.add(coin);
        coins.push(coin);
    }
    let coinsRemaining = coinBatchSize;

    // Fart creation.
    const fart = []; // This holds the positions of all farts so that they do not disapear.
    const fartGeom = new THREE.OctahedronGeometry(10, 2);
    const fartMaterial = new THREE.MeshStandardMaterial({color: '#9acd32'});
    const fartQueue = []; // This is where the pending fart position is held while the dragon flys though that space.

    function createFart(position) {
        const fartMesh = new THREE.Mesh(fartGeom, fartMaterial);
        fartMesh.position.copy(position);
        scene.add(fartMesh);
        fart.push(fartMesh);
    };

    function placeCoin(coin) {
        coin.position.set(
        Math.random() * 2 -1,
        Math.random() * 2 -1,
        Math.random() * 2 -1
    );
    coin.position.normalize();
    coin.position.multiplyScalar(50 + Math.random() * (((baseRadius - 10)) - 50));
    coin.visible = true;
    }

    function spawnCoinBatch()
    {
        for (const coin of coins)
        {
            placeCoin(coin);
        }
        coinsRemaining = coinBatchSize;
    }
    spawnCoinBatch();

    function animate() {
        animationID = requestAnimationFrame(animate);
        const localAxisY = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion);
        
        const pitchQ = new THREE.Quaternion();
        const rollQ = new THREE.Quaternion();
        const yawQ = new THREE.Quaternion();
        
        if (keys['ArrowUp']) pitchQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.025);
        if (keys['ArrowDown']) pitchQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.025);
        if (keys['ArrowRight']) rollQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.025);
        if (keys['ArrowLeft']) rollQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.025);
        if (keys['a']) yawQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.025);
        if (keys['d']) yawQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.025);
        
        group.quaternion.multiply(pitchQ).multiply(rollQ).multiply(yawQ);
        
        group.getWorldDirection(direction);
        group.position.add(direction.clone().multiplyScalar(Speed)); //Speed of dragon.
        posHistory.push(group.position.clone());
        quatHistory.push(group.quaternion.clone());

        // Body loop.
        for (let i = 0; i < bodySegment.length; i++) 
        {
            const frameBacks = (bodyRadius * 2 * (i + 1)) / Speed;
            let idx = posHistory.length - 1 - frameBacks;
            idx = Math.max(0, Math.min(posHistory.length - 1, idx));

            const indexLow = Math.floor(idx);
            const indexHigh = Math.min(posHistory.length - 1, indexLow + 1);
            const t = idx - indexLow;

            bodySegment[i].position.lerpVectors(posHistory[indexLow], posHistory[indexHigh], t);
            bodySegment[i].quaternion.slerpQuaternions(quatHistory[indexLow], quatHistory[indexHigh], t).multiply(localAlignQ);
        }

        /* This code block is the how the fartQueue works. We take in the old coin position and store it as the new fart position. */
    if (fartQueue.length > 0 && posHistory.length - fartQueue[0].frame >= bodySegment.length * bodySegmentLag) {
        createFart(fartQueue[0].position);
        fartQueue.shift();
    }
    
        camera.position.copy(group.position)
        .addScaledVector(direction, -20)
        .addScaledVector(localAxisY, 8);
        camera.up.copy(localAxisY);
        camera.lookAt(group.position.clone().addScaledVector(direction, 15));
        
        
        
        // Dragon eats coin
        for (const coin of coins)
        {
            if (!coin.visible) continue;

        coin.rotateX(0.1); // Spins coin.

        if (group.position.distanceTo(coin.position) <= 12) 
            {
            createBodySegment();
            fartQueue.push({position: coin.position.clone(), frame: posHistory.length})
            coin.visible = false;
            coinsRemaining--;
            coinScore++;
            document.getElementById('liveScore').textContent = "Coin Count: " + coinScore;
            if (coinScore % 5 == 0)
            {
                Speed += (maxSpeed - Speed) * rate;
                bodySegmentLag = Math.ceil(bodyRadius * 2 / Speed);
            }
        }
    }
    
    if (coinsRemaining === 0)
        {
            spawnCoinBatch();
        }

        for (let i = 0; i < fart.length; i++) {
            if (group.position.distanceTo(fart[i].position) < 12) 
                {
                cancelAnimationFrame(animationID);
                document.getElementById('scoreDisplay').textContent = 'Score: ' + coinScore;
                document.getElementById('gameOver').style.display = 'flex';
                return;
            }  
        }
        
        const startPeriord = 30; // This is to allow the dragon to be build. Without this piord of time the posHistory will still be using the heads postion and thus trigger the loose codition.

        // This handles the collsion with the sun.
        if (posHistory.length > startPeriord) 
            {
            if (group.position.distanceTo(sunMesh.position) < sunRadius) 
                {
                cancelAnimationFrame(animationID);
                    document.getElementById('scoreDisplay').textContent = 'Score: ' + coinScore;
                    document.getElementById('gameOver').style.display = 'flex';
                    return;
            }
        }

        const dragonNeck = 3; // The head is attached to the neck so I need the neck to not tirgger the lose condition.
        

        if (posHistory.length > startPeriord)
            {
            for (let i = dragonNeck; i < bodySegment.length; i++) {
                if (group.position.distanceTo(bodySegment[i].position) < 3) {
                    cancelAnimationFrame(animationID);
                    document.getElementById('scoreDisplay').textContent = 'Score: ' + coinScore;
                    document.getElementById('gameOver').style.display = 'flex';
                    return;
                }
            }
            const dragonDir = group.position.clone().normalize();
            if (group.position.length() >= terrainRadius(dragonDir))
                {
                cancelAnimationFrame(animationID);
                document.getElementById('scoreDisplay').textContent = 'Score: ' + coinScore;
                document.getElementById('gameOver').style.display = 'flex';
            return;
        }
        }
        renderer.render(scene, camera);
    }
    animate();
};