"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  CheckCircle2,
  CircleDot,
  Loader2,
  MessageSquareText,
  Radar,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  newPropertyInterestSchema,
  type NewPropertyInterestFormValues,
} from "@/schemas/newPropertyInterestSchema";
import {
  getNewPropertyModuleInterest,
  recordNewPropertyModuleInterest,
} from "@/services/newPropertyInterestService";
import type { NewPropertyIntendedUse } from "@/types/newProperties";

const intendedUseOptions: Array<{
  value: NewPropertyIntendedUse;
  label: string;
  description: string;
  icon: typeof Radar;
}> = [
  {
    value: "monitor_new_listings",
    label: "Monitorar anúncios recém-publicados",
    description: "Ver primeiro o que acabou de entrar no mercado.",
    icon: BellRing,
  },
  {
    value: "prospect_owners",
    label: "Prospectar proprietários",
    description: "Identificar oportunidades de captação com antecedência.",
    icon: Radar,
  },
  {
    value: "match_clients",
    label: "Encontrar opções para clientes",
    description: "Conectar rapidamente uma novidade a uma demanda ativa.",
    icon: Users,
  },
  {
    value: "follow_market",
    label: "Acompanhar o movimento do mercado",
    description: "Entender lançamentos, regiões e tipos com maior atividade.",
    icon: Sparkles,
  },
];

const futureFlow = [
  {
    title: "Identificar",
    description: "O crawler reconhece a primeira aparição do anúncio em dados aprovados.",
  },
  {
    title: "Apresentar",
    description: "O módulo organiza as novidades pela data em que entraram no mercado.",
  },
  {
    title: "Qualificar",
    description: "O corretor decide acompanhar ou dispensar cada oportunidade.",
  },
  {
    title: "Agir",
    description: "A oportunidade pode seguir para captação, cliente ou monitoramento.",
  },
];

const interestQueryKey = ["new-property-module-interest"] as const;

export function NewPropertiesValidationClient() {
  const queryClient = useQueryClient();
  const interestQuery = useQuery({
    queryKey: interestQueryKey,
    queryFn: getNewPropertyModuleInterest,
  });
  const form = useForm<NewPropertyInterestFormValues>({
    resolver: zodResolver(newPropertyInterestSchema),
    defaultValues: {
      intended_uses: [],
      notes: "",
    },
  });
  const mutation = useMutation({
    mutationFn: recordNewPropertyModuleInterest,
    onSuccess: (interest) => {
      queryClient.setQueryData(interestQueryKey, interest);
      form.reset({
        intended_uses: interest.intended_uses,
        notes: interest.notes ?? "",
      });
      toast.success("Interesse registrado. Obrigado por ajudar a definir o módulo!");
    },
    onError: () => {
      toast.error("Não foi possível registrar seu interesse. Tente novamente.");
    },
  });

  useEffect(() => {
    if (interestQuery.data) {
      form.reset({
        intended_uses: interestQuery.data.intended_uses,
        notes: interestQuery.data.notes ?? "",
      });
    }
  }, [form, interestQuery.data]);

  function handleInterestSubmit(values: NewPropertyInterestFormValues) {
    mutation.mutate({
      intended_uses: values.intended_uses,
      notes: values.notes || null,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
        <div className="max-w-3xl space-y-4">
          <Badge variant="secondary" className="gap-1.5">
            <CircleDot className="size-3" />
            Em validação
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Novos imóveis</h1>
            <p className="text-lg text-muted-foreground">
              Uma visão das oportunidades que acabaram de entrar no mercado, pensada para quem precisa agir cedo.
            </p>
          </div>
          <p className="rounded-lg border bg-background/80 p-4 text-sm text-muted-foreground">
            Esta entrega valida o interesse e o modo de uso antes do desenvolvimento completo. Hoje, a entrada não lista anúncios nem envia alertas.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>O que é um anúncio novo?</CardTitle>
              <CardDescription>Uma definição única evita tratar simples edições como novas oportunidades.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                É um anúncio de mercado cuja identidade estável aparece pela primeira vez em um snapshot publicado e aprovado pela plataforma.
              </p>
              <p>
                Alterações de preço, fotos ou descrição geram uma nova versão do mesmo anúncio — não um anúncio novo. Se ele sair e reaparecer com a mesma identidade, continua sendo o mesmo anúncio.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>Fluxo principal proposto</CardTitle>
              <CardDescription>O caminho a ser validado antes de construir o feed completo.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-4 sm:grid-cols-2">
                {futureFlow.map((step, index) => (
                  <li key={step.title} className="flex gap-3 rounded-lg border p-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{step.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle role="heading" aria-level={2}>Você usaria este módulo?</CardTitle>
                <CardDescription className="mt-1.5">
                  Sua resposta orienta a prioridade e o primeiro fluxo da funcionalidade.
                </CardDescription>
              </div>
              <MessageSquareText className="size-5 shrink-0 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {interestQuery.isPending ? (
              <div className="space-y-3" aria-label="Carregando interesse">
                {intendedUseOptions.map((option) => (
                  <Skeleton key={option.value} className="h-20 w-full" />
                ))}
              </div>
            ) : interestQuery.isError ? (
              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">Não foi possível carregar sua resposta.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => interestQuery.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={form.handleSubmit(handleInterestSubmit)}>
                {interestQuery.data && (
                  <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    Interesse já registrado. Você pode atualizar a resposta quando quiser.
                  </div>
                )}

                <Controller
                  name="intended_uses"
                  control={form.control}
                  render={({ field }) => (
                    <fieldset className="space-y-3" aria-describedby="intended-uses-error">
                      <legend className="text-sm font-medium">Como você pretende usar?</legend>
                      {intendedUseOptions.map((option) => {
                        const checked = field.value.includes(option.value);

                        return (
                          <Label
                            key={option.value}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(nextChecked) => {
                                field.onChange(
                                  nextChecked === true
                                    ? [...field.value, option.value]
                                    : field.value.filter((value) => value !== option.value),
                                );
                              }}
                              aria-label={option.label}
                            />
                            <option.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span>
                              <span className="block font-medium leading-5">{option.label}</span>
                              <span className="mt-0.5 block text-xs font-normal leading-5 text-muted-foreground">
                                {option.description}
                              </span>
                            </span>
                          </Label>
                        );
                      })}
                    </fieldset>
                  )}
                />
                {form.formState.errors.intended_uses && (
                  <p id="intended-uses-error" className="text-sm text-destructive">
                    {form.formState.errors.intended_uses.message}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="interest-notes">O que faria essa função ser útil para você?</Label>
                  <Textarea
                    id="interest-notes"
                    rows={4}
                    maxLength={1000}
                    placeholder="Ex.: receber oportunidades por bairro e avisar um cliente específico..."
                    aria-invalid={Boolean(form.formState.errors.notes)}
                    {...form.register("notes")}
                  />
                  {form.formState.errors.notes && (
                    <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Send />
                  )}
                  {interestQuery.data ? "Atualizar meu interesse" : "Quero usar este módulo"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
