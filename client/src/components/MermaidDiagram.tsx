import { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { useTheme } from "../contexts/ThemeContext";

let idCounter = 0;

interface Props {
  chart: string;
}

export default function MermaidDiagram({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${++idCounter}`);
  const { theme } = useTheme();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
      er: { useMaxWidth: true },
      securityLevel: "strict",
    });

    let cancelled = false;

    // Clear previous render
    el.innerHTML = "";

    const id = idRef.current + "-" + Date.now();
    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (!cancelled) {
          el.innerHTML = svg;
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Mermaid render failed:", err);
          el.textContent = "Unable to render diagram.";
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chart, theme]);

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto [&_svg]:max-w-full"
    />
  );
}
