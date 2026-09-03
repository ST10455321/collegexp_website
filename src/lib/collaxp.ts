export const INSTITUTIONS = [
  "Rosebank College",
  "University of Johannesburg",
  "University of the Witwatersrand",
  "Gauteng City College",
  "Joburg Theatre",
];

export const CATEGORIES = [
  "Campus",
  "Culture",
  "Music",
  "Theatre",
  "Sport",
  "Career",
  "Seminar",
  "Rally",
  "Graduation",
];

export const EVENT_TYPES = [
  { value: "ticketed", label: "Ticketed event" },
  { value: "seminar", label: "Seminar (RSVP)" },
  { value: "rally", label: "Campaign rally (RSVP)" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];

export function isRsvpType(type: string | null | undefined) {
  return type === "seminar" || type === "rally";
}

export function eventTypeLabel(type: string | null | undefined) {
  return EVENT_TYPES.find((t) => t.value === type)?.label ?? "Ticketed event";
}

export const REPORT_REASONS = [
  "Spam or scam",
  "Harassment or hate speech",
  "Nudity or sexual content",
  "Violence or dangerous content",
  "Misinformation",
  "Other",
];

export const XP_PER_LEVEL = 250;

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function levelProgress(xp: number) {
  return Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100);
}

export function xpToNextLevel(xp: number) {
  return XP_PER_LEVEL - (xp % XP_PER_LEVEL);
}

export type Badge = {
  name: string;
  description: string;
  requirement: number;
};

export const BADGES: Badge[] = [
  { name: "First Steps", description: "Register for your first event", requirement: 1 },
  { name: "Campus Regular", description: "Register for 3 events", requirement: 3 },
  { name: "Culture Vulture", description: "Register for 5 events", requirement: 5 },
  { name: "Year Book Legend", description: "Register for 10 events", requirement: 10 },
];

export function formatPrice(price: number) {
  return price <= 0 ? "Free" : `R${Number(price).toFixed(2)}`;
}

export function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
