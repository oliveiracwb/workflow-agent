// Ollama Service - Comunicação com API do Ollama

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaResponse {
  models: OllamaModel[];
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  keep_alive?: string;
}

export interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  context?: number[];
}

class OllamaService {
  private baseUrl: string;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private currentModel: string | null = null;
  private isModelLoaded: boolean = false;
  private logCallback?: (message: string, type: 'info' | 'warning' | 'error') => void;

  constructor() {
    this.baseUrl = import.meta.env.VITE_WF_OLLAMA_ADDRESS || 'http://localhost:11434';
  }

  setLogCallback(callback: (message: string, type: 'info' | 'warning' | 'error') => void) {
    this.logCallback = callback;
  }

  private log(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    console.log(`[OllamaService] ${message}`);
    if (this.logCallback) {
      this.logCallback(message, type);
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Erro ao conectar com Ollama: ${response.status}`);
      }
      
      const data: OllamaResponse = await response.json();
      return data.models.map(model => model.name);
    } catch (error) {
      console.error('Erro ao buscar modelos do Ollama:', error);
      throw new Error('Não foi possível conectar com o Ollama. Verifique se está rodando na porta 11434.');
    }
  }

  async generateResponse(
    model: string, 
    systemPrompt: string, 
    userPrompt: string, 
    outputFormat?: string
  ): Promise<string> {
    try {
      // Pré-carrega o modelo se necessário
      await this.preloadModel(model);
      console.log('OllamaService: Iniciando geração de resposta', { model, systemPrompt, userPrompt, outputFormat });
      
      let fullPrompt = '';
      
      if (systemPrompt) {
        fullPrompt += `Sistema: ${systemPrompt}\n\n`;
      }
      
      if (userPrompt) {
        fullPrompt += `Usuário: ${userPrompt}\n\n`;
      }
      
      if (outputFormat) {
        fullPrompt += `Formato de saída esperado: ${outputFormat}\n\n`;
      }

      const request: OllamaGenerateRequest = {
        model,
        prompt: fullPrompt,
        stream: false,
        keep_alive: '5m' // Mantém o modelo na memória
      };

      console.log('OllamaService: Enviando requisição para', `${this.baseUrl}/api/generate`);
      console.log('OllamaService: Request body:', request);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      console.log('OllamaService: Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Erro na geração: ${response.status} - ${response.statusText}`);
      }

      const data: OllamaGenerateResponse = await response.json();
      console.log('OllamaService: Response data:', data);
      
      return data.response;
    } catch (error) {
      console.error('OllamaService: Erro ao gerar resposta:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async preloadModel(model: string): Promise<void> {
    if (this.currentModel === model && this.isModelLoaded) {
      this.log(`Modelo ${model} já está carregado na VRAM`);
      return;
    }
    this.log(`Iniciando pré-carregamento do modelo ${model}...`);
    this.isModelLoaded = false;
    this.currentModel = model;
    try {
      const request: OllamaGenerateRequest = {
        model,
        prompt: 'Hello',
        stream: false,
        keep_alive: '5m'
      };
      this.log(`Carregando modelo ${model} na VRAM...`);
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });
      if (!response.ok) {
        throw new Error(`Erro ao pré-carregar modelo: ${response.status}`);
      }
      await response.json();
      this.isModelLoaded = true;
      this.log(`Modelo ${model} carregado com sucesso na VRAM`);
      this.startKeepAlive(model);
    } catch (error) {
      this.log(`Erro ao pré-carregar modelo ${model}: ${(error as Error).message}`, 'error');
      throw error;
    }
  }

  private startKeepAlive(model: string) {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    this.keepAliveInterval = setInterval(async () => {
      try {
        this.log(`Executando keep-alive para modelo ${model}...`);
        const request: OllamaGenerateRequest = {
          model,
          prompt: 'ping',
          stream: false,
          keep_alive: '5m'
        };
        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request)
        });
        if (response.ok) {
          this.log(`Keep-alive executado com sucesso para ${model}`);
        } else {
          this.log(`Falha no keep-alive para ${model}: ${response.status}`, 'warning');
        }
      } catch (error) {
        this.log(`Erro no keep-alive para ${model}: ${(error as Error).message}`, 'warning');
      }
    }, 3 * 60 * 1000);
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      this.log('Keep-alive interrompido');
    }
  }
}

export const ollamaService = new OllamaService(); 