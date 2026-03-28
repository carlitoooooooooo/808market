import { useState, useRef, useEffect, useCallback } from "react";

// Banner crop: 3:1 aspect ratio (wide)
const CROP_ASPECT = 3; // width / height
const PREVIEW_W = 360;
const PREVIEW_H = PREVIEW_W / CROP_ASPECT; // 120px

export default function BannerCropper({ file, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [offsetY, setOffsetY] = useState(0); // vertical drag offset in image pixels
  const [dragging, setDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startOffset, setStartOffset] = useState(0);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgNaturalSize({ w: img.width, h: img.height });
      setImgLoaded(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [file]);

  // Draw preview canvas
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;

    // The canvas shows the full image scaled to fit width
    const scaleX = PREVIEW_W / img.width;
    const scaledH = img.height * scaleX;

    canvas.width = PREVIEW_W;
    canvas.height = scaledH;

    ctx.clearRect(0, 0, PREVIEW_W, scaledH);
    ctx.drawImage(img, 0, 0, PREVIEW_W, scaledH);

    // Draw crop overlay
    const cropH = PREVIEW_W / CROP_ASPECT; // height of crop window in preview pixels
    const scaledOffsetY = offsetY * scaleX;
    const clampedY = Math.max(0, Math.min(scaledOffsetY, scaledH - cropH));

    // Darken outside crop
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, PREVIEW_W, clampedY);
    ctx.fillRect(0, clampedY + cropH, PREVIEW_W, scaledH - clampedY - cropH);

    // Crop border
    ctx.strokeStyle = "#00f5ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, clampedY, PREVIEW_W, cropH);

    // Drag hint text
    ctx.fillStyle = "rgba(0,245,255,0.7)";
    ctx.font = "12px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("drag to reposition", PREVIEW_W / 2, clampedY + cropH / 2);
  }, [imgLoaded, offsetY]);

  const getScaleX = () => {
    if (!imgRef.current) return 1;
    return PREVIEW_W / imgRef.current.width;
  };

  const clampOffset = (val) => {
    if (!imgRef.current) return 0;
    const img = imgRef.current;
    const cropHeightInImg = img.width / CROP_ASPECT;
    return Math.max(0, Math.min(val, img.height - cropHeightInImg));
  };

  const onMouseDown = (e) => {
    setDragging(true);
    setStartY(e.clientY);
    setStartOffset(offsetY);
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    const imgDy = dy / getScaleX();
    setOffsetY(clampOffset(startOffset - imgDy));
  }, [dragging, startY, startOffset]);

  const onMouseUp = () => setDragging(false);

  const onTouchStart = (e) => {
    setDragging(true);
    setStartY(e.touches[0].clientY);
    setStartOffset(offsetY);
  };

  const onTouchMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    const dy = e.touches[0].clientY - startY;
    const imgDy = dy / getScaleX();
    setOffsetY(clampOffset(startOffset - imgDy));
  }, [dragging, startY, startOffset]);

  const onTouchEnd = () => setDragging(false);

  const handleCrop = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const cropHeightInImg = img.width / CROP_ASPECT;
    const sy = clampOffset(offsetY);

    const outputW = 1200;
    const outputH = outputW / CROP_ASPECT;
    const canvas = document.createElement("canvas");
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, sy, img.width, cropHeightInImg, 0, 0, outputW, outputH);
    canvas.toBlob((blob) => {
      onCrop(new File([blob], "banner.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#111', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>
          🖼 Position Banner
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)', marginBottom: '12px' }}>
          Drag the image to choose what part shows as your banner
        </div>

        {/* Canvas preview */}
        <div style={{ borderRadius: '10px', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab', marginBottom: '20px', border: '1px solid rgba(0,245,255,0.2)', touchAction: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {imgLoaded ? (
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
          ) : (
            <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-head)' }}>Cancel</button>
          <button onClick={handleCrop} style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-head)' }}>Use This</button>
        </div>
      </div>
    </div>
  );
}
