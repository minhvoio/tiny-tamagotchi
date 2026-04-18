import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { reducer } from '@/game/reducer';
import { initialState, type PetModel } from '@/game/state';
import { TICK_INTERVAL_MS } from '@/game/constants';

const reducerSource = readFileSync(resolve(__dirname, '../../src/game/reducer.ts'), 'utf8');

function petWith(state: PetModel['state'], hasEvolved = false): PetModel {
  return { ...initialState, state, hasEvolved };
}

describe('scope contract — state machine is the only writer of `state`', () => {
  it('FEED, PLAY, REST never change state or hasEvolved', () => {
    for (const actionType of ['FEED', 'PLAY', 'REST'] as const) {
      for (const stateName of ['Normal', 'Sick', 'Evolved'] as const) {
        const start = petWith(stateName, stateName === 'Evolved');
        const next = reducer(start, { type: actionType });
        expect(next.state).toBe(start.state);
        expect(next.hasEvolved).toBe(start.hasEvolved);
      }
    }
  });

  it('HEAL branch writes state via the hasEvolved ternary (single textual anchor)', () => {
    expect(reducerSource).toContain("state: state.hasEvolved ? 'Evolved' : 'Normal'");
  });

  it('TICK branch merges states.nextState return', () => {
    expect(reducerSource).toContain('state: machine.state');
    expect(reducerSource).toContain('hasEvolved: machine.hasEvolved');
  });

  it('literal PetState strings ("Normal"|"Sick"|"Evolved") only appear in SEED_PRESETS map', () => {
    const literals = reducerSource.match(/state:\s*'(Normal|Sick|Evolved)'/g) ?? [];
    expect(literals.length).toBeLessThanOrEqual(3);
  });

  it('TICK alone never flips Evolved back to Normal across 500 TICKs', () => {
    let s: PetModel = petWith('Evolved', true);
    for (let i = 0; i < 500; i++) {
      s = reducer(s, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
      expect(s.state === 'Evolved' || s.state === 'Sick').toBe(true);
      expect(s.hasEvolved).toBe(true);
    }
  });
});
