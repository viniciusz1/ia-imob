import { CrawlerModuleNavigation } from "@/components/features/crawler/navigation/CrawlerModuleNavigation";

export default function CrawlerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 -mt-6">
      <CrawlerModuleNavigation />
      <div className="p-6">{children}</div>
    </div>
  );
}
