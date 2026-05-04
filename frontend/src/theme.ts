import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#7ec9dc",
      light: "#dff4f9",
      dark: "#3d9bb5",
      contrastText: "#10252b",
    },
    secondary: {
      main: "#805a9b",
      contrastText: "#ffffff",
    },
    info: {
      main: "#3d9bb5",
    },
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      "sans-serif",
    ].join(","),
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;
