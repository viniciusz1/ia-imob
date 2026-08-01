import { notFound } from "next/navigation";

import { OnboardingExecutionDetailClient } from "@/components/features/crawler/agencies/OnboardingExecutionDetailClient";
import { getCrawlAgency, getOnboardingExecution } from "@/services/crawlerService";

interface CrawlAgencyOnboardingExecutionPageProps {
  params: Promise<{ id: string; executionId: string }>;
}

export default async function CrawlAgencyOnboardingExecutionPage({
  params,
}: CrawlAgencyOnboardingExecutionPageProps) {
  const { id, executionId } = await params;
  const agencyId = Number(id);
  const onboardingExecutionId = Number(executionId);
  const [agency, execution] = await Promise.all([
    getCrawlAgency(agencyId),
    getOnboardingExecution(onboardingExecutionId),
  ]);

  if (execution.crawl_agency_id !== agency.id) notFound();

  return <OnboardingExecutionDetailClient agency={agency} initialExecution={execution} />;
}
