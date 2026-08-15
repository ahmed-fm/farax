import { useEffect, useState } from "react";
import { Download, ExternalLink, FileType2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fileKind } from "@/lib/taxonomy";
import { PdfViewer } from "./PdfViewer";
import { ImageViewer } from "./ImageViewer";
import { VideoPlayer } from "./VideoPlayer";

type Props = {
  url: string;
  mime: string;
  name: string;
  allowDownload: boolean;
  onDownload: () => void;
  initialPosition?: number | null | undefined;
  onProgress?: ((seconds: number) => void) | undefined;
};

export function DocumentViewer({
  url,
  mime,
  name,
  allowDownload,
  onDownload,
  initialPosition,
  onProgress,
}: Props) {
  const kind = fileKind(mime);

  if (kind === "pdf") {
    return <PdfViewer url={url} name={name} allowDownload={allowDownload} onDownload={onDownload} />;
  }

  if (kind === "image") {
    return (
      <ImageViewer url={url} name={name} allowDownload={allowDownload} onDownload={onDownload} />
    );
  }

  if (kind === "video") {
    return (
      <VideoPlayer
        url={url}
        name={name}
        allowDownload={allowDownload}
        onDownload={onDownload}
        initialPosition={initialPosition}
        onProgress={onProgress}
      />
    );
  }

  if (kind === "text") {
    return <TextViewer url={url} name={name} />;
  }

  if (kind === "office") {
    return (
      <OfficeViewer url={url} name={name} allowDownload={allowDownload} onDownload={onDownload} />
    );
  }

  return (
    <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
      <FileType2 className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Aperçu indisponible pour ce format ({mime}).
      </p>
      {allowDownload ? (
        <Button onClick={onDownload}>
          <Download className="mr-2 size-4" /> Télécharger
        </Button>
      ) : null}
    </div>
  );
}

function TextViewer({ url, name }: { url: string; name: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        if (active) setContent(text.slice(0, 400000));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-border px-3 py-2 text-sm font-medium">{name}</div>
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap p-4 text-sm">
        {failed ? "Ce fichier texte n'a pas pu être chargé." : (content ?? "Chargement…")}
      </pre>
    </div>
  );
}

/**
 * Office documents cannot be rendered natively by browsers. We embed the
 * Microsoft Office web viewer with a short-lived signed URL; if the preview
 * fails, the user falls back to downloading (when permitted).
 */
function OfficeViewer({
  url,
  name,
  allowDownload,
  onDownload,
}: {
  url: string;
  name: string;
  allowDownload: boolean;
  onDownload: () => void;
}) {
  const [preview, setPreview] = useState(false);
  const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  if (!preview) {
    return (
      <div className="surface-card flex flex-col items-center gap-3 p-8 text-center">
        <FileType2 className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">{name}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Les fichiers bureautiques n'ont pas d'aperçu natif dans le navigateur. L'aperçu utilise le
          service Office Online avec un lien temporaire ; sinon, téléchargez le fichier.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => setPreview(true)}>
            <ExternalLink className="mr-2 size-4" /> Afficher l'aperçu
          </Button>
          {allowDownload ? (
            <Button onClick={onDownload}>
              <Download className="mr-2 size-4" /> Télécharger
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="truncate text-sm font-medium">{name}</p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setPreview(false)}>
            Fermer l'aperçu
          </Button>
          {allowDownload ? (
            <Button variant="ghost" size="icon" onClick={onDownload} aria-label="Télécharger">
              <Download className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <iframe src={embedUrl} title={name} className="h-[70vh] w-full bg-muted md:h-[75vh]" />
    </div>
  );
}
