import { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";

interface Props {
  file: File | null;
  url?: string;
  onRemove?: () => void;
  size?: "sm" | "md" | "lg";
}

export function ImagePreview({ file, url, onRemove, size = "md" }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (url) {
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [file, url]);

  if (!preview) return null;

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-full max-w-xs aspect-video",
  };

  return (
    <>
      <div className="relative mt-2 inline-block group">
        <img
          src={preview}
          alt="Preview"
          className={`${sizeClasses[size]} rounded-lg object-cover border border-border cursor-pointer transition-transform hover:scale-105`}
          onClick={() => setZoomed(true)}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center pointer-events-none">
          <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-destructive text-destructive-foreground shadow-sm"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Zoom Modal */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setZoomed(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={preview}
            alt="Preview"
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
