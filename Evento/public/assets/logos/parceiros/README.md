# Logos de parceiros

Coloque nesta pasta as logos oficiais dos patrocinadores e apoiadores do Family Game Festival.

Preferência: arquivos SVG com fundo transparente. PNG em alta resolução também funciona. A página `/patrocinadores` procura automaticamente os arquivos pelos nomes abaixo e mantém uma inicial como reserva enquanto a logo ainda não existir.

Arquivos esperados:

- `Family Games Festival.svg`, `family-games.svg` ou `family-games.png`
- `Edge 3D Studio.webp`, `edge-3d-studio.svg` ou `edge-3d-studio.png`
- `ALTERSTATE.png`, `alterstate.svg` ou `alterstate.png`
- `sorri-bauru.svg`, `sorri-bauru.png` ou `Sorri Bauru.png`

Os lojistas/expositores ficam em uma área própria. Para adicionar um novo lojista, inclua a logo nesta pasta e marque `merchant: true` no parceiro em `src/data/event.ts`. Para novos nomes, inclua também os candidatos de arquivo em `src/components/SponsorHierarchy.astro`.
