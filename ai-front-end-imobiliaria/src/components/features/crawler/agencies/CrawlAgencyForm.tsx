"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { MissingFieldsHint, isFilled, isValidUrl, missingFields } from "@/components/features/crawler/requiredFields";
import { createCrawlAgency } from "@/services/crawlerService";
import type { CrawlAgencyInput } from "@/types/crawler";

export function CrawlAgencyForm() {
  const router = useRouter();
  const form = useForm<CrawlAgencyInput>({
    defaultValues: { name: "", slug: "", base_url: "", root_domain: "" },
  });
  const { isSubmitting } = form.formState;
  const values = useWatch({ control: form.control });
  const missing = missingFields([
    ["Nome", isFilled(values.name)],
    ["Slug", isFilled(values.slug)],
    ["URL base válida", isValidUrl(values.base_url)],
    ["Domínio raiz", isFilled(values.root_domain)],
  ]);

  const submit = form.handleSubmit(async (values) => {
    await createCrawlAgency(values);
    toast.success("Crawl Agency cadastrada.");
    router.push("/admin/crawler/agencies");
    router.refresh();
  });

  return (
    <form className="space-y-6" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Identidade da fonte</CardTitle>
          <CardDescription>Nome, endereço e domínio usados pelo Crawler para identificar a fonte.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField htmlFor="name" label="Nome" required>
            <Input id="name" required {...form.register("name")} />
          </FormField>
          <FormField htmlFor="slug" label="Slug" required>
            <Input id="slug" required {...form.register("slug")} />
          </FormField>
          <FormField htmlFor="base_url" label="URL base" required>
            <Input id="base_url" placeholder="https://" required type="url" {...form.register("base_url")} />
          </FormField>
          <FormField htmlFor="root_domain" label="Domínio raiz" required>
            <Input id="root_domain" required {...form.register("root_domain")} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <MissingFieldsHint className="mr-auto" missing={missing} />
        <Button asChild variant="outline">
          <Link href="/admin/crawler/agencies">Cancelar</Link>
        </Button>
        <Button disabled={isSubmitting || missing.length > 0} type="submit">
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? "Salvando…" : "Cadastrar Crawl Agency"}
        </Button>
      </div>
    </form>
  );
}
