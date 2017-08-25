/** # Grim Future

*/
var GrimFuture = exports.GrimFuture = (function () {
	var GrimFuture = {};

/** ## Battle Brothers #############################################################################

*/
	var EQUIPMENTS = {
			LightClaws: { range: 0, attacks: 1 },
			CClaws: { range: 0, attacks: 2 },
			Pistol: { range: 12, attacks: 1 },
			AssaultRifle: { range: 24, attacks: 1 },
			HeavyFlamethrower: { range: 12, attacks: 6, ap: 1 }
		},
		MODELS = {
			BattleBrother: declare(Model, {
				cost: 22,
				equipments: [EQUIPMENTS.AssaultRifle, EQUIPMENTS.LightClaws],
				constructor: function BattleBrother(wounds) {
					Model.call(this, wounds);
				}
			}),
			AssaultBrother: declare(Model, {
				cost: 22,
				equipments: [EQUIPMENTS.Pistol, EQUIPMENTS.CClaws]
			}),
			SupportBrother: declare(Model, {
				cost: 50,
				equipments: [EQUIPMENTS.HeavyFlamethrower, EQUIPMENTS.LightClaws],
				constructor: function SupportBrother(wounds) {
					Model.call(this, wounds);
				}
			})
		},
		UNITS = {
			BattleBrothers_Unit: declare(Unit, {
				quality: 3,
				defense: 6,
				fearless: true,
				constructor: function BattleBrothers_Unit(props) {
					props = props || {};
					if (!props.models) {
						props.models = Iterable.range(5).map(function () {
							return new MODELS.BattleBrother();
						}).toArray();
					}
					Unit.call(this, props);
				}
			}),
			AssaultBrothers_Unit: declare(Unit, {
				quality: 3,
				defense: 6,
				models: Iterable.repeat(MODELS.AssaultBrother, 5).toArray(),
				fearless: true
			}),
			SupportBrothers_Unit: declare(Unit, {
				quality: 3,
				defense: 6,
				fearless: true,
				constructor: function SupportBrothers_Unit(props) {
					props = props || {};
					if (!props.models) {
						props.models = Iterable.range(5).map(function () {
							return new MODELS.SupportBrother();
						}).toArray();
					}
					Unit.call(this, props);
				}
			})
		};

	var BattleBrothers = GrimFuture.BattleBrothers = declare(Army, {
		faction: 'BattleBrothers',
		'static MODELS': MODELS,
		'static UNITS': UNITS,

		constructor: function BattleBrothers(args) {
			Army.call(this, args);
		}
	});

//TODO More factions.
	return GrimFuture;
})();
