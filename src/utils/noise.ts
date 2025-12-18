import p5 from 'p5';

// --- GRADIENT NOISE IMPLEMENTATION ---

const gradConstants = {
    hash1 : new p5.Vector(127.1,311.7, 74.7),
    hash2 : new p5.Vector(269.5,183.3,246.1),
    hash3 : new p5.Vector(113.5,271.9,124.6),
    hash4 : 43758.5453123,
    octaves : 4,
    falloff : 0.5
};

const vec = (x: number,y: number,z: number): p5.Vector => new p5.Vector (x,y,z);
const mix = (x: number, y: number, amt: number) => {
    return x * (1-amt) + y * amt;
};
const fract = (x: number) => x - Math.floor(x);

function hash(p: p5.Vector) {
    const a = p.dot(gradConstants.hash1),
          b = p.dot(gradConstants.hash2),
          c = p.dot(gradConstants.hash3);
    return vec(
        -1 + 2*fract(Math.sin(a)*gradConstants.hash4),
        -1 + 2*fract(Math.sin(b)*gradConstants.hash4),
        -1 + 2*fract(Math.sin(c)*gradConstants.hash4)
    );
}

let _seedx = 0, _seedy = 0, _seedz = 0;

function _gradNoise ( x: number, y: number, z: number ) {
    x += _seedx; y += _seedy; z+= _seedz;
    const i: p5.Vector = vec ( Math.floor(x), Math.floor(y), Math.floor(z) );
    const f: p5.Vector = vec ( x - i.x , y - i.y , z - i.z );
    
    // Explicitly cast to any then number to avoid TS errors with vector component types
    const ix = (i as any).x as number;
    const iy = (i as any).y as number;
    const iz = (i as any).z as number;

    const fx = (f as any).x as number;
    const fy = (f as any).y as number;
    const fz = (f as any).z as number;

    const u: p5.Vector = vec (fx *fx*(3.0-2.0*fx), fy *fy *(3.0-2.0*fy), fz*fz *(3.0-2.0*fz));
    
    const ux = (u as any).x as number;
    const uy = (u as any).y as number;
    const uz = (u as any).z as number;

    return  mix(
            mix (
                mix (hash (i).dot (f), 
                         hash (vec(ix+1,iy,iz)).dot(vec(fx-1,fy,fz)), ux),
                mix (hash (vec(ix,iy+1,iz)).dot(vec(fx,fy-1,fz)), 
                         hash (vec(ix+1,iy+1,iz)).dot(vec(fx-1,fy-1,fz)), ux),
                uy),
            mix (
                mix (hash (vec(ix,iy,iz+1)).dot(vec(fx,fy,fz-1)), 
                         hash (vec(ix+1,iy,iz+1)).dot(vec(fx-1,fy,fz-1)), ux),
                mix (hash (vec(ix,iy+1,iz+1)).dot(vec(fx,fy-1,fz-1)), 
                         hash (vec(ix+1,iy+1,iz+1)).dot(vec(fx-1,fy-1,fz-1)), ux),
                uy),
            uz ) / 1.5 + 0.5
}

export function gradNoise (x: number, y = 0, z = 0) {
    let total = 1;
    let sum = _gradNoise(x,y,z);
    let {falloff, octaves} = gradConstants;
    let fo = falloff;
    let mult = 2;
    for (let o = gradConstants.octaves; o > 1; o--) {
        sum += fo * _gradNoise(mult*x,mult*y,mult*z);
        total += fo;
        fo *= falloff;
        mult *= 2;
    }
    return sum / total
}