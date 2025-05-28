let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});

// dom
const domElements = {
    replayMenu: document.querySelector(".module__finish"),
    replayMenuScore: document.querySelector("#score"),
    replayMenuBest: document.querySelector("#best"), 
    replayBtn: document.querySelector("#replay"),

    previewMenuPressText: document.querySelector("#preview p"),
    previewMenuTitleCounter: document.querySelector("#title-counter"),
}

if(!localStorage.getItem("best")){
    localStorage.setItem("best", JSON.stringify(0));
}

let blockSize = {
    width: 3.5, 
    height: 0.6,
    depth: 3.5
}

let isMoving = true;
let isFalling = false;

let movingBlock;
let previousBlock;

let moveDirection = { x: 0.2, z: 0 };
let moveLimitX = { min: 0, max: 0 };
let moveLimitZ = { min: 0, max: 0 };
let startBlockDirections = {x: false, z: false};
let countBlock = 1;

let fallingBlocks = [];


let cameraTargetY = 10; 

Camera(camera, cameraTargetY);
Canvas(renderer);
Light(scene);
restart();


function restart(){
    if(makeBase(blockSize)) {
        startBlockDirections.x = true;
        startBlockDirections.z = false;

        if(domElements.previewMenuPressText.classList.contains("display__none")) {
            domElements.previewMenuPressText.classList.remove("display__none")
        }
        domElements.previewMenuTitleCounter.textContent = "Stack Game";
    
        const fblock = DrawBlock(blockSize, `hsl(0, 70%, 60%)`, 1, startBlockDirections);
        MoveBlock(fblock, startBlockDirections, blockSize.width);
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (movingBlock && isMoving) {
        if(moveDirection.x !== 0){
            movingBlock.position.x += moveDirection.x;

            if (movingBlock.position.x >= moveLimitX.max) {
                moveDirection.x = -Math.abs(moveDirection.x);
            }
            if (movingBlock.position.x <= moveLimitX.min) {
                moveDirection.x = Math.abs(moveDirection.x);
            } 
        }
        if(moveDirection.z !== 0){
            movingBlock.position.z += moveDirection.z;

            if (movingBlock.position.z >= moveLimitZ.max) {
                moveDirection.z = -Math.abs(moveDirection.z);
            }
            if (movingBlock.position.z <= moveLimitZ.min) {
                moveDirection.z = Math.abs(moveDirection.z);
            } 
        } 
    }

    fallingBlocks.forEach((block, index) => {
        block.position.y -= 0.5; // було 0.2
        if (block.position.y < -20) { // було -10
            scene.remove(block);
            fallingBlocks.splice(index, 1);
        }
    });
    


    if (camera.position.y < cameraTargetY) {
        camera.position.y += 0.05;
    }
    camera.lookAt(0, camera.position.y - 10, 0);

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('keydown', (e) => {
    if (isMoving) {
        if(e.code === "Space"){

            isMoving = false;

            if(startBlockDirections.x && !startBlockDirections.z){
                startBlockDirections.x = false;
                startBlockDirections.z = true;
            }
            else{
                startBlockDirections.x = true;
                startBlockDirections.z = false;
            }

            const overlap = calculateOverlap(movingBlock, previousBlock);

            if (overlap > 0) {
                const block = adjustMovingBlock(previousBlock, movingBlock, overlap);

                const overhangBlock = createOverhangBlock(previousBlock, movingBlock, overlap);
                fallingBlocks.push(overhangBlock);

                previousBlock = block;


                if(!domElements.previewMenuPressText.classList.contains("display__none")) {
                    domElements.previewMenuPressText.classList.add("display__none")
                }
                domElements.previewMenuTitleCounter.textContent = countBlock - 1;


                const nblock = DrawBlock(blockSize, `hsl(${countBlock * 9}, 70%, 60%)`, countBlock, startBlockDirections, overlap);

                const box = new THREE.Box3().setFromObject(nblock);
                const size = new THREE.Vector3();
                box.getSize(size);

                blockSize.depth = size.z;
                blockSize.width = size.x;

                MoveBlock(nblock, startBlockDirections, Math.max(blockSize.width, blockSize.depth));
           
                isMoving = true;
            } 
            else {
                isMoving = false;

                if(!domElements.previewMenuTitleCounter.classList.contains("display__none")) {
                    domElements.previewMenuTitleCounter.classList.add("display__none")
                }
                if(domElements.replayMenu.classList.contains("display__none")) {
                    domElements.replayMenu.classList.remove("display__none")
                }

                if(domElements.previewMenuTitleCounter.textContent === "Stack Game"){
                    domElements.replayMenuScore.textContent = 0;
                }
                else{
                    domElements.replayMenuScore.textContent = domElements.previewMenuTitleCounter.textContent;
                }

                const currentScore = parseInt(domElements.replayMenuScore.textContent);
                const bestScore = parseInt(localStorage.getItem("best"));
                
                if (currentScore > bestScore) {
                    localStorage.setItem("best", currentScore);
                    domElements.replayMenuBest.textContent = currentScore;
                } else {
                    domElements.replayMenuBest.textContent = bestScore;
                }
                

                document.addEventListener("click", (e) => {
                    e.preventDefault(); 

                    if(!domElements.replayMenu.classList.contains("display__none")) {
                        domElements.replayMenu.classList.add("display__none")
                    }
                    if(domElements.previewMenuTitleCounter.classList.contains("display__none")) {
                        domElements.previewMenuTitleCounter.classList.remove("display__none")
                    }

                    location.reload();

                    restart();
                })
            }

            cameraTargetY += blockSize.height;
        }
    }
});

function calculateOverlap(movingBlock, previousBlock){
    if (moveDirection.x !== 0) {
        // будується блок який рухався і став (відносно рухаючойого блоку )
        const start = movingBlock.position.x - blockSize.width / 2;
        const end = movingBlock.position.x + blockSize.width / 2; 

        // так само будується попередній
        const prevStart = previousBlock.position.x - blockSize.width / 2; 
        const prevEnd = previousBlock.position.x + blockSize.width / 2;

        const overlapStart = Math.max(start, prevStart);
        const overlapEnd = Math.min(end, prevEnd);
        
        return overlapEnd - overlapStart;

    } else if (moveDirection.z !== 0) {
        const start = movingBlock.position.z - blockSize.depth / 2;
        const end = movingBlock.position.z + blockSize.depth / 2;
        const prevStart = previousBlock.position.z - blockSize.depth / 2;
        const prevEnd = previousBlock.position.z + blockSize.depth / 2;

        const overlapStart = Math.max(start, prevStart);
        const overlapEnd = Math.min(end, prevEnd);
        return overlapEnd - overlapStart;
    }
    return 0;
}
function adjustMovingBlock(prevBlock, block, overlap) {
    if (moveDirection.x !== 0) {
        block.scale.x = overlap / blockSize.width;
        const shift = (blockSize.width - overlap) / 2;

        if (moveDirection.x > 0 && prevBlock.position.x <= block.position.x) {
            block.position.x -= shift;
        } 
        if(moveDirection.x < 0 && prevBlock.position.x <= block.position.x) {
            block.position.x -= shift;
        }

        if (moveDirection.x < 0 && prevBlock.position.x >= block.position.x){
            block.position.x += shift;
        }

        if (moveDirection.x > 0 && prevBlock.position.x >= block.position.x) {
            block.position.x += shift;
        }
        
    } else if (moveDirection.z !== 0) {
        block.scale.z = overlap / blockSize.depth;
        const shift = (blockSize.depth - overlap) / 2;

        if (moveDirection.z > 0 && prevBlock.position.z <= block.position.z) {
            block.position.z -= shift;
        } 
        if(moveDirection.z < 0 && prevBlock.position.z <= block.position.z) {
            block.position.z -= shift;
        }

        if (moveDirection.z < 0 && prevBlock.position.z >= block.position.z){
            block.position.z += shift;
        }

        if (moveDirection.z > 0 && prevBlock.position.z >= block.position.z) {
            block.position.z += shift;
        }
    }
    return block;
}



function createOverhangBlock(prevBlock, block, overlap) {
    const geometry = new THREE.BoxGeometry(blockSize.width, blockSize.height, blockSize.depth);
    const material = new THREE.MeshPhongMaterial({ color: block.material.color });
    const overhangBlock = new THREE.Mesh(geometry, material);
    overhangBlock.position.y = block.position.y;

    if (moveDirection.x !== 0) {
        const overhangWidth = blockSize.width - overlap;
        overhangBlock.scale.x = overhangWidth / blockSize.width;
        const shift = (overlap + overhangWidth) / 2;


        if (moveDirection.x > 0 && prevBlock.position.x <= block.position.x) {
            overhangBlock.position.x = block.position.x + shift;
        } 
        if(moveDirection.x < 0 && prevBlock.position.x <= block.position.x) {
            overhangBlock.position.x = block.position.x + shift;
        }

        if (moveDirection.x < 0 && prevBlock.position.x >= block.position.x){
            overhangBlock.position.x = block.position.x - shift;
        }

        if (moveDirection.x > 0 && prevBlock.position.x >= block.position.x) {
            overhangBlock.position.x = block.position.x - shift;
        }

        overhangBlock.position.z = block.position.z;

    } else if (moveDirection.z !== 0) {
        const overhangDepth = blockSize.depth - overlap;
        overhangBlock.scale.z = overhangDepth / blockSize.depth;
        const shift = (overlap + overhangDepth) / 2;

        if (moveDirection.z > 0 && prevBlock.position.z <= block.position.z) {
            overhangBlock.position.z = block.position.z + shift;
        } 
        if(moveDirection.z < 0 && prevBlock.position.z <= block.position.z) {
            overhangBlock.position.z = block.position.z + shift;
        }

        if (moveDirection.z < 0 && prevBlock.position.z >= block.position.z){
            overhangBlock.position.z = block.position.z - shift;
        }

        if (moveDirection.z > 0 && prevBlock.position.z >= block.position.z) {
            overhangBlock.position.z = block.position.z - shift;
        }
        overhangBlock.position.x = block.position.x;
    }

    scene.add(overhangBlock);
    return overhangBlock;
}


function Camera(camera, yPos){
    camera.position.set(10, yPos, 10);
    camera.lookAt(0, 0, 0);
}
function Canvas(renderer){
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); 
    document.body.appendChild(renderer.domElement);
}
function Light(scene){
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
}


function makeBase(blockSize) {
    startBlockDirections.x, startBlockDirections.z = false, false;
    previousBlock = DrawBlock(blockSize, `hsl(0, 70%, 60%)`, 0, startBlockDirections);

    for (let i = 1; i < 60; i++) {
        DrawBlock(blockSize, `hsl(${i * 9}, 70%, 60%)`, -i, false, false);
    }
    return true;
}
function DrawBlock(blockSize, color, posY, startBlockDirections, overlap = null){
    const geometry = new THREE.BoxGeometry(blockSize.width, blockSize.height, blockSize.depth);
    const material = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color(color),     
    });

    let block = new THREE.Mesh(geometry, material);
    block.position.y = posY * blockSize.height;

    if(overlap){
        block = adjustMovingBlock(previousBlock, block, overlap);
    }

    const boxForMove = new THREE.Box3().setFromObject(block);
    const sizeForMove = new THREE.Vector3();
    boxForMove.getSize(sizeForMove);


    if (startBlockDirections.x) {
        block.position.z = previousBlock.position.z;
        block.position.x = previousBlock.position.x - sizeForMove.x - 1;
    }
    if (startBlockDirections.z) {
        block.position.x = previousBlock.position.x;
        block.position.z = previousBlock.position.z - sizeForMove.z - 1;
    }

    block.isGameBlock = true;

    scene.add(block);

    if(startBlockDirections.x || startBlockDirections.z){
        countBlock = countBlock + 1;
    }

    return block;
}
function MoveBlock(block, startBlockDirections, blockWidth) {
    movingBlock = block;
    moveDirection = { x: startBlockDirections.x ? 0.2 : 0, z: startBlockDirections.z ? 0.2 : 0 };

    moveLimitX = {
      min: block.position.x,
      max: block.position.x + (blockWidth * 2) + 2
    };
    moveLimitZ = {
      min: block.position.z,
      max: block.position.z + (blockWidth * 2) + 2
    };
}
