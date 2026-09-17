# FGF Snap

Os arquivos desta pasta são os elementos visuais da experiência `/snap`.

- `poses/`: PNGs transparentes das poses e versões temáticas do mascote que aparecem sobre a foto.
- `frames/`: molduras transparentes para cada modo visual.

O registro de quais assets estão disponíveis fica em `src/data/snap.ts`. As PNGs são
carregadas como transparência real e a composição remove automaticamente o excesso
de área transparente para o mascote ficar bem aproveitado no Story e no Post.
Para trocar uma pose ou uma moldura, substitua o arquivo mantendo o nome; para
adicionar uma nova opção, inclua o asset e uma entrada no registro, sem alterar a
composição da tela.
