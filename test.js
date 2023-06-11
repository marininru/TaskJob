const EXEC_TYPES = { seq: 'sequential', par: 'parallel' };
const EXEC_ICON = { [EXEC_TYPES.seq]: '→', [EXEC_TYPES.par]: '∥' };
const ratio = 100;

class Element {
    constructor(parent) {
        this.id = undefined;
        this.type = undefined;
        this.execType = undefined;
        this.parent = parent;
        this.children = [];
        if (parent) {
            parent.appendChild(this);
        }
    }
    appendChild(el) {
        return this.children.push(el);
    }
}

class ElementTree {
    constructor() {
        this.root = null;
        this.elems = [];
        this.links = [];
    }

    addRootElement(el) {
        this.root = el;
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
            if (el.children.length) {
                let w = 0;
                let h = 0;
                el.children.forEach(cld => {
                    if (el.execType === EXEC_TYPES.seq) {
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
                if (el.execType === EXEC_TYPES.seq) {
                    l += cld.w;
                } else {
                    t += cld.h;
                }
            });
        });
    }

    genarateRandomTree() {
        const allElems = [];
        const el = new Element(null);
        el.level = 0;
        allElems.push(el);
        this.addRootElement(el);

        for (let i = 0; i < 5; i++) {
            const parentIdx = Math.floor(Math.random() * allElems.length);
            for (let j = 0; j < Math.floor(Math.random() * 2 + 2); j++) {
                const el = new Element(allElems[parentIdx]);
                el.level = allElems[parentIdx].level + 1;
                allElems.push(el);
            }
        }

        let cnt = 1;
        const filler = el => {
            el.id = cnt++;
            el.t = 0;
            el.l = 0;
            if (el.children.length) {
                el.type = 'TASK';
                el.execType = Math.random() < 0.5 ? EXEC_TYPES.par : EXEC_TYPES.seq;
                el.w = 0;
                el.h = 0;
            } else {
                el.type = 'JOB';
                el.w = 1;
                el.h = 1;
            }
        };

        this.scanTree(filler);
        this.arrangeElems();
        this.recalcSizes();
        this.recalcPositions();
    }

    drawTree(domElement) {
        function buildTree(el, parentDomElem) {
            if (!parentDomElem) {
                parentUl = document.createElement('ul');
                document.body.appendChild(parentDomElem);
            }

            var li = document.createElement('li');

            li.textContent = `${el.id}: ${el.type} ${
                el.type === 'TASK' ? EXEC_ICON[el.execType] : ''
            } (${el.w}x${el.h}) [${el.l}x${el.t}]`;

            parentDomElem.appendChild(li);

            if (el.children && el.children.length > 0) {
                var ul = document.createElement('ul');
                li.appendChild(ul);

                for (var i = 0; i < el.children.length; i++) {
                    buildTree(el.children[i], ul);
                }
            }
        }

        buildTree(this.root, domElement);
    }

    drawElement(el, ctx) {
        const levelRatio = el.level * 10;
        ctx.fillStyle = el.type === 'JOB' ? '#eeffee' : 'white';
        ctx.strokeStyle = el.type === 'JOB' ? 'darkgreen' : 'blue';
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

    drawLink(link, ctx) {
        // Установка свойства для линии стрелки
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';

        // Рисование линии
        ctx.beginPath();
        ctx.moveTo(link.src.l * ratio + ratio / 2 + 10, link.src.t * ratio + ratio / 2);
        ctx.lineTo(link.dst.l * ratio + ratio / 2 - 10, link.dst.t * ratio + ratio / 2);
        ctx.stroke();
    }

    drawSchema(canvas) {
        let ctx = canvas.getContext('2d');
        this.elems.forEach(el => {
            this.drawElement(el, ctx);
        });
        this.links.forEach(link => this.drawLink(link, ctx));
    }

    findLinks() {
        this.elems.forEach(el => {
            if (el.execType === EXEC_TYPES.seq && el.children.length > 1) {
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
                    if (link.dst.execType === EXEC_TYPES.seq) {
                        this.links.push({
                            src: link.src,
                            dst: link.dst.children[0],
                            status: 'active'
                        });
                    }
                    if (link.dst.execType === EXEC_TYPES.par) {
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
                    if (link.src.execType === EXEC_TYPES.seq) {
                        this.links.push({
                            src: link.src.children.at(-1),
                            dst: link.dst,
                            status: 'active'
                        });
                    }
                    if (link.src.execType === EXEC_TYPES.par) {
                        link.src.children.forEach(cld =>
                            this.links.push({ src: cld, dst: link.dst, status: 'active' })
                        );
                    }
                }
            });

            this.links = this.links.filter(link => link.status !== 'deleted');
        } while (isFound);

        console.log(this.links);
    }
}

const tree = new ElementTree();
tree.genarateRandomTree();
tree.findLinks();
