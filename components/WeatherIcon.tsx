import { Sun, Moon, CloudSun, CloudMoon, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Snowflake } from "lucide-react";

export function wmo(code: number): { label: string; Icon: typeof Sun; night?: typeof Sun } {
  if (code === 0) return { label: "Clear", Icon: Sun, night: Moon };
  if (code === 1) return { label: "Mostly clear", Icon: Sun, night: Moon };
  if (code === 2) return { label: "Partly cloudy", Icon: CloudSun, night: CloudMoon };
  if (code === 3) return { label: "Overcast", Icon: Cloud };
  if (code === 45 || code === 48) return { label: "Fog", Icon: CloudFog };
  if (code >= 51 && code <= 57) return { label: "Drizzle", Icon: CloudDrizzle };
  if (code >= 61 && code <= 67) return { label: "Rain", Icon: CloudRain };
  if (code >= 71 && code <= 77) return { label: "Snow", Icon: CloudSnow };
  if (code >= 80 && code <= 82) return { label: "Rain showers", Icon: CloudRain };
  if (code === 85 || code === 86) return { label: "Snow showers", Icon: Snowflake };
  if (code >= 95) return { label: "Thunderstorms", Icon: CloudLightning };
  return { label: "Unknown", Icon: Cloud };
}

export function WeatherIcon({ code, isDay = true, className = "size-6" }: { code: number; isDay?: boolean; className?: string }) {
  const w = wmo(code);
  const I = !isDay && w.night ? w.night : w.Icon;
  return <I className={className} aria-label={w.label} />;
}
