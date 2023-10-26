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
  fps, fpsInterval, startTime, now, then, elapsed,

  startAnimating: () => {
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    animate();
  }
}
// To run actual frame-by-frame animation
var stop = false;
var frameCount = 0;
var fps, fpsInterval, startTime, now, then, elapsed;

function startAnimating(fps) {
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    now = Date.now();
    elapsed = now - then;
    // if enough time has elapsed, draw the next frame
    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        // actual looping code below!
        if (!paused) {
            avatar.physics();
            frame += time;
            if (!(frame % Math.round(60 / stepSpeed))) {
                stepCounter++;
                step += time;
            }
            let buttons = levels.buttons[levels.currentLevel].length;
            let canSwap = levels.powers[levels.currentLevel][0];
            if (!canSwap && buttons) {
                for (let i = 0; i < levels.buttons[levels.currentLevel].length; i++) {
                    if (levels.buttons[levels.currentLevel][i].type == 2) {
                        canSwap = 1;
                    }
                }
            }

            if (avatar.moved) levels.updateTime();
            else levels.updateTime(true);

            if (!(frame % GFuel) && canSwap || buttons) { // Run the Ghosts + Update the Level objects
                levels.update();
                if (canSwap) {
                    nextGhost.learn();
                    clear(4);
                    for (g in levels.ghosts) {
                        levels.ghosts[g].newFrame();
                    }
                }
            }
        }
    }
}

///////////
// EVENTS
///////////
function keyPressed(code, num) {
    if (!paused || !num) {
        if ((code == 37 || code == 65) && !avatar.complete) avatar.keys[0] = num; // Left
        else if ((code == 38 || code == 87) && !avatar.complete) avatar.keys[1] = num; // Up
        else if ((code == 39 || code == 68) && !avatar.complete) avatar.keys[2] = num; // Right
        else if ((code == 40 || code == 83) && !avatar.complete) avatar.keys[3] = num; // Down
        else if ((code == 69 || code == 32) && num && !avatar.complete) swapTime(); // E or [Space]
        else if ((code == 80 || code == 82 || code == 27) && num) dom.key(code); // P or R or [Esc]
    } else if (num) { // keydown on menus
        dom.key(code);
    }
}

document.addEventListener("keydown", function(event) {
    let k = event.code;
    if (k == 9 || k == 38 || k == 40) {
        event.preventDefault();
    } else if (k == 123 || (event.ctrlKey && event.shiftKey && (k == 73 || k == 74))) {
        event.preventDefault();
        return false;
    }
    keyPressed(k, 1);
}, false);

document.addEventListener("keyup", function(event) {
	keyPressed(event.code, 0);
});

document.addEventListener("mousedown", function (e) { // stops blurring
    e.preventDefault();
    return false;
});

document.addEventListener('contextmenu', event => event.preventDefault());

///////////
// WHERE IT ALL STARTS
///////////
window.onload = function () {
  GI.init();
  Storage.init();
  Screen.init();
  Assets.init();
  
  // START THE GAME (might delay this later)
  startAnimating(60); // 60 fps
}