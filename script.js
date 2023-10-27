///////////
// DOM
///////////

let Canvases = {
  layers: 2, // Total layers on our screen
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

let Graphics = {
  // HANDLES ACTUALLY DRAWING TO THE Canvases OBJECT!
  
  init: () => {
    // Init the graphics system
  }
}