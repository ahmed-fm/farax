import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Extracts the 11-char video id from any common YouTube URL shape. */
export function youtubeId(input: string): string | null {
  const value = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/(?:embed|shorts|live)\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return /^[\w-]{11}$/.test(value) ? value : null;
}

export function YoutubeEmbed({
  url,
  name,
  startAt,
}: {
  url: string;
  name: string;
  startAt?: number | null | undefined;
}) {
  const id = youtubeId(url);

  if (!id) {
    return (
      <div className="surface-card p-8 text-center text-sm text-muted-foreground">
        Ce lien YouTube est invalide.
      </div>
    );
  }

  const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0${
    startAt && startAt > 5 ? `&start=${Math.floor(startAt)}` : ""
  }`;

  return (
    <div className="surface-card overflow-hidden">
      <div className="aspect-video w-full bg-black">
        <iframe
          src={src}
          title={name}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <p className="mr-auto truncate text-sm font-medium">{name}</p>
        <Button variant="ghost" size="sm" asChild>
          <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 size-4" /> YouTube
          </a>
        </Button>
      </div>
    </div>
  );
}
