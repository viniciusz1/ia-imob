import { z } from "zod";

export const loginSchema = z.object({
    login: z.string().min(1, "O usuário ou e-mail é obrigatório"),
    password: z.string().min(1, "A senha é obrigatória"),
    remember: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
