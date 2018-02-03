# ludorum-wargame's backlog

## Core and dependencies

+ Check the parallelization of UCT using `EnsemblePlayer` with webworkers.

## Game logic

+ Implement `AssaultAction`.
+ Terrain management general optimizations. 

## MCTS player

+ Debug `randomAbstractGame` test. Units do not seem to move properly.
+ Test the influence map implementation in the strategic-tactic mapping with `AbstractedWargame`.
+ Make an search algorithm (probably based on A*) to get a path or paths from a shooter's position to a position from which a target can be shot.
+ Optimization of the strategic-tactic mapping, generating directly the tactic actions instead of using the method `Wargame.moves()`.

## Dynamic Scripting player.

+ Add test cases for the DS player against random players in the base and abstract game. Put them in the HTML console and `test.js`.
+ Add a test case with a match between two DS players, one with and another without weight adjustment.
+ Verify (and fix if required) the rules tha involve assaults.

## Tests

+ Implement cheating random players for testing. These are random players with trick dice.

