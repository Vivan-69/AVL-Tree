/* ── AVL Tree Data Structure (pure JS, no backend) ── */

class AVLNode {
    constructor(key) {
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
        const x = y.left, t = x.right;
        x.right = y; y.left = t;
        this._upH(y); this._upH(x);
        return x;
    }

    _rotL(x) {
        const y = x.right, t = y.left;
        y.left = x; x.right = t;
        this._upH(x); this._upH(y);
        return y;
    }

    insert(key) { this.root = this._ins(this.root, key); }

    _ins(n, key) {
        if (!n) return new AVLNode(key);
        if (key < n.key) n.left = this._ins(n.left, key);
        else if (key > n.key) n.right = this._ins(n.right, key);
        else return n;

        this._upH(n);
        const b = this._bf(n);

        if (b > 1 && key < n.left.key) return this._rotR(n);
        if (b < -1 && key > n.right.key) return this._rotL(n);
        if (b > 1 && key > n.left.key) { n.left = this._rotL(n.left); return this._rotR(n); }
        if (b < -1 && key < n.right.key) { n.right = this._rotR(n.right); return this._rotL(n); }
        return n;
    }

    delete(key) { this.root = this._del(this.root, key); }

    _del(n, key) {
        if (!n) return null;
        if (key < n.key) n.left = this._del(n.left, key);
        else if (key > n.key) n.right = this._del(n.right, key);
        else {
            if (!n.left || !n.right) { n = n.left || n.right; }
            else {
                let min = n.right;
                while (min.left) min = min.left;
                n.key = min.key;
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
}

/* ── Canvas & Globals ── */

const canvas = document.getElementById('treeCanvas');
const ctx = canvas.getContext('2d');
const msg = document.getElementById('messageText');
const tree = new AVLTree();

const R = 20;
const V_GAP = 60;
const H_BASE = 40;

let animQ = [];
let animIdx = 0;
let animTimer = null;
let paused = false;
let highlights = [];
let hlColor = '';

document.getElementById('speedSlider').addEventListener('input', function () { });

document.getElementById('insertInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleInsert(); });
document.getElementById('deleteInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleDelete(); });
document.getElementById('findInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleFind(); });

function delay() {
    const speed = parseInt(document.getElementById('speedSlider').value);
    return Math.max(50, 1100 - speed * 10);
}

/* ── Operations ── */

function handleInsert() {
    const inp = document.getElementById('insertInput');
    const v = parseInt(inp.value.trim());
    inp.value = '';
    if (isNaN(v)) return;

    msg.textContent = 'Inserting ' + v + '...';
    const existed = tree.contains(v);
    const pathBefore = tree.root ? tree.searchPath(v) : [];

    tree.insert(v);
    animQ = [];

    for (let i = 0; i < pathBefore.length; i++) {
        animQ.push({ hl: pathBefore.slice(0, i + 1), color: '#00BFFF', msg: 'Searching for position to insert ' + v });
    }

    animQ.push({ hl: [v], color: '#00FF00', msg: existed ? v + ' already exists' : 'Inserted ' + v });
    animQ.push({ hl: [], color: '', msg: 'Animation Completed' });
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
        animQ.push({ hl: pathBefore.slice(0, i + 1), color: '#FF6347', msg: 'Searching for ' + v + ' to delete', treeBefore: true });
    }

    if (existed) {
        animQ.push({ hl: [v], color: '#FF0000', msg: 'Found ' + v + ', deleting...', treeBefore: true });
    }

    tree.delete(v);

    animQ.push({ hl: [], color: '', msg: existed ? 'Deleted ' + v : v + ' not found in tree' });
    animQ.push({ hl: [], color: '', msg: 'Animation Completed' });
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
        animQ.push({ hl: result.path.slice(0, i + 1), color: '#00BFFF', msg: 'Searching for ' + v + '...' });
    }

    animQ.push({ hl: result.path, color: result.found ? '#00FF00' : '#FF0000', msg: result.found ? 'Found ' + v + '!' : v + ' not found' });
    animQ.push({ hl: [], color: '', msg: 'Animation Completed' });
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

/* ── Animation Engine ── */

function startAnim() {
    stopAnim();
    animIdx = 0;
    paused = false;
    document.getElementById('pauseBtn').textContent = 'Pause';
    playFrame();
}

function stopAnim() {
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
}

function playFrame() {
    if (animIdx >= animQ.length) return;
    const f = animQ[animIdx];
    highlights = f.hl;
    hlColor = f.color;
    draw();
    msg.textContent = f.msg;
    animIdx++;
    if (!paused && animIdx < animQ.length) animTimer = setTimeout(playFrame, delay());
}

function togglePause() {
    paused = !paused;
    document.getElementById('pauseBtn').textContent = paused ? 'Play' : 'Pause';
    if (!paused) playFrame();
}

function stepForward() {
    paused = true;
    document.getElementById('pauseBtn').textContent = 'Play';
    if (animIdx < animQ.length) playFrame();
}

function stepBack() {
    paused = true;
    document.getElementById('pauseBtn').textContent = 'Play';
    if (animIdx > 1) { animIdx -= 2; playFrame(); }
    else if (animIdx === 1) { animIdx = 0; playFrame(); }
}

function skipForward() {
    stopAnim();
    if (animQ.length) { animIdx = animQ.length - 1; paused = true; document.getElementById('pauseBtn').textContent = 'Play'; playFrame(); }
}

function skipBack() {
    stopAnim();
    if (animQ.length) { animIdx = 0; paused = true; document.getElementById('pauseBtn').textContent = 'Play'; playFrame(); }
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

function computePos(node, depth, pos, counter) {
    if (!node) return counter;
    counter = computePos(node.left, depth + 1, pos, counter);
    pos.set(node.key, { x: 0, y: 30 + depth * V_GAP, idx: counter });
    counter++;
    counter = computePos(node.right, depth + 1, pos, counter);
    return counter;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!tree.root) return;

    const pos = new Map();
    const total = computePos(tree.root, 0, pos, 0);
    const gap = Math.max(H_BASE, canvas.width / (total + 1));
    pos.forEach(p => { p.x = (p.idx + 1) * gap; });

    drawEdges(tree.root, pos);
    drawCircles(tree.root, pos);
}

function drawEdges(n, pos) {
    if (!n) return;
    const p = pos.get(n.key);
    if (n.left) {
        const lp = pos.get(n.left.key);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(lp.x, lp.y);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
        drawEdges(n.left, pos);
    }
    if (n.right) {
        const rp = pos.get(n.right.key);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(rp.x, rp.y);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
        drawEdges(n.right, pos);
    }
}

function drawCircles(n, pos) {
    if (!n) return;
    const p = pos.get(n.key);
    const lit = highlights.includes(n.key);

    ctx.beginPath();
    ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
    ctx.fillStyle = lit ? (hlColor || '#00BFFF') : '#FFFFCC';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n.key).padStart(4, '0'), p.x, p.y);

    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(String(n.height), p.x + R + 3, p.y - R + 5);

    drawCircles(n.left, pos);
    drawCircles(n.right, pos);
}

draw();
