/* ── AVL Tree Data Structure (pure JS, no backend) ── */

let nextNodeId = 1;

class AVLNode {
    constructor(key) {
        this.id = nextNodeId++;
        this.key = key;
        this.height = 1;
        this.left = null;
        this.right = null;
    }
}

class AVLTree {
    constructor() {
        this.root = null;
    }

    _h(n) { return n ? n.height : 0; }
    _bf(n) { return n ? this._h(n.left) - this._h(n.right) : 0; }
    _upH(n) { if (n) n.height = 1 + Math.max(this._h(n.left), this._h(n.right)); }

    _rotR(y) {
        animQ.push({ action: 'HIGHLIGHT', hl: [y.key], color: '#FFA500', msg: 'Right Rotation needed at ' + y.key });
        const x = y.left, t = x.right;
        x.right = y; y.left = t;
        this._upH(y); this._upH(x);
        animQ.push({ action: 'LAYOUT', layouts: calculateTargetLayouts(), hl: [], msg: 'Right Rotation completed' });
        return x;
    }

    _rotL(x) {
        animQ.push({ action: 'HIGHLIGHT', hl: [x.key], color: '#FFA500', msg: 'Left Rotation needed at ' + x.key });
        const y = x.right, t = y.left;
        y.left = x; x.right = t;
        this._upH(x); this._upH(y);
        animQ.push({ action: 'LAYOUT', layouts: calculateTargetLayouts(), hl: [], msg: 'Left Rotation completed' });
        return y;
    }

    insert(key) { this.root = this._ins(this.root, key); }

    _ins(n, key) {
        if (!n) return new AVLNode(key);
        if (key < n.key) n.left = this._ins(n.left, key);
        else n.right = this._ins(n.right, key);

        this._upH(n);
        const b = this._bf(n);

        if (b > 1 && key < n.left.key) return this._rotR(n);
        if (b < -1 && key >= n.right.key) return this._rotL(n);
        if (b > 1 && key >= n.left.key) { n.left = this._rotL(n.left); return this._rotR(n); }
        if (b < -1 && key < n.right.key) { n.right = this._rotR(n.right); return this._rotL(n); }
        return n;
    }

    delete(key) { this.root = this._del(this.root, key); }

    _del(n, key) {
        if (!n) return null;
        if (key < n.key) n.left = this._del(n.left, key);
        else if (key > n.key) n.right = this._del(n.right, key);
        else {
            if (!n.left || !n.right) {
                n = n.left || n.right;
                animQ.push({ action: 'LAYOUT', layouts: calculateTargetLayouts(), hl: [], color: '', msg: 'Removed node' });
            }
            else {
                let min = n.right;
                while (min.left) min = min.left;
                animQ.push({ action: 'HIGHLIGHT', hl: [min.key], color: '#FF00FF', msg: 'Replacing ' + n.key + ' with inorder successor ' + min.key });
                const oldId = n.id;
                n.key = min.key;

                // Keep layout ID so node smoothly transforms
                n.id = oldId;

                n.right = this._del(n.right, min.key);
            }
        }
        if (!n) return null;

        this._upH(n);
        const b = this._bf(n);

        if (b > 1 && this._bf(n.left) >= 0) return this._rotR(n);
        if (b > 1 && this._bf(n.left) < 0) { n.left = this._rotL(n.left); return this._rotR(n); }
        if (b < -1 && this._bf(n.right) <= 0) return this._rotL(n);
        if (b < -1 && this._bf(n.right) > 0) { n.right = this._rotR(n.right); return this._rotL(n); }
        return n;
    }

    find(key) {
        const path = [];
        let cur = this.root;
        while (cur) {
            path.push(cur.key);
            if (key === cur.key) return { found: true, path };
            cur = key < cur.key ? cur.left : cur.right;
        }
        return { found: false, path };
    }

    contains(key) { return this.find(key).found; }

    inorder() {
        const a = [];
        (function go(n) { if (!n) return; go(n.left); a.push(n.key); go(n.right); })(this.root);
        return a;
    }

    searchPath(key) {
        const path = [];
        let cur = this.root;
        while (cur) {
            path.push(cur.key);
            if (key === cur.key) break;
            cur = key < cur.key ? cur.left : cur.right;
        }
        return path;
    }

    searchPathForInsert(key) {
        const path = [];
        let cur = this.root;
        while (cur) {
            path.push(cur.key);
            cur = key < cur.key ? cur.left : cur.right;
        }
        return path;
    }
}


/* ── Canvas & Globals ── */

const canvas = document.getElementById('treeCanvas');
const ctx = canvas.getContext('2d');
const msg = document.getElementById('messageText');
const tree = new AVLTree();

const R = 20;
const V_GAP = 60;
const H_BASE = 40;

// Persistent visual state mapping node.id -> { x, y, targetX, targetY, height }
let nodeLayouts = new Map();
let animationRunning = true;
let animQ = [];
let animIdx = 0;
let playingKeyframe = false;
let paused = false;
let highlights = [];
let hlColor = '';

document.getElementById('speedSlider').addEventListener('input', function () { });

document.getElementById('insertInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleInsert(); });
document.getElementById('deleteInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleDelete(); });
document.getElementById('findInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleFind(); });

function animDelayMs() {
    const speed = parseInt(document.getElementById('speedSlider').value);
    return Math.max(50, 1100 - speed * 10);
}

// Return interpolation speed based on slider [0-1]
function getAnimSpeed() {
    const speed = parseInt(document.getElementById('speedSlider').value);
    return Math.max(0.02, speed / 500);
}

/* ── Tree Topology Engine ── */

function calculateTargetLayouts() {
    const targetLayouts = new Map();
    const total = computePos(tree.root, 0, targetLayouts, 0);
    const gap = Math.max(H_BASE, canvas.width / (total + 1));
    targetLayouts.forEach((p, id) => { p.targetX = (p.idx + 1) * gap; });
    return targetLayouts;
}

function computePos(node, depth, targetLayouts, counter) {
    if (!node) return counter;
    counter = computePos(node.left, depth + 1, targetLayouts, counter);
    targetLayouts.set(node.id, { targetX: 0, targetY: 30 + depth * V_GAP, idx: counter, key: node.key, height: node.height });
    counter++;
    counter = computePos(node.right, depth + 1, targetLayouts, counter);
    return counter;
}

/* ── Operations ── */

function handleInsert() {
    const inp = document.getElementById('insertInput');
    const v = parseInt(inp.value.trim());
    inp.value = '';
    if (isNaN(v)) return;

    msg.textContent = 'Inserting ' + v + '...';
    const pathBefore = tree.root ? tree.searchPathForInsert(v) : [];

    animQ = [];

    // USFCA Style: Spawn the new node at the top-left of the canvas first
    animQ.push({ 
        action: 'SPAWN_NODE', 
        id: 'new_node', 
        key: v, 
        x: 50, 
        y: 50, 
        color: '#00BFFF', 
        msg: 'Creating new node ' + v 
    });

    for (let i = 0; i < pathBefore.length; i++) {
        // Find existing node layout coordinate to slide the new node next to
        animQ.push({ 
            action: 'MOVE_SPAWN', 
            id: 'new_node',
            targetNodeKey: pathBefore[i],
            hl: pathBefore.slice(0, i + 1), 
            color: '#00BFFF', 
            msg: 'Comparing ' + v + ' with ' + pathBefore[i] 
        });
    }

    tree.insert(v);

    animQ.push({ action: 'LAYOUT', layouts: calculateTargetLayouts(), hl: [v], color: '#00FF00', msg: 'Inserted ' + v });
    animQ.push({ action: 'HIGHLIGHT', hl: [], color: '', msg: 'Animation Completed' });
    startAnim();
}

function handleDelete() {
    const inp = document.getElementById('deleteInput');
    const v = parseInt(inp.value.trim());
    inp.value = '';
    if (isNaN(v)) return;

    msg.textContent = 'Deleting ' + v + '...';
    const existed = tree.contains(v);
    const pathBefore = tree.root ? tree.searchPath(v) : [];

    animQ = [];

    for (let i = 0; i < pathBefore.length; i++) {
        animQ.push({ action: 'HIGHLIGHT', hl: pathBefore.slice(0, i + 1), color: '#FF6347', msg: 'Searching for ' + v + ' to delete' });
    }

    if (existed) {
        animQ.push({ action: 'HIGHLIGHT', hl: [v], color: '#FF0000', msg: 'Found ' + v + ', deleting...' });
    }

    tree.delete(v);

    if (existed) {
        animQ.push({ action: 'LAYOUT', layouts: calculateTargetLayouts(), hl: [], color: '', msg: 'Deleted ' + v });
    } else {
        animQ.push({ action: 'HIGHLIGHT', hl: [], color: '', msg: v + ' not found in tree' });
    }

    animQ.push({ action: 'HIGHLIGHT', hl: [], color: '', msg: 'Animation Completed' });
    startAnim();
}

function handleFind() {
    const inp = document.getElementById('findInput');
    const v = parseInt(inp.value.trim());
    inp.value = '';
    if (isNaN(v)) return;

    msg.textContent = 'Finding ' + v + '...';
    const result = tree.find(v);

    animQ = [];

    for (let i = 0; i < result.path.length; i++) {
        animQ.push({ action: 'HIGHLIGHT', hl: result.path.slice(0, i + 1), color: '#00BFFF', msg: 'Searching for ' + v + '...' });
    }

    animQ.push({ action: 'HIGHLIGHT', hl: result.path, color: result.found ? '#00FF00' : '#FF0000', msg: result.found ? 'Found ' + v + '!' : v + ' not found' });
    animQ.push({ action: 'HIGHLIGHT', hl: [], color: '', msg: 'Animation Completed' });
    startAnim();
}

function handlePrint() {
    msg.textContent = 'Printing tree...';
    const order = tree.inorder();
    animQ = [];

    for (let i = 0; i < order.length; i++) {
        animQ.push({ action: 'HIGHLIGHT', hl: order.slice(0, i + 1), color: '#FFD700', msg: 'Inorder: ' + order.slice(0, i + 1).join(', ') });
    }

    animQ.push({ action: 'HIGHLIGHT', hl: [], color: '', msg: 'Inorder: ' + (order.length ? order.join(', ') : '(empty)') });
    startAnim();
}

function handlePrint() {
    msg.textContent = 'Printing tree...';
    const order = tree.inorder();
    animQ = [];

    for (let i = 0; i < order.length; i++) {
        animQ.push({ hl: order.slice(0, i + 1), color: '#FFD700', msg: 'Inorder: ' + order.slice(0, i + 1).join(', ') });
    }

    animQ.push({ hl: [], color: '', msg: 'Inorder: ' + (order.length ? order.join(', ') : '(empty)') });
    startAnim();
}

/* ── Animation Sequences ── */

function startAnim() {
    animIdx = 0;
    paused = false;
    playingKeyframe = false;
    document.getElementById('pauseBtn').textContent = 'Pause';
}

function stopAnim() {
    playingKeyframe = false;
}

function isLayoutSettled() {
    for (const [id, layout] of nodeLayouts) {
        if (Math.abs(layout.x - layout.targetX) > 1 || Math.abs(layout.y - layout.targetY) > 1) {
            return false;
        }
    }
    return true;
}

function processKeyframes() {
    if (paused || animIdx >= animQ.length || playingKeyframe) return;

    if (!isLayoutSettled()) return; // Wait until everything glides to position

    const f = animQ[animIdx];

    if (f.action === 'HIGHLIGHT') {
        highlights = f.hl;
        hlColor = f.color;
        msg.textContent = f.msg;
        playingKeyframe = true;
        setTimeout(() => { playingKeyframe = false; }, (f.instant ? 0 : animDelayMs()));
    } else if (f.action === 'SPAWN_NODE') {
        nodeLayouts.set(f.id, { x: f.x, y: f.y, targetX: f.x, targetY: f.y, key: f.key, height: 1 });
        highlights = [f.key];
        hlColor = f.color;
        msg.textContent = f.msg;
        playingKeyframe = true;
        setTimeout(() => { playingKeyframe = false; }, animDelayMs());
    } else if (f.action === 'MOVE_SPAWN') {
        // Find the coordinates of the target node in the tree
        let tx = 50, ty = 50;
        for (const [id, layout] of nodeLayouts) {
            if (layout.key === f.targetNodeKey && id !== 'new_node') {
                tx = layout.targetX + 40; // Offset slightly to the right of the comparison node
                ty = layout.targetY - 20; // Offset slightly above
                break;
            }
        }
        
        if (nodeLayouts.has(f.id)) {
            const sn = nodeLayouts.get(f.id);
            sn.targetX = tx;
            sn.targetY = ty;
        }

        highlights = f.hl;
        hlColor = f.color;
        msg.textContent = f.msg;
    } else if (f.action === 'LAYOUT') {
        msg.textContent = f.msg;
        const newTargets = f.layouts;
        // Merge tree IDs currently existing in the tree to move towards their new targets
        // Remove IDs that don't exist anymore
        const toDelete = [];
        for (const [id,] of nodeLayouts) {
            if (!newTargets.has(id)) {
                toDelete.push(id);
            }
        }
        for (const id of toDelete) { nodeLayouts.delete(id); }

        for (const [id, target] of newTargets) {
            if (!nodeLayouts.has(id)) {
                // If this is the node we just inserted, grab the coordinates from the 'new_node' spawn
                if (nodeLayouts.has('new_node') && target.key === nodeLayouts.get('new_node').key) {
                    const sn = nodeLayouts.get('new_node');
                    nodeLayouts.set(id, { x: sn.x, y: sn.y, targetX: target.targetX, targetY: target.targetY, key: target.key, height: target.height });
                } else {
                    nodeLayouts.set(id, { x: target.targetX, y: -50, targetX: target.targetX, targetY: target.targetY, key: target.key, height: target.height });
                }
            } else {
                const existing = nodeLayouts.get(id);
                existing.targetX = target.targetX;
                existing.targetY = target.targetY;
                existing.height = target.height;
            }
        }
        // Remove the temporary spawn node
        nodeLayouts.delete('new_node');
        
        highlights = f.hl;
        if (f.color) hlColor = f.color;
    }

    animIdx++;
    document.getElementById('pauseBtn').textContent = paused ? 'Play' : 'Pause';
}

function stepForward() {
    paused = true;
    document.getElementById('pauseBtn').textContent = 'Play';
    if (animIdx < animQ.length) {
        paused = false; // Briefly unpause
        processKeyframes();
        paused = true;
    }
}

function stepBack() {
    paused = true;
    document.getElementById('pauseBtn').textContent = 'Play';
    if (animIdx > 1) {
        animIdx -= 2;
        paused = false;
        processKeyframes();
        paused = true;
    } else if (animIdx === 1) {
        animIdx = 0;
        paused = false;
        processKeyframes();
        paused = true;
    }
}

function skipForward() {
    stopAnim();
    if (animQ.length) {
        animIdx = animQ.length - 1;
        paused = true;
        document.getElementById('pauseBtn').textContent = 'Play';
        // Force fast-forward snap
        const f = animQ[animIdx - 1];
        if (f && f.action === 'LAYOUT') {
            for (const [id, target] of f.layouts) {
                if (nodeLayouts.has(id)) {
                    nodeLayouts.get(id).x = target.targetX;
                    nodeLayouts.get(id).y = target.targetY;
                }
            }
        }
    }
}

function skipBack() {
    stopAnim();
    if (animQ.length) {
        animIdx = 0;
        paused = true;
        document.getElementById('pauseBtn').textContent = 'Play';
        highlights = [];
        nodeLayouts.clear();
    }
}

function changeCanvasSize() {
    const w = parseInt(document.getElementById('canvasWidth').value);
    const h = parseInt(document.getElementById('canvasHeight').value);
    if (w > 100 && h > 100 && w < 5000 && h < 5000) {
        canvas.width = w;
        canvas.height = h;
        draw();
    }
}

function moveControls() {
    const c = document.getElementById('controls');
    c.style.order = c.style.order === '10' ? '' : '10';
}

/* ── Tree Rendering ── */

function renderLoop() {
    if (!animationRunning) return;
    processKeyframes();

    // Interpolate nodes
    const s = getAnimSpeed();
    for (const [id, layout] of nodeLayouts) {
        layout.x += (layout.targetX - layout.x) * s;
        layout.y += (layout.targetY - layout.y) * s;
    }

    draw();
    requestAnimationFrame(renderLoop);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw edges first by traversing tree structure exactly, 
    // but lookup current interpolated visual coordinates via nodeLayouts
    drawEdges(tree.root);
    
    // Draw circles over edges
    for (const [id, layout] of nodeLayouts) {
        if (id !== 'new_node') drawCircle(layout);
    }

    // Always draw new spawning node on top of everything else
    if (nodeLayouts.has('new_node')) {
        drawCircle(nodeLayouts.get('new_node'));
    }
}

function drawEdges(n) {
    if (!n) return;
    const p = nodeLayouts.get(n.id);
    if (!p) return;

    if (n.left) {
        const lp = nodeLayouts.get(n.left.id);
        if (lp) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(lp.x, lp.y);
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
            drawEdges(n.left);
        }
    }
    if (n.right) {
        const rp = nodeLayouts.get(n.right.id);
        if (rp) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(rp.x, rp.y);
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
            drawEdges(n.right);
        }
    }
}

function drawCircle(layout) {
    const lit = highlights.includes(layout.key);

    ctx.beginPath();
    ctx.arc(layout.x, layout.y, R, 0, Math.PI * 2);
    ctx.fillStyle = lit ? (hlColor || '#00BFFF') : '#FFFFCC';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(layout.key).padStart(4, ''), layout.x, layout.y);

    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(String(layout.height), layout.x + R + 3, layout.y - R + 5);
}

// Start loop
requestAnimationFrame(renderLoop);
