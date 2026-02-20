import { PageContainer } from "@/components/layout/page-container";

export const metadata = {
  title: "Termos de Uso | GPO Trader",
  description: "Termos de uso e aviso legal do GPO Trader.",
};

export default function TermsPage() {
  return (
    <main>
      <PageContainer maxWidth="md" className="space-y-8 py-12">
          <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">
            Termos de Uso
          </h1>

          <section className="space-y-4 text-sm text-slate-400">
            <h2 className="text-lg font-semibold text-slate-200">
              1. Sobre o serviço
            </h2>
            <p>
              O GPO Trader é uma plataforma de negociação assistida para o jogo
              Grand Piece Online (GPO). O serviço é oferecido &quot;como está&quot; e
              tem fins apenas informativos e de suporte à comunidade.
            </p>

            <h2 className="text-lg font-semibold text-slate-200">
              2. Não afiliação
            </h2>
            <p>
              <strong className="text-slate-300">
                GPO Trader não é afiliado, endossado, patrocinado ou de qualquer
                forma ligado à Roblox Corporation, à Grand Piece Online ou a
                seus criadores.
              </strong>{" "}
              Todas as marcas e direitos autorais mencionados são propriedade de
              seus respectivos donos. O uso de nomes e marcas é apenas para
              identificação e não implica endosso.
            </p>

            <h2 className="text-lg font-semibold text-slate-200">
              3. Proibição de RMT (Real Money Trading)
            </h2>
            <p>
              É expressamente proibido usar esta plataforma para negociar itens
              do jogo em troca de dinheiro real (RMT). O GPO Trader é apenas
              para troca de itens dentro do jogo, conforme as regras do jogo e
              da Roblox.
            </p>

            <h2 className="text-lg font-semibold text-slate-200">
              4. Uso e responsabilidade
            </h2>
            <p>
              Você é responsável por suas ações na plataforma e no jogo. Não
              nos responsabilizamos por golpes, perda de itens ou disputas entre
              usuários. A reputação no site é baseada em confirmações mútuas e
              não substitui a cautela nas trocas.
            </p>

            <h2 className="text-lg font-semibold text-slate-200">
              5. Alterações
            </h2>
            <p>
              Estes termos podem ser atualizados. O uso continuado do serviço
              após alterações constitui aceitação das novas condições.
            </p>
          </section>
      </PageContainer>
    </main>
  );
}
