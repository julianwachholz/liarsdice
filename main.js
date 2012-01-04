#!/usr/bin/env node

/**
 * Liar's Dice game implementation for node
 *
 * @author jwa
 * @version 2012-01-03
 */

var config = require('./config').config,
    lang   = require('./lang')[config.lang],
    game   = require('./liarsdice'),
    irc    = require('irc'),
    bot;

// Initializes the bot
bot = new irc.Client(config.server, config.nick, {
    port:     config.port || 6667,
    channels: [config.channel],
    userName: config.user || config.nick,
    realName: config.real || config.nick,

    autoConnect: false
});

game.set_announce(function(str) {
    bot.say(config.channel, str);
});

game.set_tell(function(nick, str) {
   bot.notice(nick, str);
});

bot.addListener('nick', function(oldnick, newnick) {
    game.player_rename(oldnick, newnick);
});

bot.addListener('part' + config.channel, function(nick) {
    game.player_lost(nick, true);
});

bot.addListener('quit', function(nick) {
    game.player_lost(nick, true);
});

bot.addListener('message' + config.channel, function(nick, message) {
    var command, match;

    for (command in lang.command) {
        if (lang.command.hasOwnProperty(command)) {
            match = message.match(lang.command[command]);
            if (!!match) {
                game.player_command(nick, command, match.splice(1));
            }
        }
    }
});

bot.connect();
