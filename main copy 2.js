const scale = 32;

let p0 = { x: 0, y: 0 };
let p1 = { x: 31.5, y: 31.5 };
const prefs = [p0, p1];
let pcounter = 0;

const canvas = document.createElement("canvas");

canvas.width = 2048;
canvas.height = 2048;
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");
ctx.scale(scale, scale);

const PADDING = 1;
const LINE_OFFSET = PADDING;
const TILE_SIZE = 16;
const NEGATION = TILE_SIZE - PADDING;
const F_EPSILON = 0.000001;
let numTileLines = canvas.width / TILE_SIZE;

const get_tile = (v) => {
  const n = Number(v < 0) * NEGATION;
  return Math.floor((v - n) / TILE_SIZE) * TILE_SIZE;
};


const sub = (a, b) => {
  return { x: a.x - b.x, y: a.y - b.y };
}

// a1 is line1 start, a2 is line1 end, b1 is line2 start, b2 is line2 end
const IntersectsLines = (a1, a2, b1, b2) => {
    const b = sub(a2, a1);
    const d = sub(b2, b1);
    const bDotDPerp = b.x * d.y - b.y * d.x;

    // if b dot d == 0, it means the lines are parallel so have infinite intersection points
    if (bDotDPerp == 0.) {
      return false;
    }
        
    const c = sub(b1, a1);
    const t = (c.x * d.y - c.y * d.x) / bDotDPerp;
    const u = (c.x * b.y - c.y * b.x) / bDotDPerp;

    return !(u < 0. || u > 1. || t < 0. || t > 1.);
}

const IntersectBox = (l0, l1, tl_x, tl_y) => {
  const left    = tl_x - PADDING;
  const right   = tl_x + PADDING + TILE_SIZE;
  const top     = tl_y - PADDING ;
  const bottom  = tl_y + PADDING + TILE_SIZE;

  const tl = { x: left, y: top };
  const tr = { x: right, y: top };
  const br = { x: right, y: bottom };
  const bl = { x: left, y: bottom };

  let cx = l0.x >= left && l0.x <= right && l1.x >= left && l1.x <= right;
  let cy = l0.y >= top && l0.y <= bottom && l1.y >= top && l1.y <= bottom;

  if(cx && cy) {
    return true;
  }

  let ctop   = IntersectsLines(l0, l1, tl, tr);
  let cright = IntersectsLines(l0, l1, tr, br);
  let cbot   = IntersectsLines(l0, l1, br, bl);
  let cleft  = IntersectsLines(l0, l1, bl, tl);
  return ctop || cright || cbot || cleft;
}


const setUpRay = (l, dx, dy, dtdx, dtdy) => {
  const r = {
    row_t0: 0,
    col_t0: 0,
    row_t1: Infinity,
    col_t1: Infinity,
    x: 0,
    y: 0,
  };

  r.x = Math.floor(l.x0);
  r.y = Math.floor(l.y0);
  
  if (Math.abs(dy) > F_EPSILON) {
    const tl_y = get_tile(r.y);
    const next_y = l.y1 > l.y0 ? tl_y + TILE_SIZE : tl_y;
    r.row_t1 = Math.min((dtdy * (next_y - l.y0)) / TILE_SIZE, 1.0);
  }

  if (Math.abs(dx) > F_EPSILON) {
    const tl_x = get_tile(r.x);
    const next_x = l.x1 > l.x0 ? tl_x + TILE_SIZE : tl_x;
    r.col_t1 = Math.min((dtdx * (next_x - l.x0)) / TILE_SIZE, 1.0);
  }

  return r;
};

const rayDone = (r) => {
  const isDone =
    Math.abs(r.row_t0 - 1.0) < F_EPSILON ||
    Math.abs(r.col_t0 - 1.0) < F_EPSILON;
  return isDone;
};

const lineColl = (p0, p1) => {
  const line = { x: p1.x - p0.x, y: p1.y - p0.y };
  const x_dir = Math.sign(line.x);
  const y_dir = Math.sign(line.y);

  const tl_x = get_tile(p0.x);
  const tl_y = get_tile(p1.y);
  
  const r_x = p0.x - tl_x;
  const r_y = p0.y - tl_y;

  let next_x;
  const x_step = x_dir * PADDING;
  if (r_x < PADDING) {
    next_x = tl_x + x_step;
  } else if(r_x < TILE_SIZE - PADDING) {
    next_x = tl_x + Number(x_dir > 0) * TILE_SIZE - x_step;
  } else {
    next_x = tl_x + TILE_SIZE - x_step;
  }

  console.log(next_x);


  ctx.save();
  ctx.globalAlpha = 2.0;
  ctx.fillStyle = "blue";
  ctx.fillRect(next_x, p0.y, 1, 1);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p0.x + line.x, p0.y + line.y);
  ctx.stroke();
  ctx.restore();

}

const stepRays = (l1, l2, l3) => {
  const dx = l1.x1 - l1.x0;
  const dy = l1.y1 - l1.y0;

  const dtdx = dx !== 0 ? TILE_SIZE / dx : 1.0;
  const dtdy = dy !== 0 ? TILE_SIZE / dy : 1.0;

  const x_step = Math.abs(dtdx);
  const y_step = Math.abs(dtdy);

  const x_dir = Math.sign(dx) * TILE_SIZE;
  const y_dir = Math.sign(dy) * TILE_SIZE;

  const r0 = setUpRay(l1, dx, dy, dtdx, dtdy);
  const r1 = setUpRay(l2, dx, dy, dtdx, dtdy);
  const cache = [99999999, 99999999];

  let counter = 0;
  while (true) {
    if (counter++ > 5000) {
      break;
    }

    const r0_t1 = Math.min(r0.row_t1, r0.col_t1);
    const r1_t1 = Math.min(r1.row_t1, r1.col_t1);
    const r = r0_t1 <= r1_t1 && !rayDone(r0) ? r0 : r1;

    const tl_x = get_tile(r.x);
    const tl_y = get_tile(r.y);
    const n = (tl_x & 0xffff) | (tl_y << 16);

    let isCool = IntersectBox({x: l3.x0, y: l3.y0}, {x: l3.x1, y: l3.y1}, tl_x, tl_y);
    if (isCool && n != cache[0] && n != cache[1]) {

      cache[1] = cache[0];
      cache[0] = n;
      ctx.save();
      ctx.fillStyle = "blue";
      ctx.globalAlpha = 0.3;
      ctx.fillRect(Math.floor(tl_x), Math.floor(tl_y), TILE_SIZE, TILE_SIZE);
      ctx.restore();
    }

    if (r.row_t1 < r.col_t1) {
      r.row_t0 = r.row_t1;
      r.row_t1 = Math.min(r.row_t1 + y_step, 1.0);
      r.y = r.y + y_dir;
    } else {
      r.col_t0 = r.col_t1;
      r.col_t1 = Math.min(r.col_t1 + x_step, 1.0);
      r.x = r.x + x_dir;
    }
    if (rayDone(r0) && rayDone(r1)) {
      break;
    }
  }
};

const duoRay = (x0, y0, x1, y1, width) => {
  const line = { x: x1 - x0, y: y1 - y0 };
  const normal = { x: line.y, y: -line.x };
  const l = Math.sqrt(line.x * line.x + line.y * line.y);
  normal.x /= l;
  normal.y /= l;

  const w =  PADDING * Math.sqrt(2);
  normal.x *= w;
  normal.y *= w;

  const extent = PADDING*2; 
  const pm = (l + extent * 2) / l;
  const div = extent / (l * pm);

  const linee = { x: line.x * pm, y: line.y * pm };
  const nx0 = x0 - linee.x * div;
  const ny0 = y0 - linee.y * div;

  const l01 = { x: nx0 + normal.x, y: ny0 + normal.y };
  const l02 = { x: nx0 + linee.x + normal.x, y: ny0 + linee.y + normal.y };
  const l11 = { x: nx0 - normal.x, y: ny0 - normal.y };
  const l12 = { x: nx0 + linee.x - normal.x, y: ny0 + linee.y - normal.y };



  ctx.save();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 0.2;

  ctx.beginPath();
  // ctx.moveTo(l01.x, l01.y);
  // ctx.lineTo(l02.x, l02.y);
  // ctx.moveTo(l11.x, l11.y);
  // ctx.lineTo(l12.x, l12.y);
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + line.x, y0 + line.y);
  
  ctx.stroke();
  ctx.restore();

  return {
    l1: { x0: l01.x, y0: l01.y, x1: l02.x, y1: l02.y },
    l2: { x0: l11.x, y0: l11.y, x1: l12.x, y1: l12.y },
    l3: { x0: nx0, y0: ny0, x1: nx0 + linee.x, y1: ny0 + linee.y }
  };
};

const render = () => {
  ctx.save();
  ctx.fillStyle = "white";

  ctx.fillRect(0, 0, 2048, 2048);

  ctx.strokeStyle = "black";
  ctx.lineWidth = 4 / scale;

  //plotLineWidth(p0.x , p0.y , p1.x , p1.y , 1 + 1 / 16);
  ctx.lineWidth = 1 / scale;
  lineColl(p0, p1);
  //const rays = duoRay(p0.x, p0.y, p1.x, p1.y, LINE_OFFSET);
  //console.log(p0.x, p0.y);
  //stepRays(rays.l1, rays.l2, {x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y});
  //plotLine(p0.x, p0.y, p1.x, p1.y);
  //line_DDA_subpixel1(p0.x, p0.y, p1.x, p1.y)

  ctx.beginPath();
  ctx.lineWidth = 4 / scale;
  for (let i = 0; i < numTileLines; i++) {
    ctx.moveTo(0, i * TILE_SIZE);
    ctx.lineTo(2048, i * TILE_SIZE);

    ctx.moveTo(i * TILE_SIZE, 0);
    ctx.lineTo(i * TILE_SIZE, 2048);
  }

  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = 1 / scale;
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 2048; i++) {
    ctx.moveTo(0, i);
    ctx.lineTo(2048, i);

    ctx.moveTo(i, 0);
    ctx.lineTo(i, 2048);
  }
  ctx.stroke();

  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2 / scale;
  ctx.setLineDash([0.2, 0.2]);

  for (let i = 0; i < 2048; i++) {
    ctx.strokeStyle = Math.floor(Math.random() * 16777215).toString(16);
    const tiles_per_row = Math.floor(canvas.width / TILE_SIZE);
    const x = i % tiles_per_row;
    const y = Math.floor(i / tiles_per_row);

    ctx.strokeRect(
      x * TILE_SIZE - PADDING,
      y * TILE_SIZE - PADDING,
      TILE_SIZE + PADDING * 2,
      TILE_SIZE + PADDING * 2
    );
  }
  ctx.fillColor = "green";
  ctx.globalAlpha = 1.;
  ctx.fillRect(p0.x - 0.25, p0.y - 0.25, 0.5, 0.5);
  ctx.fillRect(p1.x - 0.25, p1.y - 0.25, 0.5, 0.5);

  ctx.restore();
};
let mouseDown = false;
canvas.onmousedown = (e) => {
  const i = pcounter++ % 2;
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left; //x position within the element.
  const y = e.clientY - rect.top; //y position within the element.

  prefs[i].x = x / scale;
  prefs[i].y = y / scale;
  render();
  mouseDown = true;
};

window.onmousemove = (e) => {
    if(!mouseDown) return;
    const i = pcounter % 2;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left; //x position within the element.
    const y = e.clientY - rect.top; //y position within the element.
  
    prefs[i].x = x / scale;
    prefs[i].y = y / scale;
    render();
}

window.onmouseup = () => {
    mouseDown = false;
}

render();
