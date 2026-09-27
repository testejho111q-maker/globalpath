# GlobalPath — versão independente (sem Base44)

App estilo Discord: servidores, canais de texto e de voz, chat em tempo real, chamadas com microfone, câmera e compartilhamento de tela, perfil com foto, convites por link, membros e configurações.

Tudo roda em um único servidor Node.js. Não precisa de Base44, Firebase nem banco externo — os dados ficam em `data/db.json`.

## Rodar no seu PC

1. Instale o **Node.js** (versão 18 ou mais nova): https://nodejs.org
2. Descompacte esta pasta, abra um terminal dentro dela e rode:
   ```
   npm install
   npm start
   ```
3. Abra **http://localhost:3000** no navegador.

Para testar com amigos na mesma rede Wi-Fi, eles acessam `http://SEU-IP:3000`. Mas o navegador **só libera microfone e câmera em https** (ou em localhost), então, para chamadas com amigos, publique online (abaixo).

## Publicar online de graça

### Opção A — Railway (recomendada, os dados não se perdem)
1. Suba esta pasta para um repositório no GitHub.
2. Em https://railway.app → **New Project → Deploy from GitHub repo** → escolha o repositório.
3. Em **Settings → Networking**, clique em **Generate Domain** para ganhar um link https.
4. Para não perder os dados quando o app reiniciar: **+ New → Volume**, monte em `/data` e adicione a variável `DATA_DIR=/data`.

### Opção B — Render
1. Suba a pasta para o GitHub.
2. Em https://render.com → **New → Blueprint** → escolha o repositório (o arquivo `render.yaml` já configura tudo).
3. Atenção: no plano grátis do Render o disco é temporário. Contas e mensagens **somem quando o app reinicia ou é atualizado**, e o app "dorme" depois de 15 minutos sem uso. Serve para testes; para uso sério, use a Railway com volume.

## Chamadas que não conectam
As chamadas são diretas entre os navegadores (WebRTC). Na maioria das redes funciona só com o servidor STUN do Google, que já vem configurado. Em algumas redes (4G de algumas operadoras, redes de empresa), é preciso um servidor **TURN**. Dá para criar um grátis em https://www.metered.ca/stun-turn e colocar na variável `ICE_SERVERS`, por exemplo:

```
ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:SEU-SERVIDOR:80","username":"USUARIO","credential":"SENHA"}]
```

## IA que monta o servidor
Sem configurar nada, o botão **Montar com IA** usa um assistente básico que entende palavras-chave (jogos, clã, RP, live, música, estudos…).
Para usar uma IA de verdade, crie uma chave e coloque no Render (**Environment → Add Environment Variable**):

- **Gemini (tem plano grátis):** crie a chave em https://aistudio.google.com/apikey e adicione `GEMINI_API_KEY` = sua chave.
- **Claude (pago):** crie a chave em https://console.anthropic.com e adicione `ANTHROPIC_API_KEY` = sua chave.

Opcional: `GEMINI_MODEL` ou `AI_MODEL` para escolher o modelo.

## O que tem no app
- Cadastro e login (e-mail e senha), troca de senha
- Perfil: nome de exibição e foto
- Servidores: nome, cor, ícone; convidar por link; gerar novo link; membros online/offline; remover membro; sair; excluir
- Canais de texto e de voz: criar, renomear, excluir (só o dono do servidor)
- Chat em tempo real com links clicáveis, excluir mensagem e carregar mensagens antigas
- Chamadas: microfone, silenciar áudio, câmera, compartilhar tela, tela cheia, indicador de quem está falando, lista de quem está na sala
- Voz e vídeo: escolher microfone, saída de áudio e câmera, testar microfone e câmera, cancelamento de eco e supressão de ruído
- Conversas privadas (mensagens diretas) com contador de não lidas
- Cargos com cores e permissões, categorias, canais privados e só leitura, modelo streamer
- IA que monta o servidor do seu jeito
- Teclas de atalho configuráveis (aperte `?` no site) e "apertar para falar"
- Funciona no celular (menu lateral)

## Estrutura
- `server.js` — servidor (login, API, banco, tempo real e sinalização das chamadas)
- `public/` — interface (`index.html`, `app.css`, `app.js`)
- `data/db.json` — banco de dados (criado automaticamente)

As chamadas ligam cada pessoa a todas as outras, então funcionam melhor com até 6–8 pessoas com câmera ligada.
