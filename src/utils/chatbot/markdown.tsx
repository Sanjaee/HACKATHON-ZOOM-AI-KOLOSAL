import React from "react";

// Highlight code based on language
export function highlightCode(code: string, language: string): React.ReactNode {
  const lines = code.split("\n");
  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < lines.length - 1 && "\n"}
    </React.Fragment>
  ));
}

// Parse markdown to JSX
export function parseMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];

  // Regex patterns
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  // Process code blocks first (highest priority)
  const codeBlocks: Array<{ start: number; end: number; lang: string; code: string }> = [];
  codeBlockRegex.lastIndex = 0;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    codeBlocks.push({
      start: match.index,
      end: match.index + match[0].length,
      lang: match[1] || "",
      code: match[2],
    });
  }

  // Process text between code blocks
  let textIndex = 0;
  for (const block of codeBlocks) {
    // Add text before code block
    if (block.start > textIndex) {
      const beforeText = text.slice(textIndex, block.start);
      parts.push(parseTextMarkdown(beforeText));
    }

    // Add code block
    parts.push(
      <div key={`code-${block.start}`} className="my-2">
        <CodeBlock code={block.code} language={block.lang} />
      </div>
    );

    textIndex = block.end;
  }

  // Add remaining text
  if (textIndex < text.length) {
    parts.push(parseTextMarkdown(text.slice(textIndex)));
  }

  return parts.length > 0 ? parts : [text];
}

// Parse text markdown (headers, bold, inline code)
function parseTextMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];

  // Process headers, bold, and inline code
  const patterns: Array<{
    regex: RegExp;
    render: (match: RegExpMatchArray, index: number) => React.ReactNode;
  }> = [
    {
      regex: /##\s+(.+)/g,
      render: (match) => (
        <h2 key={`h2-${match.index}`} className="text-xl font-bold mt-4 mb-2">
          {match[1]}
        </h2>
      ),
    },
    {
      regex: /###\s+(.+)/g,
      render: (match) => (
        <h3 key={`h3-${match.index}`} className="text-lg font-semibold mt-3 mb-1">
          {match[1]}
        </h3>
      ),
    },
    {
      regex: /\*\*(.+?)\*\*/g,
      render: (match) => <strong key={`bold-${match.index}`}>{match[1]}</strong>,
    },
    {
      regex: /`([^`]+)`/g,
      render: (match) => (
        <code
          key={`code-${match.index}`}
          className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
        >
          {match[1]}
        </code>
      ),
    },
  ];

  const matches: Array<{
    index: number;
    length: number;
    node: React.ReactNode;
  }> = [];

  patterns.forEach(({ regex, render }) => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        node: render(match, match.index),
      });
    }
  });

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Build parts
  let lastIndex = 0;
  matches.forEach((match) => {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add match node
    parts.push(match.node);
    lastIndex = match.index + match.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

// Code block component
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2 rounded-lg overflow-hidden bg-[#1e1e1e] border border-[#3c3c3c]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c]">
        <span className="text-xs text-[#858585] font-mono">{language || "code"}</span>
        <button
          onClick={copyToClipboard}
          className="text-xs text-[#858585] hover:text-white transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code className="text-[#d4d4d4]">{highlightCode(code, language)}</code>
      </pre>
    </div>
  );
}

