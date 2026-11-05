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
import {
  MissingFieldsHint,
  domainError,
  missingFields,
  slugError,
  textError,
  urlError,
} from "@/components/features/crawler/requiredFields";
import { createCrawlAgency } from "@/services/crawlerService";
import type { CrawlAgencyInput } from "@/types/crawler";

export function CrawlAgencyForm() {
  const router = useRouter();
  // Validated while typing; a field only shows its error once the user changed it.
  const form = useForm<CrawlAgencyInput>({
    defaultValues: { name: "", slug: "", base_url: "", root_domain: "" },
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
          <FormField error={errors.name?.message} htmlFor="name" label="Nome" required>
            <Input
              id="name"
              required
              {...form.register("name", { validate: (value) => textError(value, { max: 255 }) ?? true })}
            />
          </FormField>
          <FormField
            error={errors.slug?.message}
            hint="Letras minúsculas, números e hífens."
            htmlFor="slug"
            label="Slug"
            required
          >
            <Input id="slug" required {...form.register("slug", { validate: (value) => slugError(value) ?? true })} />
          </FormField>
          <FormField error={errors.base_url?.message} htmlFor="base_url" label="URL base" required>
            <Input
              id="base_url"
              placeholder="https://"
              required
              type="url"
              {...form.register("base_url", { validate: (value) => urlError(value) ?? true })}
            />
          </FormField>
          <FormField error={errors.root_domain?.message} htmlFor="root_domain" label="Domínio raiz" required>
            <Input
              id="root_domain"
              placeholder="imobiliaria.com.br"
              required
              {...form.register("root_domain", { validate: (value) => domainError(value) ?? true })}
            />
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
