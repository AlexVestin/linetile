const scale = 32;
let totalCount = 0;

let p0 =  {x: 152.026,y: 331.354} 
let p1 =  {x: 166.942, y: 340.26} 

const prefs = [p0, p1];
let pcounter = 0;

const canvas = document.createElement("canvas");

canvas.width = 1024;
canvas.height = 1024;
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
};

// a1 is line1 start, a2 is line1 end, b1 is line2 start, b2 is line2 end
const IntersectsLines = (b1, b2, a1, a2) => {
  const b = sub(a2, a1);
  const d = sub(b2, b1);
  const bDotDPerp = b.x * d.y - b.y * d.x;
  const c = sub(b1, a1);
  const t = (c.x * d.y - c.y * d.x) / bDotDPerp;
  // const u = (c.x * b.y - c.y * b.x) / bDotDPerp;
  return t;
};

const lineColl = (p0, p1) => {
  const line = { x: p1.x - p0.x, y: p1.y - p0.y };
  const x_dir = line.x < 0 ? -1 : 1; //Math.sign(line.x);
  const y_dir = line.y < 0 ? -1 : 1; //Math.sign(line.y);

  if(Math.abs(line.x*line.x + line.y*line.y) < F_EPSILON) {
    return;
  }

  let tl_x = get_tile(Math.floor(p0.x));
  let tl_y = get_tile(Math.floor(p0.y));

  const r_x = Math.floor(p0.x) - tl_x;
  const r_y = Math.floor(p0.y) - tl_y;

  const x_step = x_dir * PADDING;
  const x_long_step = x_dir * (TILE_SIZE - 2 * PADDING);
  const y_step = y_dir * PADDING;
  const y_long_step = y_dir * (TILE_SIZE - 2 * PADDING);

  let next_x = 0;
  let zone_x = 0;
  
  let next_y = 0;
  let zone_y = 0;

  if (r_x < PADDING) {
    next_x = tl_x + x_step;
    zone_x = 0;
  } else if (r_x < TILE_SIZE - PADDING) {
    next_x = tl_x + Number(x_dir > 0) * TILE_SIZE - x_step;
    zone_x = 1;
  } else {
    tl_x += TILE_SIZE;
    next_x = tl_x + x_step;
    zone_x = 0;
  }

  if (r_y < PADDING) {
    next_y = tl_y + y_step;
    zone_y = 0;
  } else if (r_y < TILE_SIZE - PADDING) {
    next_y = tl_y + Number(y_dir > 0) * TILE_SIZE - y_step;
    zone_y = 1;
  } else {
    tl_y += TILE_SIZE;
    next_y = tl_y + y_step;
    zone_y = 0;
  }

  ctx.save();
  ctx.fillStyle = "red";
  ctx.globalAlpha = 0.3;
  

  const lookup = {};

  const fill = (x, y) => {
    console.log("Filling: ",x ,y )
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    const n = (x & 0xffff) | (y << 16);
    if(lookup[n]) {
      alert(`Repeated positions: ${x}x${y}`);
    }
    lookup[n] = 1;
  }

  fill(tl_x, tl_y);
  if ((zone_x & 1) + (zone_y & 1) === 0) {
    fill(tl_x - TILE_SIZE, tl_y, TILE_SIZE);
    fill(tl_x - TILE_SIZE, tl_y - TILE_SIZE);
    fill(tl_x, tl_y - TILE_SIZE);
  } else if ((zone_x & 1) == 0) {
    fill(tl_x - TILE_SIZE, tl_y);
  } else if ((zone_y & 1) == 0) {
    fill(tl_x, tl_y - TILE_SIZE);
  }


  const get_next_yx = () => {
    const line = [{ x: -10000, y: next_y }, { x: 10000, y: next_y }];
    let t = IntersectsLines(line[0], line[1], p0, p1);
    return p0.x + t * (p1.x - p0.x);
  }

  let next_yx = get_next_yx();

  const is_vertical   = Math.abs(line.x) <= F_EPSILON;
  const is_horizontal = Math.abs(line.y) <= F_EPSILON;

  next_yx = is_horizontal   ? Infinity : next_yx;
  next_x  = is_vertical     ? Infinity : next_x;

  tl_x += Number(!(zone_x & 1) && x_dir < 0) * TILE_SIZE * x_dir;
  tl_y += Number(!(zone_y & 1) && y_dir < 0) * TILE_SIZE * y_dir;

  let counter = 0; 

  const emitX = () => {
    if ((zone_x & 1)) {
      fill(tl_x, tl_y);
      if(!(zone_y & 1)) {
        fill(tl_x, tl_y - TILE_SIZE * y_dir);
      }
    }
  }

  const emitY = () => {
    if ((zone_y & 1)) {
      fill(tl_x, tl_y);
      if (!(zone_x & 1)) {
        fill(tl_x - TILE_SIZE * x_dir, tl_y);
      }
    }
  }

  while (1) {
    const done_x = is_vertical || (x_dir < 0 && next_x <= p1.x) || (x_dir > 0 && next_x >= p1.x);
    const done_y = is_horizontal || (y_dir < 0 && next_y <= p1.y) || (y_dir > 0 && next_y >= p1.y);
    if (counter++ > 200) {
      alert("Hang")
      console.log(done_x, done_y, is_horizontal, is_vertical);
      break;
    } 

    if (done_x && done_y) {
      break;
    }

    if (Math.abs(next_x - p0.x) > Math.abs(next_yx - p0.x)) {   
      tl_y += TILE_SIZE * y_dir * Number(zone_y & 1);   
      emitY();      
      next_y += (zone_y & 1) ? y_step * 2 : y_long_step;
      zone_y++;      
      next_yx = get_next_yx();
    } else {
      tl_x += TILE_SIZE * x_dir * Number(zone_x & 1);
      emitX();
      next_x += (zone_x & 1) ? x_step * 2 : x_long_step;
      zone_x++;
    }
  }

  const xyt = IntersectsLines({ x: next_x, y: -10000 }, {x: next_x, y: 10000}, p0, p1);
  const next_xy = p0.y + xyt * line.y;

  ctx.fillStyle = "blue";
  ctx.fillRect(next_x - 0.5, next_xy - 0.5, 1, 1);
  ctx.fillStyle = "green";
  ctx.fillRect(next_yx - 0.5, next_y - 0.5, 1, 1);

  ctx.strokeStyle = "red";
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p0.x + line.x, p0.y + line.y);
  ctx.stroke();
  ctx.restore();
};

const render = () => {
  ctx.save();
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 2048, 2048);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1 / scale;

  if (pcounter % 2) {
    lineColl(p0, p1);
  } else {
   lineColl(p1, p0);
  }

  ctx.beginPath();
  ctx.lineWidth = 2 / scale;
  for (let i = 0; i < numTileLines; i++) {
    ctx.moveTo(0, i * TILE_SIZE);
    ctx.lineTo(2048, i * TILE_SIZE);
    ctx.moveTo(i * TILE_SIZE, 0);
    ctx.lineTo(i * TILE_SIZE, 2048);
  }

  ctx.stroke();

  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();

  if(scale > 4) {
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1 / scale;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 2048; i++) {
      ctx.moveTo(0, i);
      ctx.lineTo(2048, i);
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 2048);
    }
    ctx.stroke();
  
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

    ctx.restore();

}
  ctx.fillColor = "green";
  ctx.globalAlpha = 1;
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

//render();

let counter = 0;
const load = async () => {
  const res = await fetch("output.txt");
  const txt = await res.text();
  const lines = txt.split("\n");

  let prev = { x: 0, y: 0 };

  const parseLine = (line) => {
    const parts = line.split(" ");
    if (parts.length !== 3) {
      return {x: 0, y: 0, type: "M"}
    }
    const type = parts[0];
    const s = 1.0;
    const x = (Number(parts[1]) * s);
    const y = (Number(parts[2]) + 112) * s;
    return {x, y, type}
  }

  const renderLine = (line) => {
    const {x, y} = parseLine(line);
    p0 = prev;
    p1 = {x, y};
    prev = {x, y};
  }

  window.onkeydown = () => {
    console.log("Line index: ", counter)
    renderLine(lines[counter++]);
    render();

    ctx.save();
    ctx.beginPath();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "black";
    ctx.strokeWidth = 1. / scale;
    ctx.globalCompositeOperation = "src-under"
    for(const line of lines) {
      const {type, x, y} = parseLine(line);
      if(type === "M") {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }
}
load();
render();