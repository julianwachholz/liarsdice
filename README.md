Liar's Dice
===========

Setup
-----

1. clone this repository
2. `npm install irc mongodb`
3. modify config.js to your liking
   - for NickServ authentication, rename `password.json.example` to `password.json` and add your password.
4. `node bot.js`

**OR**

Join us at `##liarsdice` on freenode.

Usage
-----

### Commands

The following commands are available to interact with the bot:

 * `!start` will initiate a new game (or join if a new game has already been initiated)
 * `!join` adds you to the current game, if it hasn't started yet
 * to make a bid, write `!bid` followed by the count and the face numbers separated by a space, e.g. `!bid 2 4`
 * to challenge the previous bid, say `!call`, `!bluff` or simply `!liar`
 * if you think the previous bid is exactly try, you can declare the bid "Spot On" by saying `!spoton`
 * say `!dice` to see how many dice are left in the game

These command triggers are configured in lang.js.

### How to play

A game of liar's dice is played in rounds. Every player starts with 5 dice. Each round, the players roll their dice. One player
begins bidding, picking a quantity of a face 1 through 6. The quantity states the player's opinion on how many of the chosen
face have been rolled in *total* on the table.

Each player has two choices during his turn: make a higher bid, or challenge the previous bid as being wrong. Raising the bid
means either increasing the quantity, or the face value (This bot uses the same rules as the Liar's Dice game in [Red Dead
Redemption](http://en.wikipedia.org/wiki/Red_Dead_Redemption))

If the current player thinks the previous player's bid is wrong, he challenges it, and then all dice are revealed to determine
whether the bid was valid. If the number of the relevant face revealed is at least as high as the bid, then the bid is valid, in
which case the bidder wins. Otherwise, the challenger wins.

Instead of raising or challenging, the player can bet that the current bid is exactly correct (called "Spot On"). Such a call,
like "Liar", ends the round. If the number is higher or lower, the player loses to the previous bidder (i.e. lose a die),
however if they are correct, they win. This allows a player who believes the previous bidder has made the best correct bid to
attempt to "steal" the win. "Spot-on" calls have a far higher probability of being wrong, and so the reward for a correct "Spot-
on" call is generally higher; in this version all other player lose a die.

[Text from Wikipedia](http://en.wikipedia.org/wiki/Liar's_dice)

Todo
----

 * Statistics (everyone loves stats!)
 * Utility commands
   * `!ping` users in channel during join phase
   * `!kick` idle players in a game of three or more
 * Implement game variations (see [Wikipedia](http://en.wikipedia.org/wiki/Liar's_dice#Variants))
   * Allow `!pass`ing a bid
   * 1 (or other face) as aces
   * Loser of a challenge gives one die to the winner of that challenge
   * Always allow challenging (not only the current player)
   * Vote for variations in join phase
