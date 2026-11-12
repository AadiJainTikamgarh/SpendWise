export function parseDate(dateInput?: Date | string): Date {
  if (!dateInput) return new Date();
  if (typeof dateInput === 'string') return new Date(dateInput);
  return dateInput;
}

export function getStartOfDay(dateInput?: Date | string): string {
  const d = new Date(parseDate(dateInput));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function getEndOfDay(dateInput?: Date | string): string {
  const d = new Date(parseDate(dateInput));
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function getStartOfMonth(dateInput?: Date | string): string {
  const d = new Date(parseDate(dateInput));
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function getEndOfMonth(dateInput?: Date | string): string {
  const d = new Date(parseDate(dateInput));
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function isSameDay(d1: Date | string, d2: Date | string): boolean {
  const a = parseDate(d1);
  const b = parseDate(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Hoisted Intl formatters for high performance across list items and renders
const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const monthYearFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
});

const sameYearDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
});

const diffYearDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatDateLabel(isoString: string): string {
  const date = parseDate(isoString);
  const now = new Date();

  const day = date.getDate();
  const month = sameYearDateFormatter.format(date).split(' ')[1] || 'date';

  if (isSameDay(date, now)) {
    return `Today, ${day} ${month}`;
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return `Yesterday, ${day} ${month}`;
  }

  const formatter = date.getFullYear() !== now.getFullYear() ? diffYearDateFormatter : sameYearDateFormatter;
  return formatter.format(date);
}

export function formatTime(isoString: string): string {
  const date = parseDate(isoString);
  return timeFormatter.format(date);
}

export function formatMonthYear(date: Date): string {
  return monthYearFormatter.format(date);
}

export function getDaysInMonthGrid(year: number, month: number, startOnSunday: boolean = true): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOffset = startOnSunday ? firstDay.getDay() : (firstDay.getDay() + 6) % 7;

  const totalDays = lastDay.getDate();
  const days: (Date | null)[] = [];

  for (let i = 0; i < startDayOffset; i++) {
    days.push(null);
  }

  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}
