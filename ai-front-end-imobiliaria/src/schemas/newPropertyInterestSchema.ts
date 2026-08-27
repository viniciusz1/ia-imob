import { z } from "zod";

import { NEW_PROPERTY_INTENDED_USES } from "@/types/newProperties";

export const newPropertyInterestSchema = z.object({
  intended_uses: z
    .array(z.enum(NEW_PROPERTY_INTENDED_USES))
    .min(1, "Selecione pelo menos uma forma de uso."),
  notes: z
    .string()
    .trim()
    .max(1000, "Conte em até 1.000 caracteres."),
});

export type NewPropertyInterestFormValues = z.infer<typeof newPropertyInterestSchema>;
