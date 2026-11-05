"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Save } from "lucide-react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { propertySchema, type PropertyFormValues } from "@/schemas/propertySchema";
import {
    STEP_LABELS,
    STEP_VALUES,
    canReachStep,
    issuesByStep,
    type PropertyFormInput,
    type PropertyStep,
} from "@/components/properties/propertyStepValidation";
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

function toNullableText(value: string | null | undefined): string {
    return value ?? "";
}

/** The API serialises decimals as text ("550000.00"); the form works with numbers. */
function toNullableNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function toCount(value: number | string | null | undefined): number {
    return toNullableNumber(value) ?? 0;
}

/**
 * Counts the user must inform: empty on a new property (so nothing is saved
 * with a silent 0), the stored value when editing.
 */
function toRequiredCount(property: Property | null | undefined, value: number | string | null | undefined): number | null {
    return property ? toCount(value) : null;
}

function getDefaultValues(property?: Property | null): PropertyFormInput {
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
        latitude: toNullableNumber(property?.latitude),
        longitude: toNullableNumber(property?.longitude),
        show_exact_address: property?.show_exact_address ?? false,
        sale_price: toNullableNumber(property?.sale_price),
        rent_price: toNullableNumber(property?.rent_price),
        property_tax: toNullableNumber(property?.property_tax),
        condo_fee: toNullableNumber(property?.condo_fee),
        accepts_financing: property?.accepts_financing ?? false,
        accepts_exchange: property?.accepts_exchange ?? false,
        show_price: property?.show_price ?? true,
        usable_area: toNullableNumber(property?.usable_area),
        total_area: toNullableNumber(property?.total_area),
        bedrooms: toRequiredCount(property, property?.bedrooms),
        suites: toCount(property?.suites),
        bathrooms: toRequiredCount(property, property?.bathrooms),
        garage_spaces: toRequiredCount(property, property?.garage_spaces),
        floor_number: toNullableNumber(property?.floor_number),
        total_floors: toNullableNumber(property?.total_floors),
        build_year: toNullableNumber(property?.build_year),
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
    const [activeStep, setActiveStep] = useState<PropertyStep>("basic");
    const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
    const [existingImages, setExistingImages] = useState(initialData?.images ?? []);
    const [syncedInitialData, setSyncedInitialData] = useState(initialData);
    const [isUploadingImages, setIsUploadingImages] = useState(false);

    const createMutation = useCreateProperty();
    const updateMutation = useUpdateProperty(initialData?.id ?? 0);
    const { data: systemEnums = [], isLoading: isLoadingEnums } = useSystemEnums();
    const { data: featuresOptions = [], isLoading: isLoadingFeatures } = useGetFeatures();

    const form = useForm<PropertyFormInput, unknown, PropertyFormValues>({
        resolver: zodResolver(propertySchema),
        defaultValues: getDefaultValues(initialData),
        // Validate while the user works: a field shows its error once it has
        // been left, and from then on it re-checks on every keystroke.
        mode: "onTouched",
        reValidateMode: "onChange",
    });

    // Reset the image list when a different property is loaded (adjusting state while rendering).
    if (syncedInitialData !== initialData) {
        setSyncedInitialData(initialData);
        setExistingImages(initialData?.images ?? []);
    }

    useEffect(() => {
        form.reset(getDefaultValues(initialData));
    }, [form, initialData]);

    const propertyTypes = useMemo(
        () => extractEnumData(systemEnums, "property_types"),
        [systemEnums]
    );
    const purposes = useMemo(() => extractEnumData(systemEnums, "property_purposes"), [systemEnums]);
    const statuses = useMemo(() => extractEnumData(systemEnums, "property_statuses"), [systemEnums]);

    const currentStepIndex = STEP_VALUES.indexOf(activeStep);
    const isLoading = createMutation.isPending || updateMutation.isPending || isUploadingImages;

    // Same schema as the submit, checked live and grouped by step: it gates
    // "Próxima", the final save and jumping ahead through the stepper, without
    // painting errors on fields the user has not touched yet.
    const watchedValues = useWatch({ control: form.control });
    const stepIssues = useMemo(() => issuesByStep(watchedValues as PropertyFormInput), [watchedValues]);
    const isLastStep = currentStepIndex === STEP_VALUES.length - 1;
    const currentStepMissing = stepIssues[activeStep];
    const stepsToReview = STEP_VALUES.filter((step) => stepIssues[step].length > 0);
    const canGoNext = currentStepMissing.length === 0;
    const canSave = stepsToReview.length === 0;
    const gateHint = isLastStep
        ? canSave
            ? null
            : `Revise as etapas: ${stepsToReview.map((step) => STEP_LABELS[step]).join(", ")}`
        : canGoNext
            ? null
            : `Campos pendentes: ${currentStepMissing.join(", ")}`;

    function moveStep(direction: "next" | "previous") {
        const index = STEP_VALUES.indexOf(activeStep);
        const nextIndex = direction === "next" ? index + 1 : index - 1;
        if (nextIndex < 0 || nextIndex >= STEP_VALUES.length) return;
        if (direction === "next" && !canGoNext) return;
        setActiveStep(STEP_VALUES[nextIndex]);
    }

    function goToStep(step: PropertyStep) {
        // Going back is always allowed; going ahead only past completed steps.
        if (STEP_VALUES.indexOf(step) > currentStepIndex && !canReachStep(stepIssues, step)) return;
        setActiveStep(step);
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
        } catch (error: unknown) {
            setIsUploadingImages(false);
            const response = isAxiosError<{ errors?: Record<string, string[]>; message?: string }>(error)
                ? error.response
                : undefined;
            if (response?.status === 422 && response.data?.errors) {
                const serverErrors = response.data.errors;
                Object.entries(serverErrors).forEach(([key, messages]) => {
                    form.setError(key as keyof PropertyFormValues, {
                        type: "server",
                        message: messages[0],
                    });
                });
                toast.error("Verifique os campos destacados.");
                return;
            }

            toast.error(response?.data?.message ?? "Não foi possível salvar o imóvel.");
        }
    }

    if (isLoadingEnums || isLoadingFeatures) {
        return (
            <Card className="flex-row items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Carregando dados do formulário...
            </Card>
        );
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs
                    className="gap-6"
                    value={activeStep}
                    onValueChange={(value) => goToStep(value as PropertyStep)}
                >
                    {/* Stepper: same Radix tabs (roles, keyboard, handlers), drawn as numbered steps.
                        It stays pinned to the top of the content area while the step scrolls. */}
                    <div className="sticky -top-4 z-20 -mt-6 bg-background pt-6 sm:-top-6 lg:-top-8">
                    <Card className="gap-0 py-0 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.45)]">
                        <TabsPrimitive.List
                            aria-label="Etapas do cadastro"
                            className="flex items-center overflow-x-auto px-6 py-5 sm:px-8"
                        >
                            {STEP_VALUES.map((step, index) => {
                                const stepState =
                                    index === currentStepIndex ? "current" : index < currentStepIndex ? "done" : "upcoming";
                                const locked = index > currentStepIndex && !canReachStep(stepIssues, step);

                                return (
                                    <Fragment key={step}>
                                        {index > 0 && (
                                            <span
                                                aria-hidden="true"
                                                className={cn(
                                                    "mx-3 h-0.5 min-w-6 flex-1 rounded-full",
                                                    index <= currentStepIndex ? "bg-primary/70" : "bg-border",
                                                )}
                                            />
                                        )}
                                        <TabsPrimitive.Trigger
                                            aria-disabled={locked || undefined}
                                            className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg py-1 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
                                            disabled={locked}
                                            title={locked ? "Conclua as etapas anteriores para avançar" : undefined}
                                            value={step}
                                        >
                                            <span
                                                className={cn(
                                                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors",
                                                    stepState === "current" && "bg-primary text-primary-foreground",
                                                    stepState === "done" && "border-2 border-primary text-primary",
                                                    stepState === "upcoming" && "bg-secondary text-muted-foreground",
                                                )}
                                            >
                                                {stepState === "done" ? (
                                                    <>
                                                        <Check aria-hidden="true" className="size-4" strokeWidth={3} />
                                                        <span className="sr-only">{index + 1}</span>
                                                    </>
                                                ) : (
                                                    index + 1
                                                )}
                                            </span>
                                            <span
                                                className={cn(
                                                    "text-sm font-semibold whitespace-nowrap transition-colors",
                                                    stepState === "upcoming" ? "text-muted-foreground" : "text-foreground",
                                                )}
                                            >
                                                {STEP_LABELS[step]}
                                            </span>
                                        </TabsPrimitive.Trigger>
                                    </Fragment>
                                );
                            })}
                        </TabsPrimitive.List>
                    </Card>
                    </div>

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
                </Tabs>

                <Card className="flex-row flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-8">
                    <div className="flex items-center gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => moveStep("previous")}
                            disabled={currentStepIndex === 0 || isLoading}
                        >
                            <ArrowLeft />
                            Anterior
                        </Button>
                        <span className="text-sm font-semibold text-subtle tabular-nums">
                            Etapa {currentStepIndex + 1} de {STEP_VALUES.length}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        {gateHint && (
                            <p className="max-w-md text-[0.8125rem] leading-4 text-subtle" id="property-step-gate">
                                {gateHint}
                            </p>
                        )}
                        <Button type="button" variant="outline" onClick={() => router.push("/properties")}>
                            Cancelar
                        </Button>
                        {/* Distinct keys: otherwise React reuses the same <button> and only
                            flips type="button" to "submit" while handling the click on the
                            penultimate step, so the browser submits the form and the property
                            is saved before the last step is ever shown. */}
                        {!isLastStep ? (
                            <Button
                                aria-describedby={gateHint ? "property-step-gate" : undefined}
                                key="next-step"
                                type="button"
                                onClick={(event) => {
                                    event.preventDefault();
                                    moveStep("next");
                                }}
                                disabled={isLoading || !canGoNext}
                            >
                                Próxima
                                <ArrowRight />
                            </Button>
                        ) : (
                            <Button
                                aria-describedby={gateHint ? "property-step-gate" : undefined}
                                key="submit-property"
                                type="submit"
                                disabled={isLoading || !canSave}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save />
                                        {isEdit ? "Salvar Alterações" : "Criar Imóvel"}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </Card>
            </form>
        </FormProvider>
    );
}
