import { CrawlerModuleNavigation } from "@/components/features/crawler/navigation/CrawlerModuleNavigation";

export default function CrawlerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 -mt-6 [&_a[href]]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed">
      <CrawlerModuleNavigation />
      <div className="p-6">{children}</div>
    </div>
  );
}
