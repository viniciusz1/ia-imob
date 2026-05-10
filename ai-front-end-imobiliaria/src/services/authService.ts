import api, { API_PREFIX } from "./api";
import { LoginFormData } from "../schemas/authSchemas";

export const authService = {
    /**
     * Requisita o cookie CSRF de inicialização do Sanctum
     */
    async csrfCookie() {
        return api.get("/sanctum/csrf-cookie");
    },

    /**
     * Efetua o login no endpoint principal
     */
    async login(data: LoginFormData) {
        // Assegura que o cookie CSRF está presente antes da requisição POST
        await this.csrfCookie();
        return api.post(`${API_PREFIX}/login`, data);
    },

    /**
     * Efetua o logout revogando a sessão no backend
     */
    async logout() {
        return api.post(`${API_PREFIX}/logout`);
    },

    /**
     * Recupera os dados do usuário autenticado no momento
     */
    async getUser() {
        return api.get(`${API_PREFIX}/user`);
    }
};
