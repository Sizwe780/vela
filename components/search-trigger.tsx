"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function SearchTrigger() {
  const router = useRouter();
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === "k" &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        router.push("/search");
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [router]);
  return (
    <button
      type="button"
      className="command-trigger"
      aria-label="Search lessons (Control or Command K)"
      onClick={() => router.push("/search")}
    >
      <span>Search</span>
      <kbd>⌘ K</kbd>
    </button>
  );
}
