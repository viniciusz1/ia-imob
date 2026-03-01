import { Metadata } from "next";
import { LoginForm } from "../../../components/features/auth/LoginForm";

export const metadata: Metadata = {
    title: "Login | Painel Imobiliária",
    description: "Faça login para acessar suas informações.",
};

export default function LoginPage() {
    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <LoginForm />
        </div>
    );
}
