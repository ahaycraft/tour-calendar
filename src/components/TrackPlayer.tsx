import { resolveTrackEmbed } from "@/lib/songs";
import { ExternalLink } from "lucide-react";

export default function TrackPlayer({ url }: { url: string | null }) {
  const embed = resolveTrackEmbed(url);

  if (!embed) {
    const raw = (url ?? "").trim();
    if (!raw) return null;
    return (
      <p className="text-[11px] text-zinc-500 leading-snug">
        Can&apos;t embed this link. In Samply, use{" "}
        <span className="text-zinc-300">Share → Embed</span> and paste the URL that
        looks like <code className="text-zinc-400">samply.app/embed/…</code>
      </p>
    );
  }

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
