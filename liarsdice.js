/**
 * The main game
 */

var lang = require('./lang')[require('./config').lang],
    sleep = require('node-sleep').sleep,

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

// Runtime settings
    status = STATUS_IDLE,

    variant = {
        spoton:      true,
        aces:        false,
        always_call: false
    },

    players        = [],
    players_dice   = {},
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
exports.set_announce = function(fn) { announce = fn; };

tell = function(nick, str) {};
exports.set_tell = function(fn) { tell = fn; };

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
    if (status !== STATUS_JOINING) {
        status = STATUS_JOINING;

        players        = [];
        players_dice   = {};
        current_player = -1;
        initial_bidder = -1;

        announce(lang.game_init_timeout.format({ nick: nick, seconds: TIMEOUT_JOINING }));
        timer.start();
    } else {
        if (players.length < MIN_PLAYERS) {
            announce(lang.e_too_few_players.format());
            status = STATUS_IDLE;
        } else {
            status = STATUS_PLAYING;
            round_start(0); // first one to join - first one to bid
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
                subtotal = lang.num_none;
            } else if (subtotal === 1) {
                subtotal = lang.num_one;
            }

            sleep(1);
            announce(lang.dice_reveal.format({
                nick: player,
                count: subtotal,
                face: face + (subtotal !== lang.num_one ? lang.face_mult : ''),
                total: total
            }));
            sleep(1);
        }
    }

    return total;
};

/**
 * Check if the game has ended
 *
 * @returns {Boolean}
 */
game_ended = function() {
    if (players.length === 1) {
        announce(lang.game_finish.format({ nick: players[0] }));
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
    var total, dice_left, finish = false,
        id_loser, tmp;

    if (!player.try_challenge(nick)) {
        return;
    }

    announce(lang.bid_challenged.format({ nick: nick, bidder: get_nick.prev() }));

    total = reveal_dice(current_bid[1]);

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

    dice_left = --players_dice[get_nick[id_loser]()].count;
    if (dice_left === 0) {
        finish = player.lost(get_nick[id_loser]());
    }

    total_dice -= 1;

    if (!finish) {
        setTimeout(function() {
            round_start(get_id[id_loser]());
        }, TIMEOUT_ROUND * 1000);
    }
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
    total = reveal_dice(current_bid[1]);

    if (total === current_bid[0]) {
        if (total === 1) {
            total = lang.num_one;
        }

        announce(
            lang.spoton_true.format({ count: total, face: current_bid[1] + (total !== lang.num_one ? lang.face_mult : '') }) + ' ' +
            (players.length === 2 ? lang.spoton_true2_single.format({ nick: get_nick.next() }) : lang.spoton_true2.format())
        );

        for (player_nick in players_dice) {
            if (player_nick !== nick && players_dice.hasOwnProperty(player_nick)) {
                dice_left = --players_dice[player_nick].count;
                if (dice_left === 0) {
                    finish = player.lost(player_nick);
                    sleep(1);
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

        dice_left = --players_dice[nick].count;
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

    if (status === STATUS_IDLE || !players_dice[nick]) {
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
    if (status === STATUS_IDLE || !players_dice[nick]) {
        return;
    }

    if (silent !== true) {
        announce(lang.player_quit.format({ nick: nick }));
    }
    player.remove(nick);

    if (status !== STATUS_JOINING && nick == current_nick) {
        if (!game_ended()) {
            current_player = get_id.next();
            announce(lang.player_next.format({ nick: get_nick.current() }));
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
    delete(players_dice[nick]);
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

    players_dice[newnick] = players_dice[oldnick];
    delete(players_dice[oldnick]);
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

    for (player in players_dice) {
        if (players_dice.hasOwnProperty(player) && !!players_dice[player].count) {
            str += player + '(' + players_dice[player].count + ') ';
        }
    }

    announce(str);
};

/**
 * A player called command
 *
 * @param {String} nick
 * @param {String} command
 * @param {Array}  arguments
 */
player.__command = function(nick, command, arguments) {
    switch (command) {

    case 'init':
    case 'join':
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

    }
};


// exports
exports.player_command = player.__command;
exports.player_rename = player.rename;
exports.player_quit = player.quit;
exports.activity = timer.game;
