# Arquitetura de Frontend: Cadastro de Imóveis (Properties)

## 1. Visão Geral
Este documento define a implementação do módulo de **Cadastro de Imóveis** no Frontend Web (Next.js, React Hook Form, TailwindCSS). O objetivo é fornecer uma interface rica e intuitiva para que corretores e administradores possam gerenciar o portfólio de imóveis da imobiliária.

---

## 2. Formulário de Cadastro (Multi-step)
Devido à grande quantidade de informações exigidas no setor imobiliário, o formulário de criação e edição deverá ser estruturado em **Abas (Tabs)** ou em um formato **Passo a Passo (Wizard)**. Isso evita que o usuário se sinta sobrecarregado.

**Etapas e Organização de Campos Sugeridas:**
1. **Dados Básicos:** Código de Referência, Título Atrativo, Descrição, Tipo de Imóvel, Finalidade, Status.
2. **Características:** Área útil/privativa, Área Total, Quartos, Suítes, Banheiros, Vagas de Automóvel, Andar do Imóvel, Total de Andares do Prédio, Ano de Construção, Múltipla escolha de Comodidades (Features como Piscina, Academia, etc enviando IDs numéricos no array).
3. **Valores:** Valor de Venda, Valor de Locação, Valor IPTU, Valor do Condomínio, Switches para "Aceita Financiamento", "Estuda Permuta" e "Ocultar Preço no Site".
4. **Localização:** Busca de CEP integrada (ViaCEP/BrasilAPI), Endereço, Número, Complemento, Bairro, Cidade, Estado. Captura implícita de Latitude e Longitude (usando Maps SDK ou equivalente via CEP) e opção de "Ocultar endereço exato no site".
5. **Mídias Exclusivas:** Upload de Fotos (Interface Drag and Drop), Links de Vídeo YouTube, Link para Tour Virtual 360. Funcionalidade para reordenar fotos e definir a "Capa".
6. **Gestão Interna (Apenas para Administrador ou Dono):** Corretor Captador responsável (Input de busca de usuários), Proprietário do Imóvel (Input de busca de clientes), Status de Publicação ("Visível no Site"), Imóvel em Destaque, Contrato de Exclusividade, Data de Vencimento, Localização das Chaves e Notas Internas.

---

## 3. Gestão de Domínios Dinâmicos (Enums)
O frontend não deve conter listas fixas (*hardcoded*) no código-fonte para selects críticos do sistema. Os dados destes campos devem ser alimentados dinamicamente via tabela `system_enums`.

### 3.1 Fetch de Enums com React Query
Durante a montagem do formulário (ou globalmente no contexto da aplicação), o frontend fará uma requisição para a API para buscar os arrays de dados JSON que irão estruturar os *Selects* e *Radios*.

**Campos alimentados pelo Enum:**
- Tipo de Imóvel (`property_type` -> `property_types`)
- Finalidade (`purpose` -> `property_purposes`)
- Status (`status` -> `property_statuses`)

**Exemplo de Hook (TanStack React Query):**
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export function useSystemEnums() {
  return useQuery({
    queryKey: ['system-enums'],
    queryFn: async () => {
      const { data } = await api.get('/enums');
      return data; // Array com objetos contendo { tag, data: [{value, label}] }
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 horas - Caching agressivo para dados que não mudam
  });
}
```

---

## 4. Gerenciamento de Estado e Validação
- **React Hook Form**: Envolverá todo o construtor do formulário. Recomenda-se a adoção de salvamento e validação única no envio final (submit), ou rascunho.
- **Zod Schema**: Garantir que as validações contemplem exatamente as obrigatoriedades do backend. Por exemplo, se `has_exclusive_right` for marcado como `true`, então `exclusive_right_expiration_date` torna-se obrigatório no Zod.

```typescript
const propertySchema = z.object({
  title: z.string().min(5, 'Título muito curto'),
  property_type: z.string().min(1, 'Selecione o tipo de imóvel'), // Validado com base no system_enums
  // ...
  features: z.array(z.number()).optional(), // Array de IDs das características associadas
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  floor_number: z.number().optional(),
  total_floors: z.number().optional(),
  broker_id: z.number().optional(), // Referencia usuário cadastrado
  owner_id: z.number().optional(), // Referencia cliente proprietário
  has_exclusive_right: z.boolean().default(false),
  exclusive_right_expiration_date: z.date().optional()
}).superRefine((data, ctx) => {
  if (data.has_exclusive_right && !data.exclusive_right_expiration_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Data de expiração é obrigatória quando há exclusividade.",
      path: ["exclusive_right_expiration_date"],
    });
  }
});
```

---

## 5. Interface de Imagens (Upload)
- Criar ou utilizar um componente de Droppable Area (Ex: `react-dropzone`).
- A listagem de miniaturas (*thumbnails*) deve mostrar o progresso do upload.
- Deve haver controle para **Apagar**, **Definir como Capa** e arrastar as cartas de fotos para definir a ordem (`order`).
- Fluxo de salvamento: O imóvel pode ser criado primeiro (obter o `id`) e, em seguida, as fotos são despachadas via endpoint isolado de armazenamento `POST /api/properties/{id}/images`. Se a conexão cair, a propriedade base já se encontrará salva.
