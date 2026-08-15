import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type Props = {
  url: string;
  name: string;
  allowDownload: boolean;
  onDownload: () => void;
};

export function PdfViewer({ url, name, allowDownload, onDownload }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState(700);
  const [term, setTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const measure = () => {
      const node = containerRef.current;
      if (node) setWidth(Math.min(node.clientWidth - 24, 1100));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const documentRef = useRef<Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]> | null>(null);

  const search = useCallback(async () => {
    const query = term.trim().toLowerCase();
    if (!query || !documentRef.current) return;
    setSearching(true);
    const found: number[] = [];
    for (let index = 1; index <= documentRef.current.numPages; index += 1) {
      const pdfPage = await documentRef.current.getPage(index);
      const content = await pdfPage.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .toLowerCase();
      if (text.includes(query)) found.push(index);
    }
    setMatches(found);
    setSearching(false);
    if (found[0]) setPage(found[0]);
  }, [term]);

  return (
    <div ref={containerRef} className="surface-card overflow-hidden bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
            aria-label="Page précédente"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">
            {page} / {numPages || "…"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPage((value) => Math.min(numPages, value + 1))}
            disabled={!numPages || page >= numPages}
            aria-label="Page suivante"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((value) => Math.max(0.5, value - 0.25))}
            aria-label="Dézoomer"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((value) => Math.min(3, value + 0.25))}
            aria-label="Zoomer"
          >
            <ZoomIn className="size-4" />
          </Button>
        </div>

        <form
          className="ml-auto flex items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Rechercher"
            className="h-8 w-28 text-sm sm:w-40"
            aria-label="Rechercher dans le PDF"
          />
          <Button type="submit" variant="ghost" size="icon" aria-label="Lancer la recherche">
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void containerRef.current?.requestFullscreen?.()}
            aria-label="Plein écran"
          >
            <Maximize2 className="size-4" />
          </Button>
          {allowDownload ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDownload}
              aria-label="Télécharger"
            >
              <Download className="size-4" />
            </Button>
          ) : null}
        </form>
      </div>

      {matches ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5 text-xs">
          {matches.length ? (
            <>
              <span className="text-muted-foreground">
                {matches.length} page(s) contiennent « {term} » :
              </span>
              {matches.slice(0, 20).map((match) => (
                <button
                  key={match}
                  onClick={() => setPage(match)}
                  className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground"
                >
                  p.{match}
                </button>
              ))}
            </>
          ) : (
            <span className="text-muted-foreground">Aucun résultat pour « {term} ».</span>
          )}
        </div>
      ) : null}

      <div className="max-h-[75vh] overflow-auto bg-muted/40 p-3">
        {error ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{error}</p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={(pdf) => {
              documentRef.current = pdf;
              setNumPages(pdf.numPages);
              setError(null);
            }}
            onLoadError={() => setError("Ce PDF n'a pas pu être chargé.")}
            loading={
              <div className="flex justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <Page
              pageNumber={page}
              width={width}
              scale={scale}
              renderAnnotationLayer
              renderTextLayer
              className="mx-auto shadow-sm"
            />
          </Document>
        )}
      </div>
      <p className="sr-only">{name}</p>
    </div>
  );
}
