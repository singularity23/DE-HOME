(function () {
  'use strict';

  const saveBtn = document.getElementById('saveBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusEl = document.getElementById('status');
  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');

  let hasImage = false;

  function setStatus (message) {
    statusEl.textContent = message;
  }

  function updateButtons () {
    saveBtn.disabled = !hasImage;
    clearBtn.disabled = !hasImage;
  }

  function clearCanvas () {
    hasImage = false;
    drawPlaceholder();
    updateButtons();
    setStatus('Waiting for pasted image...');
  }

  function drawPlaceholder () {
    const width = 900;
    const height = 360;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0f1530';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#2a335d';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(16, 16, width - 32, height - 32);
    ctx.setLineDash([]);

    ctx.fillStyle = '#e7ecff';
    ctx.font = '600 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Paste screenshot here', width / 2, height / 2 - 8);

    ctx.fillStyle = '#9fb0ff';
    ctx.font = '400 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Click this area then press Ctrl+V', width / 2, height / 2 + 24);
  }

  function drawImageFile (file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('Clipboard does not contain an image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        hasImage = true;
        updateButtons();
        setStatus(`Image pasted (${img.naturalWidth} x ${img.naturalHeight}).`);
      };
      img.onerror = () => setStatus('Failed to read pasted image.');
      img.src = event.target.result;
    };
    reader.onerror = () => setStatus('Failed to process clipboard data.');
    reader.readAsDataURL(file);
  }

  function onPaste (event) {
    const items = event.clipboardData?.items;
    if (!items || !items.length) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        drawImageFile(file);
        return;
      }
    }

    setStatus('No image found in clipboard. Copy a screenshot first.');
  }

  function downloadImage () {
    if (!hasImage) return;

    canvas.toBlob(blob => {
      if (!blob) {
        setStatus('Failed to create PNG file.');
        return;
      }

      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
      const filename = `screenshot_${stamp}.png`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus(`Saved ${filename}`);
    }, 'image/png');
  }

  canvas.addEventListener('paste', onPaste);
  document.addEventListener('paste', onPaste);
  canvas.addEventListener('focus', () => canvas.classList.add('active'));
  canvas.addEventListener('blur', () => canvas.classList.remove('active'));
  canvas.addEventListener('click', () => canvas.focus());
  saveBtn.addEventListener('click', downloadImage);
  clearBtn.addEventListener('click', clearCanvas);

  drawPlaceholder();
  updateButtons();
})();
