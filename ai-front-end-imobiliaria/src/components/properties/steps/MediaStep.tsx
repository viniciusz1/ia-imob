"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PropertyFormValues } from "@/schemas/propertySchema";
import type { PropertyImage } from "@/types/property";

export interface PendingImage {
    id: string;
    file: File;
    preview: string;
    isCover: boolean;
}

interface MediaStepProps {
    pendingImages: PendingImage[];
    existingImages: PropertyImage[];
    disabled?: boolean;
    onFilesSelected: (files: File[]) => void;
    onRemovePending: (id: string) => void;
    onSetPendingCover: (id: string) => void;
    onMovePending: (id: string, direction: "up" | "down") => void;
    onDeleteExisting: (imageId: number) => Promise<void>;
    onSetExistingCover: (imageId: number) => Promise<void>;
    onReorderExisting: (imageId: number, direction: "up" | "down") => Promise<void>;
}

interface ImageTileProps {
    src: string;
    alt: string;
    caption?: string;
    isCover: boolean;
    isPending?: boolean;
    onSetCover: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
}

function ImageTile({
    src,
    alt,
    caption,
    isCover,
    isPending,
    onSetCover,
    onMoveUp,
    onMoveDown,
    onRemove,
}: ImageTileProps) {
    return (
        <div className="overflow-hidden rounded-lg border">
            <div className="relative">
                <img
                    src={src}
                    alt={alt}
                    className="aspect-[4/3] w-full object-cover"
                />
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {isCover && <Badge>Capa</Badge>}
                    {isPending && <Badge variant="warning">Aguardando envio</Badge>}
                </div>
            </div>
            {caption && (
                <p className="truncate px-3 pt-2 text-xs text-muted-foreground" title={caption}>
                    {caption}
                </p>
            )}
            <div className="flex items-center justify-between gap-2 p-2">
                <Button
                    type="button"
                    size="xs"
                    variant={isCover ? "default" : "outline"}
                    onClick={onSetCover}
                >
                    <Star />
                    {isCover ? "Capa" : "Definir capa"}
                </Button>
                <div className="flex items-center gap-0.5">
                    <Button
                        aria-label="Mover para cima"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={onMoveUp}
                        size="icon-sm"
                        title="Mover para cima"
                        type="button"
                        variant="ghost"
                    >
                        <ArrowUp />
                    </Button>
                    <Button
                        aria-label="Mover para baixo"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={onMoveDown}
                        size="icon-sm"
                        title="Mover para baixo"
                        type="button"
                        variant="ghost"
                    >
                        <ArrowDown />
                    </Button>
                    <Button
                        aria-label="Remover imagem"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={onRemove}
                        size="icon-sm"
                        title="Remover imagem"
                        type="button"
                        variant="ghost"
                    >
                        <Trash2 />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function MediaStep({
    pendingImages,
    existingImages,
    disabled,
    onFilesSelected,
    onRemovePending,
    onSetPendingCover,
    onMovePending,
    onDeleteExisting,
    onSetExistingCover,
    onReorderExisting,
}: MediaStepProps) {
    const {
        register,
        formState: { errors },
    } = useFormContext<PropertyFormValues>();
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const sortedExisting = [...existingImages].sort((a, b) => a.order - b.order);
    const totalImages = sortedExisting.length + pendingImages.length;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="border-b">
                    <CardTitle>Fotos</CardTitle>
                    <CardDescription>Envie as imagens do anúncio e escolha a capa.</CardDescription>
                    <CardAction>
                        <Badge className="tabular-nums" variant={totalImages > 0 ? "info" : "muted"}>
                            {totalImages} {totalImages === 1 ? "imagem" : "imagens"}
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div
                        className={cn(
                            "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                            isDragOver ? "border-primary bg-primary/5" : "border-border",
                        )}
                        onDragOver={(event) => {
                            event.preventDefault();
                            setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(event) => {
                            event.preventDefault();
                            setIsDragOver(false);
                            const files = Array.from(event.dataTransfer.files).filter((file) =>
                                file.type.startsWith("image/")
                            );
                            onFilesSelected(files);
                        }}
                    >
                        <Input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                                const files = Array.from(event.target.files ?? []);
                                onFilesSelected(files);
                                event.currentTarget.value = "";
                            }}
                        />

                        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Upload className="size-5" />
                        </div>
                        <p className="text-sm text-foreground">Arraste imagens para cá</p>
                        <p className="mt-1 text-xs text-muted-foreground">ou</p>
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-3"
                            onClick={() => inputRef.current?.click()}
                            disabled={disabled}
                        >
                            <ImagePlus />
                            Selecionar Arquivos
                        </Button>
                    </div>

                    {sortedExisting.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Imagens atuais</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {sortedExisting.map((image) => (
                                    <ImageTile
                                        alt="Imagem do imóvel"
                                        isCover={image.is_cover}
                                        key={image.id}
                                        onMoveDown={() => onReorderExisting(image.id, "down")}
                                        onMoveUp={() => onReorderExisting(image.id, "up")}
                                        onRemove={() => onDeleteExisting(image.id)}
                                        onSetCover={() => onSetExistingCover(image.id)}
                                        src={image.url}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {pendingImages.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs uppercase tracking-wide text-muted-foreground">
                                Imagens pendentes de upload
                            </h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {pendingImages.map((image) => (
                                    <ImageTile
                                        alt={image.file.name}
                                        caption={image.file.name}
                                        isCover={image.isCover}
                                        isPending
                                        key={image.id}
                                        onMoveDown={() => onMovePending(image.id, "down")}
                                        onMoveUp={() => onMovePending(image.id, "up")}
                                        onRemove={() => onRemovePending(image.id)}
                                        onSetCover={() => onSetPendingCover(image.id)}
                                        src={image.preview}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b">
                    <CardTitle>Vídeo e tour virtual</CardTitle>
                    <CardDescription>Links exibidos na página do imóvel.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormField error={errors.video_url?.message} htmlFor="video_url" label="Vídeo do YouTube">
                        <Input
                            aria-invalid={!!errors.video_url}
                            id="video_url"
                            placeholder="https://youtube.com/..."
                            {...register("video_url")}
                        />
                    </FormField>
                    <FormField error={errors.virtual_tour_url?.message} htmlFor="virtual_tour_url" label="Tour Virtual 360">
                        <Input
                            aria-invalid={!!errors.virtual_tour_url}
                            id="virtual_tour_url"
                            placeholder="https://..."
                            {...register("virtual_tour_url")}
                        />
                    </FormField>
                </CardContent>
            </Card>
        </div>
    );
}
