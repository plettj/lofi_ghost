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

  init: () => {
    this.unit = (window.innerWidth / 16 > window.innerHeight / 9) ? Math.floor(window.innerHeight / (height + 0.5) / 4) * 4 : Math.floor(window.innerWidth / (width + 0.5) / 4) * 4;
    this.pixel = unit / 8;
  }
}

let Storage = {
  storedName: "UWGameJam_SavedData",
  splashScreen: false, // Whether to display the splash screen on game load
  currentData: { // All save-able game data goes here!
    "progress": 0,
  },

  init: () => {
    let savedData = localStorage.getItem(storedName);

    if (!savedData) { // Nothing was previously saved in the browser.
      setTimeout(function () { this.store(); }, 2000);
    } else { // Update our data based on what was saved.
      currentData = JSON.parse(savedData);

      if (currentData["progress"] === 0) {
        splashScreen = true;
      }
    }
  }
}

///////////
// INITIALIZATION
///////////
let Screen = {
  layers: 6, // Total layers on our screen
  contexts: [],
  
  init: () => {
    for (let i = 0; i < num; i++) {
      let canvas = document.createElement("CANVAS");
      canvas.id = "Canvas" + i;
      canvas.width = unit * width;
      canvas.height = unit * height;
      document.body.insertBefore(canvas, document.querySelector(".belowCanvases"));

      let thisCTX = canvas.getContext('2d');
      thisCTX.imageSmoothingEnabled = false;
      ctx.push(thisCTX);
    }
  }
}

let Assets = {
  names: [], // List with each tileset's name
  sources: [],

  init: () => {
    for (const item of names) {
      let image = new Image();
      image.src = graphics + "/" + item;
      sources.push(image);
    }
  }
}

let Animator = {
  frame: 0,
  paused: false,
  fpsInterval, startTime, now, then, elapsed,

  startAnimating: (fps) => {
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    this.animate();
  },
  animate: () => {
    requestAnimationFrame(animate);
    now = Date.now();
    elapsed = now - then;

    if (elapsed > fpsInterval) { // If enough time has elapsed, draw the next frame
      then = now - (elapsed % fpsInterval);
      
      if (!paused) { // GAME LOOP
        avatar.physics();
        frame++;
      }
    }
  }
}

///////////
// EVENTS
///////////
function keyPressed(code, pressed) {
  if (!paused || !pressed) {
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

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

///////////
// WHERE IT ALL STARTS
///////////
window.onload = () => {
  // main.js
  GI.init();
  Storage.init();
  Screen.init();
  Assets.init();
  // script.js
  Canvases.init();
  Graphics.init();
  
  // START THE GAME (might delay this later)
  Animator.startAnimating(60); // 60 fps
}