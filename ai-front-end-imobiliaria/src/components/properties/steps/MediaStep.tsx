"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

    return (
        <section className="space-y-6">
            <div className="space-y-2">
                <Label>Upload de Imagens</Label>
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
                        }`}
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

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                        <Upload className="h-5 w-5" />
                    </div>
                    <p className="font-medium">Arraste imagens para cá</p>
                    <p className="text-sm text-muted-foreground mt-1">ou</p>
                    <Button
                        type="button"
                        variant="outline"
                        className="mt-3"
                        onClick={() => inputRef.current?.click()}
                        disabled={disabled}
                    >
                        <ImagePlus className="h-4 w-4 mr-2" />
                        Selecionar Arquivos
                    </Button>
                </div>
            </div>

            {sortedExisting.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-medium">Imagens atuais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sortedExisting.map((image) => (
                            <div key={image.id} className="border rounded-md p-3 space-y-3">
                                <img
                                    src={image.url}
                                    alt="Imagem do imóvel"
                                    className="w-full h-40 object-cover rounded-md"
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={image.is_cover ? "default" : "outline"}
                                        onClick={() => onSetExistingCover(image.id)}
                                    >
                                        <Star className="h-4 w-4 mr-1" />
                                        {image.is_cover ? "Capa" : "Definir capa"}
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => onReorderExisting(image.id, "up")}>
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => onReorderExisting(image.id, "down")}>
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" size="sm" variant="destructive" onClick={() => onDeleteExisting(image.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {pendingImages.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-medium">Imagens pendentes de upload</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pendingImages.map((image) => (
                            <div key={image.id} className="border rounded-md p-3 space-y-3">
                                <img
                                    src={image.preview}
                                    alt={image.file.name}
                                    className="w-full h-40 object-cover rounded-md"
                                />
                                <p className="text-sm truncate" title={image.file.name}>
                                    {image.file.name}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={image.isCover ? "default" : "outline"}
                                        onClick={() => onSetPendingCover(image.id)}
                                    >
                                        <Star className="h-4 w-4 mr-1" />
                                        {image.isCover ? "Capa" : "Definir capa"}
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => onMovePending(image.id, "up")}>
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => onMovePending(image.id, "down")}>
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" size="sm" variant="destructive" onClick={() => onRemovePending(image.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="video_url">Vídeo do YouTube</Label>
                    <Input id="video_url" placeholder="https://youtube.com/..." {...register("video_url")} />
                    {errors.video_url && <p className="text-sm text-red-500">{errors.video_url.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="virtual_tour_url">Tour Virtual 360</Label>
                    <Input
                        id="virtual_tour_url"
                        placeholder="https://..."
                        {...register("virtual_tour_url")}
                    />
                    {errors.virtual_tour_url && (
                        <p className="text-sm text-red-500">{errors.virtual_tour_url.message}</p>
                    )}
                </div>
            </div>
        </section>
    );
}

