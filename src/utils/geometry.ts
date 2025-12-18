import p5 from 'p5';

// --- MBR CLASS (Minimum Bounding Rectangle) ---
export class MBR {
  min: p5.Vector;
  max: p5.Vector;

  constructor(...args: p5.Vector[]) {
    this.min = new p5.Vector(Infinity, Infinity);
    this.max = new p5.Vector(-Infinity,-Infinity);
    for (let p of args) this.add(p);
  }

  static fromRect(x: number, y: number, w: number, h: number) {
    let mbr = new MBR();
    mbr.min = new p5.Vector(x,y);
    mbr.max = new p5.Vector(x+w, y+h);
    return mbr;
  }
    
  add(p: p5.Vector) {
    this.min.x = Math.min(p.x, this.min.x);
    this.min.y = Math.min(p.y, this.min.y);
    this.max.x = Math.max(p.x, this.max.x);
    this.max.y = Math.max(p.y, this.max.y);
  }

  expand(dx: number) {
    this.min.x -= dx;
    this.max.x += dx;
    this.min.y -= dx;
    this.max.y += dx;
  }
  
  size() {
    return new p5.Vector(this.max.x - this.min.x, this.max.y - this.min.y);
  }

  containedIn(other: MBR) {
    return other.min.x <= this.min.x && other.max.x >= this.max.x &&
            other.min.y <= this.min.y && other.max.y >= this.max.y;
  }
        
  contains(p: p5.Vector) {
    return (
      p.x >= this.min.x &&
      p.y >= this.min.y &&
      p.x < this.max.x &&
      p.y < this.max.y
    );
  }

  intersects(other: MBR) {
    let minx = Math.max(other.min.x, this.min.x);
    let maxx = Math.min(other.max.x, this.max.x);
    if (minx > maxx) return false;
    let miny = Math.max(other.min.y, this.min.y);
    let maxy = Math.min(other.max.y, this.max.y);
    return miny <= maxy;
  }
}

// --- SEARCH DATA STRUCTURE (Grid Optimization) ---
export class SearchDS {
    x: number; y: number; w: number; h: number; nx: number; ny: number;
    dx: number; dy: number;
    cells: any[][] = [];
    mbr: MBR;

    constructor (x: number, y: number, w: number, h: number, nx = 30, ny = 30) {
        this.x = x; this.y = y; this.w = w; this.h = h; this.nx = nx; this.ny = ny;
        this.mbr = MBR.fromRect(x,y,w,h);
        this.dx = w/nx;
        this.dy = h/ny;
        this.cells = [];
    }
    
    *cellIndicesForMbr (mbr: MBR) {
        let ixmin = Math.floor((mbr.min.x-this.x)/this.dx);
        let ixmax = Math.floor((mbr.max.x-this.x)/this.dx);
        let iymin = Math.floor((mbr.min.y-this.y)/this.dy);
        let iymax = Math.floor((mbr.max.y-this.y)/this.dy);
        for (let ix = ixmin; ix <= ixmax; ix++) {
            for (let iy = iymin; iy <= iymax; iy++) {
                yield ix + iy * this.nx;
            }
        }
    }
    
    add (mbr: MBR, value: any) {
        for (let icell of this.cellIndicesForMbr(mbr)) {
            let cell = this.cells[icell] || [];
            cell.push ({mbr,value});
            this.cells[icell] = cell
        }
    }
    
    *valuesInMbr (mbr: MBR) {
        let duplicates = new Set();
        for (let icell of this.cellIndicesForMbr(mbr)) {
            let cell = this.cells[icell] || [];
            for (let entry of cell) {
                if (entry.mbr.intersects(mbr) && !duplicates.has(entry.value)) {
                    yield (entry.value);
                    duplicates.add(entry.value)
                }
            }
        }
    }
}

// --- POLYGON & INTERSECTION UTILS ---

export function orient(a: p5.Vector, b: p5.Vector, c: p5.Vector) {
    return Math.sign(b.x * (c.y - a.y) + c.x * (a.y - b.y) + a.x * (b.y - c.y))
}

export function segmentsIntersect(a: p5.Vector, b: p5.Vector, c: p5.Vector, d: p5.Vector) {
  return (
    Math.abs(orient(a, b, c) - orient(a, b, d)) >= 1 &&
    Math.abs(orient(c, d, a) - orient(c, d, b)) >= 1
  );
}

export function lineIntersection (a: p5.Vector, b: p5.Vector, c: p5.Vector, d: p5.Vector) {
    let v1 = b.copy().sub(a), v2 = d.copy().sub(c);
    const D = v1.x * v2.y - v1.y * v2.x;
    if (D == 0) return a.copy(); // parallel
    const t = (v2.y * (c.x - a.x) + a.y * v2.x - c.y * v2.x) / D;
    return new p5.Vector(a.x + v1.x * t, a.y + v1.y * t);
}

export function pointInPolygon(p: p5.Vector, poly: p5.Vector[]) {
  const py = p.y;
  const yOrient = (p: p5.Vector) => Math.sign(p.y - py);
  const n = poly.length;
  let prev = poly[n - 1];
  let prevYOr = yOrient(prev);
  let count = 0;
  
  for (let i = 0; i < n; i++) {
    const q = poly[i];
    const yOr = yOrient(q);
    if (Math.abs(yOr - prevYOr) >= 1) {
      const pOr = orient(prev, q, p);
      const far = new p5.Vector(99999, py); 
      const farOr = orient(prev, q, far);
      if (Math.abs(pOr - farOr) == 2) {
        if (yOr == 0) {
          const next = poly[(i + 1) % n];
          const nextYOr = yOrient(next);
          if (Math.abs(nextYOr - prevYOr) == 2) count++;
        } else {
          if (prevYOr != 0) count++;
        }
      }
    }
    prevYOr = yOr;
    prev = q;
  }
  return count % 2 == 1;
}

export function polygonArea(poly: p5.Vector[]) {
  if (poly.length < 3) return 0;
  let {x: px, y: py} = poly[poly.length - 1];
  let area = 0;
  for (let {x,y} of poly) {
    area += (px - x) * (y + py);
    [px, py] = [x, y];
  }
  return Math.abs(area / 2);
}

export function curvePolygonSplit(curve: p5.Vector[], poly: p5.Vector[]) {
    let polygonMbr = new MBR(); 
    for (let p of poly) polygonMbr.add(p); 
    for (let p of curve) polygonMbr.add(p);
    polygonMbr.expand(20);
    
    let npoly = poly.length;
    let sz = polygonMbr.size();
    let searchDS = new SearchDS(polygonMbr.min.x, polygonMbr.min.y, sz.x, sz.y);
    
    for (let i = 0; i < npoly; i++) {
        let j = (i+1) % npoly;
        let obj = {i, j};
        let mbr = new MBR(poly[i], poly[j])
        searchDS.add(mbr,obj)   
    }
    
    let intersections: any[] = [];
    let ncurve = curve.length;
    
    for (let k = 0; k+1 < ncurve && intersections.length < 2; k++) {
        let [a,b] = [curve[k], curve[k+1]]
        let mbr = new MBR(a,b);
        for (let {i,j} of searchDS.valuesInMbr(mbr)) {
            let [c,d] = [poly[i],poly[j]];
            if (segmentsIntersect(a,b,c,d)) {
                const p = lineIntersection (a,b,c,d);
                intersections.push({k,i,j,p})
                if (intersections.length == 2) break;
            }
        }
    }
    
    if (intersections.length == 2) {
        let {i:i1,j:j1,k:k1,p:p1} = intersections[0];
        let {i:i2,j:j2,k:k2,p:p2} = intersections[1];
        
        let part1 = [p1];
        for (let k = k1+1; k < k2; k++) part1.push(curve[k]);
        part1.push(p2);
        
        let count = 0;
        for (let i = j2; i != i1 && count++ < 10000; i = (i+1) % npoly) part1.push(poly[i]);
        part1.push(poly[i1]);
        
        let part2 = [p2]; 
        for (let k = k2-1; k > k1; k--) part2.push(curve[k]);
        part2.push(p1);
        
        count = 0;
        for (let i = j1; i != j2 && count++ < 10000; i = (i+1) % npoly) part2.push(poly[i]);
        part2.push(poly[j2])
        
        return [part1,part2]
    }
    return [];
}

function isDiagonal(i: number, j: number, polygon: p5.Vector[]) {
  let n = polygon.length;
  if ((j === (i + 1) % n) || (i === (j + 1) % n)) return false;
  let a = polygon[i];
  let b = polygon[j];
  for (let k = 0; k < n; k++) {
    let kNext = (k + 1) % n;
    if (k === i || k === j || kNext === i || kNext === j) continue;
    if (segmentsIntersect(a, b, polygon[k], polygon[kNext])) return false;
  }
  let mid = new p5.Vector((a.x + b.x) / 2, (a.y + b.y) / 2);
  if (!pointInPolygon(mid, polygon)) return false;
  return true;
}

export function findSplitChordInteriorPoint(polygon: p5.Vector[]) {
  const n = polygon.length;
  if (n < 4) {
    let cx = 0, cy = 0;
    for (let p of polygon) { cx += p.x; cy += p.y; }
    return new p5.Vector(cx / n, cy / n);
  }
  
  let bestDiff = Infinity;
  let bestMidpoint: p5.Vector | null = null;
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (!isDiagonal(i, j, polygon)) continue;
      
      let poly1 = [];
      for (let k = i; k <= j; k++) poly1.push(polygon[k]);
      
      let poly2 = [];
      for (let k = j; k < n; k++) poly2.push(polygon[k]);
      for (let k = 0; k <= i; k++) poly2.push(polygon[k]);
      
      let area1 = polygonArea(poly1);
      let area2 = polygonArea(poly2);
      let diff = Math.abs(area1 - area2);
      
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMidpoint = new p5.Vector((polygon[i].x + polygon[j].x) / 2, (polygon[i].y + polygon[j].y) / 2);
      }
    }
  }
  
  if (!bestMidpoint) {
    let cx = 0, cy = 0;
    for (let p of polygon) { cx += p.x; cy += p.y; }
    return new p5.Vector(cx / n, cy / n);
  }
  return bestMidpoint;
}

export function genCurve(start: p5.Vector, n: number, angleRange: number) {
  let pts = [start.copy()];
  let curr = start.copy();
  let angle = Math.random() * Math.PI * 2;
  for(let i=0; i<n; i++) {
    angle += (Math.random() - 0.5) * (angleRange * Math.PI / 180);
    const step = p5.Vector.fromAngle(angle).mult(10 + Math.random() * 10);
    curr.add(step);
    pts.push(curr.copy());
  }
  return pts;
}
