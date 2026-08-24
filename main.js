import * as THREE from 'three';
import { or } from 'three/tsl';
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

function start() 
{
    document.getElementById('liveScore').style.display = 'none';
    document.getElementById('liveScore').style.display = 'block';
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

    //top sphere
    const geoSphereTop = new THREE.SphereGeometry(500, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2);
    const matSphereTop = new THREE.MeshBasicMaterial({
        color: '#0d9deb',
        side: THREE.BackSide,
        wireframe: true
    });
    const sphereTop = new THREE.Mesh(geoSphereTop, matSphereTop);
    scene.add(sphereTop);

    //bottom sphere
    const geoSphereBottom = new THREE.SphereGeometry(500, 64, 64, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const matSphereBottom = new THREE.MeshBasicMaterial({
        color: '#f80303',
        side: THREE.BackSide,
        wireframe: true
    });
    const sphereBottom = new THREE.Mesh(geoSphereBottom, matSphereBottom);
    scene.add(sphereBottom);

    // Dragon head construction.
    const geometry = new THREE.ConeGeometry(2, 5, 9);
    const material = new THREE.MeshBasicMaterial({
        color: '#989595',
        wireframe: true});
    const dragonHead = new THREE.Mesh(geometry, material);
    dragonHead.rotation.x = Math.PI / 2;
    const group = new THREE.Group();
    group.add(dragonHead);
    scene.add(group);

    // Dragon Body.
    const posHistory = [];
    const quatHistory = [];
    const bodySegment = [];
    const localAlignQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    let Speed = 3;
    const maxSpeed = 6;
    const rate = 0.2;
    const bodyRadius = 3;
    let bodySegmentLag = Math.ceil(bodyRadius * 2 / Speed);

    function createBodySegment() {
        const bodyGeom = new THREE.OctahedronGeometry(bodyRadius, 0);
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: '#989595',
            wireframe: true});
        const dragonBody = new THREE.Mesh(bodyGeom, bodyMaterial);
        scene.add(dragonBody);
        bodySegment.push(dragonBody);
    };
    for (let i = 0; i < 105; i++) {
        createBodySegment()
    };

    let coinScore = 0;

    // Coin creation
    const coinGeom = new THREE.CylinderGeometry(5, 5, 0.5);
    const coinMaterial = new THREE.MeshBasicMaterial({color: '#e9ef74'});
    const coin = new THREE.Mesh(coinGeom, coinMaterial);
    scene.add(coin);



    // Fart creation.
    const fart = []; // This holds the positions of all farts so that they do not disapear.
    const fartGeom = new THREE.OctahedronGeometry(10, 2);
    const fartMaterial = new THREE.MeshBasicMaterial({color: '#3fea1c'});
    const fartQueue = []; // This is where the pending fart position is held while the dragon flys though that space.

    function createFart(position) {
        const fartMesh = new THREE.Mesh(fartGeom, fartMaterial);
        fartMesh.position.copy(position);
        scene.add(fartMesh);
        fart.push(fartMesh);
    };

    function spawnCoin() {
        coin.position.set(
        Math.random() * 2 -1,
        Math.random() * 2 -1,
        Math.random() * 2 -1
    );
    coin.position.normalize();
    coin.position.multiplyScalar(Math.random() * 490);
    }
    spawnCoin();

    function animate() {
        animationID = requestAnimationFrame(animate);
        const localAxisX = new THREE.Vector3(1, 0, 0).applyQuaternion(group.quaternion);
        const localAxisY = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion);
        const localAxisZ = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion);
        
        const pitchQ = new THREE.Quaternion();
        const rollQ = new THREE.Quaternion();
        const yawQ = new THREE.Quaternion();
        
        if (keys['ArrowUp']) pitchQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.05);
        if (keys['ArrowDown']) pitchQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.05);
        if (keys['ArrowRight']) rollQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.05);
        if (keys['ArrowLeft']) rollQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.05);
        if (keys['a']) yawQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.05);
        if (keys['d']) yawQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.05);
        
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

        const forward = new THREE.Vector3();
        group.getWorldDirection(forward);
    
        camera.position.copy(group.position)
        .addScaledVector(forward, -20)
        .addScaledVector(localAxisY, 8);
        camera.up.copy(localAxisY);
        camera.lookAt(group.position.clone().addScaledVector(forward, 15));
        
        coin.rotateX(0.1); // Spins coin.


        // Dragon eats coin
        if (group.position.distanceTo(coin.position) < 10) {
            createBodySegment();
            fartQueue.push({position: coin.position.clone(), frame: posHistory.length})
            spawnCoin();
            coinScore++;
            document.getElementById('liveScore').textContent = "Coin Count: " + coinScore;
            if (coinScore % 5 == 0)
            {
                Speed += (maxSpeed - Speed) * rate;
            }
            // console.log(bodySegment.length);
        }

        for (let i = 0; i < fart.length; i++) {
            if (group.position.distanceTo(fart[i].position) < 12) {
                cancelAnimationFrame(animationID);
                document.getElementById('scoreDisplay').textContent = 'Score: ' + coinScore;
                document.getElementById('gameOver').style.display = 'flex';
                return;
            }  
        }

        const dragonNeck = 3; // The head is attached to the neck so I need the neck to not tirgger the lose condition.
        
        const startPeriord = 30; // This is to allow the dragon to be build. Without this piord of time the posHistory will still be using the heads postion and thus trigger the loose codition.

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
            if (group.position.length() >= 500)
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