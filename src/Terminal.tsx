import { useEffect, useRef } from "react";

function parseColorCodes(line: string) {
    // Match: #RRGGBBword (e.g., #FF0000Hello)
    const regex = /#([0-9a-fA-F]{6})(\S*)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push(line.slice(lastIndex, match.index));
        }
        // Add colored word (without the #)
        if (match[2]) {
            parts.push(
                <span key={match.index} style={{ color: `#${match[1]}` }}>
                    {match[2]}
                </span>
            );
        }
        lastIndex = regex.lastIndex;
    }
    // Add remaining text
    if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
    }

    // Join parts and remove any stray '#' characters
    return parts.map(part =>
        typeof part === "string" ? part.replace(/#/g, "") : part
    );
}

const Terminal = ({
    lines,
    theme = {
        background: "#23272e",
        color: "#fff",
        fontSize: "1rem",
        fontFamily: "monospace",
        padding: "10px",
        borderRadius: "8px 8px 0 0",
        minHeight: "200px",
        maxHeight: "300px",
        overflowY: "auto",
        border: "1px solid #333",
    },
}: {
    lines: string[];
    theme?: React.CSSProperties;
}) => {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    return (
        <div ref={terminalRef} style={theme}>
            {lines.map((line, idx) => (
                <div key={idx} style={{ whiteSpace: "pre-wrap" }}>
                    {parseColorCodes(line)}
                </div>
            ))}
        </div>
    );
};
export default Terminal;