import { useState } from "react";

interface CopyButtonProps {
  text: string;
  attribution?: string;
}

const CopyButton = ({ text, attribution }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const copyText = attribution ? `"${text}" — ${attribution}` : text;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback silently
    }
  };

  return (
    <span
      onClick={handleCopy}
      className="inline-flex items-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ml-2"
    >
      <span className="font-mono text-[8px] tracking-[0.08em] text-ink-4 hover:text-ink-2 transition-colors select-none">
        {copied ? "Copied" : "Copy"}
      </span>
    </span>
  );
};

export default CopyButton;
