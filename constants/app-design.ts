/**
 * Shared visual system for Allergy & Health Tracker.
 * Keep screen palettes, typography and component surfaces aligned here.
 */
export const AppDesign = {
  colors: {
    navy: "#142F52",
    navySoft: "#EAF1FC",
    primary: "#1559A6",
    primarySoft: "#EEF5FF",
    teal: "#087E8B",
    tealSoft: "#E9FAFB",
    background: "#F3F6FA",
    surface: "#FFFFFF",
    border: "#D5DFEA",
    text: "#142F52",
    muted: "#46566B",
    mutedStrong: "#596A7E",
    danger: "#B4233A",
    dangerSoft: "#FFF0F3",
    success: "#176B45",
    successSoft: "#EAF8F1",
    warning: "#965500",
    warningSoft: "#FFF7E4",
    purple: "#6F55A3",
    purpleSoft: "#F2EEFA",
    brown: "#7D5A50",
    brownSoft: "#F7F1EF",
  },
  typography: {
    caption: 12,
    body: 15,
    bodyLineHeight: 23,
    section: 19,
    heading: 25,
    pageTitle: 30,
    weightRegular: "400" as const,
    weightMedium: "600" as const,
    weightStrong: "800" as const,
    weightHeavy: "900" as const,
  },
  radius: {
    control: 13,
    card: 18,
    panel: 22,
    hero: 24,
  },
  spacing: {
    page: 20,
    section: 16,
    card: 14,
  },
} as const;
