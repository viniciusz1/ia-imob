"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="container mx-auto py-12 flex justify-center items-center min-h-[50vh]">
            <Card className="w-full max-w-md border-red-200">
                <CardHeader className="bg-red-50 text-red-900 flex flex-row items-center gap-2 rounded-t-lg border-b border-red-100">
                    <AlertCircle className="h-5 w-5" />
                    <CardTitle>Erro de Conexão</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground">
                        Não foi possível carregar os dados dos usuários. Por favor, verifique se a API está online e tente novamente.
                    </p>
                    <div className="mt-4 p-4 bg-gray-50 rounded text-sm text-gray-500 overflow-auto break-all">
                        {error.message}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-4">
                    <Button onClick={() => reset()} variant="default">
                        Tentar novamente
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
