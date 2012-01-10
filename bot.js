#!/usr/bin/env node

/*
 * Bot.js loads the game module and starts the IRC bot
 */

var irc    = require('irc'),
    config = require('./config'),
    lang   = require('./lang')[config.lang],
    game   = require('./liarsdice'),
    bot;

// Initializes the bot
bot = new irc.Client(config.server, config.nick, {
    port:     config.port || 6667,
    channels: [config.channel],
    userName: config.user || config.nick,
    realName: config.real || config.nick,

    autoConnect: false
});

// Set callback functions
game.set_announce(function(str) {
    bot.say(config.channel, str);
});

game.set_tell(function(nick, str) {
   bot.notice(nick, str);
});

// Player has a new nick
bot.addListener('nick', function(oldnick, newnick) {
    game.player_rename(oldnick, newnick);
});

// Player quits
bot.addListener('part' + config.channel, function(nick) {
    game.player_quit(nick);
});

bot.addListener('quit', function(nick) {
    game.player_quit(nick);
});

bot.addListener('kick', function(chan, nick) {
    if (chan === config.channel) {
        game.player_quit(nick);
    }
});

// Identify with NickServ
bot.addListener('notice', function(nick, to, text) {
    if (nick === 'NickServ' && text.match(/^This nickname is registered\./)) {
        bot.say('NickServ', 'IDENTIFY ' + require('./password').password);
    }
});

// Main message listener
bot.addListener('message' + config.channel, function(nick, message) {
    var command, match;

    // log activity
    game.activity();

    for (command in lang.command) {
        if (lang.command.hasOwnProperty(command)) {
            match = message.match(lang.command[command]);
            if (!!match) {
                game.player_command(nick, command, match.splice(1));
            }
        }
    }
});

// Connect the bot!
bot.connect();
