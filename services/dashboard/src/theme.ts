import {
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
  type Theme,
} from "@fluentui/react-components";

export const brandRamp: BrandVariants = {
  10: "#061f1d",
  20: "#0a302c",
  30: "#0d413c",
  40: "#10524b",
  50: "#135e58",
  60: "#1d7069",
  70: "#2d8179",
  80: "#43928a",
  90: "#5da39b",
  100: "#79b4ad",
  110: "#97c5bf",
  120: "#b6d6d1",
  130: "#d0e5e1",
  140: "#e1efec",
  150: "#eef7f5",
  160: "#f7fbfa",
};

export const lightTheme: Theme = {
  ...createLightTheme(brandRamp),
  colorNeutralBackground1: "#ffffff",
  colorNeutralBackground2: "#f4f7f5",
  colorNeutralBackground3: "#edf2ef",
  colorNeutralForeground1: "#1c302d",
  colorNeutralForeground2: "#657672",
  colorNeutralStroke1: "#d5dfda",
};

export const darkTheme: Theme = {
  ...createDarkTheme(brandRamp),
  colorNeutralBackground1: "#172421",
  colorNeutralBackground2: "#1c2b27",
  colorNeutralBackground3: "#243530",
  colorNeutralForeground1: "#edf4f1",
  colorNeutralForeground2: "#a7b8b1",
  colorNeutralStroke1: "#3b5049",
};
