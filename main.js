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

const PADDING = 2;
const LINE_OFFSET = PADDING;
const TILE_SIZE = 16;
const NEGATION = TILE_SIZE - PADDING;
const F_EPSILON = 0.000001;

const LEFT = 1;
const TOP = 2;
const RIGHT = 4;
const BOTTOM = 8;

// flags |= Number(rx <= PADDING) << 0;
// flags |= Number(ry <= PADDING) << 1;
// flags |= Number(rx >= TILE_SIZE - PADDING) << 2;
// flags |= Number(ry >= TILE_SIZE - PADDING) << 3;
// flags |= Number(tl < sqrt2_2) << 4;
// flags |= Number(tr < sqrt2_2) << 5;
// flags |= Number(br < sqrt2_2) << 6;
// flags |= Number(bl < sqrt2_2) << 7;

let OFFSETS = [
  { x: -TILE_SIZE, y: 0 },
  { x: 0, y: -TILE_SIZE },
  { x: TILE_SIZE, y: 0 },
  { x: 0, y: TILE_SIZE },
  { x: -TILE_SIZE, y: -TILE_SIZE }, // tl
  { x: TILE_SIZE, y: -TILE_SIZE },  // tr
  { x: TILE_SIZE, y: TILE_SIZE },   // br
  { x: -TILE_SIZE, y: TILE_SIZE },  // bl
];

let numTileLines = canvas.width / TILE_SIZE;

const get_tile = (v) => {
  const n = Number(v < 0) * NEGATION;
  return Math.floor((v - n) / TILE_SIZE) * TILE_SIZE;
};

const outCode = (x, y, xmin, xmax, ymin, ymax) => {
	let code = 0;
    code = code | (Number(x < xmin) << 1);
    code = code | (Number(x > xmax) << 2);
    code = code | (Number(y < ymax) << 3);
    code = code | (Number(y > ymin) << 4);
	return code;
}

const intersectTile = (x0, y0, x1, y1, tl_x, tl_y) => {
    const op1 = outCode(x0, y0, tl_x, tl_x + PADDING, tl_y + PADDING, tl_y );
    const op2 = outCode(x1, y1, tl_x, tl_x + PADDING, tl_y + PADDING, tl_y );
    console.log(op1, op2, op1 & op2, x0, y0, x1, y1);
    return Number(!(op1 & op2));
}

const setUpRay = (l, dx, dy, dtdx, dtdy) => {
  const r = {
    row_t0: 0,
    col_t0: 0,
    row_t1: Infinity,
    col_t1: Infinity,
    line: l,
    tile: 0,
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

const stepRays = (l1, l2) => {
  console.log("---------- Step rays ------------");
  const dx = l1.x1 - l1.x0;
  const dy = l1.y1 - l1.y0;

  const l = Math.sqrt(dx * dx + dy * dy);

  const dtdx = dx !== 0 ? TILE_SIZE / dx : 1.0;
  const dtdy = dy !== 0 ? TILE_SIZE / dy : 1.0;

  const x_step = Math.abs(dtdx);
  const y_step = Math.abs(dtdy);

  const x_dir = Math.sign(dx) * TILE_SIZE;
  const y_dir = Math.sign(dy) * TILE_SIZE;

  const r0 = setUpRay(l1, dx, dy, dtdx, dtdy);
  const cache = [99999999, 99999999, 99999999, 99999999];

  const nx = (l1.y1 - l1.y0) / l;
  const ny = -(l1.x1 - l1.x0) / l;

  let counter = 0;
  while (true) {
    if (counter++ > 5000) {
      alert("Hang");
      break;
    }

    const r = r0;
    const tl_x = get_tile(r.x);
    const tl_y = get_tile(r.y);

    const t0 = Math.max(r.row_t0, r.col_t0);
    const t1 = Math.min(r.row_t1, r.col_t1);

    let p0x = t0 * l1.x1 + (1 - t0) * l1.x0;
    let p0y = t0 * l1.y1 + (1 - t0) * l1.y0;
    let p1x = t1 * l1.x1 + (1 - t1) * l1.x0;
    let p1y = t1 * l1.y1 + (1 - t1) * l1.y0;

    ctx.save();
    ctx.fillStyle = "green";
    ctx.fillRect(p0x - 0.25, p0y - 0.25, 0.5, 0.5);
    ctx.fillRect(p1x - 0.25, p1y - 0.25, 0.5, 0.5);

    const lpointd = (px, py) => {
      const dx = p0x - px;
      const dy = p0y - py;
      return Math.abs(dx * nx + dy * ny);
    };

    const emit = (x, y) => {
        const n = (x & 0xffff) | (y << 16);
        for(let i = 0; i < 4; i++) if (n === cache[i]) { return; }
        for(let i = 0; i < 3; i++) cache[i] = cache[i + 1];
        cache[3] = n;
        ctx.fillStyle = "blue";
        ctx.globalAlpha = 0.3;
        ctx.fillRect(Math.floor(x), Math.floor(y), TILE_SIZE, TILE_SIZE);
    };

    const rx = Math.floor(p0x - tl_x);
    const ry = Math.floor(p0y - tl_y);

    emit(tl_x, tl_y);
    let flags = 0;

    flags |= Number(rx <= PADDING) << 0;
    flags |= Number(ry <= PADDING) << 1;
    flags |= Number(rx >= TILE_SIZE - PADDING) << 2;
    flags |= Number(ry >= TILE_SIZE - PADDING) << 3;

    const t = TILE_SIZE - PADDING;

    flags |= intersectTile(p0x, p0y, p1x, p1y, tl_x, tl_y) << 4;
    console.log("intersect: ", intersectTile(p0x, p0y, p1x, p1y, tl_x, tl_y))
    // flags |= intersectTile(p0x, p0y, p1x, p1y, tl_x + t, tl_y) << 5;
    // flags |= intersectTile(p0x, p0y, p1x, p1y, tl_x + t, tl_y + t) << 6;
    // flags |= intersectTile(p0x, p0y, p1x, p1y, tl_x, tl_y + t) << 7;


    for (let i = 0; i < 8; i++) {
      const check = 1 << i;
      if (flags & check) {
        const o = OFFSETS[i];
        emit(tl_x + o.x, tl_y + o.y);
      }
    }

    ctx.restore();

    if (r.row_t1 < r.col_t1) {
      r.row_t0 = r.row_t1;
      r.row_t1 = Math.min(r.row_t1 + y_step, 1.0);
      r.y = r.y + y_dir;
    } else {
      r.col_t0 = r.col_t1;
      r.col_t1 = Math.min(r.col_t1 + x_step, 1.0);
      r.x = r.x + x_dir;
    }

    if (rayDone(r0)) {
        break;
    }

  }
};

// const duoRay = (x0, y0, x1, y1, width) => {
//   const line = { x: x1 - x0, y: y1 - y0 };
//   const normal = { x: line.y, y: -line.x };
//   const l = Math.sqrt(line.x * line.x + line.y * line.y);
//   normal.x /= l;
//   normal.y /= l;

//   let angle = Math.atan2(line.y, line.x);
//   if (angle < 0) {
//       angle += Math.PI * 2;
//   }

//   const looped = angle % (Math.PI / 2);
//   const howDiagonal = looped > Math.PI / 4 ? Math.PI / 2 - looped : looped;
//   const offsetMult2 = 1. - (Math.sin(howDiagonal) / Math.sqrt(2));

//   console.log(offsetMult2)
//   const w = PADDING; //PADDING * (1 - offsetMult) + (PADDING + Math.sqrt(2)) * offsetMult;
//   normal.x *= w;
//   normal.y *= w;

//   const perpExtent = PADDING * offsetMult2;
//   const pm = (l + perpExtent * 2) / l;
//   const linee = { x: line.x * pm, y: line.y * pm };
//   const nx0 = x0 - linee.x * (perpExtent / (pm * l));
//   const ny0 = y0 - linee.y * (perpExtent / (pm * l));

//   const l01 = { x: nx0 + normal.x, y: ny0 + normal.y };
//   const l02 = { x: nx0 + linee.x + normal.x, y: ny0 + linee.y + normal.y };
//   const l11 = { x: nx0 - normal.x, y: ny0 - normal.y };
//   const l12 = { x: nx0 + linee.x - normal.x, y: ny0 + linee.y - normal.y };

//   const extent = w ;
//   const m = (l + extent * 2) / l;
//   line.x *= m;
//   line.y *= m;

//   const nl = l * m;
//   x0 -= line.x * (extent / nl);
//   y0 -= line.y * (extent / nl);

//   ctx.save();
//   ctx.strokeStyle = "red";
//   ctx.lineWidth = 0.2;

//   ctx.beginPath();
//   ctx.moveTo(l01.x, l01.y);
//   ctx.lineTo(l02.x, l02.y);
//   ctx.moveTo(l11.x, l11.y);
//   ctx.lineTo(l12.x, l12.y);
//   ctx.moveTo(x0, y0);
//   ctx.lineTo(x0 + line.x, y0 + line.y);

//   ctx.stroke();
//   ctx.restore();

//   return {
//     l1: { x0: l01.x, y0: l01.y, x1: l02.x, y1: l02.y },
//     l2: { x0: l11.x, y0: l11.y, x1: l12.x, y1: l12.y },
//     l3: { x0, y0, x1: x0 + line.x, y1: y0 + line.y }
//   };
// };

const render = () => {
  ctx.save();
  ctx.fillStyle = "white";

  ctx.fillRect(0, 0, 2048, 2048);

  ctx.strokeStyle = "black";
  ctx.lineWidth = 4 / scale;

  //plotLineWidth(p0.x , p0.y , p1.x , p1.y , 1 + 1 / 16);
  ctx.lineWidth = 1 / scale;
  //const rays = duoRay(p0.x, p0.y, p1.x, p1.y, LINE_OFFSET);
  stepRays({ x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y });
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
  //   ctx.fillColor = "green";
  //   ctx.globalAlpha = 1.;
  //   ctx.fillRect(p0.x - 0.25, p0.y - 0.25, 0.5, 0.5);
  //   ctx.fillRect(p1.x - 0.25, p1.y - 0.25, 0.5, 0.5);

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
  if (!mouseDown) return;
  const i = pcounter % 2;
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left; //x position within the element.
  const y = e.clientY - rect.top; //y position within the element.

  prefs[i].x = x / scale;
  prefs[i].y = y / scale;
  render();
};

window.onmouseup = () => {
  mouseDown = false;
};

render();
