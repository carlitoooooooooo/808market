import { useState, useRef, useEffect, useCallback } from "react";

export default function ImageCropper({ file, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [drag, setDrag] = useState(null); // { startX, startY, origX, origY } or { resizing }
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 0 }); // square crop in image coords
  const [imgDims, setImgDims] = useState({ w: 0, h: 0, scale: 1, offsetX: 0, offsetY: 0 });

  const CANVAS_SIZE = 360;

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const offsetX = (CANVAS_SIZE - dw) / 2;
      const offsetY = (CANVAS_SIZE - dh) / 2;
      setImgDims({ w: dw, h: dh, scale, offsetX, offsetY });
      // Initial crop: centered square using 80% of shorter side
      const shortSide = Math.min(img.width, img.height) * 0.85;
      setCrop({
        x: (img.width - shortSide) / 2,
        y: (img.height - shortSide) / 2,
        size: shortSide,
      });
      setImgLoaded(true);
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  }, [file]);

  // Draw canvas
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;
    const { w, h, scale, offsetX, offsetY } = imgDims;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw image
    ctx.drawImage(img, offsetX, offsetY, w, h);

    // Darken outside crop
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Cut out crop area (show original)
    const cx = offsetX + crop.x * scale;
    const cy = offsetY + crop.y * scale;
    const cs = crop.size * scale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + cs / 2, cy + cs / 2, cs / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, offsetX, offsetY, w, h);
    ctx.restore();

    // Circle border
    ctx.beginPath();
    ctx.arc(cx + cs / 2, cy + cs / 2, cs / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#00f5ff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Corner handles
    const handles = [
      [cx, cy], [cx + cs, cy], [cx, cy + cs], [cx + cs, cy + cs]
    ];
    handles.forEach(([hx, hy]) => {
      ctx.beginPath();
      ctx.arc(hx, hy, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#00f5ff";
      ctx.fill();
    });
  }, [imgLoaded, crop, imgDims]);

  const canvasToImg = useCallback((cx, cy) => {
    const { scale, offsetX, offsetY } = imgDims;
    return { x: (cx - offsetX) / scale, y: (cy - offsetY) / scale };
  }, [imgDims]);

  const getEventPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const pos = getEventPos(e);
    const { scale, offsetX, offsetY } = imgDims;
    const cx = offsetX + crop.x * scale;
    const cy = offsetY + crop.y * scale;
    const cs = crop.size * scale;

    // Check if near a corner handle (resize)
    const handles = [
      { x: cx, y: cy, corner: "tl" },
      { x: cx + cs, y: cy, corner: "tr" },
      { x: cx, y: cy + cs, corner: "bl" },
      { x: cx + cs, y: cy + cs, corner: "br" },
    ];
    for (const h of handles) {
      if (Math.hypot(pos.x - h.x, pos.y - h.y) < 16) {
        setDrag({ type: "resize", corner: h.corner, startX: pos.x, startY: pos.y, origCrop: { ...crop } });
        return;
      }
    }

    // Check if inside crop circle (move)
    const centerX = cx + cs / 2;
    const centerY = cy + cs / 2;
    if (Math.hypot(pos.x - centerX, pos.y - centerY) < cs / 2) {
      setDrag({ type: "move", startX: pos.x, startY: pos.y, origCrop: { ...crop } });
    }
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    e.preventDefault();
    const pos = getEventPos(e);
    const { scale, offsetX, offsetY } = imgDims;
    const img = imgRef.current;
    const dx = (pos.x - drag.startX) / scale;
    const dy = (pos.y - drag.startY) / scale;

    if (drag.type === "move") {
      let nx = drag.origCrop.x + dx;
      let ny = drag.origCrop.y + dy;
      nx = Math.max(0, Math.min(img.width - drag.origCrop.size, nx));
      ny = Math.max(0, Math.min(img.height - drag.origCrop.size, ny));
      setCrop(prev => ({ ...prev, x: nx, y: ny }));
    } else if (drag.type === "resize") {
      const { corner, origCrop } = drag;
      let newSize = origCrop.size;
      let newX = origCrop.x;
      let newY = origCrop.y;

      if (corner === "br") newSize = Math.max(50, origCrop.size + Math.min(dx, dy));
      if (corner === "tr") { newSize = Math.max(50, origCrop.size + dx - dy); newY = origCrop.y + origCrop.size - newSize; }
      if (corner === "bl") { newSize = Math.max(50, origCrop.size - dx + dy); newX = origCrop.x + origCrop.size - newSize; }
      if (corner === "tl") { newSize = Math.max(50, origCrop.size - Math.max(dx, dy)); newX = origCrop.x + origCrop.size - newSize; newY = origCrop.y + origCrop.size - newSize; }

      newSize = Math.min(newSize, img.width - newX, img.height - newY);
      newX = Math.max(0, Math.min(img.width - newSize, newX));
      newY = Math.max(0, Math.min(img.height - newSize, newY));
      setCrop({ x: newX, y: newY, size: newSize });
    }
  };

  const onPointerUp = () => setDrag(null);

  const handleCrop = () => {
    const img = imgRef.current;
    const out = document.createElement("canvas");
    const SIZE = 400;
    out.width = SIZE;
    out.height = SIZE;
    const ctx = out.getContext("2d");
    // Draw circle clip
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, SIZE, SIZE);
    out.toBlob(blob => {
      onCrop(new File([blob], "avatar.png", { type: "image/png" }));
    }, "image/png", 0.9);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "16px", marginBottom: "16px", color: "#fff" }}>
        Drag to reposition · Corners to resize
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ borderRadius: "12px", cursor: drag?.type === "move" ? "grabbing" : "crosshair", maxWidth: "100%", touchAction: "none" }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />

      <div style={{ display: "flex", gap: "12px", marginTop: "20px", width: "100%", maxWidth: CANVAS_SIZE }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: "13px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: "#fff", fontSize: "15px", cursor: "pointer", fontFamily: "var(--font-body)" }}>
          Cancel
        </button>
        <button onClick={handleCrop}
          style={{ flex: 2, padding: "13px", background: "linear-gradient(135deg, #00f5ff, #bf5fff)", border: "none", borderRadius: "12px", color: "#000", fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-head)" }}>
          Use Photo
        </button>
      </div>
    </div>
  );
}
