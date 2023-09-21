const { ButtonStyle } = require('discord.js');
const Discord = require('discord.js');
const fs = require("fs");
const discordModals = require('discord-modals');
const { Modal, TextInputBuilder, showModal } = require('discord-modals');
const mysql = require('mysql')
const client = new Discord.Client({ intents: [1, 512, 32768, 2, 128] });
const mercadopago = require('mercadopago');
const { MessageAttachment } = require("discord.js");
const { profileImage } = require("discord-arts");
const emojis = require('./configs/emojis.json');
const axios = require('axios');
const moment = require('moment');
const process = require('process');
const Buffer = require('buffer').Buffer;
const { WebhookClient } = require('discord.js');
const comprarLink = require('./atalhos/comprarLink.js');

const { JsonDatabase, } = require('wio.db');
const db = new JsonDatabase({ databasePath: './databases/myJsonProdutos.json' });
const dbc = new JsonDatabase({ databasePath: './databases/myJsonCupons.json' });
const db2 = new JsonDatabase({ databasePath: './databases/myJsonDatabase.json' });
const db3 = new JsonDatabase({ databasePath: './databases/myJsonIDs.json' });
const perms = new JsonDatabase({ databasePath: './databases/myJsonPerms.json' });
const config = new JsonDatabase({ databasePath: './config.json' });
const express = require('express');

if (!config.get('notification_url')) {
    console.log('url de notificação para recebimento de pagamento não configurado');
    process.exit();
}

mercadopago.configure({
    access_token: config.get('access_token')
});

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4040;





app.listen(PORT, console.log(`Servidor online rodando na porta ${PORT}`));

const { joinVoiceChannel } = require('@discordjs/voice');

client.on("ready", () => {
    let channel = client.channels.cache.get("1125256332824563753");
    
    joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    })

    const comandos = fs.readdirSync('./slash');

    const slashCmds = comandos.map(c => require(`./slash/${c}`));


    client.application.commands.set(slashCmds.map(c => c.data.toJSON()));
    app.post('/pagamento', async (req, res) => {



        if (!('action' in req.body)) return;

        if (req.body.action === 'payment.created') {

            res.status(201);

            return console.log('Pagamento criado: ', req.body);

        }

    

        if (req.body.action !== 'payment.updated') return;


        res.status(201);

        console.log('Pagamento atualizado: ', req.body);

        const response = await mercadopago.payment.get(Number(req.body.data.id));

        console.log(response.body);
    

        if (response.body.status === 'approved') {

            console.log('Pagamento aprovado: ', response.body.status);

        }



        client.emit(`pagamentoAprovado_${response.body.metadata.data_id}`, response.body);

    

    });

});



moment.locale('pt-br');

client.login(config.get(`token`))
client.on('ready', () => {

   

    console.log(`👻  | Bot logado com sucesso.

👻  | Bot conectado a DataBase

👻  | Sistema de vendas automáticas

👻  | Desenvolvido por www`);

    client.user.setActivity(`${config.get('status')}`, { type: 'STREAMING', url: 'https://www.twitch.tv/shadowraze_77' });

});





process.on('unhandledRejection', (reason, p) => {

    console.log('❌  | Algum erro detectado');

    console.log(reason, p);

});



process.on('uncaughtException', (err, origin) => {

    console.log('❌  | opa achei um erro');

    console.log(err, origin);

});
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.categories = fs.readdirSync(`./commands/`);

fs.readdirSync('./commands/').forEach(local => {
    const comandos = fs.readdirSync(`./commands/${local}`).filter(arquivo => arquivo.endsWith('.js'))

    for(let file of comandos) {
        let puxar= require(`./commands/${local}/${file}`)

        if(puxar.name) {
            client.commands.set(puxar.name, puxar)
        } 
        if(puxar.aliases && Array.isArray(puxar.aliases))
        puxar.aliases.forEach(x => client.aliases.set(x, puxar.name))
    } 
});

client.on("messageCreate", async (message) => {

    let prefix = config.get(`prefix`);
  
    if (message.author.bot) return;
    if (message.channel.type === Discord.ChannelType.DM) return;     
  
    if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;
  
    if(!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
  
    let cmd = args.shift().toLowerCase()
    if(cmd.length === 0) return;
    let command = client.commands.get(cmd)
    if(!command) command = client.commands.get(client.aliases.get(cmd)) 
    
  try {
      command.run(client, message, args)
  } catch (err) { 
     console.error('Erro:' + err); 
  }
});
    


client.on('interactionCreate', (interaction) => {
    if (interaction.isChatInputCommand()) {
        const cmd = client.slash.get(interaction.commandName);

        if (!cmd) return;

        cmd.run(client, interaction);
    }
    if (interaction.isButton()) {
        const eprod = db.get(interaction.customId);
        if (!eprod) return;
        const severi = interaction.customId;
        const quantidade = db.get(`${severi}.conta`).length;
        const row = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(interaction.customId)
                    .setLabel('Comprar')
                    .setEmoji(emojis.carrinho)
                    .setStyle(config.get(`botao`)),
            );
    
  
                                 

        const embed = new Discord.EmbedBuilder()
            .setTitle(`${client.user.username} | Bot Store`)
            .setDescription(`\`\`\`${db.get(`${interaction.customId}.desc`)}\`\`\`\n${emojis.dinheiro} - **Nome:** **__${db.get(`${interaction.customId}.nome`)}__**\n${emojis.money} - **Preço:** **__R$${db.get(`${interaction.customId}.preco`)}__**\n${emojis.carrinhoazul} - **Estoque:** **__${db.get(`${interaction.customId}.conta`).length}__**`)
            .setColor(config.get('color'))
          
          
            .setThumbnail(client.user.displayAvatarURL())
            .setImage(`${db.get(`${interaction.customId}.banner`)}`)
        interaction.message.edit({ embeds: [embed], components: [row] });
         
      
    
        if (quantidade < 1) {
            const embedsemstock = new Discord.EmbedBuilder()
                .setTitle(`${client.user.username} | Sistema de Vendas`)
                .setDescription(`${emojis.errado} | Este produto está sem estoque no momento, volte mais tarde!`)
                .setColor(config.get('color'));
            interaction.reply({ embeds: [embedsemstock], ephemeral: true });
            return;
        }
        if (interaction.guild.channels.cache.find((c) => c.topic === interaction.user.id)) { interaction.reply({ content: `**${emojis.errado} Calma, Você já tem um carrinho criado em ${interaction.guild.channels.cache.find(c => c.topic === interaction.user.id)}.**`, ephemeral: true }) }
        if ((interaction.guild.channels.cache.find(c => c.topic === interaction.user.id))) {
            return;
        }

        interaction.guild.channels.create({
            name: `🛒・carrinho-${interaction.user.username}`,
            type: Discord.ChannelType.GuildText,
            parent: config.get('category'),
            topic: interaction.user.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages' ],
                }
            ]
        }).then(c => {
          const Ir = new Discord.ActionRowBuilder()
        .addComponents([
         new Discord.ButtonBuilder()
         .setLabel('Ir ate o carrinho')
         .setEmoji(emojis.carrinho)
         .setStyle(Discord.ButtonStyle.Link)
         .setURL(`https://discord.com/channels/${interaction.guild.id}/${c.id}`)
        ])
         interaction.user.send({ content: `${emojis.certo} seu carrinho foi aberto em ${c}. com sucesso!`, ephemeral: true, components: [Ir]});
        
            let quantidade1 = 1;
            let precoalt = eprod.preco;
            var data_id = Math.floor(Math.random() * 999999999999999);
            db3.set(`${data_id}.id`, `${data_id}`);
            db3.set(`${data_id}.status`, 'Pendente (1)');
            db3.set(`${data_id}.userid`, `${interaction.user.id}`);
            db3.set(`${data_id}.dataid`, `${moment().format('LLLL')}`);
            db3.set(`${data_id}.nomeid`, `${eprod.nome}`);
            db3.set(`${data_id}.qtdid`, `${quantidade1}`);
            db3.set(`${data_id}.precoid`, `${precoalt}`);
            db3.set(`${data_id}.entrid`, 'Andamento');
            const timer2 = setTimeout(function() {
                if ((interaction.guild.channels.cache.find(c => c.topic === interaction.user.id))) {
                    c.delete(); 
                }
                db3.delete(`${data_id}`);
            }, config.get(`tempo`));

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId('removeboton')
                        .setLabel('remover')
                        .setEmoji(emojis.menos)
                        .setStyle(ButtonStyle.Primary),
                )
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId('comprarboton')
                        .setLabel('continuar')
                        .setEmoji(emojis.carrinho)
                        .setStyle(ButtonStyle.Success),
                )
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId('addboton')
                        .setLabel('adicionar')
                        .setEmoji(emojis.mais)
                        .setStyle(ButtonStyle.Primary),
                )
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId('cancelarbuy')
                        .setLabel('Cancelar')
                        .setEmoji(emojis.errado)
                        .setStyle(ButtonStyle.Danger),
                )
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId('aceitartermos')
                        .setLabel('Aceitar termos')
                        .setEmoji(emojis.errado)
                        .setStyle(ButtonStyle.Primary),
                );
                //////////termos botao/////////////////////////
            const termos = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId('aceitar')
                        .setLabel('Aceitar')
                        .setEmoji(emojis.certo)
                        .setStyle(ButtonStyle.Success),
                )
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId('cancelarbuy')
                        .setLabel('Recusar')
                        .setEmoji(emojis.errado)
                        .setStyle(ButtonStyle.Danger),
                );
           
                        const row9 = new Discord.ActionRowBuilder()
                            .addComponents(
                                new Discord.ButtonBuilder()
                                    .setCustomId('removeboton')
                                    .setLabel('remover')
                                    .setEmoji(emojis.menos)
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(true),
                            )
                            .addComponents(
                                new Discord.ButtonBuilder()
                                    .setCustomId('comprarboton')
                                    .setLabel('continuar')
                                    .setEmoji(emojis.carrinho)
                                    .setStyle(ButtonStyle.Success)
                                    .setDisabled(true),
                            )
                            .addComponents(
                                new Discord.ButtonBuilder()
                                    .setCustomId('addboton')
                                    .setLabel('adionar')
                                    .setEmoji(emojis.mais)
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(true),
                            )
                            .addComponents(
                                new Discord.ButtonBuilder()
                                    .setCustomId('cancelarbuy')
                                    .setLabel('Cancelar')
                                    .setEmoji(emojis.errado)
                                    .setStyle(ButtonStyle.Danger)
                                    .setDisabled(true),
                            )   
                             const row7 = new Discord.ActionRowBuilder()
                            .addComponents(
                                new Discord.ButtonBuilder()
                                    .setURL(`https://termos.moonstore777.repl.co/`)
                                    .setLabel('Ler os termos')
                                    .setEmoji(emojis.carrinho)
                                    .setStyle(5),
                            )
                            .addComponents(
                                new Discord.ButtonBuilder()
                                    .setCustomId('aceitartermos')
                                    .setLabel('Aceitar termos')
                                    .setEmoji(emojis.certo)
                                    .setStyle(ButtonStyle.Success),
                            )
                         ;
                        
                        interaction.deferUpdate();
                        const embedss = new Discord.EmbedBuilder()
                            .setTitle(`${client.user.username} | Sistema de Compras`)
                            .setDescription(`${emojis.carrinho} | **Produto:**
 \`\`${eprod.nome}\`\`

${emojis.money} | **quantidade:** 
 \`\`${quantidade1}\`\`

${emojis.dinheiro} | **valor total:** 
 \`\`${precoalt}\`\` 
 
 ${emojis.seguranca} | **id da compra:**
 \`\`${data_id}\`\` `)
                            .setThumbnail(client.user.displayAvatarURL())
                         
                            .setColor(config.get('color'));
                            c.send({ embeds: [embedss], content: `<@${interaction.user.id}>`, components: [row9, row7], fetchReply: true }).then(msg => {
                                const filter = i => i.user.id === interaction.user.id;
                                const collector = msg.createMessageComponentCollector({ filter });
                                collector.on('collect', async intera => {
                                    intera.deferUpdate();
                                   
                    if (intera.customId === 'aceitartermos') {
                        const row3 = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId('removeboton')
                                .setLabel('remover')
                                .setEmoji(emojis.menos)
                                .setStyle(ButtonStyle.Primary),
                        )
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId('comprarboton')
                                .setLabel('continuar')
                                .setEmoji(emojis.carrinho)
                                .setStyle(ButtonStyle.Success),
                        )
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId('addboton')
                                .setLabel('adicionar')
                                .setEmoji(emojis.mais)
                                .setStyle(ButtonStyle.Primary),
                        )
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId('cancelarbuy')
                                .setLabel('Cancelar')
                                .setEmoji(emojis.errado)
                                .setStyle(ButtonStyle.Danger),
                        );
                            const embedaceitar = new Discord.EmbedBuilder()
                            .setTitle(`${client.user.username} | Sistema de Compras`)
                            .setDescription(`${emojis.carrinho} | **Produto:**
 \`\`${eprod.nome}\`\`

${emojis.money} | **quantidade:** 
 \`\`${quantidade1}\`\`

${emojis.dinheiro} | **valor total:** 
 \`\`${precoalt}\`\` 
 
 ${emojis.seguranca} | **id da compra:**
 \`\`${data_id}\`\` `)
                                .setColor(config.get('color'))
                                .setThumbnail(client.user.displayAvatarURL());
                            msg.edit({ embeds: [embedaceitar], components: [row3] });
                        }
                    
                    if (intera.customId === 'cancelarbuy') {
                        clearInterval(timer2);
                        const embedcancelar = new Discord.EmbedBuilder()
                            .setTitle(`${emojis.carrinho} | ${client.user.username} Compra Cancelada com sucessso!!**`)
                            .setDescription(`${emojis.certo} | Você cancelou a compra, e todos os produtos foram devolvido para o estoque!!`)
                            .setColor(config.get('color'))
                            .setThumbnail(client.user.displayAvatarURL());
                        interaction.user.send({ embeds: [embedcancelar] });
                        db3.delete(`${data_id}`);
                        const embed9 = new Discord.EmbedBuilder()
        .setTitle(`${client.user.username} | Bot Store`)
        .setDescription(`${emojis.carrinho} | o usuario ${interaction.user.username} criou um carrinho!!\n${emojis.money} | produto: ${eprod.nome}\n${emojis.mundo} | horario: ${moment().format('LLLL')}`)
        .setColor(config.get(`color`))
        .setThumbnail(client.user.displayAvatarURL())
     
      client.channels.cache.get(config.get('logsgeral')).send({ embeds: [embed9]})
                        if ((interaction.guild.channels.cache.find(c => c.topic === interaction.user.id))) {
                            c.delete(); 
                        }
                    }
                    if (intera.customId === 'addboton') {
                        if (quantidade1++ >= quantidade) {
                            quantidade1--;
                            const embedss2 = new Discord.EmbedBuilder()
                                .setTitle(`${client.user.username} | Sistema de Compras`)
                                .setDescription(`${emojis.carrinho} | **Produto:**
 \`\`${eprod.nome}\`\`

 ${emojis.dados} | **usuario:**
 ${interaction.user}

${emojis.money} | **quantidade:** 
 \`\`${quantidade1}\`\`

${emojis.dinheiro} | **valor total:** 
 \`\`${precoalt}\`\` 
 
 ${emojis.seguranca} | **id da compra:**
 \`\`${data_id}\`\` `)
                                .setColor(config.get('color'))
                                .setThumbnail(client.user.displayAvatarURL());
                            msg.edit({ embeds: [embedss2] });
                        }
                        else {
                            precoalt = Number(precoalt) + Number(eprod.preco);

                            const embedss = new Discord.EmbedBuilder()
                                .setTitle(`${client.user.username} | Sistema de Compras`)
                                .setDescription(`${emojis.carrinho} | **Produto:**
 \`\`${eprod.nome}\`\`

${emojis.money} | **quantidade:** 
 \`\`${quantidade1}\`\`

${emojis.dinheiro} | **valor total:** 
 \`\`${precoalt}\`\` 
 
 ${emojis.seguranca} | **id da compra:**
 \`\`${data_id}\`\` `)
                                .setColor(config.get('color'))
                                .setThumbnail(client.user.displayAvatarURL());
                            msg.edit({ embeds: [embedss] });
                        }
                    }
                    if (intera.customId === 'removeboton') {
                        if (quantidade1 <= 1) {
                            // if vazio?
                        }
                        else {
                            precoalt = precoalt - eprod.preco;
                            quantidade1--;
                            const embedss = new Discord.EmbedBuilder()
                                .setTitle(`${client.user.username} | Sistema de Compras`)
                                .setDescription(`${emojis.carrinho} | **Produto:**
 \`\`${eprod.nome}\`\`

${emojis.money} | **quantidade:** 
 \`\`${quantidade1}\`\`

${emojis.dinheiro} | **valor total:** 
 \`\`${precoalt}\`\` 
 
 ${emojis.seguranca} | **id da compra:**
 \`\`${data_id}\`\` `)
                                .setColor(config.get('color'))
                                .setThumbnail(client.user.displayAvatarURL());
                            msg.edit({ embeds: [embedss] });
                        }
                    }
               

                    if (intera.customId === 'comprarboton') {
                        msg.channel.bulkDelete(50);
                        clearInterval(timer2);
                        const timer3 = setTimeout(function() {
                            if ((interaction.guild.channels.cache.find(c => c.topic === interaction.user.id))) {
                                c.delete(); 
                            }
                            db3.delete(`${data_id}`);
                        }, 300000);
                        const row = new Discord.ActionRowBuilder()
                          
                            .addComponents(
                                new Discord.ButtonBuilder()
                                    .setCustomId('continuarboton')
                                    .setLabel('Pix ou qr code')
                                    .setEmoji(`<:104287504924752697:1094982601674080297>`)
                                    .setStyle(ButtonStyle.Success),
                            )
                            
                           
                          
                              .addComponents(
                                new Discord.ButtonBuilder()
                                    .setCustomId('link-pagamento')
                                    .setLabel('Mercado pago')
                                    .setEmoji(`<:emoji_39:1094982075439911012>`)
                                    .setStyle(ButtonStyle.Success),
                              )
                            .addComponents(
                                new Discord.ButtonBuilder()
                                    .setCustomId('addcboton')
                                    .setLabel('Enviar Cupom')
                                    .setEmoji(emojis.cupom)
                                    .setStyle(ButtonStyle.Success),
                            );

                        const embedss = new Discord.EmbedBuilder()
                           
                            .setTitle(`${client.user.username} | Sistema de Compras`)

                            .setDescription(`${emojis.cupom} | **Cupom:**\nsem desconto..\n\n${emojis.dinheiro} | **Desconto:**\nsem desconto..\n\n${emojis.money} | **Preço Total:**\n${precoalt} Reais`)

          
                            
                            

                            .setColor(config.get('color'))
                            .setThumbnail(client.user.displayAvatarURL());


                        c.send({ embeds: [embedss], components: [row], content: `<@${interaction.user.id}>`, fetchReply: true }).then(msg => {
                            const filter = i => i.user.id === interaction.user.id;
                            const collector = msg.createMessageComponentCollector({ filter });
                            collector.on('collect', intera2 => {
                                intera2.deferUpdate();
                                if (intera2.customId === 'addcboton') {
                                  
                                    intera.channel.permissionOverwrites.edit(intera.user.id, { SEND_MESSAGES: true });
                                    const cupomstatus = db.get(`${severi}.cupom`)
                                    if("off" === `${cupomstatus}`) return  msg.channel.send(`o sistema esta desativado`)
                                    msg.channel.send(`${emojis.mundo} | envie abaixo o cupom!`).then(mensagem => {
                                        const filter = m => m.author.id === interaction.user.id;
                                        const collector = mensagem.channel.createMessageCollector({ filter, max: 1 });
                                        collector.on('collect', cupom => {
                                            if (`${cupom}` !== `${dbc.get(`${cupom}.idcupom`)}`) {
                                                cupom.delete();
                                                mensagem.edit(`${emojis.errado} | isso nao e um cupom`);
                                                intera.channel.permissionOverwrites.edit(intera.user.id, { SEND_MESSAGES: false });
                                                return;
                                            }

                                            var minalt = dbc.get(`${cupom}.minimo`);
                                            var dscalt = dbc.get(`${cupom}.desconto`);
                                            var qtdalt = dbc.get(`${cupom}.quantidade`);

                                            precoalt = Number(precoalt) + Number('1');
                                            minalt = Number(minalt) + Number('1');
                                            if (precoalt < minalt) {
                                                cupom.delete();
                                                intera.channel.permissionOverwrites.edit(intera.user.id, { SEND_MESSAGES: false });
                                                mensagem.edit(`${emojis.errado} | voce nao atingio o minimo!`);
                                                return;
                                            }
                                            else {

                                                precoalt = Number(precoalt) - Number('1');
                                                minalt = Number(minalt) - Number('1');

                                                if (`${dbc.get(`${cupom}.quantidade`)}` === '0') {
                                                    cupom.delete();
                                                    intera.channel.permissionOverwrites.edit(intera.user.id, { SEND_MESSAGES: false });
                                                    mensagem.edit(`${emojis.errado} | esse cupom nao esta mais disponivel!!`);
                                                    return;
                                                }

                                                if (`${cupom}` === `${dbc.get(`${cupom}.idcupom`)}`) {
                                                    cupom.delete();
                                                    mensagem.edit(`${emojis.certo} | cupom adicioado!!`);
                                                    intera.channel.permissionOverwrites.edit(intera.user.id, { SEND_MESSAGES: false });
                                                    var precinho = precoalt;
                                                    var descontinho = '0.' + dscalt;
                                                    var cupomfinal = precinho * descontinho;
                                                    precoalt = precinho - cupomfinal;
                                                    qtdalt = qtdalt - 1;
                                           
                                                    const embedss2 = new Discord.EmbedBuilder()
                                                        .setTitle(`${client.user.username} | sistema de compras`)
                                                        .setDescription(`${emojis.cupom} | **Cupom:**\nsem desconto..\n\n${emojis.dinheiro} | **Desconto:**\nsem desconto..\n\n${emojis.money} | **Preço Total:**\n${precoalt} Reais`)
                                                        .setColor(config.get('color'))
                                                        .setThumbnail(client.user.displayAvatarURL());
                                                    msg.edit({ embeds: [embedss2], components: [row], content: `<@${interaction.user.id}>`, fetchReply: true });
                                                    dbc.set(`${cupom}.quantidade`, `${qtdalt}`);
                                                }
                                            }
                                        });
                                    });
                                }

                                if (intera2.customId === 'cancelarboton') {
                               
                                    clearInterval(timer3);
                                    const embedcancelar = new Discord.EmbedBuilder()
                                    .setTitle(`${emojis.carrinho} | ${client.user.username} Compra Cancelada com sucessso!!**`)
                                    .setDescription(`${emojis.certo} | Você cancelou a compra, e todos os produtos foram devolvido para o estoque!!`)
                                    .setColor(config.get('color'))
                                    .setThumbnail(client.user.displayAvatarURL());
                                interaction.user.send({ embeds: [embedcancelar] });
                                db3.delete(`${data_id}`);
                                const embed10 = new Discord.EmbedBuilder()
                .setTitle(`${client.user.username} | Bot Store`)
                .setDescription(`${emojis.carrinho} | o usuario ${interaction.user.username} fechou seu carrinho!!\n${emojis.money} | produto: ${eprod.nome}\n${emojis.mundo} | horario: ${moment().format('LLLL')}\n${emojis.load} | etapa: 2/3`)
                .setColor(config.get(`color`))
                .setThumbnail(client.user.displayAvatarURL())
             
              client.channels.cache.get(config.get('logsgeral')).send({ embeds: [embed10]});
                                   
                                    if ((interaction.guild.channels.cache.find(c => c.topic === interaction.user.id))) {
                                        c.delete(); 
                                    }
                                }

                                if (intera2.customId === 'continuarboton') {
                                    msg.channel.bulkDelete(50);
                                    clearInterval(timer3);
                                    const venda = setTimeout(function() {
                                        if ((interaction.guild.channels.cache.find(c => c.topic === interaction.user.id))) {
                                            c.delete(); 
                                        }
                                        db3.delete(`${data_id}`);
                                    }, 1800000);
                                    mercadopago.configurations.setAccessToken(config.get('access_token'))
                                    
                                    var payment_data = {
                                        transaction_amount: Number(precoalt),
                                        description: `Pagamento | ${interaction.user.username}`,
                                        payment_method_id: 'pix',
                                        payer: {
                                            email: config.get(`email`),
                                            first_name: 'Heverson',
                                            last_name: 'Bueno',
                                            identification: {
                                                type: 'CPF',
                                                number: '75608669649'
                                            },
                                            address: {
                                                zip_code: '06233200',
                                                street_name: 'Av. das Nações Unidas',
                                                street_number: '3003',
                                                neighborhood: 'Bonfim',
                                                city: 'Osasco',
                                                federal_unit: 'SP'
                                            }
                                        }
                                    }

                                    mercadopago.payment.create(payment_data).then(function(data) {
                                        db3.set(`${data_id}.status`, 'Pendente (2)');
                                        const buffer = Buffer.from(data.body.point_of_interaction.transaction_data.qr_code_base64, 'base64');
                                        const attachment = new Discord.AttachmentBuilder(buffer, { name: 'payment.png' });
                                        const row = new Discord.ActionRowBuilder()
                                            .addComponents(
                                                new Discord.ButtonBuilder()
                                                    .setCustomId('codigo')
                                                    .setEmoji(emojis.money)
                                                    .setLabel('Pix Copia e Cola')
                                                    .setStyle(ButtonStyle.Success),
                                            )
                                         
                                            .addComponents(
                                                new Discord.ButtonBuilder()
                                                    .setCustomId('cancelarpix')
                                                    .setEmoji(emojis.errado)
                                                    .setLabel('Cancelar')
                                                    .setStyle(ButtonStyle.Danger),
                                            );
                                        const embed = new Discord.EmbedBuilder()
                                            .setTitle(`${client.user.username} | Sistema de Compras`)
                                            .setDescription(`Aponte a camera do seu dispositivo para o qrcode e escaneio-o `)
                                            .setColor(config.get('color'))
                                            .setImage('attachment://payment.png')
                                            .setThumbnail(client.user.displayAvatarURL());
                                        msg.channel.send({ embeds: [embed], content: `<@${interaction.user.id}>`, components: [row], files: [attachment] }).then(msg => {

                                            const collector = msg.channel.createMessageComponentCollector();
                                            const lopp = setInterval(function() {
                                                const time2 = setTimeout(function() {
                                                    clearInterval(lopp);
                                                }, 1800000);
                                                axios.get(`https://api.mercadolibre.com/collections/notifications/${data.body.id}`, {
                                                    headers: {
                                                        'Authorization': `Bearer ${config.get('access_token')}`
                                                    }
                                                }).then(async (doc) => {
                                                    if (doc.data.collection.status === 'approved') {
                                                        db3.set(`${data_id}.status`, 'Processando');
                                                    }
                                         
                                                    if (`${db3.get(`${data_id}.status`)}` === 'Processando') {
                                                        clearTimeout(time2);
                                                        clearInterval(lopp);
                                                        clearInterval(venda);
                                                        setTimeout(function() {
                                                            if ((interaction.guild.channels.cache.find(c => c.topic === interaction.user.id))) {
                                                                c.delete(); 
                                                            }
                                                        }, 60000);
                                                        const a = db.get(`${severi}.conta`);
                                                        const canalif1 = client.channels.cache.get(config.canallogs);
                                                        db2.add('pedidostotal', 1);
                                                        db2.add('gastostotal', Number(precoalt));
                                                        db2.add(`${moment().format('L')}.pedidos`, 1);
                                                        db2.add(`${moment().format('L')}.recebimentos`, Number(precoalt));
                                                        db2.add(`${interaction.user.id}.gastosaprovados`, Number(precoalt));
                                                        db2.add(`${interaction.user.id}.pedidosaprovados`, 1);

                                                        if (a < quantidade1) {
                                                            db3.set(`${data_id}.status`, 'Reembolsado');
                                                            msg.channel.send(`${emojis.certo} | pagamento reembolsado`);
                                                            msg.channel.send(`${emojis.certo} | ID Da compra: ${data_id}`);
                                                            mercadopago.configure({ access_token: `${config.get('access_token')}` });
                                                            var refund = { payment_id: `${data.body.id}` };
                                                            mercadopago.refund.create(refund).then(result => {
                                                                const message2new = new Discord.EmbedBuilder()
                                                                    .setTitle(`${client.user.username} | Compra Reembolsada`)
                                  
                                                                    .addFields('Comprador:', `<@${data_id}>`)
                                                                    .addFields('Data da compra:', `${moment().format('LLLL')}`)
                                                                    .addFields('Nome:', `${eprod.nome}`)
                                                                    .addFields('Quantidade:', `${quantidade1}x`)
                                                                    .addFields('Preço:', `${precoalt}`)
                                                                    .addFields('Id da compra:', `\`\`\`${data_id}\`\`\``)
                                                                    .setColor(config.get('color'))
                                                                    .setThumbnail(client.user.displayAvatarURL());
                                                                canalif1.send({ embeds: [message2new] });
                                                            });
                                                        }
                                                        else {

                                                           
                                                            const pegar = new Discord.ActionRowBuilder()
                                                            .addComponents(
                                                                new Discord.ButtonBuilder()
                                                                    .setCustomId('copiar')
                                                                    .setEmoji(emojis.carrinho)
                                                                    .setLabel('copiar')
                                                                    .setStyle(ButtonStyle.Secondary),
                                                            )
                                                            const rowavaliacaoo = new Discord.ActionRowBuilder()
                                                            .addComponents(
                                                                new Discord.ButtonBuilder()
                                                                    .setCustomId('1star')
                                                                    .setEmoji('⭐')
                                                                    .setLabel('1')
                                                                    .setStyle(ButtonStyle.Primary),
                                                            )
                                                            .addComponents(
                                                                new Discord.ButtonBuilder()
                                                                    .setCustomId('2star')
                                                                    .setEmoji('⭐')
                                                                    .setLabel('2')
                                                                    .setStyle(ButtonStyle.Primary),
                                                            )
                                                            .addComponents(
                                                                new Discord.ButtonBuilder()
                                                                    .setCustomId('3star')
                                                                    .setEmoji('⭐')
                                                                    .setLabel('3')
                                                                    .setStyle(ButtonStyle.Primary),
                                                            )
                                                            .addComponents(
                                                                new Discord.ButtonBuilder()
                                                                    .setCustomId('4star')
                                                                    .setEmoji('⭐')
                                                                    .setLabel('4')
                                                                    .setStyle(ButtonStyle.Primary),
                                                            )
                                                            .addComponents(
                                                                new Discord.ButtonBuilder()
                                                                    .setCustomId('5star')
                                                                    .setEmoji('⭐')
                                                                    .setLabel('5')
                                                                    .setStyle(ButtonStyle.Primary),
                                                            );                    
                                                            const removed = a.splice(0, Number(quantidade1));
                                                            db.set(`${severi}.conta`, a);
                                                            const embedentrega = new Discord.EmbedBuilder()
                                                                .setTitle(`${config.get('title')} | Seu produto`)
                                                                .setDescription(`**${emojis.mundo} | Produtos:** \n  \`\`\` 1º| ${removed.join('\n')}\`\`\`\n${emojis.info}| Id da Compra:** ${data_id}** `)
                                                              
                                                                .setColor(config.get('color'))
                                                                .setThumbnail(client.user.displayAvatarURL());
                                                           
                                                                interaction.user.send({ embeds: [embedentrega]});
                                                                let avaliacao = 'Nenhuma avaliação enviada...';
                                                                const embed = await msg.reply({
                                                                    embeds: [new Discord.EmbedBuilder()
                                                                        .setTitle(`${client.user.username} | Sistema de Avaliação`)
                                                                        .setDescription(`${emojis.mundo} Escolha uma nota essa venda.`)
                                                                        
                                                                    
                                                                       
                                                                        .setColor(config.get('color'))], components: [rowavaliacaoo]
                                                                });
                                                                const interacaoavaliacao = embed.createMessageComponentCollector()
                                                                interacaoavaliacao.on('collect', async(interaction) => {
                                                                    
                                                                                         
                                                                    if (interaction.isButton()) {
                                                                        var textoest = '';
                                                                        var estrelas = interaction.customId.replace('star', '');
    
                                                                        for (let i = 0; i != estrelas; i++) {
                                                                            textoest = `${textoest} ⭐`;
                                                                        }
    
                                                                        interaction.deferUpdate();
                                                                        
                                                                        embed.edit({content:`${emojis.certo} | obrigado por sua avaliacao`}).then(() => {
                                                                       
                                                                            const embedaprovadolog = new Discord.EmbedBuilder()
                                                                                .setTitle(`${client.user.username} | nova avaliacao`)
                                                                                .setDescription(`${avaliacao}`)
                                                                                .setColor(config.get('color'))
                                                                             
                                                                                .setThumbnail(client.user.displayAvatarURL());
                                                                              
                                                                            client.channels.cache.get(config.get('avaliacao')).send({ embeds: [embedaprovadolog] });
                                                                            db3.set(`${data_id}.entrid`, `${removed.join(' \n')}`);
                                                                          
    
                                                                        });
                                                                    }
                                                                });
                                                            db3.set(`${data_id}.status`, 'Concluido');
                                                        
                                                            msg.channel.send(`${emojis.certo} | **Pagamento aprovado verifique a sua dm!**`);
                                                           
                                                            const membro = interaction.guild.members.cache.get(interaction.user.id);
                                                            const role = interaction.guild.roles.cache.find(role => role.id === config.get('role'));
                                                        
                                                           membro.roles.add(role);
                                                     
                                                                        
                                                                     
                                                                     
                                                                         
                                                     
                                                                const id = interaction.user.id
                                                             
                                                            const embedaprovadolog2 = new Discord.EmbedBuilder()
                                                                .setTitle(`${client.user.username} | nova compra`)
                                                                .setDescription(`
${emojis.dados} | **usuairo:**
${interaction.user.tag}
                                  
${emojis.carrinho} | **produto:**
${eprod.nome}
                                  
${emojis.money} | **valor total:**
R$${precoalt}
                                  
${emojis.seguranca} | **id da compra:**
${data.body.id}
                                  
${emojis.mundo} | **horário:**
${moment().format('LLLL')}
                                  
                                  
                                  `)
                                                                .setColor(config.get('color'))
                                                                
                                                                .setThumbnail(client.user.displayAvatarURL());
                                                            client.channels.cache.get(config.get('logsvendas')).send({ embeds: [embedaprovadolog2] });
                                                            // const sleep = async (ms) => await new Promise(r => setTimeout(r, ms));
                                                        

                                                            const row = new Discord.ActionRowBuilder()
                                                                .addComponents(
                                                                    new Discord.ButtonBuilder()
                                                                        .setCustomId('reembolso')
                                                                        .setEmoji(emojis.info)
                                                                        .setLabel('Reembolsar')
                                                                        .setStyle(ButtonStyle.Primary),
                                                                );

                                                            const canalif = client.channels.cache.get(config.get('logs_staff'));
                                                            const message2 = await canalif.send({
                                                                embeds: [new Discord.EmbedBuilder()
                                                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                   .setDescription(` 
 produto:                                                       
\`\`\` 1º| ${removed.join('\n')}\`\`\`
${emojis.carrinho} | **Nome produto:**
${eprod.nome}
${emojis.money} | **Comprador:**
${interaction.user}
${emojis.mundo} | **horário:**
${moment().format('LLLL')}`)
                                        
                                                                    .setColor(config.get('color'))
                                                                    .setThumbnail(client.user.displayAvatarURL())], components: [row]
                                                            });
                                                            const interação = message2.createMessageComponentCollector({ componentType: 'BUTTON', });
                                                            interação.on('collect', async (interaction) => {
                                                                if (interaction.customId === 'reembolso') {
                                                                    const user = interaction.user.id;
                                                                    if (interaction.user.id !== `${perms.get(`${user}_id`)}`) return interaction.reply({ content: ' | Você não está na lista de pessoas!', ephemeral: true });
                                                                    interaction.deferUpdate();
                                                                    mercadopago.configure({ access_token: `${config.get('access_token')}` });
                                                                    var refund = { payment_id: `${data.body.id}` };
                                                                    mercadopago.refund.create(refund).then(result => {
                                                                        db3.set(`${data_id}.status`, 'Reembolsado');
                                                                        message2.delete();
                                                                        const message2new = new Discord.EmbedBuilder()
                                                                            .setTitle(`${config.get('title')} | Compra Reembolsada`)
                                                                            .setDescriptoin(`${emojis.carinho} | **produto:**
                                        \`\`\`${removed.join(' \n')}\`\`\`
    
                                        **Nome produto:**
                                        ${eprod.nome}
                                        
                                        **Horario:**
                                       
    
                                        **Comprador:**
                                        ${interaction.user}
    
    
    
                                               `)
                                       
                                                                            .setColor(config.get('color'))
                                                                            .setThumbnail(client.user.displayAvatarURL());
                                                                        canalif.send({ embeds: [message2new] });
                                                                    }).catch(function() {
                                                                        interaction.followUp({ content: '<:error:1046917527730671696> | Houve algum erro durante a transação, tente novamente!', ephemeral: true }); 
                                                                    });
                                                                }
                                                            });

                                                            const row2 = new Discord.ActionRowBuilder()
                                                            .addComponents(
                                                                new Discord.ButtonBuilder()
                                                                    .setCustomId(interaction.customId)
                                                                    .setLabel('Comprar')
                                                                    .setEmoji(emojis.carrinho)
                                                                    .setStyle(config.get(`botao`)),
                                                            );

                                                           
                                                                const embed2 = new Discord.EmbedBuilder()
                                                                .setTitle(`${config.get('title')} | Bot Store`)
                                                                .setDescription(`\`\`\`${db.get(`${interaction.customId}.desc`)}\`\`\`\n${emojis.dinheiro} - **Nome:** **__${db.get(`${interaction.customId}.nome`)}__**\n${emojis.money} - **Preço:** **__R$${db.get(`${interaction.customId}.preco`)}__**\n${emojis.carrinhoazul} - **Estoque:** **__${db.get(`${interaction.customId}.conta`).length}__**`)
                                                                .setColor(config.get('color'))
                                                                .setImage(`${db.get(`${interaction.customId}.banner`)}`)
                                                              
                                                                .setThumbnail(config.get('thumbanail'));
                                                             
                                                            interaction.message.edit({ embeds: [embed2], components: [row2] });
                                                        }
                                                    }
                                                });
                                            }, 10000);

                                            collector.on('collect', interaction => {
                                                if (interaction.customId === 'codigo') {
                                                    row.components[0].setDisabled(true);
                                                    interaction.reply(data.body.point_of_interaction.transaction_data.qr_code);
                                                    const embed = new Discord.EmbedBuilder()
                                                    .setTitle(`${client.user.username} | Sistema de Compras`)
                                                    .setDescription(`Aponte a camera do seu dispositivo para o qrcode e escaneio-o `)
                                                    .setColor(config.get('color'))
                                                    .setImage('attachment://payment.png')
                                                    .setThumbnail(client.user.displayAvatarURL());
                                                    msg.edit({ embeds: [embed], content: `<@${interaction.user.id}>`, components: [row], files: [attachment] });
                                                }

                                             

                                                if (interaction.customId === 'cancelarpix') {
                                                    clearInterval(lopp);
                                                    clearInterval(venda);
                                                    const embedcancelar = new Discord.EmbedBuilder()
                                                    .setTitle(`${emojis.carrinho} | ${client.user.username} Compra Cancelada com sucessso!!**`)
                                                    .setDescription(`${emojis.certo} | Você cancelou a compra, e todos os produtos foram devolvido para o estoque!!`)
                                                    .setColor(config.get('color'))
                                                    .setThumbnail(client.user.displayAvatarURL());
                                                interaction.user.send({ embeds: [embedcancelar] });
                                                db3.delete(`${data_id}`);
                                                const embed11 = new Discord.EmbedBuilder()
                                .setTitle(`${client.user.username} | Bot Store`)
                                .setDescription(`${emojis.carrinho} | o usuario ${interaction.user.username} fechou seu carrinho!!\n${emojis.money} | produto: ${eprod.nome}\n${emojis.mundo} | horario: ${moment().format('LLLL')}\n${emojis.load} | etapa: 3/3`)
                                .setColor(config.get(`color`))
                                .setThumbnail(client.user.displayAvatarURL())
                             
                              client.channels.cache.get(config.get('logsgeral')).send({ embeds: [embed11]});
                                                    if ((interaction.guild.channels.cache.find(c => c.topic === interaction.user.id))) {
                                                        c.delete(); 
                                                    }
                                                }
                                            });
                                        });
                                    }).catch(function(error) {
                                        console.log(error);
                                    });
                                }

                                if (intera2.customId === 'link-pagamento') {
                                    msg.channel.bulkDelete(50);
                                    clearInterval(timer3);
                                    comprarLink(

                                        msg, c, interaction, db3, precoalt,

                                        data_id, config, mercadopago, eprod, quantidade1,

                                        moment, db, severi, db2, perms

                                    );
                                }
                            });
                        });
                    }

                    
                });
            });
        });
        
    }
});
client.on('ready', () => {

    client.slash = new Discord.Collection();

    const caminhoComandos = './slash';
    const comandos = [];

    fs.readdirSync(caminhoComandos)
        .forEach(arquivoNome => {
            // handler SlashCommandBuilder
            const arquivo = require(`${caminhoComandos}/${arquivoNome}`);
            if (!arquivo.data) return;

            const slashJSON = arquivo.data.toJSON();
            comandos.push(slashJSON);
            client.slash.set(slashJSON.name, arquivo);
        });

    client.application.commands.set(comandos);

  
});

