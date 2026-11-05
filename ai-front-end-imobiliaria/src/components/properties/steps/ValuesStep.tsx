"use client";

import { useFormContext } from "react-hook-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { SwitchTile } from "@/components/properties/steps/SwitchTile";
import { NumericField } from "@/components/properties/steps/NumericField";
import type { PropertyFormValues } from "@/schemas/propertySchema";

export function ValuesStep() {
    const { watch, setValue } = useFormContext<PropertyFormValues>();
    // The purpose decides which price is mandatory (see crossFieldIssues).
    const purpose = watch("purpose");
    const saleRequired = purpose === "venda" || purpose === "venda_locacao";
    const rentRequired = purpose === "locacao" || purpose === "venda_locacao";

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Valores</CardTitle>
                    <CardDescription>Preços de venda e locação e custos mensais, em reais.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                    <NumericField
                        kind="money"
                        label="Valor de Venda"
                        name="sale_price"
                        placeholder="0,00"
                        prefix="R$"
                        required={saleRequired}
                    />
                    <NumericField
                        kind="money"
                        label="Valor de Locação"
                        name="rent_price"
                        placeholder="0,00"
                        prefix="R$"
                        required={rentRequired}
                    />
                    <NumericField kind="money" label="IPTU" name="property_tax" placeholder="0,00" prefix="R$" />
                    <NumericField kind="money" label="Condomínio" name="condo_fee" placeholder="0,00" prefix="R$" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Condições</CardTitle>
                    <CardDescription>Negociação e exibição do preço no site.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <SwitchTile
                        checked={watch("accepts_financing")}
                        description="Indica se aceita financiamento bancário."
                        id="accepts_financing"
                        onCheckedChange={(checked) =>
                            setValue("accepts_financing", checked, { shouldDirty: true })
                        }
                        title="Aceita Financiamento"
                    />
                    <SwitchTile
                        checked={watch("accepts_exchange")}
                        description="Indica se o proprietário aceita troca."
                        id="accepts_exchange"
                        onCheckedChange={(checked) =>
                            setValue("accepts_exchange", checked, { shouldDirty: true })
                        }
                        title="Estuda Permuta"
                    />
                    <SwitchTile
                        checked={watch("show_price")}
                        description="Desative para ocultar preço do anúncio público."
                        id="show_price"
                        onCheckedChange={(checked) => setValue("show_price", checked, { shouldDirty: true })}
                        title="Exibir Preço no Site"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
