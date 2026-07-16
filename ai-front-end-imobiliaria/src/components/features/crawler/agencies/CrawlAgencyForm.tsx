"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCrawlAgency } from "@/services/crawlerService";
import type { CrawlAgencyInput } from "@/types/crawler";

export function CrawlAgencyForm() {
  const router = useRouter();
  const form = useForm<CrawlAgencyInput>({
    defaultValues: { name: "", slug: "", base_url: "", root_domain: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    await createCrawlAgency(values);
    toast.success("Crawl Agency cadastrada.");
    router.push("/admin/crawler/agencies");
    router.refresh();
  });

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" required {...form.register("name")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" required {...form.register("slug")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="base_url">URL base</Label>
        <Input id="base_url" type="url" required {...form.register("base_url")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="root_domain">Domínio raiz</Label>
        <Input id="root_domain" required {...form.register("root_domain")} />
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Salvando…" : "Cadastrar Crawl Agency"}
      </Button>
    </form>
  );
}
