import { Fragment } from "react";
import { Box, Stack, Typography } from "@mui/material";

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Box component="strong" key={`${part}-${index}`}>
              {part.slice(2, -2)}
            </Box>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <Box
              component="code"
              key={`${part}-${index}`}
              sx={{
                px: 0.5,
                py: 0.15,
                borderRadius: 0.75,
                bgcolor: "rgba(0,0,0,0.08)",
                fontSize: "0.92em",
              }}
            >
              {part.slice(1, -1)}
            </Box>
          );
        }
        return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
      })}
    </>
  );
}

export function MarkdownMessage({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <Stack spacing={1}>
      {blocks.map((block, blockIndex) => {
        const fencedMatch = block.match(/^```(?:\w+)?\n?([\s\S]*?)```$/);
        if (fencedMatch) {
          return (
            <Box
              component="pre"
              key={`${block}-${blockIndex}`}
              sx={{
                m: 0,
                p: 1.25,
                borderRadius: 1,
                bgcolor: "rgba(0,0,0,0.06)",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                fontFamily: "monospace",
                fontSize: 13,
              }}
            >
              {fencedMatch[1].trim()}
            </Box>
          );
        }
        const lines = block.split("\n");
        if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
          return (
            <Box component="ul" key={`${block}-${blockIndex}`} sx={{ m: 0, pl: 2.4 }}>
              {lines.map((line, index) => (
                <Typography component="li" variant="body2" key={`${line}-${index}`}>
                  <InlineMarkdown text={line.replace(/^\s*[-*]\s+/, "")} />
                </Typography>
              ))}
            </Box>
          );
        }
        if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
          return (
            <Box component="ol" key={`${block}-${blockIndex}`} sx={{ m: 0, pl: 2.4 }}>
              {lines.map((line, index) => (
                <Typography component="li" variant="body2" key={`${line}-${index}`}>
                  <InlineMarkdown text={line.replace(/^\s*\d+\.\s+/, "")} />
                </Typography>
              ))}
            </Box>
          );
        }
        return (
          <Typography
            key={`${block}-${blockIndex}`}
            variant="body2"
            sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
          >
            <InlineMarkdown text={block.replace(/^#{1,6}\s+/gm, "")} />
          </Typography>
        );
      })}
    </Stack>
  );
}
