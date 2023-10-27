///////////
// GLOBAL INFO, INITIALIZATION, & EVENTS
///////////

///////////
// GLOBAL INFORMATION
///////////
let GI = {
  unit: 1, // The game unit, in computer pixels (dynamically calculated)
  width: 32, // Game area width in Units
  height: 18,
  res: 8, // Art pixels / unit
  pixel: 1, // Computer pixels / Art pixel

  init: function () {
    this.unit = (window.innerWidth / 16 > window.innerHeight / 9) ? Math.floor(window.innerHeight / (this.height + 0.5) / 4) * 4 : Math.floor(window.innerWidth / (this.width + 0.5) / 4) * 4;
    this.pixel = this.unit / 8;
    
    document.body.style.setProperty("--unit", this.unit + "px");
    document.body.style.setProperty("--width", this.width);
    document.body.style.setProperty("--height", this.height);
  }
}

let Storage = {
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
// INITIALIZATION
///////////
let Screen = {
  layers: 2, // Total layers on our screen
  contexts: [],
  
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
  }
}

let Assets = {
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

let Animator = {
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
// WHERE IT ALL STARTS
///////////
window.onload = () => {
  GI.init();
  Storage.init();
  Screen.init();
  Assets.init();
  // START THE GAME (might delay this later)
  Animator.init();
}