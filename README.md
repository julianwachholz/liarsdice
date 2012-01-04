Liar's Dice
===========

Setup
-----

1. clone this repository
2. `npm install irc`
3. modify config.js to your liking
4. `node main.js`

**OR**

Join us at ##liarsdice on freenode.

Usage
-----

Several *natural* commands are available to talk with the bot:

* `!start` will initiate a new game (or join if a new game has already been initiated)
* `join` adds you to the current game, if it hasn't started yet
* to make a bid, simply write the count and the face as numbers separated by a space, e.g. `2 4s`
* to challenge the previous bid, say `call`, `bluff` or simply `liar` (see lang.js for wildcards)
* say `dice left?` to see how many dice are left in the game


Todo
----

* Implement game variations
  * Spot On
  * 1 as aces
  * ...

* Statistics
