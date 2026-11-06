export type CalEvent = {
  id: string;
  calendar: string; // label from GOOGLE_CALENDAR_ICS
  title: string;
  start: number; // epoch ms
  end: number; // epoch ms (exclusive)
  allDay: boolean;
  /** For all-day events: Mountain-Time dates (YYYY-MM-DD) the event covers. */
  days?: string[];
  location?: string;
  url?: string; // meeting link if present (Meet/Zoom/etc.)
  tentative?: boolean;
};
export type CalSourceStatus = { label: string; ok: boolean; error?: string };
export type CalendarData = {
  events: CalEvent[];
  rangeStart: number;
  rangeEnd: number;
  calendars: CalSourceStatus[];
};
