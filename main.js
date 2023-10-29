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
  clicked: false,

  // level
  level: 0,
  startingLevel: 0,
  nextLevel: false, // Set this to true when you wanna move up; it's automatic

  init: function () {
    this.unit = (window.innerWidth / 16 > window.innerHeight / 9) ? Math.floor(window.innerHeight / (this.height + 0.5) / 4) * 4 : Math.floor(window.innerWidth / (this.width + 0.5) / 4) * 4;
    this.pixel = this.unit / 8;
    
    document.body.style.setProperty("--unit", this.unit + "px");
    document.body.style.setProperty("--width", this.width);
    document.body.style.setProperty("--height", this.height);
  },
}

const Storage = {
  storedName: "Lo-fi_Ghost_Game_Data",
  currentData: { // All save-able game data goes here!
    "seenSplashScreen": false,
  },

  init: function () {
    let savedData = localStorage.getItem(this.storedName);

    if (!savedData) { // Nothing was previously saved in the browser.
      setTimeout(function () { Storage.store(); }, 2000);
    } else { // Update our data based on what was saved.
      this.currentData = JSON.parse(savedData);

      if (!this.currentData["seenSplashScreen"]) {
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
  layers: 9, // Total layers on our screen
  contexts: [],

  // layer aliases
  void: null,
  background: null,
  objects: null,
  bugs: null,
  covers: null,
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
    this.objects = this.contexts[5];
    this.bugs = this.contexts[6];
    this.covers = this.contexts[7];
    this.ghost = this.contexts[8];

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
  totalImageCount: 0,

  init: function () {
    this.totalImageCount = this.spritemapNames.length + this.backgroundNames.length + this.sceneNames.length
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
        GI.clicked = false;
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
  GI.clicked = true;
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

function average(a, b) {
  return (a + b) / 2;
}

function calcAngle2(dx, dy) {
  return Math.atan2(dy, dx) / Math.PI * 180 + 180;
}

function reverseAngle(angle) {
  return (angle + 180) % 360;
}

function toDirection(angle) {
  return Math.floor(((angle + 180) % 360) / 90);
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
  speed: 0,
  maxSpeed: 0,
  acc: 0.07,
  decRadius: 0,
  idleRadius: 0,
  angle: 0,
  direction: Direction.NE,

  bobbingAmplitude: 0.3,
  bobbingFrequency: 0.06,
  bobbingPhase: 0,

  GFUEL: 0, // aka Ghostification Factor Under Extreme Layering
  states: {
    idle: 0,
    follow: 1,
    keys: 2,
    caged: 3,
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
    this.speed = GI.pixel * 0.1;
    this.maxSpeed = GI.pixel * 0.4;
    this.decRadius = GI.unit;
    this.idleRadius = GI.unit / 4;
    this.spookRange = GI.unit * 2;
  },

  update: function() {
    if (!BaseMap.cursorInBounds() && this.GFUEL != this.states.caged) this.GFUEL = this.states.idle;

    const distance = dist(GI.cursorX, GI.cursorY, this.x, this.y);
    switch(this.GFUEL) {
      case this.states.idle: // Just idle
        if (distance > this.idleRadius && BaseMap.cursorInBounds()) {
          this.GFUEL = this.states.follow;
        }
        this.adjustBob();
        break;
      case this.states.follow: // Follow cursor

        if (distance > this.decRadius) {
          this.speed += this.acc;
        } else if (distance > this.idleRadius) {
          this.speed -= this.acc;
        } else {
          this.speed = 0;
          this.GFUEL = this.states.idle;
        }

        this.speed = clamp(this.speed, 0, this.maxSpeed);
        this.angle = calcAngle2(this.x - GI.cursorX, this.y - GI.cursorY);

        this.x += dcos(this.angle) * this.speed;
        this.y += dsin(this.angle) * this.speed;

        this.adjustBob();
        break;
      case this.states.keys: // Key controls
        break;
      case this.states.caged: // Stuck in cage in CLI
        this.angle = calcAngle2(this.x - GI.cursorX, this.y - GI.cursorY); // Update his orientation!
        this.x = GI.unit * 13 + GI.pixel * 4;
        this.y = GI.unit * 2.5;
        this.adjustBob();
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
  },

  cage: function(entering) {
    if (entering) { // Put ghost in cage!
      this.GFUEL = this.states.caged;
    } else { // Free ghost from cage!
      this.GFUEL = this.states.idle;
    }
  }
}

class WireSlot {
  constructor(pixelX, pixelY, spriteCol, spriteRow) {
    [this.x, this.y] = [BaseMap.toCoords(pixelX), BaseMap.toCoords(pixelY)];
    this.activated = false;
    this.range = GI.unit * 2;

    this.spritemap = Assets.spritemaps[2];
    this.spriteCol = spriteCol;
    this.spriteRow = spriteRow;
    this.animState = 0;
  }

  update() {
    //
  }

  draw() {
    if (!this.activated) {
      if (Animator.frame % 5 == 0) this.animState = (this.animState + 1) % 3;
      this.spritemap.drawTile(Screen.objects, this.spriteCol + this.animState, this.spriteRow, this.x, this.y, this.angle);
    }
  }
}

class WireBug {
  constructor(tileX, tileY, wireSlots, spriteCol, spriteRow) {
    [this.x, this.y] = BaseMap.getTileCenter(tileX, tileY);
    this.runSpeed = GI.pixel * 0.8;
    this.walkSpeed = GI.pixel * 0.1;
    this.angle = 0;
    this.runDist = GI.unit;
    this.targetX = this.x;
    this.targetY = this.y;

    this.wireSlots = wireSlots;
    this.slot = 0;

    this.state = 0;
    this.states = {
      wander: 0,
      running: 1,
      wiring: 2,
      wired: 3,
      inactive: 4,
    }

    this.spritemap = Assets.spritemaps[1];
    this.spriteCol = spriteCol;
    this.spriteRow = spriteRow;
    this.animState = 0;
  }

  update() {
    switch (this.state) {
      case this.states.wander:
        for (let i = 0; i < this.wireSlots.length; ++i) {
          const slot = this.wireSlots[i];
          if (dist(slot.x, slot.y, this.x, this.y) < slot.range) {
            this.slot = slot;
            this.targetX = slot.x;
            this.targetY = slot.y;
            this.angle = calcAngle2(this.x - this.targetX, this.y - this.targetY);
            this.state = this.states.wiring;
          }
        }
        if (this.state == this.states.wander && dist(Ghost.x, Ghost.y, this.x, this.y) < Ghost.spookRange) {
          this.angle = reverseAngle(calcAngle2(this.x - Ghost.x, this.y - Ghost.y));
          [this.targetX, this.targetY] = BaseMap.clamp(this.x + this.runDist * dcos(this.angle), this.y + this.runDist * dsin(this.angle));
          this.state = this.states.running;
        } else {
          if (this.x == this.targetX && this.y == this.targetY) {
            [this.targetX, this.targetY] = BaseMap.clamp(this.x + Math.random() * GI.unit * 2 - GI.unit, this.y + Math.random() * GI.unit * 2 - GI.unit);
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
        this.slot.activated = true;
        this.wireSlots.splice(this.wireSlots.indexOf(this.slot), 1);
        HardwareLayer.score++;
        if (this.wireSlots.length == 0) {
          this.state = this.states.inactive;
        } else {
          this.state = this.states.wander;
        }
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
    if (this.state != this.states.inactive) {
      if (Animator.frame % 15 == 0) this.animState = (this.animState + 1) % 2;
      this.spritemap.drawTile(Screen.bugs, this.spriteCol + this.animState, this.spriteRow, this.x, this.y, this.angle);
    }
  }
};

const HardwareProgress = {
  x: 0,
  y: 0,
  spritemap: null,
  progress: 0,
  spriteCoords: [
    [[0, 1, 2, 0, 1, 2], [0, 0, 0, 1, 1, 1]],
    [[0, 1, 2, 0, 1, 2], [2, 2, 2, 3, 3, 3]],
    [[0, 1, 2, 0, 1, 2], [4, 4, 4, 5, 5, 5]],
    [[0, 1, 2, 0, 1, 2], [6, 6, 6, 7, 7, 7]],
    [[0, 1, 2, 0, 1, 2], [8, 8, 8, 9, 9, 9]],
  ],

  init: function() {
    [this.x, this.y] = [BaseMap.toCoords(55), BaseMap.toCoords(17)];
    this.spritemap = Assets.spritemaps[2];
  },

  update: function() {
    if (HardwareLayer.score > this.progress) this.progress = HardwareLayer.score;
  },

  draw: function() {
    const [spriteCol, spriteRow] = this.spriteCoords[this.progress];
    for (let i = 0; i < spriteCol.length; ++i) {
      const offsetX = (i % 3) * GI.unit;
      const offsetY = (Math.floor(i / 3)) * GI.unit;
      this.spritemap.drawTile(Screen.covers, spriteCol[i], spriteRow[i], this.x + offsetX, this.y + offsetY);
    }
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

  toCoords: function(gp) {
    return gp * GI.pixel;
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

  update: function() {
    const [adjX, adjY] = [GI.cursorX / GI.unit, GI.cursorY / GI.unit];

    if (adjX > this.x && adjX < this.x + this.width && adjY > this.y && adjY < this.y + this.height) {
      this.hovered = true;
    } else {
      this.hovered = false;
    }

    if (this.hovered && GI.clicked) {
      GI.nextLevel = true;

      // Save that we've passed the splash screen!
      Storage.currentData["seenSplashScreen"] = true;
      Storage.store();
    }
  },

  draw: function() {
    // Manually drawing the button cuz this is the only part of the code with a button like this ig
    let context = Screen.objects;

    Screen.clear(context); // Clearing is OK cause the play button is the only thing on it when this menu is active
    context.save();
    context.translate(GI.unit * this.x, GI.unit * this.y);
    const yT = this.hovered ? 10 * 8 * this.height : 0;
    context.drawImage(Assets.spritemaps[6].image, 0, yT, 10 * 8 * this.width, 10 * 8 * this.height, 0, 0, GI.unit * this.width, GI.unit * this.height); // clipping fix hack
    context.restore();
  }
}

const IntroLayer = {
  startFrame: 0, // When the animation began.

  dayAmount: 100, // Between 0 and 100, how much day there is!
  lifeAmount: 100, // Between 0 and 100, how much life she has!
  delay: 0,

  dayDirection: false,
  overallFade: 1, // Starts at 1. If it's at < 1, we're fading and ending!

  init: function() {
    this.startFrame = Animator.frame;
  },

  update: function() {
    const step = Animator.frame - this.startFrame;
    const transitions = [0, 100, 300, 400, 500, 600, 700, 1400, 1700];
    let stage = 0;

    while (!between(step, transitions[stage] - 1, transitions[stage + 1]) && stage < transitions.length - 1) {
      stage++;
    }

    switch (stage) {
      case 0:
        this.dayAmount = 100;
        this.lifeAmount = 100;
        break;
      case 1:
        this.dayAmount -= 0.5;
        document.body.querySelector("#Intro1").style.opacity = 1;
        break;
      case 3:
        this.dayAmount += 1;
        break;
      case 4:
        document.body.querySelector("#Intro2").style.opacity = 1;
        break;
      case 5:
        this.dayAmount -= 1;
        break;
      case 6:
      case 7:
        if (this.dayDirection) {
          this.dayAmount += 2.5;
          if (this.dayAmount >= 100) {
            this.dayAmount = 100;
            this.delay += 1;
            if (this.delay > 20) {
              this.delay = 0;
              this.dayDirection = false;
            }
          }
        } else {
          this.dayAmount -= 2;
          if (this.dayAmount <= 0) {
            this.dayAmount = 0;
            this.delay += 1;
            if (this.delay > 20) {
              this.delay = 0;
              this.dayDirection = true;
            }
          }
        }
        
        this.lifeAmount -= 0.25;
        if (this.lifeAmount < 0) {
          this.lifeAmount = 0;
        }

        if (stage === 7) { // ENDING
          this.overallFade -= 0.005;

          if (this.overallFade <= 0) {
            this.overallFade = 0;
            document.body.querySelector("#Intro1").style.opacity = 0;
            document.body.querySelector("#Intro2").style.opacity = 0;
          }
        }
        break;
    }

    if (step >= transitions[transitions.length - 1]) {
      GI.nextLevel = true;
    }
  },

  draw: function() {
    Screen.clearAll();
    
    if (this.lifeAmount > 99) {
      Screen.background.globalAlpha = this.overallFade;
      Screen.background.drawImage(Assets.scenes[0], 0, 0, GI.canvasWidth, GI.canvasHeight);
      Screen.background.globalAlpha = 1;
      
      Screen.objects.globalAlpha = clamp(this.dayAmount * -1 / 100 + 1, 0, 1) * this.overallFade;
      Screen.objects.drawImage(Assets.scenes[2], 0, 0, GI.canvasWidth, GI.canvasHeight);
      Screen.objects.globalAlpha = 1;
    } else {
      Screen.background.globalAlpha = this.overallFade;
      Screen.background.drawImage(Assets.scenes[1], 0, 0, GI.canvasWidth, GI.canvasHeight);
      Screen.background.globalAlpha = 1;

      Screen.objects.globalAlpha = clamp(this.dayAmount * -1 / 100 + 1, 0, 1) * this.overallFade;
      Screen.objects.drawImage(Assets.scenes[3], 0, 0, GI.canvasWidth, GI.canvasHeight);
      Screen.objects.globalAlpha = 1;

      Screen.bugs.globalAlpha = clamp(Math.min(this.lifeAmount / 100, this.dayAmount / 100), 0, 1) * this.overallFade;
      Screen.bugs.drawImage(Assets.scenes[0], 0, 0, GI.canvasWidth, GI.canvasHeight);
      Screen.bugs.globalAlpha = 1;
      
      Screen.ghost.globalAlpha = clamp(Math.min(this.lifeAmount / 100, this.dayAmount * -1 / 100 + 1), 0, 1) * this.overallFade;
      Screen.ghost.drawImage(Assets.scenes[2], 0, 0, GI.canvasWidth, GI.canvasHeight);
      Screen.ghost.globalAlpha = 1;
    }
  }
}

const HardwareLayer = {
  sprites: [],
  score: 0,
  wave: 1,

  init: function() {
    Screen.setBackground(Assets.backgrounds[0]);

    Ghost.init();
    HardwareProgress.init();
    this.sprites.push([Ghost, HardwareProgress]);

    const wireSlots = [new WireSlot(21, 21, 3, 4), new WireSlot(28, 28, 3, 5), new WireSlot(66, 60, 3, 0), new WireSlot(96, 46, 3, 1)];
    const wireBugs = [new WireBug(14, 0, [wireSlots[0]], 0, 0), new WireBug(12, 2, [wireSlots[1]], 2, 0), new WireBug(1, 1, [wireSlots[2], wireSlots[3]], 2, 1)];
    this.sprites.push([wireSlots[0], wireSlots[1], wireBugs[0], wireBugs[1], wireSlots[2], wireSlots[3]]);
    this.sprites.push([wireBugs[2]]);
  },

  update: function() {
    if (this.score == 4) {
      GI.nextLevel = true;
    }
    if (this.score == 2 && this.wave == 1) {
      this.wave++;
    }
    for (let i = 0; i <= this.wave; ++i) {
      for (let j = 0; j < this.sprites[i].length; ++j) {
        this.sprites[i][j].update();
        BaseMap.fixSpriteInBounds(this.sprites[i][j]);
      }
    }
  },

  draw: function() {
    Screen.clear(Screen.bugs);
    Screen.clear(Screen.objects);
    Screen.clear(Screen.covers);
    Screen.covers.drawImage(Assets.backgrounds[1], 0, 0, GI.canvasWidth, GI.canvasHeight);
    for (let i = 0; i <= this.wave; ++i) {
      for (let j = 0; j < this.sprites[i].length; ++j) {
        this.sprites[i][j].draw();
      }
    }
  },
}

const CLILayer = {
  sprites: [],
  score: 0,

  init: function() {
    Screen.setBackground(Assets.backgrounds[0]);
    Screen.setBackground(Assets.backgrounds[1]);
    Screen.setBackground(Assets.backgrounds[2]);

    Ghost.init();
    Ghost.cage(true); // Put the ghost in the cage :).
    this.sprites.push(Ghost);
  },

  update: function() {
    for (let i = 0; i < this.sprites.length; ++i) {
      this.sprites[i].update();
      BaseMap.fixSpriteInBounds(this.sprites[i]);
    }
  },

  draw: function() {
    Screen.clear(Screen.bugs);
    Screen.clear(Screen.objects);
    for (let i = 0; i < this.sprites.length; ++i) {
      this.sprites[i].draw();
    }
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
  Screen.clearAll();
  GI.level++;

  getLayer(GI.level).init();
}

function initWorld() {
  // Use the below to skip to the gameplay!
  // HardwareLayer.init(); GI.level = 2; return;

  if (Storage.currentData["seenSplashScreen"]) { // Skip the splash screen; seen it already :P
    GI.level = 1;
  }

  if (GI.startingLevel !== 0) {
    GI.level = GI.startingLevel;
  }

  getLayer(GI.level).init();
}

function updateAll() {
  if (GI.nextLevel) {
    GI.nextLevel = false;
    goNextLevel();
  }

  getLayer(GI.level).update();
}

function drawAll() {
  Screen.clear(Screen.ghost);

  getLayer(GI.level).draw();
}

// All the levels in our game, ordered!
function getLayer(i) {
  switch(i) {
    case 0: return SplashLayer;
    case 1: return IntroLayer;
    case 2: return HardwareLayer;
    case 3: return CLILayer;
    case 4: return MenuLayer;
    case 5: return OutroLayer;
  }
}
