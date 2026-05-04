import { Article, Email, Public } from "@mui/icons-material";
import { Box } from "@mui/material";
import type { Medium } from "../../api/content";

function mediumIconSrc(medium: Medium) {
  return ["linkedin", "instagram", "tiktok", "x", "facebook", "youtube"].includes(medium)
    ? `/brand-icons/${medium}.svg`
    : null;
}

export function MediumIcon({ medium, size = 14 }: { medium: Medium; size?: number }) {
  const src = mediumIconSrc(medium);
  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt=""
        sx={{ width: size, height: size, filter: "brightness(0) invert(1)", flex: "0 0 auto" }}
      />
    );
  }
  const sx = { fontSize: size, color: "inherit", flex: "0 0 auto" };
  if (medium === "blog") return <Article sx={sx} />;
  if (medium === "email") return <Email sx={sx} />;
  return <Public sx={sx} />;
}
