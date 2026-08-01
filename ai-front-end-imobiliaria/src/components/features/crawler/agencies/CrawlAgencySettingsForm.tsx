"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCrawlAgency } from "@/services/crawlerService";
import type { CrawlAgency, CrawlAgencyInput } from "@/types/crawler";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

interface CrawlAgencySettingsFormProps {
  agency: CrawlAgency;
}

export function CrawlAgencySettingsForm({ agency }: CrawlAgencySettingsFormProps) {
  const router = useRouter();
  const form = useForm<CrawlAgencyInput>({
    defaultValues: {
      name: agency.name,
      slug: agency.slug,
      base_url: agency.base_url,
      root_domain: agency.root_domain,
    },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      const updated = await updateCrawlAgency(agency.id, values);
      form.reset({
        name: updated.name,
        slug: updated.slug,
        base_url: updated.base_url,
        root_domain: updated.root_domain,
      });
      toast.success("Identidade da Crawl Agency atualizada.");
      router.refresh();
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível atualizar a Crawl Agency."));
    }
  });

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="agency-settings-name">Nome</Label>
        <Input disabled={form.formState.isSubmitting} id="agency-settings-name" required {...form.register("name")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agency-settings-slug">Slug</Label>
        <Input disabled={form.formState.isSubmitting} id="agency-settings-slug" required {...form.register("slug")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agency-settings-base-url">URL base</Label>
        <Input disabled={form.formState.isSubmitting} id="agency-settings-base-url" required type="url" {...form.register("base_url")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agency-settings-root-domain">Domínio raiz</Label>
        <Input disabled={form.formState.isSubmitting} id="agency-settings-root-domain" required {...form.register("root_domain")} />
      </div>
      <div className="sm:col-span-2">
        <Button disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Salvando…" : "Salvar identidade"}
        </Button>
      </div>
    </form>
  );
}
