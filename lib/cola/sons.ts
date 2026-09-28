"use client";

// Sons da Cola Digital, sintetizados na hora (sem arquivo de áudio):
// a tecla da urna eletrônica e o obturador de câmera.

const CHAVE_SILENCIO = "cola-som-desligado";

let contexto: AudioContext | null = null;
let ruido: AudioBuffer | null = null;

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!contexto) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      contexto = new Ctor();
    }
    // O navegador suspende o áudio até haver um toque do usuário
    if (contexto.state === "suspended") void contexto.resume();
    return contexto;
  } catch {
    return null;
  }
}

export function somDesligado(): boolean {
  try {
    return localStorage.getItem(CHAVE_SILENCIO) === "1";
  } catch {
    return false;
  }
}

export function definirSomDesligado(desligado: boolean): void {
  try {
    if (desligado) localStorage.setItem(CHAVE_SILENCIO, "1");
    else localStorage.removeItem(CHAVE_SILENCIO);
  } catch {
    // sem localStorage o som simplesmente volta ligado na próxima visita
  }
}

// Bipe curto e seco, como a tecla da urna eletrônica.
function bipe(frequencia: number, duracao: number, volume: number): void {
  const ctx = obterContexto();
  if (!ctx) return;

  const agora = ctx.currentTime;
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  const filtro = ctx.createBiquadFilter();

  osc.type = "square";
  osc.frequency.value = frequencia;
  filtro.type = "lowpass";
  filtro.frequency.value = 2600;

  ganho.gain.setValueAtTime(0, agora);
  ganho.gain.linearRampToValueAtTime(volume, agora + 0.004);
  ganho.gain.setValueAtTime(volume, agora + duracao * 0.7);
  ganho.gain.exponentialRampToValueAtTime(0.0001, agora + duracao);

  osc.connect(filtro);
  filtro.connect(ganho);
  ganho.connect(ctx.destination);
  osc.start(agora);
  osc.stop(agora + duracao + 0.02);
}

export function tocarTecla(): void {
  if (somDesligado()) return;
  bipe(1000, 0.08, 0.16);
}

// Bipe mais grave e um pouco mais longo: candidato encontrado.
export function tocarConfirma(): void {
  if (somDesligado()) return;
  bipe(760, 0.22, 0.14);
}

function bufferDeRuido(ctx: AudioContext): AudioBuffer {
  if (ruido) return ruido;
  const duracao = 0.04;
  const quadros = Math.floor(ctx.sampleRate * duracao);
  const buffer = ctx.createBuffer(1, quadros, ctx.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < quadros; i++) {
    // Estalo: ruído com queda bem rápida
    dados[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / quadros, 3);
  }
  ruido = buffer;
  return buffer;
}

function estalo(ctx: AudioContext, quando: number, volume: number): void {
  const fonte = ctx.createBufferSource();
  fonte.buffer = bufferDeRuido(ctx);

  const filtro = ctx.createBiquadFilter();
  filtro.type = "bandpass";
  filtro.frequency.value = 3200;
  filtro.Q.value = 0.9;

  const ganho = ctx.createGain();
  ganho.gain.value = volume;

  fonte.connect(filtro);
  filtro.connect(ganho);
  ganho.connect(ctx.destination);
  fonte.start(quando);
}

// Obturador de câmera: dois estalos, o segundo mais fraco.
export function tocarObturador(): void {
  if (somDesligado()) return;
  const ctx = obterContexto();
  if (!ctx) return;
  const agora = ctx.currentTime;
  estalo(ctx, agora, 0.5);
  estalo(ctx, agora + 0.085, 0.3);
}
