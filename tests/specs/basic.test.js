﻿define(['creatartis-base', 'ludorum-wargame'], function (base, ludorum_wargame) { "use strict";
	describe("Base definitions", function () {
		function expectFunction(f) {
			expect(typeof f).toBe("function");
			return f;
		}
		var iterable = base.iterable;

		it("dice probabilities", function () { /////////////////////////////////////////////////////
			var RANDOM = base.Randomness.DEFAULT,
				rolls = expectFunction(ludorum_wargame.rolls),
				rerolls = expectFunction(ludorum_wargame.rerolls),
				addRolls = expectFunction(ludorum_wargame.addRolls);

			for (var i = 0; i < 30; i++) {
				var p1 = RANDOM.random(),
					rs1 = rolls(p1, 1);
				expect(rs1.length).toBe(2);
				expect(rs1[0]).toBe(1 - p1);
				expect(rs1[1]).toBe(p1);

				var p2 = RANDOM.random(),
					rs2 = rerolls(p2, rs1);
				expect(rs2.length).toBe(2);
				expect(rs2[0]).toBeCloseTo(1 - p1 * p2, 12);
				expect(rs2[1]).toBeCloseTo(p1 * p2, 12);

				var nr3 = RANDOM.randomInt(3) + 1,
					rs3 = rolls(p1, nr3),
					nr4 = RANDOM.randomInt(3) + 1,
					rs4 = rolls(p1, nr4);
				expect(rs3.length).toBe(nr3 + 1);
				expect(iterable(rs3).sum()).toBeCloseTo(1, 12);
				expect(rs4.length).toBe(nr4 + 1);
				expect(iterable(rs4).sum()).toBeCloseTo(1, 12);

				var rs5 = addRolls(rs3, rs4),
					rs6 = rolls(p1, nr3 + nr4);
				expect(rs5.length).toBe(nr3 + nr4 + 1);
				expect(iterable(rs3).sum()).toBeCloseTo(1, 12);
				expect(rs6.length).toBe(nr3 + nr4 + 1);
				expect(iterable(rs4).sum()).toBeCloseTo(1, 12);
				iterable(rs5).zip(rs6).forEachApply(function (p1, p2) {
					expect(p1).toBeCloseTo(p2, 12);
				});
			}
		}); // it "dice probabilities"

	}); //// describe "Base definitions".
}); //// define.
