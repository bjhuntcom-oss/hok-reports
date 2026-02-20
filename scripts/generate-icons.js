const sharp = require("sharp");
const path = require("path");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" fill="#000"/>
  <path d="M112 128h64v256h-64V128zm224 0h64v256h-64V128zM176 240h160v32H176V240z" fill="#fff"/>
</svg>`;

const buf = Buffer.from(svg);

async function generate() {
  await sharp(buf).resize(192, 192).png().toFile(path.join(__dirname, "../public/icons/icon-192.png"));
  console.log("icon-192.png generated");
  await sharp(buf).resize(512, 512).png().toFile(path.join(__dirname, "../public/icons/icon-512.png"));
  console.log("icon-512.png generated");
}

generate().catch(console.error);
