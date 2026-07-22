"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../ui/card";

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
        <Card className="w-full shadow-2xl border-white/10 bg-black/40 backdrop-blur-xl text-slate-100">
            <CardHeader className="space-y-2 text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center border border-primary/20">
                    <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" /></svg>
                </div>
                <CardTitle className="text-3xl font-bold tracking-tight text-white">Acesso ao Sistema</CardTitle>
                <CardDescription className="text-slate-400">
                    Insira suas credenciais para continuar.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="login" className={errors.login ? "text-red-400" : "text-slate-200"}>Usuário ou E-mail</Label>
                        <Input
                            id="login"
                            type="text"
                            placeholder="usuario@exemplo.com"
                            {...register("login")}
                            aria-invalid={!!errors.login}
                            className={`bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-primary ${errors.login ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        />
                        {errors.login && (
                            <p className="text-sm font-medium text-red-400">{errors.login.message}</p>
                        )}
                    </div>

                    <div className="space-y-2 relative">
                        <Label htmlFor="password" className={errors.password ? "text-red-400" : "text-slate-200"}>Senha</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                {...register("password")}
                                aria-invalid={!!errors.password}
                                className={`bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-primary pr-10 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-sm font-medium text-red-400">{errors.password.message}</p>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                        <Checkbox
                            id="remember"
                            className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            {...register("remember")}
                        />
                        <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-slate-300">
                            Lembrar-me deste dispositivo
                        </Label>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full text-md font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary),0.5)]"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Autenticando...
                            </>
                        ) : (
                            "Entrar no Sistema"
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
