Liar's Dice
===========

Setup
-----

1. clone this repository
2. `npm install irc`
3. modify config.js to your liking
4. `node main.js`

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
 * say `dice left` to see how many dice are left in the game

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

*The spot on call is not yet implemented.*

[Text from Wikipedia](http://en.wikipedia.org/wiki/Liar's_dice)

Todo
----

 * Implement game variations
   * Spot On
   * 1 as aces
   * Vote for variations in join phase
 * Statistics
 * Message throttling

Colophon
--------

https://github.com/progman/node-sleep
