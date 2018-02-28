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
			HeavyFlamethrower: { range: 12, attacks: 6, ap: 1 },
			EnergyFist: { range: 0, attacks: 2, ap: 4},
			LinkedAssaultRifle: { range: 24, attacks: 1 },
			HeavyMachinegun: { range: 36, attacks: 3, ap: 1}
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
				equipments: [EQUIPMENTS.Pistol, EQUIPMENTS.CClaws],
				constructor: function AssaultBrother(wounds) {
					Model.call(this, wounds);
				}
			}),
			SupportBrother: declare(Model, {
				cost: 50,
				equipments: [EQUIPMENTS.HeavyFlamethrower, EQUIPMENTS.LightClaws],
				constructor: function SupportBrother(wounds) {
					Model.call(this, wounds);
				}
			}),
			Engineer: declare(Model, {
				cost: 140,
				equipments: [EQUIPMENTS.Pistol, EQUIPMENTS.EnergyFist],
				constructor: function Engineer(wounds) {
					Model.call(this, wounds);
				}
			}),
			SupportBiker: declare(Model, {
				cost: 100,
				equipments: [EQUIPMENTS.LinkedAssaultRifle, EQUIPMENTS.HeavyMachinegun, EQUIPMENTS.LightClaws],
				constructor: function SupportBiker(wounds) {
					Model.call(this, wounds);
				}
			}),
			NuevoFastAttack: declare(Model, {
				cost: 30,
				equipments: [EQUIPMENTS.AssaultRifle, EQUIPMENTS.LightClaws],
				constructor: function NuevoFastAttack(wounds) {
					Model.call(this, wounds);
				}
			}),
			NuevoMelee: declare(Model, {
				cost: 20,
				equipments: [EQUIPMENTS.LightClaws],
				constructor: function NuevoMelee(wounds) {
					Model.call(this, wounds);
				}
			}),
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
				//models: Iterable.repeat(MODELS.AssaultBrother, 5).toArray(),
				fearless: true,
				constructor: function AssaultBrothers_Unit(props) {
					props = props || {};
					if (!props.models) {
						props.models = Iterable.range(5).map(function () {
							return new MODELS.AssaultBrother();
						}).toArray();
					}
					Unit.call(this, props);
				}
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
			}),
			Engineers_Unit: declare(Unit, {
				quality: 3,
				defense: 7,
				constructor: function Engineers_Unit(props) {
					props = props || {};
					if (!props.models) {
						props.models = Iterable.range(1).map(function () {
							return new MODELS.Engineer();
						}).toArray();
					}
					Unit.call(this, props);
				}
			}),
			SupportBikers_Unit: declare(Unit, {
				quality: 3,
				defense: 6,
				constructor: function SupportBikers_Unit(props) {
					props = props || {};
					if (!props.models) {
						props.models = Iterable.range(1).map(function () {
							return new MODELS.SupportBiker();
						}).toArray();
					}
					Unit.call(this, props);
				}
			}),
			//inventado solo para que exista una unidad de clasificacion fast attack
			NuevoFastAttacks_Unit: declare(Unit, {
				quality: 4,
				defense: 3,
				constructor: function NuevoFastAttacks_Unit(props) {
					props = props || {};
					if (!props.models) {
						props.models = Iterable.range(5).map(function () {
							return new MODELS.NuevoFastAttack();
						}).toArray();
					}
					Unit.call(this, props);
				}
			}),
			//inventado solo para que exista una unidad sin ataque a distancia
			NuevoMelees_Unit: declare(Unit, {
				quality: 3,
				defense: 6,
				constructor: function NuevoMelees_Unit(props) {
					props = props || {};
					if (!props.models) {
						props.models = Iterable.range(3).map(function () {
							return new MODELS.NuevoMelee();
						}).toArray();
					}
					Unit.call(this, props);
				}
			}),
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
