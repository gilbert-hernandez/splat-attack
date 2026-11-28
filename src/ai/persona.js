import { PLANS } from '../config/rivals.js';
import { RULES } from '../config/rules.js';
import { COLUMNS } from '../core/grid.js';
import { nextInt } from '../core/rng.js';

// A rival's variety (SA-11): the persona it draws once per match, and the profile it plans each pair
// with, which applies the persona's plan, risk and preferences and then adapts to what it sees.
// Everything is integer percentages on the profile's own values, so each rival keeps its style.

/** @typedef {(typeof import('../config/rivals.js').RIVALS)[number]} Profile */
/** @typedef {keyof typeof PLANS} Plan */

/** The preferred columns: left, center and right. */
export const AREAS = [0, (COLUMNS - 1) >> 1, COLUMNS - 1];

/**
 * @typedef {object} Persona
 * @property {Plan} plan the plan it starts with
 * @property {number} risk added to fire.at; cuts the stack penalties
 * @property {number} patience ticks added to the drop delay
 * @property {number[]} colors preferred colors (1 or 2)
 * @property {number} colorBonus
 * @property {number} area the preferred column
 * @property {number} areaBonus
 */

/**
 * What a rival read off the boards before planning a pair.
 * @typedef {object} Reading
 * @property {number} setup the longest chain one more blob could set off on its own board
 * @property {number} fired the longest chain splatted on its board since the reading before
 * @property {number} threat the same on the player's board
 * @property {number} playerStains the player's blobs resting on matching stains
 * @property {number} playerTallest the player's tallest column
 * @property {boolean} playerMeterFull
 * @property {number} playerPending
 * @property {number} gap the player's score minus its own
 * @property {number} pending its own pending gunk
 */

/**
 * Draws from an inclusive [min, max] range.
 * @param {number} rng
 * @param {number[]} range
 */
function within(rng, range) {
  const [min, max] = range;
  const draw = nextInt(rng, max - min + 1);
  return { rng: draw.rng, value: min + draw.value };
}

/**
 * Draws a plan by weight, leaving out `except`. Returns null if no other plan has weight.
 * @param {number} rng
 * @param {Record<string, number>} weights
 * @param {string | null} [except]
 * @returns {{rng: number, value: Plan | null}}
 */
export function drawPlan(rng, weights, except = null) {
  const plans = /** @type {Plan[]} */ (Object.keys(PLANS)).filter((p) => p !== except && weights[p] > 0);
  const total = plans.reduce((sum, p) => sum + weights[p], 0);
  if (total === 0) return { rng, value: null };
  const draw = nextInt(rng, total);
  let left = draw.value;
  for (const plan of plans) {
    if (left < weights[plan]) return { rng: draw.rng, value: plan };
    left -= weights[plan];
  }
  return { rng: draw.rng, value: plans[plans.length - 1] };
}

/**
 * A persona for one match, inside the profile's ranges. It always makes the same nine draws, so the
 * stream's position afterwards doesn't depend on what was drawn.
 * @param {Profile} profile
 * @param {number} rng
 * @returns {{rng: number, persona: Persona}}
 */
export function drawPersona(profile, rng) {
  const { vary } = profile;
  let r = rng;
  const take = (draw) => {
    r = draw.rng;
    return draw.value;
  };
  const plan = take(drawPlan(r, vary.plans));
  const risk = take(within(r, vary.risk));
  const patience = take(within(r, vary.patience));
  const count = take(within(r, vary.colors));
  const first = 1 + take(nextInt(r, RULES.colors));
  // The second color is any other one, so the two always differ.
  const second = 1 + ((first + take(nextInt(r, RULES.colors - 1))) % RULES.colors);
  const colorBonus = take(within(r, vary.colorBonus));
  const area = AREAS[take(nextInt(r, AREAS.length))];
  const areaBonus = take(within(r, vary.areaBonus));
  return {
    rng: r,
    persona: {
      plan,
      risk,
      patience,
      colors: count >= 2 ? [first, second] : [first],
      colorBonus,
      area,
      areaBonus,
    },
  };
}

/**
 * A rival's signature plan: its most likely starting plan (the first in PLANS order on a tie). Its
 * profile is tuned for it, so that plan leaves the profile's weights alone.
 * @param {Profile} profile
 * @returns {Plan}
 */
export function signatureOf(profile) {
  let best = /** @type {Plan} */ (Object.keys(PLANS)[0]);
  for (const plan of /** @type {Plan[]} */ (Object.keys(PLANS)))
    if (profile.vary.plans[plan] > profile.vary.plans[best]) best = plan;
  return best;
}

/** A percentage of an integer, rounded to the nearest (halves away from zero). */
function percentOf(value, percent) {
  const product = value * percent;
  const size = Math.floor((Math.abs(product) + 50) / 100);
  return product < 0 ? -size : size;
}

/**
 * The profile to plan one pair with: the rival's profile with its plan's overlay, its persona's risk
 * and preferences, and its adaptation to the reading.
 * @param {Profile} profile
 * @param {Persona} persona
 * @param {Plan} plan the current plan (the persona's, or a later switch)
 * @param {Reading | null} reading the last reading of the boards, or null before the first
 */
export function pairProfile(profile, persona, plan, reading) {
  /** @type {Record<string, number>} */
  const weights = { ...profile.weights };
  const fire = { ...profile.fire };

  // The profile is tuned for its signature plan, so only another plan changes it.
  if (plan !== signatureOf(profile)) {
    const overlay = PLANS[plan];
    for (const [key, percent] of Object.entries(overlay.weights)) weights[key] = percentOf(weights[key], percent);
    fire.at = overlay.fireSet > 0 ? overlay.fireSet : fire.at + overlay.fireShift;
  }

  fire.at += persona.risk;
  const calm = 100 - persona.risk * profile.vary.riskPercent;
  weights.height = percentOf(weights.height, calm);
  weights.spawnColumn = percentOf(weights.spawnColumn, calm);
  weights.colorLinks = persona.colorBonus;
  weights.area = persona.areaBonus;

  if (reading) adapt(profile.adapt, reading, weights, fire);
  fire.at = Math.max(1, fire.at);
  fire.smallPercent = Math.min(100, Math.max(0, fire.smallPercent));

  const colorMask = persona.colors.reduce((mask, color) => mask | (1 << color), 0);
  return {
    ...profile,
    weights,
    fire,
    prefs: { areaCol: persona.area, colorMask },
  };
}

/**
 * The player's threat, 0 to 100: the chain they have ready, their blobs on matching stains (bigger
 * attacks to come) and how much they have stacked to build with.
 * @param {Reading} reading
 */
export function pressureOf({ threat, playerStains, playerTallest }) {
  const tall = Math.max(0, playerTallest - (RULES.visibleRows >> 1));
  return Math.min(100, 25 * Math.min(threat, 4) + 2 * playerStains + 4 * tall);
}

/**
 * Shifts weights and fire values toward what the boards call for, scaled by the profile's `adapt`.
 * @param {Profile['adapt']} strength
 * @param {Reading} reading
 * @param {Record<string, number>} weights
 * @param {{at: number, smallPercent: number}} fire
 */
function adapt(strength, reading, weights, fire) {
  // Under threat: fire smaller chains sooner, and keep the stack lower.
  const pressure = pressureOf(reading);
  const urgency = percentOf(pressure, strength.threat);
  fire.smallPercent += percentOf(100 - fire.smallPercent, urgency);
  weights.height = percentOf(weights.height, 100 + urgency);
  if (pressure >= 75 && strength.threat > 0) fire.at--;

  // The player could Rinse away an attack: build instead.
  if (reading.playerMeterFull && reading.playerPending === 0) {
    weights.attack = percentOf(weights.attack, 100 - strength.meter);
    weights.chainSetup = percentOf(weights.chainSetup, 100 + strength.meter);
  }

  // Far behind: take risks for a bigger chain. Well ahead: play safe.
  if (strength.gap > 0 && reading.gap > strength.gapPoints) {
    fire.at++;
    weights.chainSetup = percentOf(weights.chainSetup, 100 + strength.gap);
  } else if (strength.gap > 0 && reading.gap < -strength.gapPoints) {
    fire.at--;
    weights.height = percentOf(weights.height, 100 + strength.gap);
  }

  // Gunk coming: cancel it, with whatever chain is ready.
  const gunk = Math.min(reading.pending, 2 * COLUMNS);
  weights.cancel = percentOf(weights.cancel, 100 + Math.floor((gunk * strength.gunk) / COLUMNS));
  if (reading.pending >= COLUMNS && strength.gunk > 0) fire.at--;
}
