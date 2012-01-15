/**
 * The main game
 */

var mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId,

    config = require('./config'),
    lang = require('./lang')[config.lang],

// Constants
    STATUS_IDLE    = 0,
    STATUS_JOINING = 1,
    STATUS_PLAYING = 2,

    TIMEOUT_JOINING = 60,
    TIMEOUT_ROUND   = 10,
    TIMEOUT_REMIND  = 120,
    TIMEOUT_TURN    = 3,    // minutes
    TIMEOUT_GAME    = 11,   // minutes

    MIN_PLAYERS  = 2,
    MAX_PLAYERS  = 5,
    INITIAL_DICE = 5,

    FACE_MIN = 1,
    FACE_MAX = 6,

// MongoDB collection reference for player statistics
    stats_enabled = false,
    stats,
    stats_global_objectid = null,

// Runtime settings
    status = STATUS_IDLE,

    variant = {
        spoton:      true,
        aces:        false,
        always_call: false
    },

    players        = [],
    players_info   = {},
    current_player = -1,
    initial_bidder = -1,
    total_dice     = 0,

    current_bid    = [0,0],

    // Timeouts & reminders
    timer,

// Functions to talk with players
    announce,
    tell,

// Internal functions
    game_start,
    game_ended,
    reveal_dice,
    round_start,

    get_nick, // get nicks
    get_id,   // get player IDs
    player;   // player functions

announce = function(str) {};
tell = function(nick, str) {};

/**
 * Get player IDs
 */
get_id = {
    current: function() {
        return current_player;
    },
    prev: function() {
        return current_player - 1 < 0 ? players.length - 1 : current_player - 1;
    },
    next: function() {
        return current_player + 1 >= players.length ? 0 : current_player + 1;
    }
};

/**
 * Get player nicks
 */
get_nick = {
    current: function() {
        return players[get_id.current()];
    },
    prev: function() {
        return players[get_id.prev()];
    },
    next: function() {
        return players[get_id.next()];
    }
}


/**
 * Starts or initializes a new game
 */
game_start = function(nick) {
    var stat_update;

    if (status !== STATUS_JOINING) {
        status = STATUS_JOINING;

        players        = [];
        players_info   = {};
        current_player = -1;
        initial_bidder = -1;

        announce(lang.game_init_timeout.format({ nick: nick, seconds: TIMEOUT_JOINING }));
        timer.start();
    } else {
        if (players.length < MIN_PLAYERS) {
            announce(lang.e_too_few_players.format());
            stat_update = { $inc: { notstarted: 1 } };
            status = STATUS_IDLE;
        } else {
            stat_update = { $inc: { total: 1 } };
            status = STATUS_PLAYING;
            round_start(0); // first one to join - first one to bid
        }

        if (stats_enabled) {
            stats.update({ _id: stats_global_objectid }, stat_update);
            if (status === STATUS_PLAYING) {
                players_info.forEach(function(player) {
                    stats.update({ _id: player.objectI }, { $inc: { total: 1 } });
                });
            }
        }
    }
};

/**
 * Every player shakes their cup and throws their dice
 *
 * @param {Number} player_id Initial bid goes to this guy
 */
round_start = function(player_id) {
    var nick, dice_count, faces, i;

    total_dice = 0;

    if (game_ended()) {
        return;
    }

    for (nick in players_info) {
        if (players_info.hasOwnProperty(nick)) {
            faces = [];
            dice_count = players_info[nick].count;
            total_dice += dice_count;

            for (i = 0; i < dice_count; i++) {
                faces.push(Math.floor(Math.random() * (FACE_MAX - FACE_MIN + 1)) + FACE_MIN);
            }

            players_info[nick].faces = faces;
            tell(nick, lang.player_rolled.format({ dice: faces.join(' ') }));
        }
    }

    announce(lang.game_round_start.format());
    current_bid = [0,0];

    current_player = initial_bidder = !!players[player_id] ? player_id : get_id.next();

    announce(lang.player_initial.format({ nick: get_nick.current() }));
    timer.remind(get_nick.current());
};

/**
 * Reveals all dice and counts the total number of face and returns it
 *
 * @param {Number} face
 * @param {Function} fn Callback that accepts the total of face showing dice
 */
reveal_dice = function(face, fn) {
    var total = 0, subtotal, i, player, iteration = 1;

    for (player in players_info) {
        if (players_info.hasOwnProperty(player) && !!players_info[player].count) {
            subtotal = 0;
            for (i = 0; i < players_info[player].count; i++) {
                if (players_info[player].faces[i] === face) {
                    subtotal += 1;
                    total += 1;
                }
            }

            if (subtotal === 0) {
                subtotal = lang.num_none;
            } else if (subtotal === 1) {
                subtotal = lang.num_one;
            }

            setTimeout(function(player, subtotal, face, total) {
                return function() {
                    announce(lang.dice_reveal.format({
                        nick: player,
                        count: subtotal,
                        face: face + (subtotal !== lang.num_one ? lang.face_mult : ''),
                        total: total
                    }));
                }
            }(player, subtotal, face, total), 1000 * iteration++);
        }
    }

    setTimeout(function() {
        fn(total);
    }, 1000 * iteration);
};

/**
 * Check if the game has ended
 *
 * @returns {Boolean}
 */
game_ended = function() {
    if (players.length === 1) {
        announce(lang.game_finish.format({ nick: players[0] }));
        if (stats_enabled) {
            stats.update({ _id: players_info[nick].objectId }, {
                $inc: {
                    wins: 1,
                    perfectwins: players_info[nick].count === INITIAL_DICE ? 1 : 0,
                    singlewins: players_info[nick].count === 1 ? 1 : 0
                }
            });
        }
        status = STATUS_IDLE;
        return true;
    }
    return false;
};

// Timeout & reminder functions
timer = {
    timer_remind: null,
    timer_turn:   null,
    timer_game:   null,
    throttle: {},

    /**
     * Reminds player of game starting in 10s
     */
    start: function() {
        setTimeout(game_start, TIMEOUT_JOINING * 1000);
        setTimeout(function() {
            if (players.length >= MIN_PLAYERS) {
                announce(lang.timeout_start.format({ players: players.join(', ') }));
            }
        }, (TIMEOUT_JOINING - 10) * 1000);
    },

    /**
     * Reminds a player of his turn
     *
     * @param  {String|Boolean} nick Supply false just to clear the timers and not start a new one
     */
    remind: function(nick) {
        clearTimeout(this.timer_remind);
        clearTimeout(this.timer_turn);

        if (nick !== false) {
            this.timer_remind = setTimeout(function() {
                if (status !== STATUS_PLAYING) { return; }
                announce(lang.timeout_round.format({ nick: nick }));
                timer.turn(nick);
            }, TIMEOUT_REMIND * 1000);
        }
    },

    /**
     * Kicks a player after some time of inactivity
     * @private
     *
     * @param  {String} nick
     */
    turn: function(nick) {
        clearTimeout(this.timer_turn);
        this.timer_turn = setTimeout(function() {
            if (status !== STATUS_PLAYING) { return; }
            announce(lang.timeout_player.format({ nick: nick, minutes: TIMEOUT_TURN }));
            player.quit(nick, true);
        }, TIMEOUT_TURN * 60 * 1000);
    },

    /**
     * Ends the game after long time of inactivity
     */
    game: function() {
        clearTimeout(this.timer_game);
        this.timer_game = setTimeout(function() {
            if (status !== STATUS_PLAYING) { return; }
            announce(lang.timeout_game.format({ minutes: TIMEOUT_GAME }));
            if (stats_enabled) {
                stats.update({ _id: stats_global_objectid }, {
                    $inc: { nowinner: 1 }
                });
            }
            status = STATUS_IDLE;
        }, TIMEOUT_GAME * 60 * 1000);
    },

    /**
     * Set a throttle limit for a given command identifier
     *
     * @param {String} name
     * @param {Number} timeout Seconds to throttle
     * @return {Boolean} false if throttled
     */
    throttle: function(name, timeout) {
        var throttle = this.throttle[name];
        this.throttle[name] = new Date();

        if (!throttle) {
            return true;
        }

        return (this.throttle[name].getTime() - throttle.getTime()) / 1000 > timeout;
    }
};

// Player functions
player = {};

/**
 * New player joins the game
 *
 * @param {String}  nick
 * @param {Boolean} silent
 */
player.join = function(nick, silent) {
    if (status === STATUS_IDLE) {
        game_start(nick);
        silent = true;
    }

    if (status !== STATUS_JOINING) {
        announce(lang.e_cannot_join.format({ nick: nick }));
        return;
    }

    if (nick in players_info) {
        announce(lang.e_already_joined.format({ nick: nick }));
        return;
    }

    if (players.length >= MAX_PLAYERS) {
        announce(lang.e_too_many_players.format({ nick: nick }));
        return;
    }

    players.push(nick);
    players_info[nick] = {
        count: INITIAL_DICE,
        faces: [],
        objectId: null
    };

    if (stats_enabled) {
        stats.findOne({ nick: nick }, function(err, doc) {
            if (!!doc) {
                players_info[nick].objectId = doc._id;
            } else {
                stats.insert({ nick: nick, total: 0, wins: 0 }, function(err, docs) {
                    players_info[nick].objectId = docs[0]._id;
                });
            }
        });
    }

    if (silent !== true) {
        announce(lang.player_join.format({ nick: nick }));
    }
};

/**
 * Player places a bid
 *
 * @param {String} nick
 * @param {Number} count
 * @param {Number} face
 */
player.bid = function(nick, count, face) {
    if (nick !== get_nick.current()) {
        return;
    }

    if (count > total_dice) {
        announce(lang.e_bid_too_many_dice.format({ nick: nick, total: total_dice }));
        return;
    }

    if (face < FACE_MIN || face > FACE_MAX) {
        announce(lang.e_no_such_face.format({ nick: nick }));
        return;
    }

    if (count > current_bid[0] || count == current_bid[0] && face > current_bid[1]) {
        current_bid = [count, face];
        current_player = get_id.next();

        if (count === 1) {
            announce(lang.bid_placed_single.format({ nick: get_nick.prev(), face: face }));
        } else {
            announce(lang.bid_placed.format({ nick: get_nick.prev(), count: count, face: face }));
        }

        announce(lang.player_next.format({ nick: get_nick.current() }));
        timer.remind(get_nick.current());
    } else {
        announce(lang.e_bid_illegal.format({ nick: get_nick.current() }));
    }
};

/**
 * Check if a challenge may be played now
 *
 * @param {String} nick
 *
 * @returns {Boolean} true if player can challenge at this time
 */
player.try_challenge = function(nick) {
    if (status !== STATUS_PLAYING || nick !== get_nick.current()) {
        return false;
    }

    if (current_bid[0] === 0) {
        announce(lang.e_no_bid.format({ nick: nick }));
        return false;
    }

    timer.remind(false);
    return true;
};

/**
 * Challenges the previous bid
 *
 * @param {String} nick
 */
player.challenge = function(nick) {
    var dice_left, finish = false,
        id_loser, tmp;

    if (!player.try_challenge(nick)) {
        return;
    }

    announce(lang.bid_challenged.format({ nick: nick, bidder: get_nick.prev() }));

    reveal_dice(current_bid[1], function(total) {
        if (total < current_bid[0]) {
            id_loser = 'prev';

            tmp = 'bid_bluff';
            if (total === 0) {
                tmp += '_none';
            } else if (total === 1) {
                total = lang.num_one;
            }

            announce(
                lang[tmp].format({ count: total, face: current_bid[1] + (total !== lang.num_one ? lang.face_mult : '') }) + ' ' +
                lang.bid_bluff2.format({ nick: get_nick.prev() })
            );
        } else {
            id_loser = 'current';
            tmp = current_bid[0];

            if (tmp === 1) {
                tmp = lang.num_one;
            }

            announce(
                lang.bid_valid.format({ count: tmp, face: current_bid[1] + (tmp !== lang.num_one ? lang.face_mult : '') }) + ' ' +
                lang.bid_valid2.format({ nick: get_nick.current() })
            );
        }

        dice_left = --players_info[get_nick[id_loser]()].count;
        if (dice_left === 0) {
            finish = player.lost(get_nick[id_loser]());
        }

        total_dice -= 1;

        if (!finish) {
            setTimeout(function() {
                round_start(get_id[id_loser]());
            }, TIMEOUT_ROUND * 1000);
        }
    });
};

/**
 * Player says the last bid is exactly correct
 *
 * @param {String} nick
 */
player.spoton = function(nick) {
    var total, player_nick, dice_left, id_loser, finish = false;

    if (!player.try_challenge(nick)) {
        return;
    }

    if (!variant.spoton) {
        return;
    }

    announce(lang.spoton.format({ nick: nick }));
    total = reveal_dice(current_bid[1], function(total) {
        if (total === current_bid[0]) {
            if (total === 1) {
                total = lang.num_one;
            }

            announce(
                lang.spoton_true.format({ count: total, face: current_bid[1] + (total !== lang.num_one ? lang.face_mult : '') }) + ' ' +
                (players.length === 2 ? lang.spoton_true2_single.format({ nick: get_nick.next() }) : lang.spoton_true2.format())
            );

            for (player_nick in players_info) {
                if (player_nick !== nick && players_info.hasOwnProperty(player_nick)) {
                    dice_left = --players_info[player_nick].count;
                    if (dice_left === 0) {
                        finish = player.lost(player_nick);
                    }
                }
            }

            id_loser = 'next';
        } else {
            if (total === 0) {
                total = lang.num_none;
            } else if (total === 1) {
                total = lang.num_one;
            }

            announce(
                lang.spoton_wrong.format({ count: total, face: current_bid[1] + (total !== lang.num_one ? lang.face_mult : '') }) + ' ' +
                lang.spoton_wrong2.format({ nick: nick })
            );

            dice_left = --players_info[nick].count;
            if (dice_left === 0) {
                finish = player.lost(nick);
            }

            id_loser = 'current';
        }

        if (!finish) {
            setTimeout(function() {
                round_start(get_id[id_loser]());
            }, TIMEOUT_ROUND * 1000);
        }
    });
};

/**
 * Removes a player once he has zero dice
 *
 * @param {String} nick
 * @param {Boolean} forceful - will start a new round if player quit
 * @returns {Boolean} true if game is over
 */
player.lost = function(nick) {
    var i;

    if (status === STATUS_IDLE || !players_info[nick]) {
        return;
    }

    if (status !== STATUS_JOINING) {
        announce(lang.player_lost.format({ nick: nick }));
    }

    player.remove(nick);
    return game_ended();
};

/**
 * Player quits or has lost, removes him from the current game
 * and initiates a new round
 *
 * @param {String} nick
 * @param {Boolean} silent
 */
player.quit = function(nick, silent) {
    var current_nick = get_nick.current();
    if (status === STATUS_IDLE || !players_info[nick]) {
        return;
    }

    if (silent !== true) {
        announce(lang.player_quit.format({ nick: nick }));
    }
    player.remove(nick);

    if (status !== STATUS_JOINING && nick == current_nick) {
        if (!game_ended()) {
            current_player = get_id.next();
            if (current_bid[0] === 0) {
                announce(lang.player_initial.format({ nick: get_nick.current() }));
            } else {
                announce(lang.player_next.format({ nick: get_nick.current() }));
            }
        }
    }
};

/**
 * Removes a player from the game
 *
 * @param {String} nick
 */
player.remove = function(nick) {
    for (i = 0; i < players.length; i++) {
        if (players[i] === nick) {
            players.splice(i,1);
            break;
        }
    }
    delete(players_info[nick]);
};

/**
 * Renames a player
 *
 * @param {String} oldnick
 * @param {String} newnick
 */
player.rename = function(oldnick, newnick) {
    var i, len = players.length;

    for (i = 0; i < len; i++) {
        if (players[i] === oldnick) {
            players[i] = newnick;
            break;
        }
    }

    players_info[newnick] = players_info[oldnick];
    delete(players_info[oldnick]);
};

/**
 * Shows how many dice are left in the current round
 */
player.dice_left = function() {
    var player, str;

    if (status !== STATUS_PLAYING) {
        return;
    }

    if (!timer.throttle('dice_left', 10)) {
        return;
    }

    str = lang.dice_left.format();

    for (player in players_info) {
        if (players_info.hasOwnProperty(player) && !!players_info[player].count) {
            str += player + '(' + players_info[player].count + ') ';
        }
    }

    announce(str);
};

/**
 * Shows a player's or global statistics
 *
 * @param {Function} reply_fn
 * @param {String} stats_for
 */
player.stats = function(reply_fn, stats_for) {
    var cursor, highscore, i;

    if (reply_fn === announce && !timer.throttle('stats', 10)) {
        return;
    }

    if (!!stats_for && stats_for.trim() !== '') {
        stats.findOne({ nick: stats_for.trim() }, function(err, doc) {
            if (!!doc) {
                reply_fn(lang.stats_player.format({
                    nick: doc.nick,
                    total: doc.total,
                    wins: doc.wins,
                    winpercent: Math.round(doc.wins * 100 / doc.total)
                }));
                if (doc.perfectwins) {
                    reply_fn(lang.stats_player_perfect.format({ perfectwins: doc.perfectwins }));
                }
                if (doc.singlewins) {
                    reply_fn(lang.stats_player_single.format({ singlewins: doc.singlewins }));
                }
            } else {
                reply_fn(lang.e_stats_unknown.format());
            }
        });
    } else {
        stats.findOne({ _id: stats_global_objectid }, function(err, global_stats) {
            if (err) {
                reply_fn(lang.e_db.format({error: err.message }))
            } else {
                reply_fn(lang.stats_global.format({
                    total: global_stats.total,
                    nowinner: global_stats.nowinner,
                    notstarted: global_stats.notstarted
                }));

                cursor = stats.find({ nick: { $ne: config.mongodb.global_nick } });
                cursor.sort('wins', -1).limit(3);
                cursor.count(function(err, num) {
                    if (!err && num === 3) {
                        highscore = {};
                        for (i = 0; i < 3; i++) {
                            cursor.nextObject(function(i) {
                                return function(err, doc) {
                                    if (!!doc) {
                                        var j = i+1;
                                        highscore['nick'+j] = doc.nick;
                                        highscore['wins'+j] = doc.wins;

                                        if (j === 3) {
                                            reply_fn(lang.stats_global.format(stats_highscore));
                                        }
                                    }
                                };
                            }(i));
                        }
                    }
                });
            }
        });
    }
};

/**
 * A player called command
 *
 * @param {String}  nick
 * @param {String}  command
 * @param {Array}   arguments
 * @param {Boolean} is_pm
 */
player.__command = function(nick, command, arguments, is_pm) {
    if (is_pm !== true) {
        is_pm = false;
    }

    switch (command) {

    case 'init':
        if (status !== STATUS_PLAYING) {
            if (status === STATUS_IDLE) {
                game_start(nick);
                player.join(nick, true);
            } else {
                player.join(nick);
            }
        } else if (status === STATUS_PLAYING) {
            announce(lang.e_already_playing.format({ nick: nick }));
        }
        break;

    case 'bid':
        player.bid(nick, parseInt(arguments[0], 10), parseInt(arguments[1], 10));
        break;

    case 'challenge':
        player.challenge(nick);
        break;

    case 'spoton':
        player.spoton(nick);
        break;

    case 'dice_left':
        player.dice_left();
        break;

    case 'quit':
        player.quit(nick);
        break;

    case 'stats':
        player.stats(is_pm ? function (str) {
            tell(nick, str);
        } : announce, arguments[0]);
        break;

    }
};


// exports
exports.set_announce = function(fn) { announce = fn; };
exports.set_tell = function(fn) { tell = fn; };
exports.set_stats_collection = function(collection, callback) {
    stats_enabled = true;
    stats = collection;
    stats.findOne({ nick: config.mongodb.global_nick }, function(err, doc) {
        if (!!doc) {
            stats_global_objectid = doc._id;
            callback();
        } else {
            stats.insert({
                nick: config.mongodb.global_nick
            }, function(err, docs) {
                stats_global_objectid = docs[0]._id;
                callback();
            });
        }
    });
};

exports.player_command = player.__command;
exports.player_rename = player.rename;
exports.player_quit = player.quit;
exports.activity = timer.game;
