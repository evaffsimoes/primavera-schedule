# Festival Schedule

Agenda web para marcar concertos por festival e dia, detetar conflitos de horários e partilhar escolhas com amigos.

## Executar

Abra a pasta do projeto no VS Code e execute `index.html` com a extensão Live Server. A aplicação usa módulos JavaScript no browser, por isso não deve ser aberta diretamente como ficheiro (`file://`).

## Adicionar festivais e artistas

Os dados ficam em `js/festival-data.js`, separados da interface e da ligação ao Firebase.

1. Duplique a entrada de um festival dentro de `festivals`.
2. Dê-lhe um identificador único e preencha `name`, `location` e `stages`.
3. Em `days`, crie uma lista para cada dia. Cada concerto com horário segue o formato `[horaInicio, horaFim, palco, artista]`, usando horas `HH:MM`.
4. Em `artistsWithoutSchedule`, adicione os artistas anunciados mas ainda sem horário, organizados pelo mesmo nome de dia. Esses artistas podem ser selecionados e partilhados com o grupo; não entram no cálculo de conflitos até terem horários.

Exemplo:

```js
export const festivals = {
  "festival-exemplo": {
    name: "Festival Exemplo",
    location: "Lisboa",
    stages: ["Palco Principal", "Palco 2"],
    days: {
      "12 august": [
        ["18:00", "19:00", "Palco Principal", "Artista com horário"]
      ]
    },
    artistsWithoutSchedule: {
      "12 august": ["Artista anunciado"]
    }
  }
};
```

Quando saírem os horários, mova o artista para `days` com início, fim e palco. Cada festival guarda as suas seleções separadamente.

## Partilhar com amigos

Os grupos usam Firebase Firestore. A configuração do projeto está em `js/firebase.js`. Para partilhar agendas em produção, confirme que o Firestore está ativado e configurado com regras de acesso apropriadas; a configuração do browser não substitui regras de segurança.

## Ligar a um repositório GitHub

Na pasta do projeto, abra o terminal do VS Code. Crie primeiro um repositório vazio no GitHub e, depois, execute:

```bash
git init
git add .
git commit -m "Initial festival schedule"
git branch -M main
git remote add origin https://github.com/SEU_UTILIZADOR/NOME_DO_REPOSITORIO.git
git push -u origin main
```

Substitua o URL de exemplo pelo URL HTTPS do seu repositório. Para alterações seguintes:

```bash
git add .
git commit -m "Describe your changes"
git push
```
