const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios').default;
const config = require('./config.json');
const channelList = require('./json/channel_list.json');
const adminList = require('./json/admin_list.json');
const {
  getOCRResult,
  convertImageToTiff,
  sendOCRRequest,
  extractGovernorName,
  extractIdFromText,
  extractAllianceName
} = require('./utils/ocrUtils');
const {
  readAllianceList,
  readMemberList,
  writeMemberList
} = require('./utils/dataUtils');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on('messageCreate', async message => {
  if (channelList.channels.includes(message.channel.id) && message.attachments.size > 0) {
    const attachment = message.attachments.first();
    
    console.log('Received image attachment:', attachment.url);
    
    try {
      const response = await axios({
        url: attachment.url,
        method: 'GET',
        responseType: 'arraybuffer'
      });
      const tiffBuffer = await convertImageToTiff(response.data);

      const resultId = await sendOCRRequest(tiffBuffer);

      const ocrResult = await getOCRResult(resultId);
      console.log('OCR result received:', ocrResult);

      const formattedResult = ocrResult.raw_text;
      console.log('Formatted OCR result:', formattedResult);

      const governorName = extractGovernorName(formattedResult);
      const extractedId = extractIdFromText(formattedResult);

      if (!extractedId) {
        const noIdEmbed = new EmbedBuilder()
          .setAuthor({
            name: "Alliance Verify",
            iconURL: config.icon,
            url: "https://discord.js.org",
          })
          .setColor(0xffeac3)
          .setImage(config.banner)
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setThumbnail(message.author.displayAvatarURL())
          .setTimestamp()
          .setDescription('No valid ID found in the image. Verification cannot proceed.');
        await message.reply({ embeds: [noIdEmbed] });
        return;
      }

      const allianceList = readAllianceList();
      const memberList = readMemberList();

      const alliance = extractAllianceName(formattedResult, allianceList);

      if (!alliance) {
        const invalidAllianceEmbed = new EmbedBuilder()
          .setAuthor({
            name: "Alliance Verify",
            iconURL: config.icon,
            url: "https://discord.js.org",
          })
          .setColor(0xffeac3)
          .setImage(config.banner)
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setThumbnail(message.author.displayAvatarURL())
          .setTimestamp()
          .setDescription('Alliance name not found or invalid.');
        await message.reply({ embeds: [invalidAllianceEmbed] });
        return;
      }

      const serverId = message.guild.id;
      const memberEntry = memberList[serverId]?.find(entry => entry.gov_id === extractedId);

      if (memberEntry) {
        if (memberEntry.discord_id === message.author.id) {
          const alreadyVerifiedEmbed = new EmbedBuilder()
            .setAuthor({
              name: "Alliance Verify",
              iconURL: config.icon,
              url: "https://discord.js.org",
            })
            .setColor(0xffeac3)
            .setImage(config.banner)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            })
            .setThumbnail(message.author.displayAvatarURL())
            .setTimestamp()
            .setDescription('You are already verified.');

          const roleId = allianceList[serverId]?.find(a => a.alliance_name === alliance.name)?.role_id;
          if (roleId) {
            const member = message.guild.members.cache.get(message.author.id);
            if (member) {
              await member.roles.add(roleId);
              await member.roles.add("1127953944468013136"); // melons check
              await member.roles.remove("1127959928242458636");
            }
          }

          await message.reply({ embeds: [alreadyVerifiedEmbed] });
        } else {
          const adminIds = adminList[serverId] || [];
          const mentions = adminIds.map(id => {
            if (message.guild.roles.cache.has(id)) {
              return `<@&${id}>`;
            } else {
              return `<@${id}>`;
            }
          });

          const mentionString = mentions.length ? mentions.join(' ') : 'a moderator';

          const contactAdminEmbed = new EmbedBuilder()
            .setAuthor({
              name: "Alliance Verify",
              iconURL: config.icon,
              url: "https://discord.js.org",
            })
            .setColor(0xffeac3)
            .setImage(config.banner)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            })
            .setThumbnail(message.author.displayAvatarURL())
            .setTimestamp()
            .setDescription(`<@${memberEntry.discord_id}> has already used this profile to verify himself. Please contact ${mentionString}.`);

          await message.reply({ embeds: [contactAdminEmbed] });
        }
        return;
      }

      const newEntry = {
        governor_name: governorName,
        discord_id: message.author.id,
        gov_id: extractedId,
        alliance_name: alliance.name
      };

      if (!memberList[serverId]) {
        memberList[serverId] = [];
      }
      memberList[serverId].push(newEntry);

      writeMemberList(memberList);

      const roleId = allianceList[serverId]?.find(a => a.alliance_name === alliance.name)?.role_id;
      if (roleId) {
        const member = message.guild.members.cache.get(message.author.id);
        if (member) {
          await member.roles.add(roleId);
        }
      }

      const successEmbed = new EmbedBuilder()
      .setAuthor({
          name: "Alliance Verify",
          iconURL: config.icon,
          url: "https://discord.js.org",
        })
        .setColor(0xffeac3)
        .setImage(config.banner)
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setThumbnail(message.author.displayAvatarURL())
        .setTimestamp()
        .setDescription('You have been verified and the role has been assigned.');

      await message.reply({ embeds: [successEmbed] });
      
    } catch (error) {
      console.error('Error processing the image:', error);
      const errorEmbed = new EmbedBuilder()
        .setAuthor({
          name: "Alliance Verify",
          iconURL: config.icon,
          url: "https://discord.js.org",
        })
        .setColor(0xffeac3)
        .setImage(config.banner)
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setThumbnail(message.author.displayAvatarURL())
        .setTimestamp()
        .setDescription('There was an error processing the image.');

      await message.reply({ embeds: [errorEmbed] });
    }
  }
});

client.login(config.token);