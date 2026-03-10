import { useState } from "react";
import { ExternalLink, X } from "lucide-react";

interface ImageUrlInputProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export function ImageUrlInput({ label, value, onChange, placeholder = "https://..." }: ImageUrlInputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/60"
        />
        <a
          href="https://postimages.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <ExternalLink className="h-3 w-3" />
          Get URL
        </a>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {value && (
        <div className="relative mt-1.5 inline-block">
          <img
            src={value}
            alt="Preview"
            className="w-24 h-24 rounded-lg object-cover border border-border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
    </div>
  );
}
