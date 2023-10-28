///////////
// GLOBAL INFORMATION
///////////
const GI = {
  // units
  unit: 1, // The game unit, in computer pixels (dynamically calculated)
  width: 16, // Game area width in Units
  height: 9,
  res: 8, // Art pixels / unit
  pixel: 1, // Computer pixels / Art pixel

  // sprite maps
  spriteSize: 80, // width == height

  // canvas
  canvasX: 0,
  canvasY: 0,
  canvasWidth: 0,
  canvasHeight: 0,

  // cursor
  cursorX: 0,
  cursorY: 0,

  init: function () {
    this.unit = (window.innerWidth / 16 > window.innerHeight / 9) ? Math.floor(window.innerHeight / (this.height + 0.5) / 4) * 4 : Math.floor(window.innerWidth / (this.width + 0.5) / 4) * 4;
    this.pixel = this.unit / 8;
    
    document.body.style.setProperty("--unit", this.unit + "px");
    document.body.style.setProperty("--width", this.width);
    document.body.style.setProperty("--height", this.height);
  }
}

const Storage = {
  storedName: "UWGameJam_SavedData",
  splashScreen: false, // Whether to display the splash screen on game load
  currentData: { // All save-able game data goes here!
    "progress": 0,
  },

  init: function () {
    let savedData = localStorage.getItem(this.storedName);

    if (!savedData) { // Nothing was previously saved in the browser.
      setTimeout(function () { Storage.store(); }, 2000);
    } else { // Update our data based on what was saved.
      this.currentData = JSON.parse(savedData);

      if (this.currentData["progress"] === 0) {
        this.splashScreen = true;
      }
    }
  },
  store: function () {
    localStorage.setItem(this.storedName, JSON.stringify(this.currentData));
  }
}


///////////
// GAME LOOP
///////////
const Screen = {
  layers: 8, // Total layers on our screen
  contexts: [],

  // layer aliases
  void: null,
  background: null,
  objects: null,
  bugs: null,
  ghost: null,
  screen: null,

  init: function () {
    let belowCanvases = document.querySelector(".belowCanvases");
    for (let i = 0; i < this.layers; i++) {
      let canvas = document.createElement("CANVAS");
      canvas.id = "Canvas" + i;
      canvas.width = GI.unit * GI.width;
      canvas.height = GI.unit * GI.height;
      document.body.insertBefore(canvas, belowCanvases);

      let context = canvas.getContext("2d");
      context.imageSmoothingEnabled = false;
      this.contexts.push(context);
    }

    this.void = this.contexts[0];
    this.backgound = this.contexts[1]; // floor and solid walls
    // underground??
    this.objects = this.contexts[5];
    this.bugs = this.contexts[6];
    this.ghost = this.contexts[7];

    const canvas = document.getElementById("Canvas0");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      GI.canvasX = rect.left;
      GI.canvasY = rect.top;
      GI.canvasWidth = rect.width;
      GI.canvasHeight = rect.height;
    }
  },
}

class Spritemap {
  constructor(image) {
    this.image = image;
    this.width = image.width;
    this.height = image.height;
    this.col = Math.floor(this.width / GI.spriteSize);
    this.row = Math.floor(this.height / GI.spriteSize);
  }
  
  getTileCoordinates(x, y) {
    return [x * GI.spriteSize, y * GI.spriteSize];
  }

  drawTile(context, x, y, destX, destY) {
    const [xT, yT] = this.getTileCoordinates(x, y);
    context.drawImage(this.image, xT, yT, GI.spriteSize, GI.spriteSize, destX, destY, GI.unit, GI.unit);
  }
}

const Assets = {
  spritemapNames: ["ghost", "hardwarebug"],
  spritemapsPath: "assets/spritemaps",
  spritemaps: [],

  init: function () {
    for (let i = 0; i < this.spritemapNames.length; i++) {
      let image = new Image();
      image.src = this.spritemapsPath + "/" + this.spritemapNames[i] + ".png";
      this.spritemaps.push(new Spritemap(image));
    }
  },
}

const Animator = {
  frame: 0,
  paused: false,
  fps: 60,
  fpsInterval: 0,
  startTime: 0,
  now: 0,
  then: 0,
  elapsed: 0,

  init: function () {
    this.fpsInterval = 1000 / this.fps;
    this.then = Date.now();
    this.startTime = this.then;
  },

  start: function () {
    this.animate();
  },

  animate: () => {
    requestAnimationFrame(() => { Animator.animate(); });
    Animator.now = Date.now();
    Animator.elapsed = Animator.now - Animator.then;

    if (Animator.elapsed > Animator.fpsInterval) { // If enough time has elapsed, draw the next frame
      Animator.then = Animator.now - (Animator.elapsed % Animator.fpsInterval);
      
      if (!Animator.paused) { // GAME LOOP
        updateAll();
        drawAll();
        Animator.frame++;
      }
    }
  }
}


///////////
// EVENTS
///////////

function keyPressed(code, pressed) {
  if (!Animator.paused || !pressed) {
    if ((code == 37 || code == 65)) return; // Left
    else if ((code == 38 || code == 87)) return; // Up
    else if ((code == 39 || code == 68)) return; // Right
    else if ((code == 40 || code == 83)) return; // Down
    else if ((code == 80 || code == 82 || code == 27) && pressed) return; // P or R or [Esc]
  }
}

document.addEventListener("keydown", (event) => {
  let k = event.code;
  
  if (k == 9 || k == 38 || k == 40) {
    event.preventDefault();
  } else if (k == 123 || (event.ctrlKey && event.shiftKey && (k == 73 || k == 74))) {
    event.preventDefault();
    return false;
  }

  keyPressed(k, 1);
}, false);

document.addEventListener("keyup", (event) => {
	keyPressed(event.code, 0);
});

document.addEventListener("mousedown", (event) => {
  event.preventDefault();
  return false;
});

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});


///////////
// UTIL
///////////

function between(x, a, b) {
  return (x < Math.max(a, b)) && (x > Math.min(a, b));
}

function clamp(x, a, b) {
  return Math.min(Math.max(x, Math.min(a, b)), Math.max(a, b));
}

function dist(x1, y1, x2, y2  ) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function toDirection(angle) {
  return Math.floor(angle / 45);
}

const Dir = {
  W: 0,
  NW: 1,
  N: 2,
  NE: 3,
  E: 4,
  SE: 5,
  S: 6,
  SW: 7,
};


///////////
// WORLD
///////////

const Ghost = {
  x: 0,
  y: 0,
  speed: 5,
  angle: 0,
  direction: Dir.N,

  bobbingAmplitude: 0.2,
  bobbingFrequency: 0.04,
  bobbingPhase: 0,

  GFUEL: 0, // aka Ghostification Factor Under Extreme Layering
  states: { // GFUEL states
    follow: 0,
    static: 1,
    keys: 2,
  },

  spritemap: null,
  spriteCol: 0,
  spriteRow: 0,

  init: function() {
    this.spritemap = Assets.spritemaps[0];
  },

  update: function() {
    const [tileX, tileY] = BaseMap.tilePos(this.x, this.y);
    const tileState = BaseMap.tileState(this.x, this.y);

    if (!BaseMap.cursorInBounds()) this.GFUEL = this.states.static;
    else this.GFUEL = this.states.follow;

    switch(this.GFUEL) {
      case this.states.follow: // Follow cursor
        const dx = GI.cursorX - this.x;
        const dy = GI.cursorY - this.y;

        const distance = dist(GI.cursorX, GI.cursorY, this.x, this.y);
        const cappedSpeed = Math.min(this.speed, distance / Animator.fps);

        this.x += (dx - GI.spriteSize / 4) / distance * cappedSpeed;
        this.y += (dy + GI.spriteSize / 2) / distance * cappedSpeed;

        this.angle = Math.atan2(dy - GI.spriteSize / 4, dx - GI.spriteSize / 4) / Math.PI * 180 + 180;

        this.adjustBob();
        break;
      case this.states.static: // Just idle
        this.adjustBob();
        break;
      case this.states.keys: // Key controls
        break;
    }

    this.direction = toDirection(this.angle);
    this.updateSprite();
  },

  updateSprite: function() {
    switch (this.direction) {
      case Dir.N: [this.spriteRow, this.spriteCol] = [0, 0]; break;
      case Dir.NE: [this.spriteRow, this.spriteCol] = [1, 0]; break;
      case Dir.E: [this.spriteRow, this.spriteCol] = [0, 1]; break;
      case Dir.SE: [this.spriteRow, this.spriteCol] = [1, 1]; break;
      case Dir.S: [this.spriteRow, this.spriteCol] = [3, 0]; break;
      case Dir.SW: [this.spriteRow, this.spriteCol] = [3, 1]; break;
      case Dir.W: [this.spriteRow, this.spriteCol] = [2, 1]; break;
      case Dir.NW: [this.spriteRow, this.spriteCol] = [2, 0]; break;
    }
  },

  draw: function() {
    Screen.ghost.clearRect(0, 0, GI.canvasWidth, GI.canvasHeight);
    this.spritemap.drawTile(Screen.ghost, this.spriteRow, this.spriteCol, this.x, this.y);
  },

  adjustBob: function() { // controls bobbing height
    this.y += this.bobbingAmplitude * Math.sin(this.bobbingPhase);
    this.bobbingPhase += this.bobbingFrequency;
  }
}

///////////
// MAP
///////////

const BaseMap = {
  map: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],

  mapPadded: [
    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [-1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1, -1],
    [-1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1, -1],
    [-1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1, -1],
    [-1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1, -1],
    [-1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1, -1],
    [-1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1, -1],
    [-1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1, -1],
    [-1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1, -1],
    [-1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1, -1],
    [-1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  ],

  tilePos: function(x, y) {
    return [Math.floor(x / GI.unit), Math.floor(y / GI.unit)];
  },

  tileCenter: function(x, y) {
    const [tileX, tileY] = this.tilePos(x, y);
    return [tileX * GI.unit + GI.unit / 2, tileY * GI.unit + GI.unit / 2];
  },

  tileState: function(x, y) {
    if (!BaseMap.cursorInBounds()) return [[-1, -1, -1], [-1, -1, -1], [-1, -1, -1]];
    const [tileX, tileY] = this.tilePos(x, y);
    return [
      this.mapPadded[tileY    ].slice(tileX, tileX + 3),
      this.mapPadded[tileY + 1].slice(tileX, tileX + 3),
      this.mapPadded[tileY + 2].slice(tileX, tileX + 3)];
  },

  cursorInBounds: function() {
    return between(GI.cursorX, 0, GI.canvasWidth) && between(GI.cursorY, 0, GI.canvasHeight)
  }
}

const HardwareLayer = {
  curr: 0,

  init: function() {
    //
  },

  drawLevel: function() {
    for (let y = 0; y < GI.height; ++y) {
      for (let x = 0; x < GI.width; ++x) {
        
      }
    }
  },

  advanceLevel: function() {
    this.curr++
  }
}


///////////
// WHERE IT ALL STARTS
///////////
window.onload = () => {

  // Initialization
  GI.init();
  Storage.init();
  Screen.init();
  Assets.init();
  Animator.init();

  document.getElementsByTagName("body")[0].addEventListener("mousemove", (e) => {
    GI.cursorX = e.clientX - GI.canvasX;
    GI.cursorY = e.clientY - GI.canvasY;
  }, false);

  Ghost.init();

  // Start game loop
  Animator.start();
}

function updateAll() {
  Ghost.update();
}

function drawAll() {
  Ghost.draw();
}
