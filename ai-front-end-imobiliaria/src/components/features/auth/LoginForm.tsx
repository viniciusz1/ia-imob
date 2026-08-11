"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { loginSchema, type LoginFormData } from "../../../schemas/authSchemas";
import { authService } from "../../../services/authService";
import { markAuthenticatedSession } from "../../../services/authSessionCookie";
import { useAuthStore } from "../../../store/useAuthStore";
import { postLoginPath } from "../../../lib/permissions";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Checkbox } from "../../ui/checkbox";

export function LoginForm() {
    const router = useRouter();
    const { setUser } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            login: "",
            password: "",
            remember: false,
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            setIsLoading(true);
            await authService.login(data);

            // Após o login, buscamos o usuário
            const response = await authService.getUser();
            const userData = response.data.data ?? response.data;
            setUser(userData);
            markAuthenticatedSession(data.remember);

            toast.success("Login efetuado com sucesso!");
            router.push(postLoginPath(userData));
        } catch (error) {
            if (error instanceof AxiosError && error.response?.status === 422) {
                const backendErrors = error.response.data.errors;
                if (backendErrors) {
                    Object.keys(backendErrors).forEach((key) => {
                        setError(key as keyof LoginFormData, {
                            type: "server",
                            message: backendErrors[key][0],
                        });
                    });
                } else {
                    toast.error(error.response.data.message || "Credenciais inválidas.");
                }
            } else {
                toast.error("Ocorreu um erro ao conectar ao servidor.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full">
            {/* Duas versões da logo: o wordmark é escuro e some no tema
                escuro, então a variante clara entra no lugar */}
            <Image
                src="/prospectai-logo.png"
                alt="Prospectai"
                width={825}
                height={200}
                priority
                className="h-11 w-auto dark:hidden"
            />
            <Image
                src="/prospectai-logo-dark.png"
                alt="Prospectai"
                width={825}
                height={200}
                priority
                className="hidden h-11 w-auto dark:block"
            />

            <div className="mt-10 space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                    Acesse sua conta
                </h1>
                <p className="text-sm text-muted-foreground">
                    Use suas credenciais para entrar no painel.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                <div className="space-y-2">
                    <Label
                        htmlFor="login"
                        className={errors.login ? "text-destructive" : undefined}
                    >
                        Usuário ou E-mail
                    </Label>
                    <Input
                        id="login"
                        type="text"
                        autoComplete="username"
                        placeholder="usuario@exemplo.com"
                        {...register("login")}
                        aria-invalid={!!errors.login}
                        className="h-11"
                    />
                    {errors.login && (
                        <p className="text-sm font-medium text-destructive">
                            {errors.login.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label
                        htmlFor="password"
                        className={errors.password ? "text-destructive" : undefined}
                    >
                        Senha
                    </Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            {...register("password")}
                            aria-invalid={!!errors.password}
                            className="h-11 pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-2 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            {showPassword ? (
                                <EyeOff className="size-4" />
                            ) : (
                                <Eye className="size-4" />
                            )}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-sm font-medium text-destructive">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                    <Checkbox id="remember" {...register("remember")} />
                    <Label
                        htmlFor="remember"
                        className="cursor-pointer text-sm font-normal text-muted-foreground"
                    >
                        Lembrar-me deste dispositivo
                    </Label>
                </div>

                <Button
                    type="submit"
                    size="lg"
                    className="mt-2 h-11 w-full text-sm font-semibold"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Autenticando...
                        </>
                    ) : (
                        "Entrar no Sistema"
                    )}
                </Button>
            </form>
        </div>
    );
}
