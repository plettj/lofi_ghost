///////////
// GLOBAL INFORMATION
///////////
const GI = {
  unit: 1, // The game unit, in computer pixels (dynamically calculated)
  width: 16, // Game area width in Units
  height: 9,
  res: 8, // Art pixels / unit
  pixel: 1, // Computer pixels / Art pixel

  // canvas (x,y), width, height
  canvasX: 0,
  canvasY: 0,
  canvasWidth: 0,
  canvasHeight: 0,

  // cursor (x, y)
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
  }
}

const Assets = {
  names: [], // List with each tileset's name
  sources: [],

  init: function () {
    for (let i = 0; i < this.names.length; i++) {
      let image = new Image();
      image.src = graphics + "/" + this.names[i];
      this.sources.push(image);
    }
  }
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

///////////
// WORLD
///////////

const Ghost = {
  x: 0,
  y: 0,
  GFUEL: 0,

  init: function() {
    //
  }
}

///////////
// MAP
///////////

const CoreMap = {
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

  canvasPos: function(x, y) {
    return [x - GI.canvasX, y - GI.canvasY];
  },

  tilePos: function(x, y) {
    const [cx, cy] = this.canvasPos(x, y);
    return [Math.floor(cx / GI.unit), Math.floor(cy / GI.unit)];
  },

  cursorInBounds: function() {
    return between(GI.cursorX, GI.canvasX, GI.canvasX + GI.canvasWidth) && between(GI.cursorY, GI.canvasY, GI.canvasY + GI.canvasHeight)
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
    GI.cursorX = e.clientX;
    GI.cursorY = e.clientY;
  }, false);

  // Start game loop
  Animator.start();
}
