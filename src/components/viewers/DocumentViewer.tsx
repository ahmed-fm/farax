import { useEffect, useRef, useState } from "react";
import {
  Download,
  Maximize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  FileType2,
  FileArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fileKind } from "@/lib/taxonomy";

type Props = {
  url: string;
  mime: string;
  name: string;
  allowDownload: boolean;
  initialPosition?: number | null;
  onProgress?: (seconds: number) => void;
};

export function DocumentViewer({
  url,
  mime,
  name,
  allowDownload,
  initialPosition,
  onProgress,
}: Props) {
  const kind = fileKind(mime);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fullscreen = () => {
    void containerRef.current?.requestFullscreen?.();
  };

  if (kind === "pdf") {
    return (
      <div ref={containerRef} className="surface-card overflow-hidden bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p className="truncate text-sm font-medium">{name}</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={fullscreen} aria-label="Plein écran">
              <Maximize2 className="size-4" />
            </Button>
            {allowDownload ? (
              <Button variant="ghost" size="icon" asChild aria-label="Télécharger">
                <a href={url} download={name}>
                  <Download className="size-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
        <iframe
          src={`${url}#view=FitH`}
          title={name}
          className="h-[70vh] w-full bg-muted md:h-[80vh]"
        />
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div ref={containerRef} className="surface-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p className="truncate text-sm font-medium">{name}</p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              aria-label="Dézoomer"
            >
              <ZoomOut className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
              aria-label="Zoomer"
            >
              <ZoomIn className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label="Pivoter"
            >
              <RotateCw className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={fullscreen} aria-label="Plein écran">
              <Maximize2 className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex max-h-[75vh] items-center justify-center overflow-auto bg-muted p-4">
          <img
            src={url}
            alt={name}
            className="max-w-none origin-center transition-transform"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          />
        </div>
      </div>
    );
  }

  if (kind === "video") {
    return <VideoPlayer url={url} name={name} initialPosition={initialPosition} onProgress={onProgress} />;
  }

  if (kind === "text") {
    return <TextViewer url={url} name={name} />;
  }

  const Icon = kind === "archive" ? FileArchive : FileType2;
  return (
    <div className="surface-card flex flex-col items-center gap-4 p-10 text-center">
      <Icon className="size-12 text-muted-foreground" />
      <div>
        <p className="font-medium">Aperçu non disponible dans le navigateur</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ce format ({mime}) ne peut pas être affiché directement.
          {allowDownload
            ? " Téléchargez-le pour l'ouvrir dans votre logiciel."
            : " Le téléchargement n'est pas autorisé pour ce document."}
        </p>
      </div>
      {allowDownload ? (
        <Button asChild>
          <a href={url} download={name}>
            <Download className="mr-2 size-4" /> Télécharger
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function VideoPlayer({
  url,
  name,
  initialPosition,
  onProgress,
}: {
  url: string;
  name: string;
  initialPosition?: number | null;
  onProgress?: (seconds: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const video = ref.current;
    if (!video || !initialPosition) return;
    const apply = () => {
      video.currentTime = initialPosition;
    };
    video.addEventListener("loadedmetadata", apply, { once: true });
    return () => video.removeEventListener("loadedmetadata", apply);
  }, [initialPosition]);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !onProgress) return;
    const id = window.setInterval(() => {
      if (!video.paused) onProgress(video.currentTime);
    }, 10000);
    return () => window.clearInterval(id);
  }, [onProgress]);

  return (
    <div className="surface-card overflow-hidden">
      <video ref={ref} src={url} controls playsInline className="w-full bg-black" title={name} />
      <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-sm">
        <span className="text-muted-foreground">Vitesse</span>
        {[0.75, 1, 1.25, 1.5, 2].map((value) => (
          <Button
            key={value}
            size="sm"
            variant={rate === value ? "default" : "ghost"}
            onClick={() => setRate(value)}
          >
            {value}×
          </Button>
        ))}
      </div>
    </div>
  );
}

function TextViewer({ url, name }: { url: string; name: string }) {
  const [content, setContent] = useState("Chargement…");
  useEffect(() => {
    let active = true;
    fetch(url)
      .then((r) => r.text())
      .then((text) => active && setContent(text.slice(0, 200000)))
      .catch(() => active && setContent("Impossible de charger le fichier."));
    return () => {
      active = false;
    };
  }, [url]);
  return (
    <div className="surface-card overflow-hidden">
      <p className="border-b border-border px-3 py-2 text-sm font-medium">{name}</p>
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap p-4 text-sm">{content}</pre>
    </div>
  );
}
