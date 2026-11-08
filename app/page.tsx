import { Header } from "@/components/Header";
import { Briefing } from "@/components/Briefing";
import { WeatherWidget } from "@/components/WeatherWidget";
import { SnowWidget } from "@/components/SnowWidget";
import { NewsWidget } from "@/components/NewsWidget";
import { StocksWidget } from "@/components/StocksWidget";
import { DriveWidget } from "@/components/DriveWidget";
import { YouTubeWidget } from "@/components/YouTubeWidget";
import { CalendarWidget } from "@/components/CalendarWidget";
import { PackagesWidget } from "@/components/PackagesWidget";

export const dynamic = "force-dynamic";

export default function Home() {
  const name = process.env.DISPLAY_NAME || "Brian";
  return (
    <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <Header name={name} />
      <Briefing />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <div className="xl:col-span-2"><WeatherWidget /></div>
        <div className="xl:col-span-2"><CalendarWidget /></div>
        <div className="xl:col-span-2"><SnowWidget /></div>
        <DriveWidget />
        <StocksWidget />
        <div className="xl:col-span-2"><PackagesWidget /></div>
        <div className="xl:col-span-2"><NewsWidget /></div>
        <div className="xl:col-span-2"><YouTubeWidget /></div>
      </div>
    </main>
  );
}
