const scale = 32;
let totalCount = 0;
let mode = 0;

let p0 = { x: 152.026, y: 331.354 };
let p1 = { x: 166.942, y: 340.26 };

let pcounter = 0;
let rotationAmount = 0;

const CENTER_ZONE = 1;
const EDGE_ZONE = 0;


const canvas = document.createElement("canvas");

canvas.width = 2048;
canvas.height = 2048;
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

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

  if (Math.abs(line.x * line.x + line.y * line.y) < F_EPSILON) {
    return;
  }

  const lutning = line.x / line.y;

  let tl_x = get_tile(Math.floor(p0.x));
  let tl_y = get_tile(Math.floor(p0.y));

  const r_x = Math.floor(p0.x) - tl_x;
  const r_y = Math.floor(p0.y) - tl_y;


  const x_step = x_dir * PADDING;
  const x_long_step = x_dir * (TILE_SIZE - 2 * PADDING);
  const y_step = y_dir * PADDING;
  const y_long_step = y_dir * (TILE_SIZE - 2 * PADDING);

  const yx_step      = 2*y_dir*(PADDING) * lutning;
  const yx_long_step = y_dir*(TILE_SIZE - 2*PADDING) * lutning;


  let next_x = 0;
  let zone_x = 0;

  let next_y = 0;
  let zone_y = 0;

  if (r_x < PADDING) {
    next_x = tl_x + x_step;
    zone_x = EDGE_ZONE;
  } else if (r_x < TILE_SIZE - PADDING) {
    next_x = tl_x + Number(x_dir > 0) * TILE_SIZE - x_step;
    zone_x = CENTER_ZONE;
  } else {
    tl_x += TILE_SIZE;
    next_x = tl_x + x_step;
    zone_x = EDGE_ZONE;
  }

  if (r_y < PADDING) {
    next_y = tl_y + y_step;
    zone_y = EDGE_ZONE;
  } else if (r_y < TILE_SIZE - PADDING) {
    next_y = tl_y + Number(y_dir > 0) * TILE_SIZE - y_step;
    zone_y = CENTER_ZONE;
  } else {
    tl_y += TILE_SIZE;
    next_y = tl_y + y_step;
    zone_y = EDGE_ZONE;
  }

  ctx.save();
  ctx.fillStyle = "red";
  ctx.globalAlpha = 0.3;

  const lookup = {};

  const fill = (x, y) => {
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    const n = (x & 0xffff) | (y << 16);
    if (lookup[n]) {
      alert(`Repeated positions: ${x}x${y}`);
    }
    lookup[n] = 1;
    return 1;
  };

  let count = 0;

  count += fill(tl_x, tl_y);
  if ((zone_x & 1) + (zone_y & 1) === 0) {
    count += fill(tl_x - TILE_SIZE, tl_y, TILE_SIZE);
    count += fill(tl_x - TILE_SIZE, tl_y - TILE_SIZE);
    count += fill(tl_x, tl_y - TILE_SIZE);
  } else if (zone_x === EDGE_ZONE) {
    count += fill(tl_x - TILE_SIZE, tl_y);
  } else if (zone_y === EDGE_ZONE) {
    count += fill(tl_x, tl_y - TILE_SIZE);
  }

  const get_next_yx = () => {
    const line = [
      { x: -10000, y: next_y },
      { x: 10000, y: next_y },
    ];
    let t = IntersectsLines(line[0], line[1], p0, p1);
    return p0.x + t * (p1.x - p0.x);
  };

  let next_yx = get_next_yx();

  const is_vertical = Math.abs(line.x) <= F_EPSILON;
  const is_horizontal = Math.abs(line.y) <= F_EPSILON;

  next_yx = is_horizontal ? Infinity : next_yx;
  next_x = is_vertical ? Infinity : next_x;

  tl_x -= Number(zone_x === CENTER_ZONE && x_dir < 0) * TILE_SIZE;
  tl_y -= Number(zone_y === CENTER_ZONE && y_dir < 0) * TILE_SIZE;


  const emitX = () => {
    if ((zone_x & 1) === CENTER_ZONE) {
      count += fill(tl_x, tl_y);
      if ((zone_y & 1) === EDGE_ZONE) {
        count += fill(tl_x, tl_y - TILE_SIZE * y_dir);
      }
    }
  };

  const emitY = () => {
    if ((zone_y & 1) === CENTER_ZONE) {
      count += fill(tl_x, tl_y);
      if ((zone_x & 1) === EDGE_ZONE) {
        count += fill(tl_x - TILE_SIZE * x_dir, tl_y);
      }
    }
  };

  const y_steps = [yx_long_step, yx_step];
  const x_steps = [x_long_step, x_step * 2];

  let its = 0;
  if(!is_vertical) {
    const next_x2 = next_x + x_steps[zone_x];
    its += Number((x_dir < 0 && p1.x < next_x) || (x_dir > 0 && p1.x >= next_x)) + Math.floor((Math.abs(p1.x - next_x) / TILE_SIZE));
    its += Number((x_dir < 0 && p1.x < next_x2) || (x_dir > 0 && p1.x >= next_x2)) + Math.floor((Math.abs(p1.x - next_x2) / TILE_SIZE));
  }
 
  if(!is_horizontal) {
    const next_y2 = next_y + ((zone_y & 1) ? 2*PADDING*y_dir : (TILE_SIZE - 2*PADDING)*y_dir);
    its += Number((y_dir < 0 && p1.y < next_y) || (y_dir > 0 && p1.y >= next_y)) + Math.floor((Math.abs(p1.y - next_y) / TILE_SIZE));
    its += Number((y_dir < 0 && p1.y < next_y2) || (y_dir > 0 && p1.y >= next_y2)) + Math.floor((Math.abs(p1.y - next_y2) / TILE_SIZE));
  }

  for (let i = 0; i < its; i++) {
    if (Math.abs(next_x - p0.x) > Math.abs(next_yx - p0.x)) {
      tl_y += TILE_SIZE * y_dir * Number(zone_y & 1);
      emitY();
      next_yx += y_steps[zone_y & 1]; 
      zone_y++;
    } else {
      tl_x += TILE_SIZE * x_dir * Number(zone_x & 1);
      emitX();
      next_x += x_steps[zone_x & 1];
      zone_x++;
    }
  }

  const xyt = IntersectsLines(
    { x: next_x, y: -10000 },
    { x: next_x, y: 10000 },
    p0,
    p1
  );
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

const xiaolinWu = (p0, p1) => {
  const fpart = (x) => x - Math.floor(x);
  const rfpart = (x) => 1 - fpart(x);
  const ipart = (x) => Math.floor(x);
  const plot = (x, y, a) => {
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  };

  let x0 = p0.x / TILE_SIZE;
  let y0 = p0.y / TILE_SIZE;
  let x1 = p1.x / TILE_SIZE;
  let y1 = p1.y / TILE_SIZE;

  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

  if (steep) {
    [x0, y0] = [y0, x0];
    [x1, y1] = [y1, x1];
  }

  if (x0 > x1) {
    [x0, x1] = [x1, x0];
    [y0, y1] = [y1, y0];
  }

  const dx = x1 - x0;
  const dy = y1 - y0;

  let gradient = 1.0;
  if (dx !== 0) {
    gradient = dy / dx;
  }

  let xend = Math.round(x0);
  let yend = y0 + gradient * (xend - x0);
  let xgap = rfpart(x0 + 0.5);
  let xpxl1 = xend;
  let ypxl1 = ipart(yend);
  // if (steep) {
  //   plot(ypxl1,   xpxl1, rfpart(yend) * xgap)
  //   plot(ypxl1+1, xpxl1,  fpart(yend) * xgap)
  // } else {
  //   plot(xpxl1, ypxl1  , rfpart(yend) * xgap)
  //   plot(xpxl1, ypxl1+1,  fpart(yend) * xgap)
  // }

  let intery = yend + gradient;
  xend = Math.round(x1);
  yend = y1 + gradient * (xend - x1);
  xgap = fpart(x1 + 0.5);
  let xpxl2 = xend; //this will be used in the main loop
  let ypxl2 = ipart(yend);

  // if (steep) {
  //   plot(ypxl2  , xpxl2, rfpart(yend) * xgap)
  //   plot(ypxl2+1, xpxl2,  fpart(yend) * xgap)
  // } else {
  //   plot(xpxl2, ypxl2,  rfpart(yend) * xgap)
  //   plot(xpxl2, ypxl2+1, fpart(yend) * xgap)
  // }

  console.log("xcx", xpxl1, xpxl2);

  if (steep) {
    // for(let x = xpxl1 + 1; x <= xpxl2 - 1; x++) {
    //   plot(ipart(intery)  , x, rfpart(intery));
    //   plot(ipart(intery)+1, x,  fpart(intery));
    //   intery = intery + gradient;
    // }
  } else {
    let c = 0;
    for (let x = xpxl1 + 1; x <= xpxl2 - 1; x++) {
      plot(x, ipart(intery), rfpart(intery));
      plot(x, ipart(intery) + 1, fpart(intery));
      intery = intery + gradient;
      console.log(yend, x, intery);
      // if(c++ == 1) {
      //   break;
      // }
    }
  }
};

const raColl = (start, end) => {
  const difX = (end.x - start.x) / TILE_SIZE;
  const difY = (end.y - start.y) / TILE_SIZE;
  const dist = Math.ceil(Math.abs(difX) + Math.abs(difY) + 2 * TILE_SIZE);
  const dx = difX / dist;
  const dy = difY / dist;

  let sx = start.x / TILE_SIZE;
  let sy = start.y / TILE_SIZE;

  ctx.fillStyle = "purple";
  ctx.globalAlpha = 0.3;

  for (let i = 0; i <= dist; i++) {
    const x = Math.floor(sx + dx * i);
    const y = Math.floor(sy + dy * i);
    // draw(x,y);
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
  ctx.globalAlpha = 1.0;
};

const render = () => {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  // let cx =  (p0.x + p1.x) / 2;
  // let cy =  (p0.y + p1.y) / 2;
  // const l = { x: p1.x - p0.x, y: p1.y - p0.y};
  // let r =  -Math.atan2(l.y, l.x);
  // ctx.translate(cx, cy);
  // ctx.rotate(r * rotationAmount);
  // ctx.translate(-cx, -cy);

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 2048, 2048);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1 / scale;

  ctx.globalAlpha = 0.3;
  switch (mode % 3) {
    case 0: {
      ctx.fillStyle = "red";
      lineColl(p0, p1);
      break;
    }
    case 1: {
      ctx.fillStyle = "purple";
      xiaolinWu(p0, p1);
      break;
    }
    case 2:
      ctx.fillStyle = "blue";
      raColl(p0, p1);
      break;
  }

  ctx.globalAlpha = 1.0;

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
  let drawBoxes = true;
  if (drawBoxes) {
    ctx.fillStyle = "green";
    for (let i = 0; i < 128; i++) {
      for (let j = 0; j < 128; j++) {
        ctx.fillRect(
          i * 16 - PADDING,
          j * TILE_SIZE - PADDING,
          PADDING * 2,
          PADDING * 2
        );
      }
    }
  }

  if (scale > 4) {
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
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left; //x position within the element.
  const y = e.clientY - rect.top; //y position within the element.

  p0.x = x / scale;
  p0.y = y / scale;
  render();
  mouseDown = true;
  rotationAmount = 0;
};

window.onmousemove = (e) => {
  if (!mouseDown) return;
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left; //x position within the element.
  const y = e.clientY - rect.top; //y position within the element.

  p1.x = x / scale;
  p1.y = y / scale;
  render();
};

window.onmouseup = () => {
  mouseDown = false;
  const rotationTime = 10;
  let timer = rotationTime;
  const animate = () => {
    rotationAmount = 1 - timer / rotationTime;
    if (timer >= 0) {
      render();
      requestAnimationFrame(animate);
    }
    timer--;
  };
  requestAnimationFrame(animate);
};

//render();

let counter = 0;
const load = async () => {
  const res = await fetch("out2.txt");
  const txt = await res.text();
  const lines = txt.split("\n");

  let prev = { x: 0, y: 0 };

  const parseLine = (line) => {
    const parts = line.split(" ");
    if (parts.length !== 3) {
      return { x: 0, y: 0, type: "M" };
    }
    const type = parts[0];
    const s = 1.0;
    const x = (Number(parts[1]) - 70) * s;
    const y = (Number(parts[2]) - 190) * s;
    return { x, y, type };
  };

  const renderLine = (line) => {
    const { x, y } = parseLine(line);
    p0 = prev;
    p1 = { x, y };
    prev = { x, y };
  };

  window.onkeydown = () => {
    renderLine(lines[counter++]);
    render();

    ctx.save();
    ctx.beginPath();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1 / scale;
    ctx.globalCompositeOperation = "src-under";
    for (const line of lines) {
      const { type, x, y } = parseLine(line);
      if (type === "M") {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.restore();
  };
};
//load();
render();

window.onkeydown = (e) => {
  rotationAmount = 0;
  switch (e.key) {
    case "ArrowUp": {
      p0.y -= 0.25;
      p1.y -= 0.25;
      break;
    }
    case "ArrowDown": {
      p0.y += 0.25;
      p1.y += 0.25;
      break;
    }
    case "ArrowLeft": {
      p0.x -= 0.25;
      p1.x -= 0.25;
      break;
    }
    case "ArrowRight": {
      p0.x += 0.25;
      p1.x += 0.25;
      break;
    }
    case "s": {
      mode++;
      console.log("Modechange");
      break;
    }
  }
  console.log("Keydown");
  render();
  e.preventDefault();
};
