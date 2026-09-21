// Using `satisfies Record<string, Record<string, string>>` so
// indexing like myColors.purple['500'] is type-safe (string keys).
export const myColors = {
  gray: {
    100: "#f3f3f3",
    200: "#efefef",
    300: "#eaeaea",
    400: "#bebebe",
    500: "#929292",
    600: "#888888ff",
    700: "#3f3f3f",
    800: "#1e1e1e",
  },
  blue: {
    20:  "#eaeff6",
    100: "#16a3fe",
    200: "#1940b0",
    280: "#1a2d8b",
    290: "#14257b",
    300: "#122272",
    330: "#0e1c5f",
    340: "#15185f",
    350: "#001457",
    400: "#06124b",
    500: "#030b30",
  },
  purple: {
    20:  "#e1e1ff",
    100: "#8d9fe4",
    200: "#7b7afe",
    300: "#2f296e",
    400: "#211951",
    420: "#211750",
    500: "#150e3d",
    600: "#0b0b24",
  },
  green: {
    20:  "#d3eee7",
    50: "#00ff56",
    100: "#3ff6a9",
    200: "#15f5ba",
    300: "#23c99d",
    400: "#078362",
  },
  yellow: {
    50:  "#fce68f",
    100: "#ffe066",
    200: "#ffe648",
    300: "#704d00",
  },
  orange: {
    100: "#fb8c00",
    300: "#4a2800",
  },
  cream: {
    100: "#e7b481",
  },
  red: {
    100: "#ff5252",
  },
} satisfies Record<string, Record<string, string>>;
