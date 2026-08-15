import { useEffect, useRef, useState } from "react";
import { Download, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  url: string;
  name: string;
  allowDownload: boolean;
  onDownload: () => void;
  initialPosition?: number | null | undefined;
  onProgress?: ((seconds: number) => void) | undefined;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({
  url,
  name,
  allowDownload,
  onDownload,
  initialPosition,
  onProgress,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onProgress) return;
    const interval = window.setInterval(() => {
      if (!video.paused && video.currentTime > 0) onProgress(Math.floor(video.currentTime));
    }, 10000);
    const onPause = () => onProgress(Math.floor(video.currentTime));
    video.addEventListener("pause", onPause);
    return () => {
      window.clearInterval(interval);
      video.removeEventListener("pause", onPause);
      onProgress(Math.floor(video.currentTime));
    };
  }, [onProgress]);

  return (
    <div className="surface-card overflow-hidden">
      <video
        ref={videoRef}
        src={url}
        controls
        controlsList={allowDownload ? undefined : "nodownload"}
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black"
        onLoadedMetadata={() => {
          const video = videoRef.current;
          if (video && initialPosition && initialPosition > 5 && !resumed) {
            video.currentTime = initialPosition;
            setResumed(true);
          }
        }}
      >
        <track kind="captions" />
      </video>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        <p className="mr-auto truncate text-sm font-medium">{name}</p>
        <Gauge className="size-4 text-muted-foreground" aria-hidden />
        <div className="flex flex-wrap gap-1">
          {SPEEDS.map((value) => (
            <button
              key={value}
              onClick={() => setSpeed(value)}
              className={`rounded px-2 py-1 text-xs tabular-nums ${
                speed === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {value}x
            </button>
          ))}
        </div>
        {allowDownload ? (
          <Button variant="ghost" size="icon" onClick={onDownload} aria-label="Télécharger">
            <Download className="size-4" />
          </Button>
        ) : null}
      </div>
      {resumed ? (
        <p className="px-3 pb-2 text-xs text-muted-foreground">Lecture reprise où vous vous étiez arrêté.</p>
      ) : null}
    </div>
  );
}
