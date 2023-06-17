const EXEC_MODES = { seq: 'C', par: 'P' };
const EXEC_ICON = { [EXEC_MODES.seq]: '→', [EXEC_MODES.par]: '∥' };
const ratio = 100;

class BPTree {
    constructor(bp, ctx) {
        this.bp = bp;
        this.ctx = ctx;
    }

    drawElement(el) {
        const ctx = this.ctx;

        const levelRatio = el.level * 10;
        ctx.fillStyle = el.getBgColor();
        ctx.strokeStyle = el.getColor();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(
            el.l * ratio + levelRatio,
            el.t * ratio + levelRatio,
            el.w * ratio - 2 * levelRatio,
            el.h * ratio - 2 * levelRatio
        );
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(el.id, el.l * ratio + levelRatio + 1, el.t * ratio + levelRatio + 1);
    }

    drawArrow(fromX, fromY, toX, toY) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        drawArrowhead(toX, toY, Math.atan2(toY - fromY, toX - fromX));

        function drawArrowhead(x, y, radians) {
            const arrowSize = 10;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x - arrowSize * Math.cos(radians - Math.PI / 10),
                y - arrowSize * Math.sin(radians - Math.PI / 10)
            );
            ctx.moveTo(x, y);
            ctx.lineTo(
                x - arrowSize * Math.cos(radians + Math.PI / 10),
                y - arrowSize * Math.sin(radians + Math.PI / 10)
            );
            ctx.stroke();
        }
    }

    drawSchema() {
        const ctx = this.ctx;
        ctx.clearRect(-1, -1, 10000, 10000);

        const drawLink = link => {
            this.drawArrow(
                link.src.l * ratio + ratio / 2 + 10,
                link.src.t * ratio + ratio / 2,
                link.dst.l * ratio + ratio / 2 - 10,
                link.dst.t * ratio + ratio / 2
            );
        };
        this.bp.elems.forEach(el => {
            this.drawElement(el, ctx);
        });
        this.bp.links.forEach(link => drawLink(link, ctx));
    }

    drawTree(domElement) {
        function buildTree(el, parentDomElem) {
            if (!parentDomElem) {
                parentUl = document.createElement('ul');
                document.body.appendChild(parentDomElem);
            }

            var li = document.createElement('li');

            li.innerHTML = `<span style="color:${el.getColor()}">${el.id}: ${
                el.type
            } ${el.getExecTypeIcon()}</span>`;

            parentDomElem.appendChild(li);

            if (el.children && el.children.length > 0) {
                var ul = document.createElement('ul');
                li.appendChild(ul);

                for (var i = 0; i < el.children.length; i++) {
                    buildTree(el.children[i], ul);
                }
            }
        }

        domElement.innerHTML = '';
        buildTree(this.bp.root, domElement);
    }
}

class BPNode {
    constructor({ bp, type, execMode, parent }) {
        this.id = bp ? bp.getNodeId() : undefined;
        this.type = type;
        this.execMode = execMode;
        this.parent = parent;
        this.bp = bp;
        this.children = [];
        if (parent) {
            parent.appendChild(this);
        }
    }
    appendChild(el) {
        el.level = this.level + 1;
        el.bp = this.bp;
        return this.children.push(el);
    }

    getColor() {
        return this.type === 'JOB' ? 'darkgreen' : this.type === 'TASK' ? 'blue' : 'red';
    }

    getBgColor() {
        return this.type === 'JOB' ? '#eeffee' : this.type === 'TASK' ? 'white' : '#ffeeee';
    }

    getExecTypeIcon() {
        return this.type === 'TASK' ? EXEC_ICON[this.execMode] : '';
    }
}

class BP {
    constructor() {
        this.clear();
    }

    clear() {
        this.idCounter = 1;
        this.root = null;
        this.elems = [];
        this.links = [];
    }

    getNodeId() {
        return this.idCounter++;
    }

    addRootElement(el) {
        this.root = el;
        el.level = 0;
        el.bp = this;
    }

    scanTree(func) {
        function look(el, idx) {
            func(el, idx);
            el.children.forEach((el, idx) => look(el, idx));
        }
        look(this.root, 0);
    }

    arrangeElems() {
        this.elems = [];
        this.scanTree(el => this.elems.push(el));
    }

    recalcSizes() {
        const reversed = [...this.elems].reverse();

        reversed.forEach(el => {
            el.t = 0;
            el.l = 0;
            if (el.children.length === 0) {
                el.w = 1;
                el.h = 1;
            }
        });

        reversed.forEach(el => {
            if (el.children.length) {
                let w = 0;
                let h = 0;
                el.children.forEach(cld => {
                    if (el.execMode === EXEC_MODES.seq) {
                        w += cld.w;
                        h = Math.max(h, cld.h);
                    } else {
                        w = Math.max(w, cld.w);
                        h += cld.h;
                    }
                });
                el.w = w;
                el.h = h;
            }
        });
    }

    recalcPositions() {
        this.elems.forEach(el => {
            let l = el.l;
            let t = el.t;
            el.children.forEach(cld => {
                cld.l = l;
                cld.t = t;
                if (el.execMode === EXEC_MODES.seq) {
                    l += cld.w;
                } else {
                    t += cld.h;
                }
            });
        });
    }

    genarateRandomBP() {
        this.clear();

        const allElems = [];
        const el = new BPNode({
            bp: this,
            type: 'TASK',
            execMode: Math.random() < 0.5 ? EXEC_MODES.par : EXEC_MODES.seq
        });
        allElems.push(el);
        this.addRootElement(el);

        for (let i = 0; i < 5; i++) {
            const parentIdx = Math.floor(Math.random() * allElems.length);
            for (let j = 0; j < Math.floor(Math.random() * 2 + 2); j++) {
                const el = new BPNode({
                    bp: this,
                    parent: allElems[parentIdx],
                    type: Math.random() < 0.7 ? 'TASK' : 'JOB',
                    execMode: Math.random() < 0.5 ? EXEC_MODES.par : EXEC_MODES.seq
                });
                allElems.push(el);
            }
        }

        const filler = el => {
            if (el.children.length === 0) {
                el.type = 'JOB';
                el.execMode = EXEC_MODES.seq;
            }
        };

        this.scanTree(filler);
        this.analyzeTree();
    }

    analyzeTree() {
        this.arrangeElems();
        this.appendExtraNodes();
        this.arrangeElems();
        this.recalcSizes();
        this.recalcPositions();
        this.findLinks();
    }

    appendExtraNodes() {
        this.elems.forEach(el => {
            if (el.execMode === EXEC_MODES.seq) {
                const newChildren = [];
                for (let i = 0; i < el.children.length; i++) {
                    const el1 = el.children[i];
                    const el2 = el.children[i + 1];
                    newChildren.push(el1);
                    if (el2) {
                        if (
                            el1.execMode === EXEC_MODES.par &&
                            el2.execMode === EXEC_MODES.par &&
                            el1.children.length > 1 &&
                            el2.children.length > 1
                        ) {
                            // не передаем parent в конструктор, т.к. добавим в список children ниже
                            const node = new BPNode({ bp: this, type: 'NODE' });
                            node.parent = el;
                            node.level = el.level + 1;
                            node.w = 1;
                            node.h = 1;
                            newChildren.push(node);
                        }
                    }
                }
                el.children = newChildren;
            }
        });
    }

    findLinks() {
        this.elems.forEach(el => {
            if (el.execMode === EXEC_MODES.seq && el.children.length > 1) {
                for (let i = 0; i < el.children.length - 1; i++) {
                    this.links.push({
                        src: el.children[i],
                        dst: el.children[i + 1],
                        status: 'active'
                    });
                }
            }
        });

        let isFound;
        do {
            isFound = false;
            [...this.links].forEach(link => {
                // если получатель не конечный узел (JOB)
                if (link.dst.children.length > 1) {
                    isFound = true;
                    link.status = 'deleted';
                    if (link.dst.execMode === EXEC_MODES.seq) {
                        this.links.push({
                            src: link.src,
                            dst: link.dst.children[0],
                            status: 'active'
                        });
                    }
                    if (link.dst.execMode === EXEC_MODES.par) {
                        link.dst.children.forEach(cld =>
                            this.links.push({ src: link.src, dst: cld, status: 'active' })
                        );
                    }
                }
            });

            this.links = this.links.filter(link => link.status !== 'deleted');

            [...this.links].forEach(link => {
                // если получатель не конечный узел (JOB)
                if (link.src.children.length > 1) {
                    isFound = true;
                    link.status = 'deleted';
                    if (link.src.execMode === EXEC_MODES.seq) {
                        this.links.push({
                            src: link.src.children.at(-1),
                            dst: link.dst,
                            status: 'active'
                        });
                    }
                    if (link.src.execMode === EXEC_MODES.par) {
                        link.src.children.forEach(cld =>
                            this.links.push({ src: cld, dst: link.dst, status: 'active' })
                        );
                    }
                }
            });

            this.links = this.links.filter(link => link.status !== 'deleted');
        } while (isFound);
    }
}

////////////////////////////////

class BPNodeScriptWrapper {
    constructor(node) {
        this.node = node;
    }

    static createNode(obj, bp) {
        return new BPNode({
            bp: bp,
            type: obj.type,
            execMode: obj.execMode
        });
    }

    appendChild(obj) {
        const cldNode = new BPNode({
            bp: this.node.bp,
            parent: this.node,
            type: obj.type,
            execMode: obj.execMode
        });
        return new BPNodeScriptWrapper(cldNode);
    }
}
class BPScriptWrapper {
    constructor(bp) {
        this.bp = bp;
    }

    addRootElement(obj) {
        const el = BPNodeScriptWrapper.createNode(obj, this.bp);
        this.bp.addRootElement(el);
        return new BPNodeScriptWrapper(el);
    }
}

const defaultScript = `const root = bp.addRootElement({ type: 'TASK', execMode: 'C' });
let t1 = root.appendChild({ type: 'TASK', execMode: 'P' });
t1.appendChild({ type: 'JOB', execMode: 'C' });
t1.appendChild({ type: 'JOB', execMode: 'C' });

t1 = root.appendChild({ type: 'TASK', execMode: 'P' });
t1.appendChild({ type: 'JOB', execMode: 'C' });
t1.appendChild({ type: 'JOB', execMode: 'C' });`;

function scriptToTree(bp, script) {
    const f = new Function('bp', script);
    f(bp);
}
