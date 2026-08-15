import { useRef, useState } from "react";
import { Download, Maximize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  url: string;
  name: string;
  allowDownload: boolean;
  onDownload: () => void;
};

export function ImageViewer({ url, name, allowDownload, onDownload }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  return (
    <div ref={containerRef} className="surface-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="truncate text-sm font-medium">{name}</p>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((value) => Math.max(0.25, value - 0.25))}
            aria-label="Dézoomer"
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((value) => Math.min(4, value + 0.25))}
            aria-label="Zoomer"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRotation((value) => (value + 90) % 360)}
            aria-label="Pivoter"
          >
            <RotateCw className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void containerRef.current?.requestFullscreen?.()}
            aria-label="Plein écran"
          >
            <Maximize2 className="size-4" />
          </Button>
          {allowDownload ? (
            <Button variant="ghost" size="icon" onClick={onDownload} aria-label="Télécharger">
              <Download className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <div
        className="max-h-[70vh] touch-pan-x touch-pan-y overflow-auto bg-muted/40 p-4"
        onDoubleClick={() => setZoom((value) => (value === 1 ? 2 : 1))}
      >
        <img
          src={url}
          alt={name}
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          className="mx-auto max-w-full origin-center transition-transform duration-150"
        />
      </div>
    </div>
  );
}
