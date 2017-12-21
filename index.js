const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const request = require('request');
const fs = require('fs');
const getYoutubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');
const yt_api_key = "AIzaSyDeoIH0u1e72AtfpwSKKOSy3IPp2UHzqi4";
const prefix = '$';
const discord_token = process.env.BOT_TOKEN;
client.login(discord_token);
client.on('ready', function() {
	console.log(' Music Is Online ');
});
/*
////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\
*/
var servers = [];
var queue = [];
var guilds = [];
var queueNames = [];
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];
var now_playing = [];
/*
\\\\\\\\\\\\\\\\\\\\\\\\/////////////////////////
\\\\\\\\\\\\\\\\\\\\\\\\/////////////////////////
\\\\\\\\\\\\\\\\\\\\\\\\/////////////////////////
\\\\\\\\\\\\\\\\\\\\\\\\/////////////////////////
*/
client.on('ready', () => {});
console.log("Logged")
var download = function(uri, filename, callback) {
	request.head(uri, function(err, res, body) {
		console.log('content-type:', res.headers['content-type']);
		console.log('content-length:', res.headers['content-length']);

		request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
	});
};

client.on('message', function(message) {
	const member = message.member;
	const mess = message.content.toLowerCase();
	const args = message.content.split(' ').slice(1).join(' ');

	if (mess.startsWith(prefix + 'play')) {
		if (!message.member.hasPermission('ADMINISTRATOR')) return message.reply(':x:');
		if (!message.member.voiceChannel) return message.reply('** You Are Not In VoiceChannel **');
		// if user is not insert the URL or song title
		if (args.length == 0) {
			let play_info = new Discord.RichEmbed()
			    .setColor("RANDOM")
				.setAuthor(client.user.username, client.user.avatarURL)
				.setDescription('**$play url song / song name**')
			message.channel.sendEmbed(play_info)
			return;
		}
		if (queue.length > 0 || isPlaying) {
			getID(args, function(id) {
				add_to_queue(id);
				fetchVideoInfo(id, function(err, videoInfo) {
					if (err) throw new Error(err);
					let play_info = new Discord.RichEmbed()
						.setAuthor("Added To Queue", message.author.avatarURL)
						.setDescription(`**${videoInfo.title}**`)
						.setColor("RANDOM")
						.setFooter('Requested By:' + message.author.tag)
						.setImage(videoInfo.thumbnailUrl)
					//.setDescription('?')
					message.channel.sendEmbed(play_info);
					queueNames.push(videoInfo.title);
					// let now_playing = videoInfo.title;
					now_playing.push(videoInfo.title);

				});
			});
		}
		else {

			isPlaying = true;
			getID(args, function(id) {
				queue.push('placeholder');
				playMusic(id, message);
				fetchVideoInfo(id, function(err, videoInfo) {
					if (err) throw new Error(err);
					let play_info = new Discord.RichEmbed()
						.setAuthor(`Added To Queue`, message.author.avatarURL)
						.setDescription(`**${videoInfo.title}**`)
						.setColor("RANDOM")
						.setFooter('Requested By: ' + message.author.tag)
						.setThumbnail(videoInfo.thumbnailUrl)
					//.setDescription('?')
					message.channel.sendEmbed(play_info);
				});
			});
		}
	}
	else if (mess.startsWith(prefix + 'skip')) {
		if (!message.member.voiceChannel) return message.reply('**You Are Not In VoiceChannel**');
		message.reply(':gear: **Skipping**').then(() => {
			skip_song(message);
			var server = server = servers[message.guild.id];
			if (message.guild.voiceConnection) message.guild.voiceConnection.end();
		});
	}
	else if (message.content.startsWith(prefix + 'vol')) {
		if (!message.member.voiceChannel) return message.reply('**You Are Not In VoiceChannel**');
		// console.log(args)
		if (args > 100) return message.reply(':x: **100**');
		if (args < 1) return message.reply(":x: **1**");
		dispatcher.setVolume(1 * args / 50);
		message.channel.sendMessage(`Volume Updated To: **${dispatcher.volume*50}**`);
	}
	else if (mess.startsWith(prefix + 'pause')) {
		if (!message.member.voiceChannel) return message.reply('**You Are Not In VoiceChannel**');
		message.reply(':gear: **Paused**').then(() => {
			dispatcher.pause();
		});
	}
	else if (mess.startsWith(prefix + 'unpause')) {
		if (!message.member.voiceChannel) return message.reply('**You Are Not In VoiceChannel**');
		message.reply(':gear: **UnPaused**').then(() => {
			dispatcher.resume();
		});
	}
	else if (mess.startsWith(prefix + 'stop')) {
		if (!message.member.voiceChannel) return message.reply('**You Are Not In VoiceChannel**');
		message.reply(':name_badge: **Stopped**');
		var server = server = servers[message.guild.id];
		if (message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
	}
	else if (mess.startsWith(prefix + 'join')) {
		if (!message.member.voiceChannel) return message.reply('**You Are Not In VoiceChannel**');
		message.member.voiceChannel.join().then(message.react('✅'));
	}
	else if (mess.startsWith(prefix + 'play')) {
		getID(args, function(id) {
			add_to_queue(id);
			fetchVideoInfo(id, function(err, videoInfo) {
				if (err) throw new Error(err);
				if (!message.member.voiceChannel) return message.reply('**You Are Not In VoiceChannel**ه');
				if (isPlaying == false) return message.reply(':x:');
				let playing_now_info = new Discord.RichEmbed()
					.setAuthor(client.user.username, client.user.avatarURL)
					.setDescription(`**${videoInfo.title}**`)
					.setColor("RANDOM")
					.setFooter('Requested By:' + message.author.tag)
					.setImage(videoInfo.thumbnailUrl)
				message.channel.sendEmbed(playing_now_info);
				queueNames.push(videoInfo.title);
				// let now_playing = videoInfo.title;
				now_playing.push(videoInfo.title);

			});

		});
	}

	function skip_song(message) {
		if (!message.member.voiceChannel) return message.reply('**You Are Not In VoiceChannel**');
		dispatcher.end();
	}

	function playMusic(id, message) {
		voiceChannel = message.member.voiceChannel;


		voiceChannel.join().then(function(connectoin) {
			let stream = ytdl('https://www.youtube.com/watch?v=' + id, {
				filter: 'audioonly'
			});
			skipReq = 0;
			skippers = [];

			dispatcher = connectoin.playStream(stream);
			dispatcher.on('end', function() {
				skipReq = 0;
				skippers = [];
				queue.shift();
				queueNames.shift();
				if (queue.length === 0) {
					queue = [];
					queueNames = [];
					isPlaying = false;
				}
				else {
					setTimeout(function() {
						playMusic(queue[0], message);
					}, 500);
				}
			});
		});
	}

	function getID(str, cb) {
		if (isYoutube(str)) {
			cb(getYoutubeID(str));
		}
		else {
			search_video(str, function(id) {
				cb(id);
			});
		}
	}

	function add_to_queue(strID) {
		if (isYoutube(strID)) {
			queue.push(getYoutubeID(strID));
		}
		else {
			queue.push(strID);
		}
	}

	function search_video(query, cb) {
		request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
			var json = JSON.parse(body);
			cb(json.items[0].id.videoId);
		});
	}


	function isYoutube(str) {
		return str.toLowerCase().indexOf('youtube.com') > -1;
	}
});
client.on('guildMemberAdd', member => {
    var embed = new Discord.RichEmbed()
    .setAuthor(member.user.username, member.user.avatarURL)
    .setThumbnail(member.user.avatarURL)
    .setTitle(`عضو جديد`)
    .setDescription(`اهلا بك في السيرفر`)
    .addField(' :bust_in_silhouette:  انت رقم',`**[ ${member.guild.memberCount} ]**`,true)
    .setColor('GREEN')
    .setFooter(`AJ Bot`)

var channel =member.guild.channels.find('name', 'wlc')
if (!channel) return;
channel.send({embed : embed});
});

client.on('guildMemberRemove', member => {
    var embed = new Discord.RichEmbed()
    .setAuthor(member.user.username, member.user.avatarURL)
    .setThumbnail(member.user.avatarURL)
    .setTitle(`خرج عضو`)
    .setDescription(`الى اللقاء...`)
    .addField(':bust_in_silhouette:   تبقي',`**[ ${member.guild.memberCount} ]**`,true)
    .setColor('RED')
    .setFooter(`AJ Bot`)

var channel =member.guild.channels.find('name', 'wlc')
if (!channel) return;
channel.send({embed : embed});
});
client.on('message', message => {
	if (message.content === "جوكر") {
	 const embed = new Discord.RichEmbed()
 .setColor("RANDOM")
 .setDescription('مشغول ')
 message.channel.sendEmbed(embed);
   }
});
client.on('message', message => {
	if (message.content === "نودل") {
	 const embed = new Discord.RichEmbed()
 .setColor("RANDOM")
 .setDescription('آمر ؟')
 message.channel.sendEmbed(embed);
   }
});
client.login (process.env.BOT_TOKEN); 
client.on('ready', () => {
  client.user.setGame(`*Rando`,'https://www.twitch.tv/*Rando');
  console.log(' Game Is Online ');
});
const Eris = require("eris");
var iiserver = "380691386711801867";
var smart= new Eris(process.env.BOT_TOKEN);
 
smart.on("ready", ready => {
setInterval(function(){
    
                var currentTime = new Date(),
            hours = currentTime.getHours() + 0 ,
            minutes = currentTime.getMinutes(),
            seconds = currentTime.getSeconds(),
            years = currentTime.getFullYear(),
            month = currentTime.getMonth() + 1,
            day = currentTime.getDate(),
			week = currentTime.getDay();
           
             
 
            if (minutes < 10) {
                minutes = "0" + minutes;
            }
            var suffix = "AM";
            if (hours >= 12) {
                suffix = "PM";
                hours = hours - 12;
            }
            if (hours == 0) {
                hours = 12;
			}
smart.editChannel("392659408905043979", {name : "👑 - Users 「"+client.users.size+"」"});
smart.editChannel("390112111105146880", {name : "🕐 - Time   「" + hours + ":" + minutes  +" " + suffix + "」"}) 
smart.editChannel("390112110987968513", {name : "📅 - Date " + "「" + day + "-" + month + "-" + years + "」"})
smart.editChannel("390112111423913984", {name : "⌞ A ⌝"})
smart.editChannel("390112111423913984", {name : "⌞ Ar ⌝"})
smart.editChannel("390112111423913984", {name : "⌞ Ara ⌝"})
smart.editChannel("390112111423913984", {name : "⌞ Arab ⌝"})
smart.editChannel("390112111423913984", {name : "⌞ ArabJ ⌝"})
smart.editChannel("390112111423913984", {name : "⌞ ArabJo ⌝"})
smart.editChannel("390112111423913984", {name : "⌞ ArabJok ⌝"})
smart.editChannel("390112111423913984", {name : "⌞ ArabJoke ⌝"})
smart.editChannel("390112111423913984", {name : "⌞ ArabJoker ⌝"})


}, 6000);
});
smart.connect(process.env.BOT_TOKEN)
client.on('message', message => {
	
		 if (message.content === "$server") {
	var year = message.guild.createdAt.getFullYear()
	var month = message.guild.createdAt.getMonth()
	var day = message.guild.createdAt.getDate()
		 let embed = new Discord.RichEmbed()
	
	.addField('**SERVER NAME💳**: ' , message.guild.name)
	.addField('**SERVER ID🆔** :' , message.guild.id)
	.addField(' SERVER VERIFICATIONLEVEL❓  : ' , message.guild.verificationLevel)
	.addField('SERVER REGION�� : ' , message.guild.region)
	.addField('CHANNELS SIZE🔋 : ' , message.guild.channels.size)
	.addField('DEFAULT CHANNEL1⃣ : ' , message.guild.defaultChannel)
	.addField('ROLES🔢 : ' , message.guild.roles.size)
	.addField('SERVER CREATED IN🕑 : ' ,year + "-"+ month +"-"+ day)
	.addField('MEMBERS📡 : ' , message.guild.memberCount)
	.addField('SERVER OWNER👑 : ' , message.guild.owner)
	.setColor("#51cde6")
    .setFooter(`AJ Bot`)
		  message.channel.sendEmbed(embed);
	} 
	
	});
const yt = require('ytdl-core');
client.on('message', message => {
  if (message.content.startsWith('$quran.1')) {
    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.reply(`**يحب ان تكون في روم صوتي**`);
    voiceChannel.join()
      .then(connnection => {
        const stream = ytdl("https://www.youtube.com/watch?v=vqqvpP8TVfk&t", { filter: 'audioonly' });
        const dispatcher = connnection.playStream(stream);
        dispatcher.on('end', () => voiceChannel.leave());
      });
  }
});

client.on('message', message => {
  if (message.content.startsWith('$quran.2')) {
    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.reply(`**يحب ان تكون في روم صوتي**`);
    voiceChannel.join()
      .then(connnection => {
        const stream = ytdl("https://www.youtube.com/watch?v=qFq5h4wtjaM&t=30s", { filter: 'audioonly' });
        const dispatcher = connnection.playStream(stream);
        dispatcher.on('end', () => voiceChannel.leave());
      });
  }
});
client.on('message', message => {
  if (message.content.startsWith('$quran.3')) {
    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.reply(`**يحب ان تكون في روم صوتي**`);
    voiceChannel.join()
      .then(connnection => {
        const stream = ytdl("https://www.youtube.com/watch?v=mxUsXAwur5o&t=6s", { filter: 'audioonly' });
        const dispatcher = connnection.playStream(stream);
        dispatcher.on('end', () => voiceChannel.leave());
      });
  }
});

client.on('message', message => {
  if (message.content.startsWith('$quran.4')) {
    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.reply(`**يحب ان تكون في روم صوتي**`);
    voiceChannel.join()
      .then(connnection => {
        const stream = ytdl("https://www.youtube.com/watch?v=LTRcg-gR78o", { filter: 'audioonly' });
        const dispatcher = connnection.playStream(stream);
        dispatcher.on('end', () => voiceChannel.leave());
      });
  }
});

client.on('message', message => {
  if (message.content.startsWith('$quran.5')) {
    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.reply(`**يحب ان تكون في روم صوتي**`);
    voiceChannel.join()
      .then(connnection => {
        const stream = ytdl("https://www.youtube.com/watch?v=6Hzk5uPDaJk", { filter: 'audioonly' });
        const dispatcher = connnection.playStream(stream);
        dispatcher.on('end', () => voiceChannel.leave());
      });
  }
});
client.on('message', message => {
  if (message.content.startsWith('$quran.6')) {
    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.reply(`**يحب ان تكون في روم صوتي**`);
    voiceChannel.join()
      .then(connnection => {
        const stream = ytdl("https://www.youtube.com/watch?v=g46yT-neUnw", { filter: 'audioonly' });
        const dispatcher = connnection.playStream(stream);
        dispatcher.on('end', () => voiceChannel.leave());
      });
  }
});

client.on('message', message => {
  if (message.content.startsWith('$quran.7')) {
    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.reply(`**يحب ان تكون في روم صوتي**`);
    voiceChannel.join()
      .then(connnection => {
        const stream = ytdl("https://www.youtube.com/watch?v=g46yT-neUnw", { filter: 'audioonly' });
        const dispatcher = connnection.playStream(stream);
        dispatcher.on('end', () => voiceChannel.leave());
      });
  }
});
client.on("message", message => {
 if (message.content === "$quran") {

  const embed = new Discord.RichEmbed() 
      .setColor("RANDOM")
      .setThumbnail(message.author.avatarURL)
      .setDescription(` 
     🕋 اوامر بوت القرآن الكريم 🕋

$quran.1 سورة البقرة كاملة عبد الباسط عبد الصمد🗣
$quran.2 سورة البقرة كاملة للشيخ مشاري العفاسي🗣
$quran.3 سورة الكهف كاملة بصوت مشارى بن راشد العفاسي🗣
$quran.4 سورة الفاتحه بصوت الشيخ عبد الباسط عبد الصمد🗣
$quran.5 سورة يس كاملة للشيخ مشاري بن راشد العفاسي🗣
$quran.6 سورة الواقعه بصوت الشيخ مشاري بن راشد العفاسي🗣
$quran.7 سورة يوسف بصوت الشيخ مشاري بن راشد العفاسي🗣

$quran.stop لآيقاف القران الكريم

`)


message.channel.sendEmbed(embed)

}
});
client.on("message", message => {
	if(message.content === "$quran.stop" ) {
					var servers = {};
  
			  if (message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
	  
	}
  });
  
  client.login(process.env.BOT_TOKEN);
