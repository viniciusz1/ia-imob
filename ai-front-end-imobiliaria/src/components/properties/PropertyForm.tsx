"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { propertySchema, type PropertyFormValues } from "@/schemas/property";
import type { Property, SelectOption } from "@/types/property";
import { useCreateProperty, useGetFeatures, useUpdateProperty } from "@/hooks/useProperties";
import { useSystemEnums } from "@/hooks/useSystemEnums";
import {
    deletePropertyImage,
    reorderPropertyImages,
    setPropertyCoverImage,
    uploadPropertyImage,
} from "@/services/propertyService";
import { BasicDataStep } from "@/components/properties/steps/BasicDataStep";
import { FeaturesStep } from "@/components/properties/steps/FeaturesStep";
import { ValuesStep } from "@/components/properties/steps/ValuesStep";
import { LocationStep } from "@/components/properties/steps/LocationStep";
import { InternalManagementStep } from "@/components/properties/steps/InternalManagementStep";
import { MediaStep, type PendingImage } from "@/components/properties/steps/MediaStep";

interface PropertyFormProps {
    mode: "create" | "edit";
    initialData?: Property | null;
}

const STEP_VALUES = ["basic", "features", "values", "location", "media", "management"] as const;

const STEP_LABELS: Record<(typeof STEP_VALUES)[number], string> = {
    basic: "Dados Básicos",
    features: "Características",
    values: "Valores",
    location: "Localização",
    media: "Mídias",
    management: "Gestão Interna",
};

function toNullableText(value: string | null | undefined): string {
    return value ?? "";
}

function getDefaultValues(property?: Property | null): PropertyFormValues {
    return {
        reference_code: property?.reference_code ?? "",
        title: property?.title ?? "",
        description: toNullableText(property?.description),
        property_type: property?.property_type ?? "",
        purpose: property?.purpose ?? "",
        status: property?.status ?? "",
        zip_code: property?.zip_code ?? "",
        state: property?.state ?? "",
        city: property?.city ?? "",
        neighborhood: property?.neighborhood ?? "",
        street: property?.street ?? "",
        number: property?.number ?? "",
        complement: toNullableText(property?.complement),
        latitude: property?.latitude ?? null,
        longitude: property?.longitude ?? null,
        show_exact_address: property?.show_exact_address ?? false,
        sale_price: property?.sale_price ?? null,
        rent_price: property?.rent_price ?? null,
        property_tax: property?.property_tax ?? null,
        condo_fee: property?.condo_fee ?? null,
        accepts_financing: property?.accepts_financing ?? false,
        accepts_exchange: property?.accepts_exchange ?? false,
        show_price: property?.show_price ?? true,
        usable_area: property?.usable_area ?? null,
        total_area: property?.total_area ?? null,
        bedrooms: property?.bedrooms ?? 0,
        suites: property?.suites ?? 0,
        bathrooms: property?.bathrooms ?? 0,
        garage_spaces: property?.garage_spaces ?? 0,
        floor_number: property?.floor_number ?? null,
        total_floors: property?.total_floors ?? null,
        build_year: property?.build_year ?? null,
        video_url: toNullableText(property?.video_url),
        virtual_tour_url: toNullableText(property?.virtual_tour_url),
        owner_id: property?.owner_id ?? null,
        broker_id: property?.broker_id ?? null,
        internal_notes: toNullableText(property?.internal_notes),
        has_exclusive_right: property?.has_exclusive_right ?? false,
        exclusive_right_expiration_date: toNullableText(property?.exclusive_right_expiration_date),
        keys_location: toNullableText(property?.keys_location),
        is_published: property?.is_published ?? false,
        is_highlighted: property?.is_highlighted ?? false,
        features: property?.features?.map((feature) => feature.id) ?? [],
    };
}

function extractEnumData(enums: { tag: string; data: SelectOption[] }[], tag: string): SelectOption[] {
    const found = enums.find((item) => item.tag === tag);
    return found?.data ?? [];
}

export function PropertyForm({ mode, initialData }: PropertyFormProps) {
    const isEdit = mode === "edit";
    const router = useRouter();
    const [activeStep, setActiveStep] = useState<(typeof STEP_VALUES)[number]>("basic");
    const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
    const [existingImages, setExistingImages] = useState(initialData?.images ?? []);
    const [isUploadingImages, setIsUploadingImages] = useState(false);

    const createMutation = useCreateProperty();
    const updateMutation = useUpdateProperty(initialData?.id ?? 0);
    const { data: systemEnums = [], isLoading: isLoadingEnums } = useSystemEnums();
    const { data: featuresOptions = [], isLoading: isLoadingFeatures } = useGetFeatures();

    const form = useForm<PropertyFormValues>({
        // @ts-expect-error Zod resolver output/input mismatch with defaulted fields
        resolver: zodResolver(propertySchema),
        defaultValues: getDefaultValues(initialData),
    });

    useEffect(() => {
        form.reset(getDefaultValues(initialData));
        setExistingImages(initialData?.images ?? []);
    }, [form, initialData]);

    const propertyTypes = useMemo(
        () => extractEnumData(systemEnums, "property_types"),
        [systemEnums]
    );
    const purposes = useMemo(() => extractEnumData(systemEnums, "property_purposes"), [systemEnums]);
    const statuses = useMemo(() => extractEnumData(systemEnums, "property_statuses"), [systemEnums]);

    const currentStepIndex = STEP_VALUES.indexOf(activeStep);
    const isLoading = createMutation.isPending || updateMutation.isPending || isUploadingImages;

    function moveStep(direction: "next" | "previous") {
        const index = STEP_VALUES.indexOf(activeStep);
        const nextIndex = direction === "next" ? index + 1 : index - 1;
        if (nextIndex < 0 || nextIndex >= STEP_VALUES.length) return;
        setActiveStep(STEP_VALUES[nextIndex]);
    }

    function addPendingFiles(files: File[]) {
        if (files.length === 0) return;

        setPendingImages((current) => {
            const hasCover = current.some((image) => image.isCover) || existingImages.some((image) => image.is_cover);
            const mapped = files.map((file, index) => ({
                id: `${file.name}-${file.size}-${Date.now()}-${index}`,
                file,
                preview: URL.createObjectURL(file),
                isCover: !hasCover && index === 0,
            }));
            return [...current, ...mapped];
        });
    }

    function removePendingFile(id: string) {
        setPendingImages((current) => {
            const target = current.find((item) => item.id === id);
            if (target) URL.revokeObjectURL(target.preview);
            return current.filter((item) => item.id !== id);
        });
    }

    function setPendingCover(id: string) {
        setPendingImages((current) =>
            current.map((image) => ({
                ...image,
                isCover: image.id === id,
            }))
        );
    }

    function movePending(id: string, direction: "up" | "down") {
        setPendingImages((current) => {
            const index = current.findIndex((image) => image.id === id);
            if (index < 0) return current;

            const targetIndex = direction === "up" ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= current.length) return current;

            const clone = [...current];
            [clone[index], clone[targetIndex]] = [clone[targetIndex], clone[index]];
            return clone;
        });
    }

    async function handleDeleteExisting(imageId: number) {
        if (!initialData?.id) return;
        await deletePropertyImage(initialData.id, imageId);
        setExistingImages((current) => current.filter((image) => image.id !== imageId));
    }

    async function handleSetExistingCover(imageId: number) {
        if (!initialData?.id) return;
        await setPropertyCoverImage(initialData.id, imageId);
        setExistingImages((current) =>
            current.map((image) => ({ ...image, is_cover: image.id === imageId }))
        );
    }

    async function handleReorderExisting(imageId: number, direction: "up" | "down") {
        if (!initialData?.id) return;

        const ordered = [...existingImages].sort((a, b) => a.order - b.order);
        const currentIndex = ordered.findIndex((image) => image.id === imageId);
        if (currentIndex < 0) return;

        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= ordered.length) return;

        [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];

        await reorderPropertyImages(
            initialData.id,
            ordered.map((image) => image.id)
        );

        setExistingImages(
            ordered.map((image, index) => ({
                ...image,
                order: index + 1,
            }))
        );
    }

    async function onSubmit(values: PropertyFormValues) {
        try {
            const payload = {
                ...values,
                description: values.description || null,
                complement: values.complement || null,
                video_url: values.video_url || null,
                virtual_tour_url: values.virtual_tour_url || null,
                internal_notes: values.internal_notes || null,
                exclusive_right_expiration_date: values.exclusive_right_expiration_date || null,
                keys_location: values.keys_location || null,
            };

            const property = isEdit
                ? await updateMutation.mutateAsync(payload)
                : await createMutation.mutateAsync(payload);

            if (pendingImages.length > 0) {
                setIsUploadingImages(true);
                for (let index = 0; index < pendingImages.length; index += 1) {
                    const image = pendingImages[index];
                    await uploadPropertyImage(property.id, {
                        image: image.file,
                        is_cover: image.isCover,
                    });
                }
                setIsUploadingImages(false);
                pendingImages.forEach((image) => URL.revokeObjectURL(image.preview));
                setPendingImages([]);
            }

            toast.success(isEdit ? "Imóvel atualizado com sucesso!" : "Imóvel criado com sucesso!");
            router.push("/properties");
            router.refresh();
        } catch (error: any) {
            setIsUploadingImages(false);
            if (error.response?.status === 422 && error.response.data?.errors) {
                const serverErrors = error.response.data.errors as Record<string, string[]>;
                Object.entries(serverErrors).forEach(([key, messages]) => {
                    form.setError(key as keyof PropertyFormValues, {
                        type: "server",
                        message: messages[0],
                    });
                });
                toast.error("Verifique os campos destacados.");
                return;
            }

            toast.error(error.response?.data?.message ?? "Não foi possível salvar o imóvel.");
        }
    }

    if (isLoadingEnums || isLoadingFeatures) {
        return (
            <div className="border rounded-lg p-8 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Carregando dados do formulário...
            </div>
        );
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
                <Tabs value={activeStep} onValueChange={(value) => setActiveStep(value as (typeof STEP_VALUES)[number])}>
                    <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto gap-1 bg-transparent p-0">
                        {STEP_VALUES.map((step) => (
                            <TabsTrigger
                                key={step}
                                value={step}
                                className="border rounded-md px-3 py-2 text-xs md:text-sm"
                            >
                                {STEP_LABELS[step]}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="border rounded-lg p-5 md:p-6">
                        <TabsContent value="basic">
                            <BasicDataStep
                                propertyTypes={propertyTypes}
                                purposes={purposes}
                                statuses={statuses}
                            />
                        </TabsContent>
                        <TabsContent value="features">
                            <FeaturesStep featuresOptions={featuresOptions} />
                        </TabsContent>
                        <TabsContent value="values">
                            <ValuesStep />
                        </TabsContent>
                        <TabsContent value="location">
                            <LocationStep />
                        </TabsContent>
                        <TabsContent value="media">
                            <MediaStep
                                pendingImages={pendingImages}
                                existingImages={existingImages}
                                disabled={isLoading}
                                onFilesSelected={addPendingFiles}
                                onRemovePending={removePendingFile}
                                onSetPendingCover={setPendingCover}
                                onMovePending={movePending}
                                onDeleteExisting={handleDeleteExisting}
                                onSetExistingCover={handleSetExistingCover}
                                onReorderExisting={handleReorderExisting}
                            />
                        </TabsContent>
                        <TabsContent value="management">
                            <InternalManagementStep />
                        </TabsContent>
                    </div>
                </Tabs>

                <div className="flex items-center justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => moveStep("previous")}
                        disabled={currentStepIndex === 0 || isLoading}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Anterior
                    </Button>

                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => router.push("/properties")}>
                            Cancelar
                        </Button>
                        {currentStepIndex < STEP_VALUES.length - 1 ? (
                            <Button type="button" onClick={() => moveStep("next")} disabled={isLoading}>
                                Próxima
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        {isEdit ? "Salvar Alterações" : "Criar Imóvel"}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </FormProvider>
    );
}
