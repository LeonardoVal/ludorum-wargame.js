/** This spec is built with [Karma](https://karma-runner.github.io/1.0/index.html) and
[Jasmine](https://jasmine.github.io/2.5/introduction).
*/
define(['creatartis-base', 'ludorum-wargame'], function (base, ludorum_wargame, p2) { "use strict";
	describe("DynamicScriptingPlayer", function () {
		var GrimFuture = ludorum_wargame.GrimFuture,
			SupportBrothers_Unit = GrimFuture.BattleBrothers.UNITS.SupportBrothers_Unit,
			BattleBrothers_Unit = GrimFuture.BattleBrothers.UNITS.SupportBrothers_Unit;

/*
		it("dependencies load properly", function () { /////////////////////////////////////////////
			expect(p2).toBeDefined('p2 did not load properly!');
		});
		it("rules work.", function () { ////////////////////////////////////////////////////////////
			var example1 = ludorum_wargame.test.example1(),
				moves1 = example1.moves().Red,
				example2 = example1.next({ Red: moves1[0] }),
				player = new ludorum_wargame.DynamicScriptingPlayer({ name: 'DynScriptingPlayer' });
			expect(player).not.toBeNull();
			expect(player.ownRules()).not.toBeNull();
			player.ownRules().forEach(function (rule) {
				expect(rule).not.toBeNull();
				var actions = rule.call(player, example1, 'Red');
				if (actions !== null) {
					expect(Array.isArray(actions)).toBe(true);
					actions.forEach(function (action) {
						expect(typeof action).toBe('object');
						expect(action instanceof ludorum_wargame.GameAction).toBe(true);
					});
				}
			});
		}); // it "state handling".
		it("Con exampleDS1.", function () { ////////////////////////////////////////////////////////////
			var exampleDS1 = ludorum_wargame.test.exampleDS1(),
				moves1 = exampleDS1.moves().Red,
				example2 = exampleDS1.next({ Red: moves1[0] }),
				player = new ludorum_wargame.DynamicScriptingPlayer({ name: 'DynScriptingPlayer' }),
				actionActivate = player.decision(exampleDS1, 'Red'),
				action = player.__pendingActions__.shift();
			if (action !== null) {
				//aplica rule_1A
				expect(action.__rule__.name === "rule_1A").toBe(true);
				expect(actionActivate instanceof ludorum_wargame.ActivateAction).toBe(true);
				expect(action instanceof  ludorum_wargame.ShootAction).toBe(true);
			}
		}); // it

		it("Con exampleDS2.", function () { ////////////////////////////////////////////////////////////
			var exampleDS2 = ludorum_wargame.test.exampleDS2(),
				moves1 = exampleDS2.moves().Red,
				example2 = exampleDS2.next({ Red: moves1[0] }),
				player = new ludorum_wargame.DynamicScriptingPlayer({ name: 'DynScriptingPlayer' }),
				actionActivate = player.decision(exampleDS2, 'Red'),
				action = player.__pendingActions__.shift();
			if (action !== null) {
				//aplica rule_2A
				//expect(action.__rule__.name === "rule_1A").toBe(false);
				//expect(exampleDS2.armies['Blue'].units.) //tengo q ver si efectivamente esta herido //FIXME
				expect(action.__rule__.name === "rule_2A").toBe(true);
				expect(actionActivate instanceof ludorum_wargame.ActivateAction).toBe(true);
				expect(action instanceof  ludorum_wargame.AssaultAction).toBe(true);
			}
		}); // it
		it("Con exampleDS3.", function () { ////////////////////////////////////////////////////////////
			var exampleDS3 = ludorum_wargame.test.exampleDS3(),
				moves1 = exampleDS3.moves().Red,
				example2 = exampleDS3.next({ Red: moves1[0] }),
				player = new ludorum_wargame.DynamicScriptingPlayer({ name: 'DynScriptingPlayer' }),
				actionActivate = player.decision(exampleDS3, 'Red'),
				action = player.__pendingActions__.shift();
			if (action !== null) {
				//aplica rule_3A
				expect(action.__rule__.name === "rule_3A").toBe(true);
				expect(actionActivate instanceof ludorum_wargame.ActivateAction).toBe(true);
				expect(action instanceof ludorum_wargame.ShootAction).toBe(true);
				expect(typeof action.targetId).toBe('string');
				var id = action.targetId,
					targetUnit = action.unitById(exampleDS3,id);
				expect(targetUnit instanceof SupportBrothers_Unit).toBe(true);
			}
		}); // it

		it("Con exampleDS4.", function () { ////////////////////////////////////////////////////////////
			var exampleDS4 = ludorum_wargame.test.exampleDS4(),
				moves1 = exampleDS4.moves().Red,
				example2 = exampleDS4.next({ Red: moves1[0] }),
				player = new ludorum_wargame.DynamicScriptingPlayer({ name: 'DynScriptingPlayer' }),
				actionActivate = player.decision(exampleDS4, 'Red'),
				action = player.__pendingActions__.shift();
			if (action !== null) {
				//aplica rule_1B
				expect(action.__rule__.name === "rule_1B").toBe(true);
				expect(actionActivate instanceof ludorum_wargame.ActivateAction).toBe(true);
				expect(action instanceof  ludorum_wargame.MoveAction).toBe(true);
			}
		}); // it

	*/
	}); //// describe "Base definitions".

}); //// define.
