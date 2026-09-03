import { resolveTrackEmbed } from "@/lib/songs";
import { ExternalLink } from "lucide-react";

export default function TrackPlayer({ url }: { url: string | null }) {
  const embed = resolveTrackEmbed(url);
  if (!embed) return null;

  if (embed.kind === "samply") {
    return (
      <iframe
        src={`${embed.src}${embed.src.includes("?") ? "&" : "?"}color=3b82f6`}
        title="Samply player"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950"
        height={160}
        loading="lazy"
        allow="autoplay; clipboard-write"
      />
    );
  }

  if (embed.kind === "soundcloud") {
    return (
      <iframe
        src={embed.src}
        title="SoundCloud player"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950"
        height={140}
        loading="lazy"
        allow="autoplay"
      />
    );
  }

  if (embed.kind === "audio") {
    return <audio controls preload="none" src={embed.src} className="w-full" />;
  }

  return (
    <a
      href={embed.src}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
    >
      <ExternalLink size={14} />
      Open track link
    </a>
  );
}
