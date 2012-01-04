/**
 * Texts to be used in a game of liar's dice
 */

// English
exports.en = {
    e_cannot_join:      '{nick}: Sorry, you can\'t join the game right now',
    e_already_joined:   '{nick}: You already joined the game!',
    e_too_few_players:  'Looks like we need more players, game won\'t start',
    e_too_many_players: '{nick}: Woah, sorry but the game\'s full already',
    e_already_playing:  '{nick}: Sorry but the game already started.. :(',

    game_init_timeout: '{nick} started a new game! start in {seconds} seconds, say "join" to play',
    round_start:        'Round start, check for a notice from me to see your dice',

    player_join:    '{nick} joins the game',
    player_rolled:  'You rolled: {dice}',
    player_initial: '{nick}: place initial bid',
    player_next:    '{nick}: you may raise the bid or call the bluff',
    player_remind:  'Hey {nick}, it\'s your turn',

    command: {
        init:      /^\!start/i,
        join:      /join/i,
        bid:       /(\d+) (\d)s?/i,
        challenge: /(liar|call|bluff)/i,
        dice_left: /dice left\?/i,
        // spoton:    /(spot on|spoton)/i,
    },

    bid_illegal: 'Bid is illegal. You may bid an increased quantity of any face or the same quantity of a higher face',
    bid_placed:  '{nick} bids there are {count} {face}s',
    bid_too_many_dice: '{nick}: there are only {total} dice left..',

    e_no_bid: '{nick}: no bid to challenge, place initial bid',
    bid_challenged: '{nick} calls the bluff',
    bid_bluff:  'Bid was a bluff, only {count} {face}s',
    bid_bluff2: '{nick} loses a die for bluffing',
    bid_valid:  'Bid was true, at least {count} {face}s',
    bid_valid2: '{nick} loses a die for calling a valid bid',

    reveal: '{nick} shows {count} {face}s, totalling {total}',
    lost: '{nick} has no more dice and has lost',
    finish: '{nick} wins the game'
};
