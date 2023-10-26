// DOM

let Graphics = {

}

let Canvases = {
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
// Canvas holder
let contexts = [];

function makeContexts(num) {
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
    let miniC = document.body.querySelector("#LCanvas");
    miniC.width = unit * width * 0.32;
    miniC.height = unit * height * 0.32;
    ctx.push(miniC.getContext('2d'));
}
makeContexts(8);
ctx[4].globalAlpha = 0.5;

// Image holder
let img = [];
function makeImages(srcs) {
    for (let i = 0; i < srcs.length; i++) {
        let image = new Image();
        image.src = graphics + "/" + srcs[i];
        img.push(image);
    }
}
makeImages(["BlockTileset.png", "Background.png", "AvatarTileset.png", "Objects.png"]);