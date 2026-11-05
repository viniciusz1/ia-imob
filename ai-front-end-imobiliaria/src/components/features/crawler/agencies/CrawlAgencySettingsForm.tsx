"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  MissingFieldsHint,
  domainError,
  missingFields,
  slugError,
  textError,
  urlError,
} from "@/components/features/crawler/requiredFields";
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
    mode: "onChange",
  });
  const { errors, isSubmitting } = form.formState;
  const values = useWatch({ control: form.control });
  const missing = missingFields([
    ["Nome", textError(values.name, { max: 255 }) === null],
    ["Slug", slugError(values.slug) === null],
    ["URL base válida", urlError(values.base_url) === null],
    ["Domínio raiz", domainError(values.root_domain) === null],
  ]);

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
    <form className="space-y-6" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Identidade da Crawl Agency</CardTitle>
          <CardDescription>Nome, endereço e domínio usados pelo Crawler para identificar a fonte.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField error={errors.name?.message} htmlFor="agency-settings-name" label="Nome" required>
            <Input
              disabled={isSubmitting}
              id="agency-settings-name"
              required
              {...form.register("name", { validate: (value) => textError(value, { max: 255 }) ?? true })}
            />
          </FormField>
          <FormField error={errors.slug?.message} htmlFor="agency-settings-slug" label="Slug" required>
            <Input
              disabled={isSubmitting}
              id="agency-settings-slug"
              required
              {...form.register("slug", { validate: (value) => slugError(value) ?? true })}
            />
          </FormField>
          <FormField error={errors.base_url?.message} htmlFor="agency-settings-base-url" label="URL base" required>
            <Input
              disabled={isSubmitting}
              id="agency-settings-base-url"
              required
              type="url"
              {...form.register("base_url", { validate: (value) => urlError(value) ?? true })}
            />
          </FormField>
          <FormField error={errors.root_domain?.message} htmlFor="agency-settings-root-domain" label="Domínio raiz" required>
            <Input
              disabled={isSubmitting}
              id="agency-settings-root-domain"
              required
              {...form.register("root_domain", { validate: (value) => domainError(value) ?? true })}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <MissingFieldsHint className="mr-auto" missing={missing} />
        <Button disabled={isSubmitting || missing.length > 0} type="submit">
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? "Salvando…" : "Salvar identidade"}
        </Button>
      </div>
    </form>
  );
}
