const {writeFileSync} = require('node:fs');

// Compose outside the captured viewport so the label never changes the UI layout.
async function savePreview(page, path, {fullPage = false, timeZone} = {}) {
  const shot = await page.screenshot({fullPage});
  const label = ['SYNTHETIC DATA', '2030-01-01', timeZone].filter(Boolean).join('  /  ');
  const encoded = await page.evaluate(async ({png, label}) => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + png;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight + 26;
    const ctx = canvas.getContext('2d');
    const top = image.naturalHeight;
    ctx.drawImage(image, 0, 0);
    ctx.fillStyle = '#11110f';
    ctx.fillRect(0, top, canvas.width, 26);
    ctx.fillStyle = '#696969';
    ctx.fillRect(0, top, canvas.width, 1);
    ctx.fillStyle = '#d3d3d3';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText(label, 10, top + 16);
    return canvas.toDataURL('image/png').split(',')[1];
  }, {png: shot.toString('base64'), label});
  writeFileSync(path, Buffer.from(encoded, 'base64'));
}

module.exports = {savePreview};
