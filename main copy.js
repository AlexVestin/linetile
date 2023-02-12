const scale = 12;
let totalCount = 0;
let mode = 0;

// 60,1885
//299.805,1885
let p0 = { x: 60, y: 1885 };
let p1 = { x: 299.805, y: 1885};


// 193
// 95 -> 193 + 95 == 288

let pcounter = 0;
let rotationAmount = 0;


const EDGE_ZONE = 0;
const CENTER_ZONE = 1;


const canvas = document.createElement("canvas");

canvas.width = 2048;
canvas.height = 2048;
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

const width = 2048;
const height = 1536;

const PADDING = 2;
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
  const lookup = {};
  const t0 = performance.now();

  const fill = (x, y, c = "red") => {
    console.log(x, y);
    if(y >= 0 && y < height) {
      ctx.save();
      ctx.fillStyle = c;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      // const n = (x & 0xffff) | (y << 16);
      // if (lookup[n] && c !== "blue") {
      //   alert(`Repeated positions: ${x}x${y}`);
      // }
      // lookup[n] = 1;
      ctx.restore();
      return 1;
    } 
    return 0;
  };

  const line = { x: p1.x - p0.x, y: p1.y - p0.y };
  const x_dir = Math.sign(line.x);
  const y_dir = Math.sign(line.y);
  const is_vertical = Math.abs(line.x) <= F_EPSILON;
  const is_horizontal = Math.abs(line.y) <= F_EPSILON;

  const derivate     = is_horizontal ? line.x : line.x / line.y;
  const inv_derivate = is_vertical  ? line.y : line.y / line.x;

  let tl_x = get_tile(Math.floor(p0.x));
  let tl_y = get_tile(Math.floor(p0.y));

  const r_x = Math.floor(p0.x) - tl_x;
  const r_y = Math.floor(p0.y) - tl_y;

  const x_step = x_dir * PADDING;
  const x_long_step = x_dir * (TILE_SIZE - 2 * PADDING);
  const y_step = y_dir * PADDING;
  const y_long_step = y_dir * (TILE_SIZE - 2 * PADDING);


  const yx_step      = 2*y_dir*(PADDING) * derivate;
  const yx_long_step = y_dir*(TILE_SIZE - 2*PADDING) * derivate;

  let next_x = 0;
  let zone_x = 0;

  let next_y = 0;
  let zone_y = 0;

  zone_x = r_x >= PADDING && r_x < TILE_SIZE - PADDING ? CENTER_ZONE : EDGE_ZONE;
  zone_y = r_y >= PADDING && r_y < TILE_SIZE - PADDING ? CENTER_ZONE : EDGE_ZONE;

  if (r_x < PADDING) {
    next_x = tl_x + x_step;
  } else if (r_x < TILE_SIZE - PADDING) {
    next_x = tl_x + Number(x_dir > 0) * TILE_SIZE - x_step;
  } else {
    tl_x += TILE_SIZE;
    next_x = tl_x + x_step;
  }
  if (r_y < PADDING) {
    next_y = tl_y + y_step;
  } else if (r_y < TILE_SIZE - PADDING) {
    next_y = tl_y + Number(y_dir > 0) * TILE_SIZE - y_step;
  } else {
    tl_y += TILE_SIZE;
    next_y = tl_y + y_step;
  }
  // 896385
  // 974269
  // 896389 <<

  let count = 0;
  count += fill(tl_x, tl_y);
  if (zone_x === EDGE_ZONE && zone_y === EDGE_ZONE) {
    count += fill(tl_x - TILE_SIZE, tl_y, TILE_SIZE);
    count += fill(tl_x - TILE_SIZE, tl_y - TILE_SIZE);
    count += fill(tl_x, tl_y - TILE_SIZE);
  } else if (zone_x === EDGE_ZONE) {
    count += fill(tl_x - TILE_SIZE, tl_y);
  } else if (zone_y === EDGE_ZONE) {
    count += fill(tl_x, tl_y - TILE_SIZE);
  }
  
  tl_x -= Number(zone_x === EDGE_ZONE && x_dir < 0) * TILE_SIZE;
  tl_y -= Number(zone_y === EDGE_ZONE && y_dir < 0) * TILE_SIZE;

  //fill(tl_x, tl_y, "green")

  let next_yx =  p0.x - (p0.y - next_y) * derivate;

  next_yx = is_horizontal ? p0.x : next_yx;
  next_x  = is_vertical ? p0.x : next_x;

  const emitX = () => {
    if ((zone_x & 1) === 1) {
      count += fill(tl_x, tl_y);
      // if (!(zone_y & 1) && PADDING > 0) {
      //   count += fill(tl_x, tl_y - TILE_SIZE * y_dir);
      // }
    }
  };

  const emitY = () => {
    if ((zone_y & 1) === 1) {
      count += fill(tl_x, tl_y);
      // if (!(zone_x & 1) && PADDING > 0) {
      //   count += fill(tl_x - TILE_SIZE * x_dir, tl_y, "blue");
      // }
    }
  };

  const yx_steps = [yx_long_step, yx_step];
  const x_steps = [x_long_step, x_step * 2];
  const y_steps = [y_long_step, y_step * 2];

  let tdx0 = 0;
  let tdx1 = 0;
  let tdy0 = 0;
  let tdy1 = 0;

  const oxs = [(p0.x - next_x), p0.x - (next_x + x_steps[zone_x])]
  const oys = [(p0.y - next_y), p0.y - (next_y + y_steps[zone_y])]
  

  // ox = x_dir < 0 ? -(TILE_SIZE - ox) : ox;
  if (!is_vertical) {
    // tdx0 = ((line.x + oxs[zone_x])*x_dir + TILE_SIZE) >> 4;
    tdx1 = ((line.x + oxs[1 - zone_x])*x_dir + TILE_SIZE) >> 4
  } 

  if (!is_horizontal) {
    // tdy0 = ((line.y + oys[zone_y]) * y_dir + TILE_SIZE) >> 4;
    tdy1 = ((line.y + oys[1 - zone_y]) * y_dir + TILE_SIZE) >> 4;
  }

  const new_x = [];
  const new_y = [];
  const old_x = [];
  const old_y = [];

  const its = tdx0 + tdx1 + tdy0 + tdy1;
  let dx = Math.abs(derivate);
  let dy = Math.abs(inv_derivate) * TILE_SIZE;
  
  let dp0 = 1 + (Math.abs(oys[1 - zone_y] * derivate) + oxs[zone_x] * x_dir) / TILE_SIZE;
  let dp1 = 1 + (Math.abs(oys[1 - zone_y] * derivate) + oxs[1 - zone_x] * x_dir) / TILE_SIZE;

  console.log(dp0, dp1, derivate, oxs, oys)
  
  for (let i = 0; i < tdy1; i++) {
    let zx0 = Math.floor(dp0);
    let zx1 = Math.floor(dp1);
    let zx  = zone_x + zx0 + zx1;
  
    const x = tl_x + zx1 * TILE_SIZE * x_dir;
    const y = tl_y + (i + 1) * TILE_SIZE * y_dir; 
    if((mode % 2) === 0) {
      fill(x, y);
      if (!(zx & 1) && PADDING > 0) {
        fill(x - TILE_SIZE * x_dir, y);
      }
    }
    new_y.push(zx);   
    dp0 += dx;
    dp1 += dx;
  }
  
  let dp = Math.abs(oxs[1 - zone_x] * inv_derivate) + TILE_SIZE;
  for (let i = 0; i < tdx1; i++) {
    let zy0 = (Math.abs(dp + oys[zone_y] * y_dir)) >> 4;
    let zy1 = (Math.abs(dp + oys[1 - zone_y] * y_dir)) >> 4;
    let zy  = zone_y + zy0 + zy1;

    const x = tl_x + (i + 1) * TILE_SIZE * x_dir;
    const y = tl_y + zy1 * TILE_SIZE * y_dir; 

    if((mode % 2) === 0) {
      fill(x, y);
      if (!(zy & 1) && PADDING > 0) {
        fill(x, y - TILE_SIZE * y_dir);
      }
    }
   
    dp += dy;
    new_x.push(zy);
  }

 for (let i = 0; i < its; i++) {
    if (Math.abs(next_x - p0.x) > Math.abs(next_yx - p0.x)) {
      tl_y += TILE_SIZE * y_dir * Number(zone_y & 1);
      if(zone_y & 1) {
        if((mode % 2) === 1) {
          emitY();
        }
        old_y.push(zone_x);
      }
      
      
      next_yx += yx_steps[zone_y & 1];
      zone_y++;
    } else {
      tl_x += TILE_SIZE * x_dir * Number(zone_x & 1);
      
      if(zone_x & 1) {
        if((mode % 2) === 1) {
          emitX();
        }
        
        old_x.push(zone_y);
      }
      next_x += x_steps[zone_x & 1];
      zone_x++;
    }
  } 
  
  let same_x = new_x.every((e, i) => e === old_x[i]) && new_x.length === old_x.length;
  let same_y = new_y.every((e, i) => e === old_y[i]) && new_y.length === old_y.length;

  //console.log(new_x, old_x, new_y, old_y, same_x, same_y)
  if( !same_y || !same_x) {
    //console.error("ERROR")
    // alert("Error")
  }

  // vec2<u32>(abs(line.yy + y_steps.xy)) / TILE_SIZE;
  
 

  const t1 = performance.now();
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
  ctx.fillStyle = "red";
  lineColl(p0, p1);
  // switch (mode % 3) {
  //   case 0: {
  //     ctx.fillStyle = "red";
  //     lineColl(p0, p1);
  //     break;
  //   }
  //   case 1: {
  //     ctx.fillStyle = "purple";
  //     xiaolinWu(p0, p1);
  //     break;
  //   }
  //   case 2:
  //     ctx.fillStyle = "blue";
  //     raColl(p0, p1);
  //     break;
  // }

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
  let drawBoxes = false;
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

    let bonusGrid = true;
    if(bonusGrid) {
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

let counter = 219;
const load = async () => {
  const res = await fetch("output.txt");
  const txt = await res.text();
  const lines = txt.split("\n");

  let prev = { x: 0, y: 0 };

  const parseLine = (line) => {
    const parts = line.split(" ");
    if (parts.length !== 3) {
      return { x: 0, y: 0, type: "M" };
    }
    const type = parts[0];
    const s = 1;
    const x = (Number(parts[1]) - 70) * s;
    const y = (Number(parts[2]) - 350) * s;
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
    ctx.scale(scale, scale);
    ctx.globalAlpha = 1;
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
load();
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
