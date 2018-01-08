# ludorum-wargame's backlog

## Core and dependencies

+ Test the new `EnsemblePlayer` with many MCTS players running in webworkers to check MCTS paralelization.

## Game logic

+ Implement `AssaultAction`.
+ Terrain management general optimizations. 

## MCTS player

+ Update and finish the influence map implementation.
+ Make an search algorithm (probably based on A*) to get a path or paths from a shooter's position to a position from which a target can be shot.
+ Optimization of the strategic-tactic mapping, generating directly the tactic actions instead of using the method `Wargame.moves()`.

## Dynamic Scripting player.

+ Add test cases for the DS player against random players in the base and abstract game. Put them in the HTML console and `test.js`.
+ Add a test case with a match between two DS players, one with and another without weight adjustment.
+ Verify (and fix if required) the rules tha involve assaults.

