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

  // cursor, relative to canvas
  cursorX: 0,
  cursorY: 0,

  // level
  level: 0,
  nextLevel: false,

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
// RENDERING
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
    this.background = this.contexts[1];
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

  clear: function(context) {
    context.clearRect(0, 0, GI.canvasWidth, GI.canvasHeight);
  },

  clearAll: function() {
    for (let i = 0; i < this.layers; ++i) {
      this.clear(this.contexts[i]);
    }
  },

  setBackground: function(image) {
    this.background.drawImage(image, 0, 0, GI.canvasWidth, GI.canvasHeight);
  }
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

  drawTile(context, x, y, destX, destY, angle) {
    context.save();
    context.translate(destX, destY);
    if (angle !== undefined) context.rotate(((angle + 90) % 360) * Math.PI / 180);
    context.translate(-GI.unit / 2, -GI.unit / 2);
    const [xT, yT] = this.getTileCoordinates(x, y);
    context.drawImage(this.image, xT + 1, yT + 1, GI.spriteSize - 2, GI.spriteSize - 2, 0, 0, GI.unit, GI.unit); // clipping fix hack
    context.restore();
  }
}

const Assets = {
  spritemapNames: ["ghost", "bugs", "hardwareTileset", "cliBreakTop", "cliBreakBottom", "buttons", "play"],
  spritemapsPath: "assets/spritemaps",
  spritemaps: [],

  backgroundNames: ["hardware", "hardwareObjects", "cli", "menu", "splashScreen"],
  backgroundsPath: "assets/backgrounds",
  backgrounds: [],

  sceneNames: ["introDay", "introDayDead", "introNight", "introNightDead"],
  scenesPath: "assets/scenes",
  scenes: [],

  imagesLoaded: 0,
  totalImageCount: 14,

  init: function () {
    const handleAllImagesLoaded = () => {
      this.imagesLoaded++;
      if (this.imagesLoaded >= this.totalImageCount) {
        initWorld();
      }
    };

    for (let i = 0; i < this.spritemapNames.length; i++) {
      let image = new Image();
      image.src = this.spritemapsPath + "/" + this.spritemapNames[i] + ".png";
      this.spritemaps.push(new Spritemap(image));
      image.onload = handleAllImagesLoaded;
    }

    for (let i = 0; i < this.backgroundNames.length; ++i) {
      let image = new Image();
      image.src = this.backgroundsPath + "/" + this.backgroundNames[i] + ".png";
      this.backgrounds.push(image);
      image.onload = handleAllImagesLoaded;
    }

    for (let i = 0; i < this.sceneNames.length; ++i) {
      let image = new Image();
      image.src = this.scenesPath + "/" + this.sceneNames[i] + ".png";
      this.scenes.push(image);
      image.onload = handleAllImagesLoaded;
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

function calcAngle2(dx, dy) {
  return Math.atan2(dy, dx) / Math.PI * 180 + 180;
}

function reverseAngle(angle) {
  return (angle + 180) % 360;
}

function toDirection(angle) {
  return Math.floor(angle / 90);
}

function toCardinal(angle) {
  return Math.floor(((angle + 45) % 360) / 90);
}

function dcos(angle) {
  return Math.cos(angle / 180 * Math.PI);
}

function dsin(angle) {
  return Math.sin(angle / 180 * Math.PI);
}

const Direction = {
  NW: 0,
  NE: 1,
  SE: 2,
  SW: 3,

  W: 0,
  N: 1,
  E: 2,
  S: 3,
};


///////////
// WORLD
///////////

const Ghost = {
  x: 0, // center of sprite
  y: 0,
  speed: 5,
  angle: 0,
  direction: Direction.NE,

  bobbingAmplitude: 0.2,
  bobbingFrequency: 0.04,
  bobbingPhase: 0,

  GFUEL: 0, // aka Ghostification Factor Under Extreme Layering
  states: {
    idle: 0,
    follow: 1,
    keys: 2,
  },

  spritemap: null,
  spriteCol: 0,
  spriteRow: 0,
  spriteColTable: [2, 0, 0, 2],
  spriteRowTable: [0, 0, 1, 1],
  animState: 0,

  spookRange: 0,

  init: function() {
    this.spritemap = Assets.spritemaps[0];
    this.spookRange = GI.unit * 2;
  },

  update: function() {

    if (BaseMap.cursorInBounds()) this.GFUEL = this.states.follow;
    else this.GFUEL = this.states.idle;

    switch(this.GFUEL) {
      case this.states.idle: // Just idle
        this.adjustBob();
        break;
      case this.states.follow: // Follow cursor
        const dx = GI.cursorX - this.x;
        const dy = GI.cursorY - this.y;

        const distance = dist(GI.cursorX, GI.cursorY, this.x, this.y);
        const cappedSpeed = Math.min(this.speed, distance / Animator.fps);

        this.x += dx / distance * cappedSpeed;
        this.y += dy / distance * cappedSpeed;

        this.angle = calcAngle2(dx, dy);

        this.adjustBob();
        break;
      case this.states.keys: // Key controls
        break;
    }

    this.direction = toDirection(this.angle);
    this.updateSprite();
  },

  updateSprite: function() {
    this.animState = (Animator.frame % 30 == 0) ? (this.animState + 1) % 2 : this.animState;
    this.spriteCol = this.spriteColTable[this.direction] + this.animState;
    this.spriteRow = this.spriteRowTable[this.direction];
  },

  draw: function() {
    this.spritemap.drawTile(Screen.ghost, this.spriteCol, this.spriteRow, this.x, this.y);
  },

  adjustBob: function() { // manages bobbing height
    this.y += this.bobbingAmplitude * Math.sin(this.bobbingPhase);
    this.bobbingPhase += this.bobbingFrequency;
  }
}

class WireSlot {
  constructor(tileX, tileY) {
    [this.x, this.y] = BaseMap.getTileCenter(tileX, tileY);
    this.activated = false;
    this.range = GI.unit * 2;
    this.spritemap = Assets.spritemaps[2];
  }

  update() {
    //
  }

  draw() {
    if (this.activated) {
      //
    }
  }
}

class WireBug {
  constructor(tileX, tileY, wireSlot) {
    [this.x, this.y] = BaseMap.getTileCenter(tileX, tileY);
    this.runSpeed = 5;
    this.walkSpeed = 1;
    this.angle = 0;
    this.runDist = GI.unit * 2;
    this.targetX = this.x;
    this.targetY = this.y;

    this.wireSlot = wireSlot;

    this.state = 0;
    this.states = {
      wander: 0,
      running: 1,
      wiring: 2,
      wired: 3,
    }

    this.spritemap = Assets.spritemaps[1];
    this.spriteCol = 0;
    this.spriteRow = 0;
    this.animState = 0;
  }

  update() {

    if (dist(this.wireSlot.x, this.wireSlot.y, this.x, this.y) < this.wireSlot.range) { // wiring takes priority
      this.angle = calcAngle2(this.targetX - this.x, this.targetY - this.y);
      this.targetX = this.wireSlot.x;
      this.targetY = this.wireSlot.y;
      this.state = this.states.wiring;
    }

    switch (this.state) {
      case this.states.wander:
        if (dist(Ghost.x, Ghost.y, this.x, this.y) < Ghost.spookRange) {
          this.angle = reverseAngle(calcAngle2(this.x - Ghost.x, this.y - Ghost.y));
          [this.targetX, this.targetY] = BaseMap.clamp(this.x + this.runDist * dcos(this.angle), this.y + this.runDist * dsin(this.angle));
          this.state = this.states.running;
        } else {
          if (this.x == this.targetX && this.y == this.targetY) {
            [this.targetX, this.targetY] = BaseMap.clamp(this.x + Math.random() * GI.unit * 4 - 2 * GI.unit, this.y + Math.random() * GI.unit * 4 - 2 * GI.unit);
            this.angle = calcAngle2(this.x - this.targetX, this.y - this.targetY);
          }
          this.moveToTarget(this.states.wander, this.walkSpeed);
        }
        break;
      case this.states.running:
        this.moveToTarget(this.states.wander, this.runSpeed);
        break;
      case this.states.wiring:
        this.moveToTarget(this.states.wired, this.runSpeed);
        break;
      case this.states.wired:
        break;
    }
  }

  moveToTarget(nextState, speed) {
    if (dist(this.x, this.y, this.targetX, this.targetY) > speed) {
      this.x += dcos(this.angle) * speed;
      this.y += dsin(this.angle) * speed;
    } else {
      this.x = this.targetX;
      this.y = this.targetY;
      this.state = nextState;
    }
  }

  draw() {
    if (Animator.frame % 15 == 0) this.animState = (this.animState + 1) % 2;
    this.spriteCol = this.animState;
    this.spritemap.drawTile(Screen.bugs, this.spriteCol, this.spriteRow, this.x, this.y, this.angle);
  }
};

class LetterBlock {
  constructor(tileX, tileY) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.letter = 0;

    [this.x, this.y] = BaseMap.getTileCenter(tileX, tileY);
    this.speed = 10;
    this.moveDirection = Direction.N;
    this.xTable = [-this.runDist, 0, this.runDist, 0];
    this.yTable = [0, -this.runDist, 0, this.runDist];
  }

  update() {
    const angle = reverseAngle(calcAngle2(Ghost.x - this.x, Ghost.y - this.y));
    this.moveDirection = toCardinal(angle);
  }
};


///////////
// MAP
///////////

const BaseMap = {

  getTilePos: function(x, y) {
    return [Math.floor(x / GI.unit), Math.floor(y / GI.unit)];
  },

  getTileCenter: function(tileX, tileY) {
    return [tileX * GI.unit + GI.unit / 2, tileY * GI.unit + GI.unit / 2];
  },

  getTileCenterCoords: function(x, y) {
    return this.getTileCenter(this.getTilePos(x, y))
  },

  cursorInBounds: function() {
    return between(GI.cursorX, 0, GI.canvasWidth) && between(GI.cursorY, 0, GI.canvasHeight);
  },

  fixSpriteInBounds: function(sprite) {
    if (sprite.x - GI.unit / 2 < 0) sprite.x = GI.unit / 2;
    if (sprite.x + GI.unit / 2 > GI.canvasWidth) sprite.x = GI.canvasWidth - GI.unit / 2;
    if (sprite.y - GI.unit / 2 < 0) sprite.y = GI.unit / 2;
    if (sprite.y + GI.unit / 2 > GI.canvasHeight) sprite.y = GI.canvasHeight - GI.unit / 2;
  },

  clamp: function(x, y) {
    return [clamp(x, GI.unit / 2, GI.canvasWidth - GI.unit / 2), clamp(y, GI.unit / 2, GI.canvasHeight - GI.unit / 2)];
  }
}

const SplashLayer = {
  hovered: false,
  // Below are for PLAY button, in units
  x: 6,
  y: 6,
  width: 4,
  height: 2,

  init: function() {
    Screen.setBackground(Assets.backgrounds[4]);
  },

  draw: function() {
    console.log("wazzup");
    // Manually drawing the button cuz this is the only part of the code with a button like this ig
    let context = Assets.spritemaps[6];

    const [adjX, adjY] = [GI.cursorX / GI.unit, GI.cursorY / GI.unit];

    if (adjX > this.x && adjX < this.x + this.width && adjY > this.y && adjY < this.y + this.height) {
      hovered = true;
    } else {
      hovered = false;
    }

    context.save();
    context.translate(GI.unit * this.x, GI.unit * this.y);
    const yT = hovered ? 10 * 8 * this.width : 0;
    context.drawImage(this.image, 0, yT, 10 * 8 * this.width, 10 * 8 * this.height, 0, 0, GI.unit * this.width, GI.unit * this.height); // clipping fix hack
    context.restore();
  }
}

const IntroLayer = {
  init: function() {
    Screen.setBackground(Assets.scenes[0]);
  },

  draw: function() {
    //
  }
}

const HardwareLayer = {
  sprites: [],

  init: function() {
    Screen.setBackground(Assets.backgrounds[0]);

    Ghost.init();
    this.sprites.push(Ghost);

    const wireSlot1 = new WireSlot(7, 7);
    const wireBug1 = new WireBug(14, 5, wireSlot1);
    const wireSlot2 = new WireSlot(9, 7);
    const wireBug2 = new WireBug(13, 8, wireSlot2);
    this.sprites.push(wireSlot1, wireSlot2, wireBug1, wireBug2);
  },

  update: function() {
    for (let i = 0; i < this.sprites.length; ++i) {
      this.sprites[i].update();
      BaseMap.fixSpriteInBounds(this.sprites[i]);
    }
  },

  draw: function() {
    Screen.clear(Screen.bugs);
    for (let i = 0; i < this.sprites.length; ++i) {
      this.sprites[i].draw();
    }
  },
}

const CLILayer = {
  init: function() {
    //
  },

  update: function() {
    //
  },

  draw: function() {
    //
  }
}

const MenuLayer = {
  init: function() {
    //
  },

  update: function() {
    //
  },

  draw: function() {
    //
  }
}

const OutroLayer = {
  init: function() {
    //
  },

  update: function() {
    //
  },

  draw: function() {
    //
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

  // Start game loop
  Animator.start();
}

function goNextLevel() {
  GI.level++;
  Screen.clear();
}

function initWorld() {
  // START FIRST LEVEL

  SplashLayer.init();
  //HardwareLayer.init();
}

function updateAll() {
  if (GI.nextLevel) {
    GI.nextLevel = false;
    goNextLevel();
  }

  switch(GI.level) {
    case 0: SplashLayer.update(); break;
    case 1: IntroLayer.update(); break;
    case 2: HardwareLayer.update(); break;
    case 3: CLILayer.update(); break;
    case 4: MenuLayer.update(); break;
    case 5: OutroLayer.update(); break;
  }
}

function drawAll() {
  Screen.clear(Screen.ghost);
  switch(GI.level) {
    case 0: SplashLayer.draw(); break;
    case 1: IntroLayer.draw(); break;
    case 2: HardwareLayer.draw(); break;
    case 3: CLILayer.draw(); break;
    case 4: MenuLayer.draw(); break;
    case 5: OutroLayer.draw(); break;
  }
}
