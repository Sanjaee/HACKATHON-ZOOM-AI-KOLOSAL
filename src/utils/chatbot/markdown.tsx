import React from "react";

// Highlight code based on language
// Note: language parameter reserved for future syntax highlighting
export function highlightCode(code: string): React.ReactNode {
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
      const parsedBefore = parseTextMarkdown(beforeText);
      if (parsedBefore) {
        parts.push(parsedBefore);
      }
    }

    // Add code block
    parts.push(
      <div key={`code-${block.start}`} className="my-4">
        <CodeBlock code={block.code} language={block.lang} />
      </div>
    );

    textIndex = block.end;
  }

  // Add remaining text
  if (textIndex < text.length) {
    const remainingText = text.slice(textIndex);
    const parsedRemaining = parseTextMarkdown(remainingText);
    if (parsedRemaining) {
      parts.push(parsedRemaining);
    }
  }

  return parts.length > 0 ? parts : [text];
}

// Parse text markdown (headers, bold, inline code, paragraphs, lists)
function parseTextMarkdown(text: string): React.ReactNode {
  if (!text.trim()) return null;

  // Split by double newlines to create paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  return (
    <>
      {paragraphs.map((paragraph, pIdx) => {
        // Check if paragraph is a list
        const lines = paragraph.split('\n').filter(l => l.trim());
        const isList = lines.some(line => /^[\*\-\+]\s+|^\d+\.\s+/.test(line.trim()));
        
        if (isList) {
          return (
            <div key={`para-${pIdx}`} className="my-3">
              {parseList(paragraph)}
            </div>
          );
        }
        
        // Check if paragraph starts with header
        if (/^#{1,3}\s+/.test(paragraph.trim())) {
          return (
            <div key={`para-${pIdx}`} className="my-3">
              {parseInlineMarkdown(paragraph)}
            </div>
          );
        }
        
        // Regular paragraph
        return (
          <p key={`para-${pIdx}`} className="my-3 leading-relaxed whitespace-pre-wrap">
            {parseInlineMarkdown(paragraph)}
          </p>
        );
      })}
    </>
  );
}

// Parse inline markdown (bold, italic, code, links)
function parseInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  
  // Process headers, bold, italic, inline code, and links
  const patterns: Array<{
    regex: RegExp;
    render: (match: RegExpMatchArray, index: number) => React.ReactNode;
  }> = [
    {
      regex: /^###\s+(.+)$/gm,
      render: (match) => (
        <h3 key={`h3-${match.index}`} className="text-lg font-semibold mt-4 mb-2">
          {parseInlineMarkdown(match[1])}
        </h3>
      ),
    },
    {
      regex: /^##\s+(.+)$/gm,
      render: (match) => (
        <h2 key={`h2-${match.index}`} className="text-xl font-bold mt-5 mb-3">
          {parseInlineMarkdown(match[1])}
        </h2>
      ),
    },
    {
      regex: /^#\s+(.+)$/gm,
      render: (match) => (
        <h1 key={`h1-${match.index}`} className="text-2xl font-bold mt-6 mb-4">
          {parseInlineMarkdown(match[1])}
        </h1>
      ),
    },
    {
      regex: /\*\*(.+?)\*\*/g,
      render: (match) => <strong key={`bold-${match.index}`} className="font-semibold">{match[1]}</strong>,
    },
    {
      regex: /\*(.+?)\*/g,
      render: (match) => <em key={`italic-${match.index}`} className="italic">{match[1]}</em>,
    },
    {
      regex: /`([^`]+)`/g,
      render: (match) => (
        <code
          key={`code-${match.index}`}
          className="bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono text-purple-300"
        >
          {match[1]}
        </code>
      ),
    },
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/g,
      render: (match) => (
        <a
          key={`link-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          {match[1]}
        </a>
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
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) {
        parts.push(beforeText);
      }
    }
    // Add match node
    parts.push(match.node);
    lastIndex = match.index + match.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining) {
      parts.push(remaining);
    }
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

// Parse list (bullet and numbered)
function parseList(text: string): React.ReactNode {
  const lines = text.split('\n').filter(l => l.trim());
  const listItems: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let isOrdered = false;
  let listKey = 0;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const bulletMatch = /^[\*\-\+]\s+(.+)$/.exec(trimmed);
    const orderedMatch = /^(\d+)\.\s+(.+)$/.exec(trimmed);
    
    if (bulletMatch) {
      // If we were in ordered list, close it
      if (isOrdered && currentList.length > 0) {
        listItems.push(
          <ol key={`ol-${listKey++}`} className="list-decimal list-inside ml-4 my-2 space-y-1">
            {currentList}
          </ol>
        );
        currentList = [];
      }
      isOrdered = false;
      currentList.push(
        <li key={`li-${idx}`} className="ml-2">
          {parseInlineMarkdown(bulletMatch[1])}
        </li>
      );
    } else if (orderedMatch) {
      // If we were in bullet list, close it
      if (!isOrdered && currentList.length > 0) {
        listItems.push(
          <ul key={`ul-${listKey++}`} className="list-disc list-inside ml-4 my-2 space-y-1">
            {currentList}
          </ul>
        );
        currentList = [];
      }
      isOrdered = true;
      currentList.push(
        <li key={`li-${idx}`} className="ml-2">
          {parseInlineMarkdown(orderedMatch[2])}
        </li>
      );
    } else if (currentList.length > 0) {
      // End of list, close it
      if (isOrdered) {
        listItems.push(
          <ol key={`ol-${listKey++}`} className="list-decimal list-inside ml-4 my-2 space-y-1">
            {currentList}
          </ol>
        );
      } else {
        listItems.push(
          <ul key={`ul-${listKey++}`} className="list-disc list-inside ml-4 my-2 space-y-1">
            {currentList}
          </ul>
        );
      }
      currentList = [];
      // Add non-list line as regular text
      if (trimmed) {
        listItems.push(
          <p key={`text-${idx}`} className="my-2 leading-relaxed">
            {parseInlineMarkdown(trimmed)}
          </p>
        );
      }
    } else if (trimmed) {
      // Regular text line
      listItems.push(
        <p key={`text-${idx}`} className="my-2 leading-relaxed">
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  // Close any remaining list
  if (currentList.length > 0) {
    if (isOrdered) {
      listItems.push(
        <ol key={`ol-${listKey++}`} className="list-decimal list-inside ml-4 my-2 space-y-1">
          {currentList}
        </ol>
      );
    } else {
      listItems.push(
        <ul key={`ul-${listKey++}`} className="list-disc list-inside ml-4 my-2 space-y-1">
          {currentList}
        </ul>
      );
    }
  }

  return <>{listItems}</>;
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
        <code className="text-[#d4d4d4]">{highlightCode(code)}</code>
      </pre>
    </div>
  );
}

