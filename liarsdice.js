/**
 * The main game
 */

var lang = require('./lang')[require('./config').config.lang],

// Constants
    STATUS_IDLE    = 0,
    STATUS_JOINING = 1,
    STATUS_PLAYING = 2,

    TIMEOUT_JOINING = 30,
    TIMEOUT_ROUND   = 5,
    TIMEOUT_TURN    = 60,

    MIN_PLAYERS  = 2,
    MAX_PLAYERS  = 5,
    INITIAL_DICE = 5,

    FACE_MIN = 1,
    FACE_MAX = 6,

// Runtime settings
    status = STATUS_IDLE,

    variant_use_aces          = false,
    variant_allow_spoton      = false,
    variant_always_allow_call = false,

    players        = [],
    players_dice   = {},
    current_player = -1,
    initial_bidder = -1,
    total_dice     = 0,

    current_bid    = [0,0],


// Functions to talk with players
    announce,
    tell,

// Internal functions
    nick_current,
    nick_prev,
    nick_next,

    init,
    start,
    player_reminder,

    player_join,
    player_bid,
    player_challenge,
    player_dice_left,

    reveal_dice,
    round_start;

/**
 * Formats a string
 *
 * @param {Object} variables
 */
String.prototype.format = function(variables) {
    var str = this, key, r;
    for (key in variables) {
        if (variables.hasOwnProperty(key)) {
            r = new RegExp('{' + key + '}', 'g');
            str = str.replace(r, variables[key]);
        }
    }

    return str;
};

announce = function(str) {};
exports.set_announce = function(fn) {
    announce = fn;
};

tell = function(nick, str) {};
exports.set_tell = function(fn) {
    tell = fn;
};


/**
 * Initializes a new game
 *
 * @param {String} nick
 */
init = function(nick) {
    status = STATUS_JOINING;

    players = [];
    players_dice = {};
    current_player = -1;
    initial_bidder = -1;

    setTimeout(start, TIMEOUT_JOINING * 1000);
    announce(lang.game_init_timeout.format({ nick: nick, seconds: TIMEOUT_JOINING }));
};

/**
 * Starts the game
 */
start = function() {
    if (players.length < MIN_PLAYERS) {
        announce(lang.e_too_few_players);
        status = STATUS_IDLE;
    } else {
        status = STATUS_PLAYING;
        round_start();
    }
};

/**
 * Get nicks
 */
exports.nick_current = nick_current = function() {
    return players[current_player];
};
exports.nick_prev = nick_prev = function() {
    var i = current_player - 1 < 0 ? players.length - 1 : current_player - 1;
    return players[i];
};
exports.nick_next = nick_next = function() {
    var i = current_player + 1 >= players.length ? 0 : current_player + 1;
    return players[i];
};

/**
 * New player joins the game
 *
 * @param {String}  nick
 * @param {Boolean} silent
 */
player_join = function(nick, silent) {
    if (status === STATUS_IDLE) {
        init(nick);
        silent = true;
    }

    if (status !== STATUS_JOINING) {
        announce(lang.e_cannot_join.format({ nick: nick }));
        return;
    }

    if (nick in players_dice) {
        announce(lang.e_already_joined.format({ nick: nick }));
        return;
    }

    if (players.length >= MAX_PLAYERS) {
        announce(lang.e_too_many_players.format({ nick: nick }));
        return;
    }

    players.push(nick);
    players_dice[nick] = {
        count: INITIAL_DICE,
        faces: []
    };

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
player_bid = function(nick, count, face) {
    if (nick !== nick_current()) {
        return;
    }

    if (count > total_dice) {
        announce(lang.bid_too_many_dice.format({ nick: nick, total: total_dice }));
        return;
    }

    if (count > current_bid[0] || count == current_bid[0] && face > current_bid[1]) {
        current_bid = [count, face];
        current_player = current_player + 1 >= players.length ? 0 : current_player + 1;
        announce(lang.bid_placed.format({ nick: nick_prev(), count: count, face: face }));
        announce(lang.player_next.format({ nick: nick_current() }));
    } else {
        announce(lang.bid_illegal);
    }
};

/**
 * Challenges the previous bid
 *
 * @param {String} nick
 */
player_challenge = function(nick) {
    var total, dice_left, finish = false;

    if (nick !== nick_current()) {
        return;
    }

    announce(lang.bid_challenged.format({ nick: nick_current() }));

    total = reveal_dice(current_bid[1]);

    if (total < current_bid[0]) {
        announce(lang.bid_bluff.format({ count: total, face: current_bid[1] }));
        announce(lang.bid_bluff2.format({ nick: nick_prev() }));

        dice_left = --players_dice[nick_prev()].count;

        if (dice_left === 0) {
            finish = exports.player_lost(nick_prev());
        }
    } else {
        announce(lang.bid_valid.format({ count: current_bid[0], face: current_bid[1] }));
        announce(lang.bid_valid2.format({ nick: nick_current() }));

        dice_left = --players_dice[nick_current()].count;

        if (dice_left === 0) {
            finish = exports.player_lost(nick_current());
        }
    }

    total_dice -= 1;

    if (!finish) {
        setTimeout(round_start, TIMEOUT_ROUND * 1000)
    }
};

/**
 * Removes a player once he has zero dice
 *
 * @param {String} nick
 * @param {Boolean} forceful - will start a new round if player quit
 * @returns {Boolean} true if game is over
 */
exports.player_lost = function(nick, forceful) {
    var i;
    announce(lang.lost.format({ nick: nick }));

    for (i = 0; i < players.length; i++) {
        if (players[i] === nick) {
            players.splice(i,1);
            break;
        }
    }
    delete(players_dice[nick]);

    if (players.length === 1) {
        announce(lang.finish.format({ nick: players[0] }));
        status = STATUS_IDLE;
        return true;
    }

    if (forceful === true) {
        setTimeout(round_start, TIMEOUT_ROUND * 1000);
    }
    return false;
};

/**
 * Shows how many dice are left in the current round
 */
player_dice_left = function() {
    var player, str;

    if (status !== STATUS_PLAYING) {
        return;
    }

    str = 'dice left in this round: ';

    for (player in players_dice) {
        if (players_dice.hasOwnProperty(player) && !!players_dice[player].count) {
            str += player + '(' + players_dice[player].count + ') ';
        }
    }

    announce(str);
};

/**
 * Renames a player
 *
 * @param {String} oldnick
 * @param {String} newnick
 */
exports.player_rename = function(oldnick, newnick) {
    var i, len = players.length;

    for (i = 0; i < len; i++) {
        if (players[i] === oldnick) {
            players[i] = newnick;
            break;
        }
    }

    players_dice[newnick] = players_dice[oldnick];
    delete(players_dice[oldnick]);
};

/**
 * A player called command
 *
 * @param {String} nick
 * @param {String} command
 * @param {Array}  arguments
 */
exports.player_command = function(nick, command, arguments) {
    switch (command) {

    case 'init':
        if (status === STATUS_IDLE) {
            init(nick);
            player_join(nick, true);
            break;
        } else if (status === STATUS_PLAYING) {
            announce(lang.e_already_playing.format({ nick: nick }));
        }

    case 'join':
        player_join(nick);
        break;

    case 'bid':
        player_bid(nick, parseInt(arguments[0], 10), parseInt(arguments[1], 10));
        break;

    case 'challenge':
        if (current_bid[0] === 0) {
            announce(lang.e_no_bid.format({ nick: nick }));
        } else {
            player_challenge(nick);
        }
        break;

    case 'dice_left':
        player_dice_left();
        break;

    }
};

/**
 * Every player shakes their cup and throws their dice
 * Round begins
 */
round_start = function() {
    var nick, dice_count, faces, i;

    total_dice = 0;

    for (nick in players_dice) {
        if (players_dice.hasOwnProperty(nick)) {
            faces = [];
            dice_count = players_dice[nick].count;
            total_dice += dice_count;

            for (i = 0; i < dice_count; i++) {
                faces.push(Math.floor(Math.random() * (FACE_MAX - FACE_MIN + 1)) + FACE_MIN);
            }

            players_dice[nick].faces = faces;
            tell(nick, lang.player_rolled.format({ dice: faces.join(' ') }));
        }
    }

    announce(lang.round_start);
    current_bid = [0,0];

    initial_bidder = initial_bidder + 1 >= players.length ? 0 : initial_bidder + 1;
    current_player = initial_bidder;

    announce(lang.player_initial.format({ nick: players[initial_bidder] }));
};

/**
 * Reveals all dice and counts the total number of face and returns it
 *
 * @param {Number} face
 * @returns {Number}
 */
reveal_dice = function(face) {
    var total = 0, subtotal, i, player;

    for (player in players_dice) {
        if (players_dice.hasOwnProperty(player)) {
            subtotal = 0;
            for (i = 0; i < players_dice[player].count; i++) {
                if (players_dice[player].faces[i] === face) {
                    subtotal += 1;
                    total += 1;
                }
            }

            if (subtotal === 0) {
                subtotal = 'no';
            }

            announce(lang.reveal.format({ nick: player, count: subtotal, face: face, total: total }));
        }
    }

    return total;
};
