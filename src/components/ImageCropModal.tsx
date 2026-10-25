import React, { useState, useRef, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/Modal.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Icons } from "@/lib/icons/index.ts";

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  originalFile: File | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File, previewUrl: string) => void;
}

const TARGET_ASPECT_RATIO = 3 / 4; // 0.75

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  originalFile,
  onClose,
  onCropComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  const [naturalDimensions, setNaturalDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  // Crop box state in normalized [0, 1] percentages of natural image dimensions
  const [cropBox, setCropBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ x: 0, y: 0, width: 0.75, height: 1 });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; boxX: number; boxY: number }>({
    mouseX: 0,
    mouseY: 0,
    boxX: 0,
    boxY: 0,
  });

  const [scaleFactor, setScaleFactor] = useState<number>(1); // 0.4 to 1.0 of max fit
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 500, height: 400 });

  // 1. Initialize image when opened
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      imageObjRef.current = img;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNaturalDimensions({ width: nw, height: nh });

      // Determine max 3:4 box that fits inside nw x nh
      let boxW: number;
      let boxH: number;

      if (nw / nh > TARGET_ASPECT_RATIO) {
        // Image is wider than 3:4 (e.g. landscape or square)
        boxH = nh;
        boxW = nh * TARGET_ASPECT_RATIO;
      } else {
        // Image is taller than 3:4
        boxW = nw;
        boxH = nw / TARGET_ASPECT_RATIO;
      }

      const normW = boxW / nw;
      const normH = boxH / nh;
      const normX = (1 - normW) / 2;
      const normY = (1 - normH) / 2;

      setCropBox({
        x: normX,
        y: normY,
        width: normW,
        height: normH,
      });
      setScaleFactor(1);
    };
  }, [isOpen, imageSrc]);

  // 2. Redraw canvas whenever crop box or scale changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img || naturalDimensions.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Responsive container sizing: fit max width 540, max height 380
    const containerMaxW = 540;
    const containerMaxH = 380;
    const imgAspect = naturalDimensions.width / naturalDimensions.height;

    let cw: number;
    let ch: number;
    if (imgAspect > containerMaxW / containerMaxH) {
      cw = containerMaxW;
      ch = Math.round(containerMaxW / imgAspect);
    } else {
      ch = containerMaxH;
      cw = Math.round(containerMaxH * imgAspect);
    }

    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
      setCanvasDimensions({ width: cw, height: ch });
    }

    // Clear and draw image
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);

    // Compute pixel crop rectangle on canvas
    const px = cropBox.x * cw;
    const py = cropBox.y * ch;
    const pw = cropBox.width * cw;
    const ph = cropBox.height * ch;

    // Dark semi-transparent mask outside crop area
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    // Top
    ctx.fillRect(0, 0, cw, py);
    // Bottom
    ctx.fillRect(0, py + ph, cw, ch - (py + ph));
    // Left
    ctx.fillRect(0, py, px, ph);
    // Right
    ctx.fillRect(px + pw, py, cw - (px + pw), ph);

    // Border around crop box
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    // Rule of thirds grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Vertical third lines
    ctx.beginPath();
    ctx.moveTo(px + pw / 3, py);
    ctx.lineTo(px + pw / 3, py + ph);
    ctx.moveTo(px + (pw * 2) / 3, py);
    ctx.lineTo(px + (pw * 2) / 3, py + ph);

    // Horizontal third lines
    ctx.moveTo(px, py + ph / 3);
    ctx.lineTo(px + pw, py + ph / 3);
    ctx.moveTo(px, py + (ph * 2) / 3);
    ctx.lineTo(px + pw, py + (ph * 2) / 3);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [cropBox, naturalDimensions]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const px = cropBox.x * canvasDimensions.width;
    const py = cropBox.y * canvasDimensions.height;
    const pw = cropBox.width * canvasDimensions.width;
    const ph = cropBox.height * canvasDimensions.height;

    // Check if clicked inside crop box
    if (mouseX >= px && mouseX <= px + pw && mouseY >= py && mouseY <= py + ph) {
      setIsDragging(true);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        boxX: cropBox.x,
        boxY: cropBox.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const deltaX = (e.clientX - dragStartRef.current.mouseX) / canvasDimensions.width;
    const deltaY = (e.clientY - dragStartRef.current.mouseY) / canvasDimensions.height;

    let newX = dragStartRef.current.boxX + deltaX;
    let newY = dragStartRef.current.boxY + deltaY;

    // Clamp inside boundaries
    newX = Math.max(0, Math.min(newX, 1 - cropBox.width));
    newY = Math.max(0, Math.min(newY, 1 - cropBox.height));

    setCropBox((prev) => ({
      ...prev,
      x: newX,
      y: newY,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Scale Crop Box
  const handleScaleChange = (newScale: number) => {
    if (naturalDimensions.width === 0) return;
    setScaleFactor(newScale);

    const nw = naturalDimensions.width;
    const nh = naturalDimensions.height;

    // Base max dimensions in pixels
    let maxBaseW: number;
    let maxBaseH: number;

    if (nw / nh > TARGET_ASPECT_RATIO) {
      maxBaseH = nh;
      maxBaseW = nh * TARGET_ASPECT_RATIO;
    } else {
      maxBaseW = nw;
      maxBaseH = nw / TARGET_ASPECT_RATIO;
    }

    const scaledW = maxBaseW * newScale;
    const scaledH = maxBaseH * newScale;

    const normW = scaledW / nw;
    const normH = scaledH / nh;

    // Center the newly sized box
    const centerX = cropBox.x + cropBox.width / 2;
    const centerY = cropBox.y + cropBox.height / 2;

    let newX = centerX - normW / 2;
    let newY = centerY - normH / 2;

    newX = Math.max(0, Math.min(newX, 1 - normW));
    newY = Math.max(0, Math.min(newY, 1 - normH));

    setCropBox({
      x: newX,
      y: newY,
      width: normW,
      height: normH,
    });
  };

  // Center alignment preset
  const handleCenter = () => {
    setCropBox((prev) => ({
      ...prev,
      x: (1 - prev.width) / 2,
      y: (1 - prev.height) / 2,
    }));
  };

  // Crop and output high-res file
  const handleApplyCrop = () => {
    const img = imageObjRef.current;
    if (!img || !originalFile || naturalDimensions.width === 0) return;

    // Extract exact native pixel coordinates
    const sourceX = Math.round(cropBox.x * naturalDimensions.width);
    const sourceY = Math.round(cropBox.y * naturalDimensions.height);
    const sourceW = Math.round(cropBox.width * naturalDimensions.width);
    const sourceH = Math.round(cropBox.height * naturalDimensions.height);

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = sourceW;
    exportCanvas.height = sourceH;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    exportCtx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      sourceW,
      sourceH,
    );

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const cleanName =
          originalFile.name.replace(/\.[^/.]+$/, "") + "-3x4.webp";
        const croppedFile = new File([blob], cleanName, { type: "image/webp" });
        const newPreviewUrl = URL.createObjectURL(croppedFile);
        onCropComplete(croppedFile, newPreviewUrl);
        onClose();
      },
      "image/webp",
      0.92,
    );
  };

  const outputWidth = Math.round(cropBox.width * naturalDimensions.width);
  const outputHeight = Math.round(cropBox.height * naturalDimensions.height);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Icons.Image size={20} className="text-primary" />
          <span>Adjust Image to 3:4 Aspect Ratio</span>
        </div>
      }
      description="The Hero Showcase requires a 3:4 vertical aspect ratio (portrait). Drag the frame to compose your crop."
      size="xl"
    >
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface">
          <div>
            <span className="text-on-surface-variant">Original: </span>
            <span className="font-semibold">
              {naturalDimensions.width} × {naturalDimensions.height} px
            </span>
          </div>
          <div className="flex items-center gap-1 font-bold text-primary">
            <Icons.Check size={14} />
            <span>Target: 3:4 Vertical Ratio</span>
          </div>
          <div>
            <span className="text-on-surface-variant">Output: </span>
            <span className="font-bold text-emerald-500">
              {outputWidth} × {outputHeight} px
            </span>
          </div>
        </div>

        {/* Canvas Display Container */}
        <div className="relative flex items-center justify-center p-2 rounded-2xl bg-black/80 overflow-hidden border border-outline-variant/40 select-none">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-move rounded-lg max-h-[380px] object-contain shadow-lg"
          />
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Zoom / Size Slider */}
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <span className="text-xs font-semibold text-on-surface-variant shrink-0">
              Crop Size:
            </span>
            <input
              type="range"
              min="0.35"
              max="1.0"
              step="0.01"
              value={scaleFactor}
              onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
              className="w-full accent-primary cursor-pointer h-1.5 rounded-lg bg-surface-container-high"
            />
            <span className="text-xs font-bold text-on-surface shrink-0 w-10 text-right">
              {Math.round(scaleFactor * 100)}%
            </span>
          </div>

          {/* Quick Alignment Actions */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCenter}
            >
              Center Frame
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleScaleChange(1.0)}
            >
              Max Fit
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApplyCrop}
            leftIcon={<Icons.Success size={16} />}
          >
            Crop &amp; Use Image
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ImageCropModal;

