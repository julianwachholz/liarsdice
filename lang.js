// Format functions to be used with language strings

/**
 * Formats a string
 *
 * @param {Object} variables
 * @return {String}
 */
String.prototype.format = function(variables) {
    var str = this, key, r;

    if (!!variables) {
        for (key in variables) {
            if (variables.hasOwnProperty(key)) {
                r = new RegExp('{' + key + '}', 'g');
                str = str.replace(r, variables[key]);
            }
        }
    }

    return str;
};

/**
 * Selects a random element from an array of strings and return its formatted output
 * @see String.prototype.format
 *
 * @param {Object} variables
 * @return {String}
 */
Array.prototype.format = function(variables) {
    var elem = this[Math.floor(Math.random() * this.length)];
    return elem.format(variables);
};


// English
exports.en = {
    num_none:  'no',
    num_one:   'one',
    face_mult: 's',

    command: {
        init:      /^\!(start|j(oin)?)/i,
        ping:      /^\!ping/i, // @TODO ping command
        quit:      /^\!(quit|forfeit|giveup)/i,

        bid:       /^\!b(id)? (\d+) (\d+)s?/i,
        challenge: /^\!(liar|call|bluff)\b/i,
        spoton:    /^\!spot( |-)?on/i,

        kick:      /^\!kick (\S+)/i, // @TODO kick command
        dice_left: /(^\!dice(left)?|dice (are )?left\??)/i,

        stats:     /^\!stats( \S+)?/i,
    },

    e_cannot_join:       '{nick}: Sorry, you can\'t join the game right now',
    e_already_joined:    ['{nick}: You already joined the game!',
                          'Hey {nick}, you\'re already in'],
    e_too_few_players:   ['Looks like we need more players, game won\'t start',
                          'We need a few more players before the game can start...'],
    e_too_many_players:  '{nick}: Woah, the game\'s full already, sorry',
    e_already_playing:   '{nick}: Sorry but the game already started.. :(',

    game_init_timeout:   '{nick} started a new game! Start in {seconds} seconds, say "!join" to play',
    game_round_start:    'Round start, check for a notice from me to see your dice',
    game_finish:         ['{nick} wins the game!',
                          'Whooray for {nick}, he won!'],

    player_join:         ['{nick} joins the game',
                          '{nick} is in'],
    player_rolled:       'You rolled: {dice}',
    player_initial:      ['{nick}: Place initial bid',
                          '{nick}: Make the first bid'],
    player_next:         ['{nick}: You may raise the bid or call the bluff',
                          'Your turn, {nick}: think it\'s a bluff? or raise the bid?'],
    player_lost:         ['{nick} has no more dice and has lost',
                          'Bye bye {nick}, no more dice means you\'re out'],
    player_quit:         ['{nick} left the game',
                          '{nick} gave up..'],

    timeout_start:       ['Game starts in ten seconds! (Players: {players})',
                          'Commencing game in 10 seconds with: {players}'],
    timeout_round:       ['Hey {nick}, it\'s your turn!',
                          'Just a friendly reminder that {nick} should play now'],
    timeout_player:      'Dropping {nick} from the game after no action within {minutes} minutes.',
    timeout_game:        'No activity in {minutes} minutes, ending game without a winner.',

    e_bid_illegal:       'Bid is illegal. You may bid an increased quantity of any face or the same quantity of a higher face',
    e_no_such_face:      ['{nick}: There\'s no such face',
                          '{nick}: You know how many sides a die has right?'],
    e_bid_too_many_dice: ['{nick}: There are only {total} dice left..',
                          '{nick}: That\'s way off my friend.'],
    e_no_bid:            ['{nick}: No bid to challenge, place initial bid',
                          'Place a bid first, {nick}'],

    bid_placed:          '{nick} bids there are {count} {face}s',
    bid_placed_single:   '{nick} bids there is one {face}',

    bid_challenged:      ['{nick} calls the bluff',
                          '{nick} thinks {bidder} is a bloody liar',
                          '{nick} doesn\'t believe {bidder}'],
    bid_bluff:           'Bid was a bluff, only {count} {face}.',
    bid_bluff_none:      'Bid was a bluff, actually no {face}s.',
    bid_bluff2:          '{nick} lost a die for bluffing',
    bid_valid:           'Bid was true, at least {count} {face}.',
    bid_valid2:          '{nick} lost a die for calling a valid bid',

    spoton:              ['{nick} declares the bid spot-on',
                          '{nick} thinks that bid is spot-on'],
    spoton_true:         'Bid was spot-on, exactly {count} {face}.',
    spoton_true2:        ['Players were caught by a spot-on bid and lost a die',
                          'All other players lost a die for being caught by a spot-on bid'],
    spoton_true2_single: '{nick} was caught by a spot-on bid and lost a die',
    spoton_wrong:        'Bid was dead wrong. Actually {count} {face}.',
    spoton_wrong2:       '{nick} lost a die for being dead wrong',

    dice_left:           ['Dice left in this round: ',
                          'These have a few dice left: '],
    dice_reveal:         '{nick} shows {count} {face}, totalling {total}',

    stats_global:        'Games played: {total} (without a winner: {nowinner}, failed to start: {notstarted})',
    stats_highscore:     'Most wins:\n1. {nick1} ({wins1})\n2. {nick2} ({wins2})\n3. {nick3} ({wins3})',
    e_stats_unknown:     'I don\'t know this nick.',
    stats_player:        'Statistics for player {nick}:\nGames played: {total} - Games won: {wins} ({winpercent}%)',
    stats_player_perfect:   'Times won without losing a die: {perfectins}',
    stats_player_single:    'Times won with a single die left: {singlewins}',

    e_db:                'Whoops, this shouldn\'t happen: {error}'
};
