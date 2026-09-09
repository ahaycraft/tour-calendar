import Link from "next/link";
import { Plus } from "lucide-react";

// Full pill with a text label on sm+, shrinks to an icon-only circle on
// mobile so it doesn't dominate the page header next to the title.
export default function AddButton({
  href,
  label
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="shrink-0 flex items-center justify-center gap-1.5 whitespace-nowrap font-medium text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors rounded-full w-10 h-10 sm:w-auto sm:h-auto sm:rounded-lg sm:px-4 sm:py-2"
    >
      <Plus size={18} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
